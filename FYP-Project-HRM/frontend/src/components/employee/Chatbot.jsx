import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * HRChatbot.jsx — COMPLETE UPDATED FILE
 * =======================================
 * All original UI code preserved exactly.
 * Only sendMessage() is updated to forward the JWT token.
 *
 * Props:
 *   isLoggedIn       {boolean}   – pass true when the user is authenticated
 *   onLoginRedirect  {function}  – optional callback when "Login" button is clicked
 */
const HRChatbot = ({ isLoggedIn = false, onLoginRedirect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [userName, setUserName] = useState('');
    const [showNameInput, setShowNameInput] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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

    // When chat opens, decide what to show
    useEffect(() => {
        if (!isOpen) return;

        if (!isLoggedIn) {
            setShowLoginPrompt(true);
            return;
        }

        setShowLoginPrompt(false);

        if (messages.length === 0) {
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
    }, [isOpen, isLoggedIn, userName, messages.length]);

    // If user logs out while chat is open, show login prompt
    useEffect(() => {
        if (isOpen && !isLoggedIn) {
            setShowLoginPrompt(true);
        } else if (isOpen && isLoggedIn) {
            setShowLoginPrompt(false);
        }
    }, [isLoggedIn, isOpen]);

    const handleToggle = () => {
        if (!isLoggedIn && !isOpen) {
            setIsOpen(true);
            return;
        }
        setIsOpen(prev => !prev);
    };

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape' && isOpen) setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen]);

    const formatMessage = (text) => {
        if (!text) return '';
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/^[•\-*]\s+(.*?)$/gm, '• $1<br>');
        formatted = formatted.replace(/^\d+\.\s+(.*?)$/gm, '<span class="list-decimal ml-4">$&</span>');
        formatted = formatted.replace(/\n\n/g, '<br><br>');
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">$1</a>');
        formatted = formatted.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="text-blue-600 hover:underline">$1</a>');
        formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
        return formatted;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // sendMessage — UPDATED
    // Only change from original: reads JWT token from localStorage and adds
    // Authorization header to the axios call so Flask can forward it to MERN.
    // Everything else (UI state, error handling, name flow) is identical.
    // ─────────────────────────────────────────────────────────────────────────
    const sendMessage = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        const userMessage = trimmedInput;
        setInput('');
        setError(null);

        const userMessageObj = {
            id: Date.now(),
            text: userMessage,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMessageObj]);

        // Name collection flow — unchanged
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

        setIsTyping(true);
        try {
            // ── UPDATED: Read JWT token and add Authorization header ──────────
            // Check what key YOUR MERN auth saves the token under.
            // Open Chrome DevTools → Application → Local Storage after login
            // and look for the key that holds a long "eyJ..." string.
            const token = localStorage.getItem('token')
                       || localStorage.getItem('authToken')
                       || localStorage.getItem('jwt')
                       || localStorage.getItem('accessToken')
                       || null;
            // ─────────────────────────────────────────────────────────────────

            const response = await axios.post(
                'http://localhost:5001/api/chat/send',
                {
                    message: userMessage,
                    user_name: userName,
                    session_id: localStorage.getItem('session_id')
                },
                {
                    // ── UPDATED: attach token if it exists ────────────────────
                    // If no token (user not logged in), the chatbot still works
                    // in RAG-only mode (policy questions from documents).
                    // If token exists, Flask forwards it to MERN so the bot can
                    // also fetch personal data (attendance, leaves, payroll).
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                    // ─────────────────────────────────────────────────────────
                }
            );

            setIsTyping(false);
            const botMessage = {
                id: Date.now(),
                text: response.data.answer || "I'm sorry, I couldn't generate a response. Please try again.",
                sender: 'bot',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMessage]);
            if (response.data.session_id) {
                localStorage.setItem('session_id', response.data.session_id);
            }
        } catch (error) {
            setIsTyping(false);
            let errorMessage = 'Sorry, I cannot connect to the server. ';
            if (error.code === 'ECONNABORTED') {
                errorMessage += 'The request timed out.';
            } else if (error.response) {
                errorMessage += `Server error: ${error.response.status}.`;
            } else if (error.request) {
                errorMessage += 'No response from server. Please make sure the backend is running.';
            } else {
                errorMessage += error.message || 'Please check your connection.';
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

    const resetUser = () => {
        localStorage.removeItem('hr_user_name');
        setUserName('');
        setShowNameInput(true);
        setMessages([]);
        setError(null);
    };

    const handleLoginClick = () => {
        setIsOpen(false);
        if (onLoginRedirect) {
            onLoginRedirect();
        }
    };

    // ─── Login Gate Panel ────────────────────────────────────────────────────
    const LoginPromptPanel = () => (
        <div
            style={{
                position: 'fixed',
                bottom: '80px',
                right: '24px',
                zIndex: 9998,
                animation: 'slide-up 0.3s ease-out'
            }}
            className="w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        >
            {/* Header */}
            <div className="bg-[#0f2b3d] text-white px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-7 13H7v-2h6v2zm3-4H7V9h9v2z"/>
                    </svg>
                    <h3 className="font-semibold text-sm">HR Assistant</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/70 hover:text-white text-xl leading-5 transition-colors"
                    aria-label="Close chat"
                >
                    ×
                </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#0f2b3d]/8 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0f2b3d" strokeWidth={1.8}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                </div>

                <div>
                    <p className="font-semibold text-gray-800 text-base">Login Required</p>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Please log in to your account to access the HR Assistant.
                    </p>
                </div>

                <button
                    onClick={handleLoginClick}
                    className="w-full py-2.5 bg-[#0f2b3d] hover:bg-[#1a3b4f] active:scale-95 text-white text-sm font-medium rounded-xl transition-all"
                >
                    Go to Login
                </button>

                <p className="text-xs text-gray-400">
                    Don't have an account?{' '}
                    <button
                        onClick={handleLoginClick}
                        className="text-[#0f2b3d] hover:underline font-medium"
                    >
                        Contact HR
                    </button>
                </p>
            </div>
        </div>
    );

    return (
        <>
            {/* Chat Toggle Button */}
            <button
                onClick={handleToggle}
                style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
                className="w-11 h-11 bg-[#0f2b3d] text-white rounded-full shadow-lg hover:bg-[#1a3b4f] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                aria-label="Open HR Assistant"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-7 13H7v-2h6v2zm3-4H7V9h9v2z"/>
                    </svg>
                )}
                {!isOpen && (
                    <span
                        style={{ position: 'absolute', top: '2px', right: '2px', width: '10px', height: '10px', zIndex: 10000 }}
                        className={`${isLoggedIn ? 'bg-green-500' : 'bg-amber-400'} rounded-full border-2 border-[#0f2b3d]`}
                    ></span>
                )}
            </button>

            {/* Show login prompt OR full chat window */}
            {isOpen && (
                showLoginPrompt ? (
                    <LoginPromptPanel />
                ) : (
                    <div
                        style={{ position: 'fixed', bottom: '80px', right: '24px', zIndex: 9998, maxHeight: 'calc(100vh - 100px)', animation: 'slide-up 0.3s ease-out' }}
                        className="w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
                    >
                        {/* Header */}
                        <div className="bg-[#0f2b3d] text-white px-5 py-4 flex justify-between items-center">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-7 13H7v-2h6v2zm3-4H7V9h9v2z"/>
                                    </svg>
                                    <h3 className="font-semibold text-sm">HR Assistant</h3>
                                </div>
                                {userName && (
                                    <p className="text-xs text-white/70 flex items-center gap-1 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                                        Welcome, {userName}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={resetUser} className="text-white/70 hover:text-white text-sm transition-colors" title="Reset user" aria-label="Reset user">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18l4 4M18 22l4-4" />
                                    </svg>
                                </button>
                                <button onClick={clearConversation} className="text-white/70 hover:text-white text-sm transition-colors" title="Clear chat" aria-label="Clear chat">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                    </svg>
                                </button>
                                <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white text-xl leading-5 transition-colors" aria-label="Close chat">
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                            {messages.length === 0 && !showNameInput && (
                                <div className="text-center text-gray-400 py-8">
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

                            {error && !isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-red-50 text-red-600 rounded-2xl px-4 py-2 text-sm border border-red-200">
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
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                                <div className="text-[10px] text-gray-400">
                                    {isTyping ? 'Assistant is typing...' : 'Ready to help'}
                                </div>
                                <div className="text-[10px] text-gray-400 flex gap-2">
                                    <span>Shift+Enter ↵ new line</span>
                                    <span>Esc to close</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

            <style>{`
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-4px); }
                }
                .animate-bounce { animation: bounce 1s infinite; }
                .message-bubble a { word-break: break-all; }
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