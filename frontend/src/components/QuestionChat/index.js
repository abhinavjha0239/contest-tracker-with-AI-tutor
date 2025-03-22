import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaLightbulb } from 'react-icons/fa';
import './QuestionChat.css';

const QuestionChat = ({ contestId, question }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasAnswer, setHasAnswer] = useState(!!question?.answerPath);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  // Reset chat when question changes
  useEffect(() => {
    if (question) {
      setChatHistory([{
        role: 'assistant',
        content: `Welcome! I'm your AI tutor for "${question.title}". ${
          hasAnswer ? 'I have access to a reference solution for this problem. ' : ''
        }How can I help you?`
      }]);
      setSessionId(null);
      setError(null);
    }
  }, [question?.questionId, hasAnswer]);

  // Debug validations
  useEffect(() => {
    if (!question?.questionId) {
      console.warn('Missing questionId:', question);
    }
  }, [question]);

  // Scroll to bottom of chat when history changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const sendMessage = async () => {
    if (!message.trim() || !question?.questionId) return;

    const userMessage = message.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        contestId,
        questionId: question.questionId,
        message: userMessage,
        sessionId
      };

      console.log('Sending chat request:', payload);

      const response = await axios.post(
        'http://localhost:5000/api/ai-tutor/chat',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.response) {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: response.data.response
        }]);
        
        if (response.data.sessionId) {
          setSessionId(response.data.sessionId);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err.response?.data?.msg || err.message;
      setError(errorMessage);
      setChatHistory(prev => [...prev, {
        role: 'error',
        content: `Error: ${errorMessage}. Please try again.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="question-chat">
      {hasAnswer && (
        <div className="reference-solution-badge">
          <FaLightbulb /> Reference solution available
        </div>
      )}
      
      <div className="chat-history">
        {chatHistory.map((entry, index) => (
          <div 
            key={index} 
            className={`chat-message ${entry.role}`}
          >
            {entry.role === 'user' ? '👤 You:' : entry.role === 'assistant' ? '🤖 AI Tutor:' : '⚠️ Error:'}
            <div className="message-content">{entry.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      <div className="chat-input">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this problem..."
          disabled={isLoading}
        />
        <button 
          onClick={sendMessage} 
          disabled={isLoading || !message.trim()}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default QuestionChat;
