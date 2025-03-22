import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './ContestQuestions.css';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import QuestionChat from '../../components/QuestionChat';
import { FaUpload, FaPlusCircle } from 'react-icons/fa';

const ContestQuestions = () => {
  const { contestId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [answerFile, setAnswerFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [contestInfo, setContestInfo] = useState(null);
  
  // New question form state
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionFile, setNewQuestionFile] = useState(null);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState(null);

  const fetchQuestions = useCallback(async () => {
    console.log("Fetching questions for contest ID:", contestId);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error("No authentication token found!");
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      console.log("Making API request to fetch questions...");
      // FIX THE API URL HERE - use 'ai-tutor' instead of 'aitutor'
      const response = await axios.get(
        `http://localhost:5000/api/ai-tutor/contest/${contestId}/questions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Questions API response:", response.data);
      
      // After loading the questions
      if (response.data.length > 0) {
        // Ensure questionId exists and is valid
        const questions = response.data.map(q => {
          // If questionId is missing, generate one
          if (!q.questionId) {
            console.warn('Question is missing questionId, generating one:', q.title);
            return {
              ...q,
              questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
          }
          return q;
        });
        
        console.log('Processed questions with IDs:', questions.map(q => q.questionId));
        setQuestions(questions);
        setSelectedQuestion(questions[0]);
      } else {
        console.log("No questions found for this contest");
      }
      
      // Set error to empty since we successfully got questions
      setError('');
      
      // Try to fetch contest info, but don't fail the whole page if it's not available
      try {
        console.log("Fetching contest info...");
        const contestResponse = await axios.get(
          `http://localhost:5000/api/contests/${contestId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log("Contest info API response:", contestResponse.data);
        setContestInfo(contestResponse.data);
      } catch (contestErr) {
        console.warn("Could not fetch contest details, but questions were loaded:", contestErr);
        // Create minimal contest info from the contestId
        setContestInfo({
          _id: contestId,
          name: "Contest Details Not Available"
        });
      }
    } catch (err) {
      console.error("Error fetching questions:", err);
      // More detailed error message based on error type
      if (err.response) {
        // The request was made and the server responded with an error status code
        setError(`Failed to fetch questions: ${err.response.status} - ${err.response.data.msg || err.response.statusText}`);
      } else if (err.request) {
        // The request was made but no response was received
        setError('Network error: Unable to connect to the server. Please check your connection.');
      } else {
        // Something else caused the error
        setError(`An error occurred: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (questions.length > 0) {
      // Process questions once when they're loaded
      const validatedQuestions = questions.map(q => {
        if (!q.questionId) {
          const newId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.warn('Question is missing questionId, generating:', newId);
          return {
            ...q,
            questionId: newId
          };
        }
        return q;
      });

      // Only update state if IDs have changed
      const hasChanges = validatedQuestions.some(
        (q, i) => q.questionId !== questions[i].questionId
      );

      if (hasChanges) {
        setQuestions(validatedQuestions);
      }

      // Set selected question only if not already set
      if (!selectedQuestion) {
        setSelectedQuestion(validatedQuestions[0]);
      }
    }
  }, [questions.length]); // Only depend on questions.length, not questions array

  const handleQuestionSelect = useCallback((question) => {
    if (question?.questionId) {
      setSelectedQuestion(question);
    }
  }, []); // No dependencies needed

  const handleFileChange = (e) => {
    setAnswerFile(e.target.files[0]);
  };

  const handleNewQuestionFileChange = (e) => {
    setNewQuestionFile(e.target.files[0]);
  };

  const handleAnswerFileChange = (e) => {
    setNewQuestionAnswer(e.target.files[0]);
  };

  const handleUploadAnswer = async () => {
    if (!answerFile || !selectedQuestion) return;
    
    setUploadLoading(true);
    setUploadError('');
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', answerFile);
      formData.append('contestId', contestId);
      formData.append('questionId', selectedQuestion.questionId);
      
      // FIX THE API URL HERE - use 'ai-tutor' instead of 'aitutor'
      await axios.post(
        'http://localhost:5000/api/ai-tutor/upload-answer',
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      // Refresh questions to get updated answer
      fetchQuestions();
      setShowUploadModal(false);
      setAnswerFile(null);
    } catch (err) {
      setUploadError('Failed to upload answer');
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAddNewQuestion = async (e) => {
    e.preventDefault();
    
    if (!newQuestionTitle) {
      setUploadError('Please provide a question title');
      return;
    }

    if (!newQuestionFile) {
      setUploadError('Question file is required');
      return;
    }

    if (!newQuestionAnswer) {
      setUploadError('Answer file is required');
      return;
    }
    
    setUploadLoading(true);
    setUploadError('');
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Generate a unique question ID
      const questionId = `q_${Date.now()}`;
      
      formData.append('questionId', questionId);
      formData.append('title', newQuestionTitle);
      formData.append('questionFile', newQuestionFile);
      formData.append('answerFile', newQuestionAnswer);
      
      await axios.post(
        `http://localhost:5000/api/ai-tutor/add-question/${contestId}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Refresh questions
      fetchQuestions();
      setShowNewQuestionModal(false);
      setNewQuestionTitle('');
      setNewQuestionFile(null);
      setNewQuestionAnswer(null);
    } catch (err) {
      console.error('Add question error:', err);
      setUploadError(err.response?.data?.msg || 'Failed to add question');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="error-container">
      <div className="error-message">{error}</div>
      <button 
        className="retry-button" 
        onClick={fetchQuestions}
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="contest-questions-container">
      <div className="questions-sidebar">
        <h2>Questions</h2>
        {contestInfo && <p className="contest-name">{contestInfo.name}</p>}
        
        {/* Always show upload section at the top */}
        <div className="upload-section">
          <button 
            className="action-button add-question-button"
            onClick={() => setShowNewQuestionModal(true)}
          >
            <FaPlusCircle /> Add Question
          </button>
        </div>
        
        <div className="questions-list">
          {questions.length > 0 ? (
            questions.map(question => (
              <div
                key={question.questionId || question._id}
                className={`question-item ${
                  selectedQuestion?.questionId === question.questionId ? 'active' : ''
                }`}
                onClick={() => handleQuestionSelect(question)}
              >
                {question.title}
              </div>
            ))
          ) : (
            <div className="no-questions-message">
              No questions available. Click "Add Question" to create one.
            </div>
          )}
        </div>
      </div>

      <div className="question-content">
        {selectedQuestion ? (
          <QuestionChat 
            contestId={contestId}
            question={selectedQuestion}
            key={selectedQuestion.questionId} // Add key to force re-render on question change
          />
        ) : (
          <div className="no-question-selected">
            {questions.length > 0 ? (
              "Select a question to start chatting with the AI Tutor"
            ) : (
              "Add a question to get started with the AI Tutor"
            )}
          </div>
        )}
      </div>

      {/* Upload Answer Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="upload-modal">
            <h3>Upload Answer for {selectedQuestion?.title}</h3>
            <div className="upload-form">
              <input type="file" onChange={handleFileChange} accept=".txt,.java,.cpp,.py,.js,.c,.cs" />
              {uploadError && <div className="error-message">{uploadError}</div>}
              <div className="modal-actions">
                <button 
                  className="cancel-button" 
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="upload-submit-button" 
                  onClick={handleUploadAnswer}
                  disabled={!answerFile || uploadLoading}
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Question Modal */}
      {showNewQuestionModal && (
        <div className="modal-overlay">
          <div className="upload-modal">
            <h3>Add New Question</h3>
            <form className="upload-form" onSubmit={handleAddNewQuestion}>
              <div className="form-group">
                <label htmlFor="question-title">Question Title:</label>
                <input 
                  id="question-title"
                  type="text" 
                  value={newQuestionTitle}
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  placeholder="Enter question title"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="question-file">Question File (Required):</label>
                <input 
                  id="question-file"
                  type="file" 
                  onChange={handleNewQuestionFileChange} 
                  accept=".txt,.java,.cpp,.py,.js,.c,.cs,.pdf"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="answer-file">Answer File (Required):</label>
                <input 
                  id="answer-file"
                  type="file" 
                  onChange={handleAnswerFileChange} 
                  accept=".txt,.java,.cpp,.py,.js,.c,.cs"
                  required
                />
              </div>
              {uploadError && <div className="error-message">{uploadError}</div>}
              <div className="modal-actions">
                <button 
                  type="button"
                  className="cancel-button" 
                  onClick={() => setShowNewQuestionModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="upload-submit-button" 
                  disabled={!newQuestionTitle || !newQuestionFile || !newQuestionAnswer || uploadLoading}
                >
                  {uploadLoading ? 'Adding...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestQuestions;
