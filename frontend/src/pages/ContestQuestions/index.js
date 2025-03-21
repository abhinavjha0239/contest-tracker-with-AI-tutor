import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './ContestQuestions.css';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import QuestionChat from '../../components/QuestionChat';

const ContestQuestions = () => {
  const { contestId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQuestions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/ai-tutor/contest/${contestId}/questions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestions(response.data);
      if (response.data.length > 0) {
        setSelectedQuestion(response.data[0]);
      }
    } catch (err) {
      setError('Failed to fetch questions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    fetchQuestions();
  }, [contestId, fetchQuestions]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="contest-questions-container">
      <div className="questions-sidebar">
        <h2>Questions</h2>
        <div className="questions-list">
          {questions.map(question => (
            <div
              key={question.questionId}
              className={`question-item ${selectedQuestion?.questionId === question.questionId ? 'active' : ''}`}
              onClick={() => setSelectedQuestion(question)}
            >
              {question.title}
            </div>
          ))}
        </div>
      </div>

      <div className="question-content">
        {selectedQuestion ? (
          <QuestionChat 
            contestId={contestId}
            question={selectedQuestion}
          />
        ) : (
          <div className="no-question-selected">
            Select a question to start chatting with the AI Tutor
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestQuestions;
