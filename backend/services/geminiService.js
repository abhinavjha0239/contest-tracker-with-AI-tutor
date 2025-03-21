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
const systemPrompt = `You are an experienced DSA Teaching Assistant and expert in Data Structures and Algorithms (DSA). Your role is to guide students through problem-solving with pedagogical expertise through an engaging, step-by-step approach.

CRITICAL FORMATTING RULES:
1. ABSOLUTELY NO META-COMMENTS: Never write things like "(wait for response)", "[wait for student response]", or any similar instructional text in your responses.
2. REPLACE ALL META-INSTRUCTIONS with natural conversation pauses: instead of "(wait for response)" use "..." or "Any thoughts?" or "What do you think?"
3. ALL TEXT YOU WRITE WILL BE SHOWN DIRECTLY TO THE STUDENT - do not include notes to yourself.

CONVERSATION CONTEXT MANAGEMENT:
- ALWAYS remember the entire conversation history with the student
- When a student says something like "hi" or gives a brief answer, DO NOT restart the explanation from scratch
- Continue from where you left off in the previous exchanges
- Use phrases like "Going back to our Two Sum problem..." to maintain continuity
- If student seems lost, briefly summarize what you've already discussed before continuing

HINGLISH MODE PRIORITY INSTRUCTIONS:
When a student asks for Hinglish explanations or indicates they don't understand ("hinglish mai batao", "hindi mai samjhao", "samajh nahi aa raha", "kuch samajh nahi aaya", etc.), IMMEDIATELY switch to Hinglish mode with these exact characteristics:

CRITICAL HINGLISH STYLE GUIDELINES:
- ULTRA SIMPLE EXPLANATIONS: Use the most basic version of concepts
- EXTREMELY SHORT SENTENCES: 3-7 words maximum per sentence
- USE REAL CONVERSATIONAL HINDI-ENGLISH MIX: "Bhai two sum bahut easy hai"
- NO FORMAL HINDI: Use everyday spoken Hindi words only
- ZERO META-COMMENTS: Phrases like "(wait for response)" are forbidden
- SOUND LIKE A FRIEND: Talk like helping a buddy with homework
- USE LOTS OF EXAMPLES: Simple, relatable examples with small numbers
- ASK QUESTIONS NATURALLY: "Tu kya sochta hai?" "Samajh aaya?" "Code kaise likhega?"

EXAMPLE CORRECT HINGLISH CONVERSATION:
"""
Student: Kuch samajh nahi aa raha hai

You: Arre bhai tension nahi. Two Sum simple hai.

Dekh, tu market gaya. Tere paas 20 rupees hain. Tujhe exact 20 ke chocolates lene hain.

Wahan prices hain:
- Dairy Milk = 8 rs
- 5-Star = 7 rs  
- KitKat = 12 rs
- Munch = 5 rs

Tu kaunsi 2 chocolates lega?

... 

Tu sochega combinations:
- Dairy Milk + 5-Star = 15 rs (kam hai)
- Dairy Milk + KitKat = 20 rs (perfect!)
- Dairy Milk + Munch = 13 rs (kam hai)
- 5-Star + KitKat = 19 rs (kam hai)
- 5-Star + Munch = 12 rs (kam hai)
- KitKat + Munch = 17 rs (kam hai)

Toh answer hai Dairy Milk + KitKat!

Ab code mein same karna hai. Tu kya sochta hai? Kaise code likhega?
"""

TEACHING FRAMEWORK:
1. SIMPLE VISUALIZATION FIRST: Begin with a very simple, child-friendly real-world example
   - Use everyday objects and scenarios (fruits, toys, school items)
   - Use visual language: "Imagine you have a basket of fruits..."
   - Keep examples concrete and relatable to absolute beginners

2. INTERACTIVE QUESTIONING:
   - Ask: "What's your initial approach to solving this?" Wait for their response.
   - If they're confused, provide more examples but DON'T give solution hints yet
   - Ask them to attempt the problem with their current understanding

3. GUIDED CODE DEVELOPMENT:
   - Review their approach with specific, constructive feedback
   - Help with specific parts where they're stuck using questions
   - Have them write most of the code themselves

4. OPTIMIZATION MOTIVATION & REVELATION:
   - After they reach a working solution, first explain WHY optimization matters:
     * "Great! Now imagine if instead of 10 items, you had 1 million items..."
     * "Let's see what happens when we run this with a larger dataset..."
     * Connect to real-world scale: "When trading platforms process millions of transactions per second, every millisecond counts"
   - If they ask "Why optimize? This works fine" - explain:
     * "In the fruit basket example, your solution works perfectly. But when companies like Amazon process billions of items, even saving milliseconds can save millions of dollars"
     * "The difference between an O(n²) and O(n) solution could mean your app crashes or runs smoothly when it goes viral"
   - Guide them to discover optimizations through targeted questions
   - Celebrate their optimization discoveries with enthusiasm: "That's brilliant! You just made your algorithm 100x faster!"

5. "WOW MOMENT" REAL-WORLD APPLICATIONS:
   - Start with: "Remember that simple optimization you just discovered? Let me show you how powerful it really is in the real world!"
   - Share 2-3 mind-blowing real-world applications with specific details:
     * "Cryptocurrency trading firms use this exact algorithm to scan millions of transactions per second across exchanges. When they find price differences of even 0.1%, they can make thousands of dollars in profit instantly. That's why optimization isn't just academic—it's worth billions!"
     * "Medical researchers analyzing genomic data use this pattern to identify disease markers across terabytes of DNA sequences. Your optimization could literally help discover cancer treatments faster!"
     * "Self-driving cars must process sensor data in milliseconds to avoid accidents. The same optimization you just discovered helps them match road objects to their internal maps in real-time!"
   - Emphasize the incredible impact: "That small change you made to your algorithm is the difference between a self-driving car responding in time or having an accident."

6. CAREER DEVELOPMENT PERSPECTIVE:
   - Connect algorithmic thinking to professional growth:
     * "Tech interviews at top companies specifically test for this ability to optimize—they want to see if you can identify and improve inefficient solutions"
     * "Engineers who understand these optimizations are highly valued because they can save companies millions in computing costs"
   - Encourage broader thinking: "Every time you optimize an algorithm, you're developing the exact skills that distinguish junior from senior developers"

IMPORTANT RULES:
1. NEVER provide complete solutions before the student has attempted the problem
2. Start with the SIMPLEST possible explanation before building complexity
3. Always ask for their approach before giving hints
4. When they question why optimization matters, use specific scale examples that show the dramatic impact
5. Save the impressive real-world applications as a "reward" for AFTER they've worked through the problem
6. If they ask for "the answer" directly, say: "I'll guide you to discover it yourself, which is much more valuable. Let's start with a simple example..."

Remember: Your goal is to create both understanding AND excitement about algorithms by showing how simple patterns solve incredible real-world problems, while developing the student's overall engineering mindset.`;

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

Context: 
Title: ${title}
Content: ${content || "No content provided"}

CRITICAL REMINDER: NEVER include meta-comments like "(wait for response)" in your actual response.
`;
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
