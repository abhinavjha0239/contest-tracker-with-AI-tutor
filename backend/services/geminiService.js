const { GoogleGenerativeAI } = require('@google/generative-ai');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// Configure Google Generative AI with proper options
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Try different model options - the model name might depend on your API key access
let model;
try {
  // Try the primary model first
  model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro", // Updated to newest model name (gemini-1.5-pro)
    generationConfig: {
      temperature: 0.4, // Reduced temperature for more consistent output
      topP: 0.95,
      maxOutputTokens: 8192,
    }
    // Removed incorrect safety settings that were causing the error
  });
  console.log("Successfully configured Gemini 1.5 Pro model");
} catch (err) {
  console.error("Failed to initialize primary model, trying fallback:", err);
  try {
    // Fallback to alternative model
    model = genAI.getGenerativeModel({ 
      model: "gemini-pro", // Original model as fallback
      generationConfig: {
        temperature: 0.4, // Match primary model temperature
        topP: 0.95,
        maxOutputTokens: 4096,
      }
      // Removed incorrect safety settings that were causing the error
    });
    console.log("Successfully configured fallback Gemini Pro model");
  } catch (fallbackErr) {
    console.error("Failed to initialize fallback model:", fallbackErr);
    // We'll handle this in getAIResponse if model is undefined
  }
}

// Configure AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Chat session cache to maintain conversations between requests
const chatSessions = new Map();
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour timeout for chat sessions

// System prompt for AI tutor
const systemPrompt = `You are a DSA Teaching Assistant. You have access to both the question and its reference solution. Your role is to help students learn without giving away the answer directly.

CRITICAL RULES:
1. ALWAYS use the reference solution as your source of truth
2. NEVER reveal the complete solution until the student has demonstrated serious effort
3. Guide students toward the approach used in the reference solution
4. If a student's approach differs from the reference, acknowledge it but guide them toward the official solution
5. When checking student code, compare it strictly against the reference solution
6. Use the exact approach and optimizations from the reference solution in your hints

HELPING WITH IMPLEMENTATION:
1. First ensure students understand the problem by asking them to explain it
2. Guide them step-by-step through the approach used in the reference solution
3. If they get stuck, give hints based on the reference solution's approach
4. Only after multiple attempts and genuine effort, you may reveal small parts of the solution
5. The full solution should only be shared if the student has demonstrated they've tried everything else

REMEMBER:
- You have the official solution - use it to verify student answers
- Don't be lenient - follow the reference solution strictly
- Keep the official solution private until absolutely necessary
- Your goal is to teach the approach from the reference solution`;

/**
 * Get file content from S3 storage
 * @param {string} s3Key - The S3 key of the file
 * @returns {Promise<string>} - The file content as string
 */
async function getS3FileContent(s3Key) {
  try {
    console.log(`Retrieving file content from S3 with key: ${s3Key}`);
    
    // Create GetObject command
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
    });

    // Get the object from S3
    const response = await s3.send(command);
    
    // Convert stream to string
    const contentStream = response.Body;
    if (!contentStream) {
      throw new Error('Empty response from S3');
    }

    // For text-based files, convert to string
    const chunks = [];
    for await (const chunk of contentStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const content = buffer.toString('utf-8');
    
    console.log(`Successfully retrieved file content, length: ${content.length} characters`);
    return content;
  } catch (err) {
    console.error('Error retrieving file from S3:', err);
    throw new Error(`Failed to retrieve file: ${err.message}`);
  }
}

/**
 * Get AI response based on question content and user message
 * @param {string} title - The title of the question
 * @param {string} content - The content of the question
 * @param {string} message - The user's message/question
 * @param {array} history - Previous conversation history
 * @param {string} sessionId - Unique identifier for the conversation session
 * @returns {Promise<{text: string, sessionId: string}>} - AI generated response and session ID
 */
async function getAIResponse(title, content, message, history = [], sessionId = null) {
  try {
    // Check if model was successfully initialized
    if (!model) {
      throw new Error("AI model configuration failed. Please check your API key and model access.");
    }

    // Generate a consistent session ID if not provided
    // This ensures the same session is used for the same question
    if (!sessionId) {
      // Use s3Key or file path as the primary identifier
      const fileIdentifier = content && content.includes('/') ? content.split('/').pop() : content;
      sessionId = `session_${fileIdentifier || title || 'default'}_${Date.now()}`;
    }
    
    console.log(`Processing request for session: ${sessionId}`);
    
    let chat;
    let isNewSession = false;
    
    // Check if we have an existing chat session for this user/question
    if (chatSessions.has(sessionId)) {
      chat = chatSessions.get(sessionId).chat;
      console.log(`Retrieved existing chat session for ${sessionId}`);
      
      // Update last accessed timestamp
      chatSessions.set(sessionId, {
        chat,
        lastAccessed: Date.now()
      });
    } else {
      isNewSession = true;
      console.log(`Creating new chat session with ID: ${sessionId}`);
      
      // Format history for Gemini's chat interface if provided
      const formattedHistory = history && history.length > 0 ? 
        history.map(entry => ({
          role: entry.role,
          parts: [{ text: entry.content }]
        })) : [];
      
      // Create a new chat instance
      chat = model.startChat({
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        ...(formattedHistory.length > 0 ? { history: formattedHistory } : {})
      });
      
      // Store the chat session with timestamp
      chatSessions.set(sessionId, {
        chat,
        lastAccessed: Date.now()
      });

      console.log(`${formattedHistory.length > 0 ? 
        `Chat session initialized with ${formattedHistory.length} history messages` : 
        "New chat session initialized with no history"}`);
      
      // Only send system prompt for new chat sessions without history
      if (formattedHistory.length === 0) {
        try {
          const systemMessage = `
${systemPrompt}

QUESTION TITLE: ${title}

${content}

IMPORTANT: Base all your responses on the reference solution provided above. Do not deviate from this approach.

Remember: Guide the student toward discovering the solution themselves, but ensure they follow the same approach as the reference solution.`;
          await chat.sendMessage(systemMessage);
          console.log("System prompt successfully sent");
        } catch (systemErr) {
          console.log("Error sending system message, continuing with user message:", systemErr);
        }
      }
    }

    // Clean up old sessions to prevent memory leaks
    cleanupOldSessions();

    // Send the user's message and get response
    try {
      const result = await chat.sendMessage(message);
      const response = result.response.text();
      console.log("Successfully generated response");
      return { text: response, sessionId };
    } catch (err) {
      console.error("Error in chat.sendMessage:", err);
      
      // If chat session failed, remove it from cache to create a fresh one next time
      chatSessions.delete(sessionId);
      
      // Fallback to non-chat method if chat fails
      console.log("Falling back to non-chat method");
      
      const prompt = `
${systemPrompt}

Context: 
Title: ${title}
Content: ${content || "No content provided"}

Previous conversation: ${JSON.stringify(history.map(h => ({role: h.role, message: h.content})))}

User Question: ${message}

CRITICAL REMINDER: NEVER include meta-comments like "(wait for response)" in your actual response.
`;

      const result = await model.generateContent(prompt);
      return { text: result.response.text(), sessionId };
    }
  } catch (err) {
    console.error('Error getting AI response:', err);
    
    // Return a user-friendly error that doesn't expose implementation details
    if (err.message && err.message.includes("API key")) {
      throw new Error("AI service credentials are invalid or missing. Please contact support.");
    } else if (err.message && err.message.includes("model")) {
      throw new Error("The AI model is currently unavailable. Please try again later.");
    } else {
      throw new Error(`AI service error: ${err.message}`);
    }
  }
}

/**
 * Clean up sessions that haven't been accessed recently
 */
function cleanupOldSessions() {
  const now = Date.now();
  let cleanupCount = 0;
  
  chatSessions.forEach((sessionData, id) => {
    if (now - sessionData.lastAccessed > SESSION_TIMEOUT) {
      chatSessions.delete(id);
      cleanupCount++;
    }
  });
  
  if (cleanupCount > 0) {
    console.log(`Cleaned up ${cleanupCount} inactive chat sessions`);
  }
}

/**
 * Clear a specific chat session from cache
 * @param {string} sessionId - The session ID to clear
 */
function clearChatSession(sessionId) {
  if (chatSessions.has(sessionId)) {
    chatSessions.delete(sessionId);
    console.log(`Cleared chat session: ${sessionId}`);
    return true;
  }
  return false;
}

/**
 * Clear all chat sessions from cache
 */
function clearAllChatSessions() {
  const count = chatSessions.size;
  chatSessions.clear();
  console.log(`Cleared all ${count} chat sessions`);
  return count;
}

/**
 * Format a new history entry
 * @param {string} role - Either 'user' or 'model'
 * @param {string} content - The message content
 * @returns {Object} - Formatted history entry
 */
function createHistoryEntry(role, content) {
  return { role, content, timestamp: new Date().toISOString() };
}

module.exports = {
  getAIResponse,
  getS3FileContent,
  createHistoryEntry,  // Export this to help routes manage history
  clearChatSession,
  clearAllChatSessions
};
