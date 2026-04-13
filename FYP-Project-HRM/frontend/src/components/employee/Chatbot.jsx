import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const HRChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [userName, setUserName] = useState('');
    const [showNameInput, setShowNameInput] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    // Load saved name on mount
    useEffect(() => {
        const savedName = localStorage.getItem('hr_user_name');
        if (savedName) {
            setUserName(savedName);
            setShowNameInput(false);
        }
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Welcome message when chat opens
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            if (!userName) {
                setMessages([{
                    id: Date.now(),
                    text: "👋 Hi! What's your name?",
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            } else {
                setMessages([{
                    id: Date.now(),
                    text: `Welcome back, **${userName}**! 👋 How can I help with HR today? You can ask me about attendance, leave policies, HR portal, and more.`,
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            }
        }
    }, [isOpen, userName, messages.length]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Close chat with Escape key
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen]);

    // Format message (handle markdown)
    const formatMessage = (text) => {
        if (!text) return '';
        
        // Handle bold
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Handle bullet points (•, -, *)
        formatted = formatted.replace(/^[•\-*]\s+(.*?)$/gm, '• $1<br>');
        
        // Handle numbered lists
        formatted = formatted.replace(/^\d+\.\s+(.*?)$/gm, '<span class="list-decimal ml-4">$&</span>');
        
        // Handle line breaks (preserve double breaks for paragraphs)
        formatted = formatted.replace(/\n\n/g, '<br><br>');
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Handle URLs
        formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">$1</a>');
        
        // Handle emails
        formatted = formatted.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="text-blue-600 hover:underline">$1</a>');
        
        // Handle code blocks (if any)
        formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
        
        return formatted;
    };

    const sendMessage = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        const userMessage = trimmedInput;
        setInput('');
        setError(null);
        
        // Add user message with unique ID
        const userMessageObj = {
            id: Date.now(),
            text: userMessage,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMessageObj]);

        // Handle name input
        if (showNameInput) {
            localStorage.setItem('hr_user_name', userMessage);
            setUserName(userMessage);
            setShowNameInput(false);
            
            setTimeout(() => {
                const botMessage = {
                    id: Date.now() + 1,
                    text: `Nice to meet you, **${userMessage}**! 👋 I'm your HR assistant. I can help you with:\n\n• Attendance marking\n• Leave applications\n• HR portal access\n• Career development\n• Wellness programs\n\nWhat would you like to know?`,
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages(prev => [...prev, botMessage]);
            }, 500);
            return;
        }

        // Show typing indicator
        setIsTyping(true);

        try {
            // Call Flask backend (make sure URL matches your server)
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            
            const response = await axios.post(`${API_URL}/chat`, {
                message: userMessage,
                user_name: userName,
                session_id: localStorage.getItem('session_id') || Date.now().toString()
            }, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            setIsTyping(false);
            
            // Add bot response
            const botMessage = {
                id: Date.now(),
                text: response.data.answer || "I'm sorry, I couldn't generate a response. Please try again.",
                sender: 'bot',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMessage]);
            
            // Save session ID if provided
            if (response.data.session_id) {
                localStorage.setItem('session_id', response.data.session_id);
            }
            
        } catch (error) {
            setIsTyping(false);
            console.error('Error details:', error);
            
            let errorMessage = 'Sorry, I cannot connect to the server. ';
            
            if (error.code === 'ECONNABORTED') {
                errorMessage += 'The request timed out. Please check if the server is running.';
            } else if (error.response) {
                // Server responded with error
                errorMessage += `Server error: ${error.response.status}. ${error.response.data?.message || 'Please try again.'}`;
            } else if (error.request) {
                // Request made but no response
                errorMessage += 'No response from server. Please make sure the backend is running on http://localhost:5001';
            } else {
                errorMessage += error.message || 'Please check your connection and try again.';
            }
            
            setError(errorMessage);
            
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: errorMessage,
                sender: 'bot',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }
    };

    // Clear conversation
    const clearConversation = () => {
        if (window.confirm('Clear all messages?')) {
            setMessages([]);
            if (userName) {
                setMessages([{
                    id: Date.now(),
                    text: `Conversation cleared. How can I help you, **${userName}**?`,
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            } else {
                setShowNameInput(true);
            }
        }
    };

    // Reset user
    const resetUser = () => {
        localStorage.removeItem('hr_user_name');
        setUserName('');
        setShowNameInput(true);
        setMessages([]);
        setError(null);
    };

    return (
        <>
            {/* Chat Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-[#0f2b3d] text-white px-5 py-3 rounded-full shadow-lg hover:bg-[#1a3b4f] transition-all z-50 flex items-center gap-2 group"
                aria-label="Open HR Assistant"
            >
                <i className="fas fa-comment"></i>
                <span className="font-medium">HR Assist</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200" style={{ animation: 'slide-up 0.3s ease-out' }}>
                    
                    {/* Header */}
                    <div className="bg-[#0f2b3d] text-white px-5 py-4 flex justify-between items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-robot"></i>
                                <h3 className="font-semibold">HR Assistant</h3>
                            </div>
                            {userName && (
                                <p className="text-xs text-white/70 flex items-center gap-1 mt-1">
                                    <i className="fas fa-circle text-[6px] text-emerald-400"></i>
                                    Welcome, {userName}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={resetUser}
                                className="text-white/70 hover:text-white text-sm transition-colors"
                                title="Reset user"
                                aria-label="Reset user"
                            >
                                <i className="fas fa-user-slash"></i>
                            </button>
                            <button 
                                onClick={clearConversation}
                                className="text-white/70 hover:text-white text-sm transition-colors"
                                title="Clear chat"
                                aria-label="Clear chat"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-white/70 hover:text-white text-xl leading-5 transition-colors"
                                aria-label="Close chat"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                        {messages.length === 0 && !showNameInput && (
                            <div className="text-center text-gray-400 py-8">
                                <i className="fas fa-comments text-4xl mb-2"></i>
                                <p className="text-sm">Ask me anything about HR policies!</p>
                            </div>
                        )}
                        
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                style={{ animation: 'fade-in 0.3s ease-out' }}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                                        msg.sender === 'user'
                                            ? 'bg-[#0f2b3d] text-white rounded-br-none'
                                            : 'bg-white text-gray-700 rounded-bl-none border border-gray-100 shadow-sm'
                                    }`}
                                >
                                    {msg.sender === 'bot' ? (
                                        <div 
                                            className="text-sm leading-relaxed message-bubble prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                                        />
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                    )}
                                    <p className={`text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-white/50' : 'text-gray-400'}`}>
                                        {msg.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex justify-start" style={{ animation: 'fade-in 0.3s ease-out' }}>
                                <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 border border-gray-100">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Error Message */}
                        {error && !isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-red-50 text-red-600 rounded-2xl px-4 py-2 text-sm border border-red-200">
                                    <i className="fas fa-exclamation-triangle mr-2"></i>
                                    {error}
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-gray-200 pl-4 pr-2 py-2 focus-within:border-[#0f2b3d]/30 focus-within:ring-2 focus-within:ring-[#0f2b3d]/5 transition-all">
                            <textarea
                                rows="1"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder={showNameInput ? "Enter your name..." : "Ask about attendance, leave, policies..."}
                                className="flex-1 bg-transparent border-0 outline-none resize-none max-h-28 py-2 text-sm text-gray-700 placeholder-gray-400"
                                disabled={isTyping}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isTyping}
                                className="w-9 h-9 bg-[#0f2b3d] hover:bg-[#1a3b4f] text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Send message"
                            >
                                <i className="fas fa-paper-plane text-xs"></i>
                            </button>
                        </div>
                        <div className="flex justify-between mt-2 px-1">
                            <div className="text-[10px] text-gray-400">
                                <i className="far fa-clock mr-1"></i>
                                {isTyping ? 'Assistant is typing...' : 'Ready to help'}
                            </div>
                            <div className="text-[10px] text-gray-400 flex gap-2">
                                <span>Shift+Enter ↵ new line</span>
                                <span>Esc to close</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add styles to head using useEffect instead of style jsx */}
            <style>{`
                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-4px);
                    }
                }
                
                .animate-bounce {
                    animation: bounce 1s infinite;
                }
                
                .message-bubble a {
                    word-break: break-all;
                }
                
                .message-bubble code {
                    background-color: #f3f4f6;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                }
            `}</style>
        </>
    );
};

export default HRChatbot;