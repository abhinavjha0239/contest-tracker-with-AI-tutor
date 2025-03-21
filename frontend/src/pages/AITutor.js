import React, { useState, useRef, useEffect } from 'react';
import { Container, Form, Button, Alert, Card, InputGroup, Spinner } from 'react-bootstrap';
import api from '../axiosConfig'; // Import the configured axios instance

const AITutor = () => {
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null);
    
    // Chat-related states
    const [s3Key, setS3Key] = useState('');
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        setError('');
        setDebugInfo(null);

        try {
            // Log the request details before making the call
            console.log('Making API request to:', '/api/aitutor/upload');
            console.log('Form data contains file:', formData.has('file'));
            
            const { data } = await api.post('/api/aitutor/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            console.log('Response:', data);
            setS3Key(data.s3Key);  // Store S3Key for chat reference
            
            // Add system message to initialize the chat
            setMessages([
                { 
                    role: 'system', 
                    content: `File "${data.fileName}" was successfully uploaded. You can now chat about its contents.
Note: If the file is empty, you'll need to upload a different file with content.`
                }
            ]);
        } catch (err) {
            console.error('Upload error:', err);
            
            // Enhanced error debugging
            const errorDetails = {
                message: err.message,
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                url: err.config?.url,
                method: err.config?.method,
                baseURL: api.defaults.baseURL || 'Not set',
                file: file ? {
                    name: file.name,
                    type: file.type,
                    size: file.size
                } : 'No file'
            };
            
            // Log more information about the API configuration
            console.log('API base URL:', api.defaults.baseURL);
            console.log('Complete request URL:', err.config?.baseURL + err.config?.url);
            
            setDebugInfo(errorDetails);
            
            // Try fallback approaches
            if (err.response?.status === 404) {
                setError(`Route not found: ${err.config?.url}. Please check server routes configuration.`);
            } else {
                setError(err.response?.data?.msg || `Upload failed: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userInput.trim() || !s3Key) return;

        setMessages(prev => [...prev, { role: 'user', content: userInput }]);
        const messageToSend = userInput;
        setUserInput('');
        setChatLoading(true);

        try {
            console.log('Sending chat request with s3Key:', s3Key);
            
            let apiResponse = null;
            
            try {
                await api.get('/api/aitutor/test-no-auth');
                console.log('Basic test endpoint is accessible');
                
                const testPost = await api.post('/api/aitutor/test-post', { test: true });
                console.log('Test POST successful:', testPost.data);
            } catch (testErr) {
                console.error('Test routes not accessible:', testErr);
            }
            
            try {
                console.log('Attempting primary endpoint: /api/aitutor/chat-file');
                const result = await api.post('/api/aitutor/chat-file', {
                    s3Key,
                    message: messageToSend
                });
                apiResponse = result;
            } catch (err1) {
                console.error('Primary endpoint failed:', err1);
                
                // Try fallback
                const result = await api.post('/api/aitutor/chat-file', {
                    s3Key,
                    message: messageToSend
                }, {
                    baseURL: window.location.origin.replace('3000', '5000')
                });
                apiResponse = result;
            }
            
            if (apiResponse) {
                setMessages(prev => [...prev, { role: 'assistant', content: apiResponse.data.response }]);
            } else {
                throw new Error('No successful response from any endpoint');
            }
        } catch (err) {
            console.error('Chat error:', err);
            
            const errorMsg = err.response?.status === 404
                ? 'Endpoint not found. The server may need to be restarted or the route may be misconfigured.'
                : err.response?.data?.msg
                ? err.response.data.msg
                : `Error: ${err.message}`;
                    
            setMessages(prev => [...prev, { role: 'error', content: errorMsg }]);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <Container className="mt-4">
            <Card>
                <Card.Header>
                    <h2>AI Tutor</h2>
                </Card.Header>
                <Card.Body>
                    {/* Show file upload form if no file is uploaded or there's an error */}
                    {(!s3Key || error) && (
                        <Form onSubmit={handleFileUpload}>
                            <Form.Group className="mb-3">
                                <Form.Label>Upload Question File</Form.Label>
                                <Form.Control 
                                    type="file" 
                                    onChange={(e) => setFile(e.target.files[0])}
                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.doc,.docx,.md"
                                />
                                <Form.Text className="text-muted">
                                    Supported formats: PDF, Images (JPG, PNG, GIF), Text files, Documents (DOC, DOCX, MD)
                                </Form.Text>
                            </Form.Group>
                            
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? 'Uploading...' : 'Upload'}
                            </Button>
                        </Form>
                    )}
                    
                    {error && (
                        <Alert variant="danger" className="mt-3">
                            {error}
                            {debugInfo && (
                                <div className="mt-2 small">
                                    <details>
                                        <summary>Debug Information</summary>
                                        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                                    </details>
                                </div>
                            )}
                        </Alert>
                    )}
                    
                    {/* Chat interface - appears after successful file upload */}
                    {s3Key && (
                        <div className="mt-4">
                            <div className="chat-messages" style={{
                                maxHeight: '400px',
                                overflowY: 'auto',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                marginBottom: '20px'
                            }}>
                                {messages.map((msg, index) => (
                                    <div key={index} className={`message ${msg.role}`} style={{
                                        padding: '10px',
                                        margin: '5px 0',
                                        borderRadius: '5px',
                                        backgroundColor: 
                                            msg.role === 'user' ? '#e9f5ff' :
                                            msg.role === 'assistant' ? '#f0f0f0' :
                                            msg.role === 'error' ? '#ffebee' : '#e8f5e9',
                                        maxWidth: '90%',
                                        marginLeft: msg.role === 'user' ? 'auto' : '0',
                                        wordBreak: 'break-word'
                                    }}>
                                        <div className="message-header" style={{
                                            fontWeight: 'bold',
                                            marginBottom: '5px',
                                            fontSize: '0.8rem',
                                            color: '#555'
                                        }}>
                                            {msg.role === 'user' ? 'You' : 
                                             msg.role === 'assistant' ? 'AI Tutor' :
                                             msg.role === 'error' ? 'Error' : 'System'}
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="typing-indicator" style={{padding: '10px', color: '#666'}}>
                                        AI Tutor is typing <Spinner animation="grow" size="sm" />
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            <Form onSubmit={handleSendMessage}>
                                <InputGroup>
                                    <Form.Control
                                        as="textarea"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        placeholder="Ask a question about the uploaded file..."
                                        style={{resize: 'none', height: '60px'}}
                                        disabled={chatLoading}
                                    />
                                    <Button variant="primary" type="submit" disabled={chatLoading || !userInput.trim()}>
                                        Send
                                    </Button>
                                </InputGroup>
                            </Form>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default AITutor;
