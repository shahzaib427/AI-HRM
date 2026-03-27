import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const CareerCoach = () => {
  const [loading, setLoading] = useState({
    profile: false,
    recommendations: false,
    skillGap: false,
    chat: false
  });
  
  const [error, setError] = useState(null);
  
  const [userProfile, setUserProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [skillGap, setSkillGap] = useState([]);
  const [marketData, setMarketData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "What's the salary for a Tech Lead in Lahore?",
    "How to become a Full Stack Developer?",
    "Best tech companies in Pakistan",
    "Skills needed for AI/ML career"
  ]);
  
  const chatEndRef = useRef(null);
  
  const API_BASE_URL = 'http://127.0.0.1:5001/api';

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: false,
    timeout: 15000
  });

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchUserProfile(),
        fetchRecommendations(),
        fetchChatHistory()
      ]);
    };
    
    loadInitialData();
  }, []);

  // Fetch skill gap when profile is loaded
  useEffect(() => {
    if (userProfile) {
      fetchSkillGap();
      fetchMarketInsights(userProfile.careerGoal);
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    setLoading(prev => ({ ...prev, profile: true }));
    setError(null);
    
    try {
      console.log('Fetching profile...');
      const response = await api.get('/profile');
      console.log('Profile response:', response.data);
      
      setUserProfile({
        currentRole: response.data.current_role,
        experience: response.data.experience_years,
        skills: response.data.skills || [],
        interests: response.data.interests || [],
        careerGoal: response.data.career_goal || 'Tech Lead',
        timeline: response.data.timeline || '2 years',
        location: response.data.location || 'Lahore',
        currentSalary: response.data.current_salary || 'Rs. 200,000'
      });
      
    } catch (err) {
      console.error('Error fetching profile:', err.message);
      setError('Failed to load profile. Please check if the server is running.');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const fetchRecommendations = async () => {
    setLoading(prev => ({ ...prev, recommendations: true }));
    
    try {
      console.log('Fetching recommendations...');
      const response = await api.get('/career/recommendations');
      console.log('Recommendations response:', response.data);
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err.message);
    } finally {
      setLoading(prev => ({ ...prev, recommendations: false }));
    }
  };

  const fetchSkillGap = async () => {
    if (!userProfile) return;
    
    setLoading(prev => ({ ...prev, skillGap: true }));
    
    try {
      console.log('Fetching skill gap...');
      const response = await api.post('/career/analyze-skill-gap', {
        target_role: userProfile.careerGoal,
        skills: userProfile.skills
      });
      console.log('Skill gap response:', response.data);
      setSkillGap(response.data.skill_gaps || []);
    } catch (err) {
      console.error('Error fetching skill gap:', err.message);
    } finally {
      setLoading(prev => ({ ...prev, skillGap: false }));
    }
  };

  const fetchMarketInsights = async (role) => {
    try {
      console.log('Fetching market insights for:', role);
      const response = await api.get(`/career/market-insights/${encodeURIComponent(role)}`);
      console.log('Market insights response:', response.data);
      
      setMarketData({
        salary: response.data.salary_range || 'Information not available',
        demand: response.data.demand || 'Unknown',
        growth: response.data.growth_rate || 'Unknown',
        companies: response.data.companies || []
      });
    } catch (err) {
      console.error('Error fetching market insights:', err.message);
    }
  };

  const fetchChatHistory = async () => {
    try {
      console.log('Fetching chat history...');
      const response = await api.get('/chat/history');
      console.log('Chat history response:', response.data);
      
      const messages = response.data.messages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp,
        time: new Date(msg.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
      
      setChatMessages(messages);
    } catch (err) {
      console.error('Error fetching chat history:', err.message);
      setChatMessages([{
        id: 1,
        sender: 'ai',
        text: "👋 Hi! I'm your AI Career Coach for Pakistan's tech industry. I can help you with salaries, career paths, skills, interviews, and company information. What would you like to know?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setLoading(prev => ({ ...prev, chat: true }));
    
    try {
      console.log('Sending chat message:', chatInput);
      const response = await api.post('/chat/send', { message: chatInput });
      console.log('Chat response:', response.data);
      
      const aiResponse = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response.data.ai_response.text,
        timestamp: response.data.ai_response.timestamp,
        time: new Date(response.data.ai_response.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setError(null);
      
      // Update suggested questions based on context
      updateSuggestedQuestions(chatInput);
      
    } catch (err) {
      console.error('Error sending message:', err.message);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, chat: false }));
    }
  };

  const updateSuggestedQuestions = (lastQuestion) => {
    // Dynamic suggested questions based on context
    const lowerQuestion = lastQuestion.toLowerCase();
    
    if (lowerQuestion.includes('salary') || lowerQuestion.includes('pay')) {
      setSuggestedQuestions([
        "What's the salary for a Senior Software Engineer?",
        "How much do Tech Leads earn in Karachi?",
        "Salary comparison: Product vs Service companies",
        "Entry level salaries in Pakistan"
      ]);
    } else if (lowerQuestion.includes('skill') || lowerQuestion.includes('learn')) {
      setSuggestedQuestions([
        "What skills are in highest demand?",
        "How to learn System Design?",
        "Best resources for learning Cloud Computing",
        "Which programming language should I learn?"
      ]);
    } else if (lowerQuestion.includes('company') || lowerQuestion.includes('job')) {
      setSuggestedQuestions([
        "Top tech companies in Lahore",
        "How to get a job at Systems Limited?",
        "Remote work opportunities in Pakistan",
        "Which companies pay the most?"
      ]);
    } else if (lowerQuestion.includes('interview')) {
      setSuggestedQuestions([
        "How to prepare for coding interviews?",
        "Common system design interview questions",
        "Behavioral interview tips",
        "Interview process at Afiniti"
      ]);
    } else {
      setSuggestedQuestions([
        "What's the salary for a Tech Lead?",
        "How to become a Full Stack Developer?",
        "Best tech companies in Pakistan",
        "Skills needed for AI/ML career"
      ]);
    }
  };

  // Format RAG response with better markdown-like rendering
  const formatMessageText = (text) => {
    // Split by double newlines for paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((para, idx) => {
      // Check if it's a header (starts with ## or **)
      if (para.startsWith('##') || para.startsWith('**') && para.endsWith('**')) {
        return <h4 key={idx} className="font-bold text-lg mt-2 mb-1">{para.replace(/[#*]/g, '')}</h4>;
      }
      // Check if it's a bullet point list
      else if (para.includes('\n•') || para.includes('\n-')) {
        const items = para.split('\n');
        return (
          <ul key={idx} className="list-disc pl-5 mt-1 mb-2 space-y-1">
            {items.map((item, i) => {
              if (item.startsWith('•') || item.startsWith('-')) {
                return <li key={i} className="text-sm">{item.substring(1).trim()}</li>;
              }
              return null;
            })}
          </ul>
        );
      }
      // Regular paragraph
      else {
        return <p key={idx} className="mb-2 text-sm leading-relaxed">{para}</p>;
      }
    });
  };

  // Loading state
  if (loading.profile && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50/30">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Make sure the Flask server is running on port 5000</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:from-purple-700 hover:to-pink-600"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Don't render main content until we have user profile
  if (!userProfile) return null;

  // Skill Gap Analysis Card
  const SkillGapCard = ({ skill }) => (
    <div className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors bg-white">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-900">{skill.skill}</h4>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          skill.importance === 'High' ? 'bg-red-100 text-red-800' :
          skill.importance === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {skill.importance}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Current: {skill.current}%</span>
          <span className="text-gray-600">Target: {skill.target}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
            style={{ width: `${skill.current}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500">
          Gap: {skill.target - skill.current}% to reach target
        </div>
      </div>
    </div>
  );

  // Career Path Card
  const CareerPathCard = ({ path }) => (
    <div className="p-5 rounded-xl border border-gray-200 hover:border-purple-300 transition-all duration-300 hover:scale-[1.02] bg-white shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{path.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{path.description}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-purple-600">{path.confidence}% Match</div>
          <div className="text-xs text-gray-500">Timeline: {path.timeline}</div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <h4 className="font-medium text-gray-900 text-sm">Next Steps:</h4>
        {path.steps && path.steps.length > 0 ? (
          <ul className="space-y-1">
            {path.steps.map((step, index) => (
              <li key={index} className="flex items-center text-sm text-gray-700">
                <span className="text-green-500 mr-2">✓</span>
                {step}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No specific steps available</p>
        )}
      </div>
      
      {path.salary_range && (
        <div className="mb-3 text-sm text-gray-600">
          <span className="font-medium">Expected Salary:</span> {path.salary_range}
        </div>
      )}
      
      <button className="w-full mt-3 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-lg transition-all duration-200 text-sm font-medium">
        View Detailed Plan
      </button>
    </div>
  );

  return (
    <div className="min-h-screen py-6 bg-gradient-to-br from-purple-50 via-white to-pink-50/30">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-200/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-pink-200/20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                AI Career Coach - Pakistan
              </h1>
              <p className="mt-2 text-gray-600">
                Personalized career guidance for Pakistan's tech industry, powered by AI
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                  {error}
                </div>
              )}
              <button 
                onClick={() => {
                  fetchUserProfile();
                  fetchRecommendations();
                  fetchChatHistory();
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Chat & Profile */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI Chat Assistant */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
                    🇵🇰
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Pakistan Career Coach AI</h3>
                    <p className="text-xs text-gray-600">Specialized in Pakistan's tech market</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 h-96 overflow-y-auto bg-gray-50">
                <div className="space-y-4">
                  <AnimatePresence>
                    {chatMessages.map(msg => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 ${
                          msg.sender === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none' 
                            : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
                        }`}>
                          {msg.sender === 'ai' ? (
                            <div className="prose prose-sm max-w-none">
                              {formatMessageText(msg.text)}
                            </div>
                          ) : (
                            <p className="text-sm">{msg.text}</p>
                          )}
                          <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                            {msg.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {loading.chat && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                    placeholder="Ask about Pakistani tech salaries, companies, careers..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={loading.chat}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={loading.chat}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loading.chat ? '...' : 'Send'}
                  </button>
                </div>
                
                {/* Suggested Questions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setChatInput(question)}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Career Path Recommendations */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recommended Career Paths</h2>
                {loading.recommendations && (
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map(path => (
                    <CareerPathCard key={path.id} path={path} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recommendations available. Try refreshing or updating your profile.
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Analysis */}
          <div className="space-y-8">
            {/* Skill Gap Analysis */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Skill Gap Analysis</h2>
                {skillGap.length > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                    {skillGap.filter(s => s.importance === 'High').length} high priority
                  </span>
                )}
              </div>
              
              {loading.skillGap ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : skillGap.length > 0 ? (
                <div className="space-y-4">
                  {skillGap.map((skill, index) => (
                    <SkillGapCard key={index} skill={skill} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No skill gap data available
                </div>
              )}
            </div>

            {/* Market Insights - Pakistan */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">🇵🇰 Pakistan Market Insights</h2>
              
              {marketData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-900">Target Role:</span>
                      <span className="font-bold text-green-900">{userProfile.careerGoal}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Monthly Salary:</span>
                        <span className="font-medium">{marketData.salary}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Demand:</span>
                        <span className={`font-medium ${
                          marketData.demand === 'Very High' ? 'text-green-600' : 
                          marketData.demand === 'High' ? 'text-green-500' :
                          marketData.demand === 'Medium' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {marketData.demand}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Growth Rate:</span>
                        <span className="font-medium">{marketData.growth}</span>
                      </div>
                    </div>
                  </div>
                  
                  {marketData.companies && marketData.companies.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-3">Top Pakistani Companies</h4>
                      <div className="flex flex-wrap gap-2">
                        {marketData.companies.map((company, index) => (
                          <span key={index} className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-medium">
                            {company}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Loading market insights...
                </div>
              )}
            </div>

            {/* Profile Summary */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Your Profile</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Role:</span>
                  <span className="font-medium text-gray-900">{userProfile.currentRole}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Experience:</span>
                  <span className="font-medium text-gray-900">{userProfile.experience} years</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-gray-900">{userProfile.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Career Goal:</span>
                  <span className="font-medium text-gray-900">{userProfile.careerGoal}</span>
                </div>
                <div className="pt-3">
                  <span className="text-gray-600 block mb-2">Top Skills:</span>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.skills.slice(0, 4).map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                    {userProfile.skills.length > 4 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        +{userProfile.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <button className="w-full mt-4 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium">
                Update Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerCoach;