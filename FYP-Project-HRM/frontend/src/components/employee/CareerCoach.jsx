// CareerCoach.jsx - FIXED with working sidebar
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const CareerCoach = () => {
  const { currentUser, getToken, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState({
    recommendations: false,
    chat: false,
    skills: false,
    interview: false,
    institutes: false
  });

  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [inDemandSkills, setInDemandSkills] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(true);

  // ─── SIDEBAR STATE ───────────────────────────────────────────────────────────
  const [sidebarContent, setSidebarContent] = useState({
    type: null,
    data: null,
    title: null,
    isLoading: false
  });

  // ─── INTERVIEW LEARNING STATE ────────────────────────────────────────────────
  const [domains] = useState([
    'Web Development', 'Data Science', 'AI/ML', 'Cloud Computing',
    'DevOps', 'Python', 'JavaScript', 'React', 'Database', 'MERN Stack'
  ]);
  const [selectedDomain, setSelectedDomain] = useState('Web Development');
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questionLimit, setQuestionLimit] = useState(5);

  // ─── TRAINING INSTITUTES STATE ───────────────────────────────────────────────
  const [institutes, setInstitutes] = useState([]);

  const chatEndRef = useRef(null);
  const API_BASE_URL = 'http://127.0.0.1:5001/api';

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    withCredentials: true,
    timeout: 15000
  });

  api.interceptors.request.use((config) => {
    const authToken = getToken();
    if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => { setServerAvailable(true); return response; },
    (error) => {
      if (error.code === 'ERR_NETWORK') {
        setServerAvailable(false);
        setError('Cannot connect to backend server.');
      }
      return Promise.reject(error);
    }
  );

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [chatMessages]);
  useEffect(() => { if (!authLoading) loadAllData(); }, [authLoading]);

  // ─── DATA LOADERS ────────────────────────────────────────────────────────────
  const loadAllData = async () => {
    setDataLoaded(false);
    await Promise.allSettled([
      loadRecommendations(),
      loadChatHistory(),
      loadInDemandSkills(),
      loadInstitutes()
    ]);
    setDataLoaded(true);
  };

  const loadRecommendations = async () => {
    setLoading(prev => ({ ...prev, recommendations: true }));
    try {
      const response = await api.get('/career/recommendations');
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(prev => ({ ...prev, recommendations: false }));
    }
  };

  const loadInDemandSkills = async () => {
    setLoading(prev => ({ ...prev, skills: true }));
    try {
      const response = await api.get('/career/skills');
      setInDemandSkills(response.data.skills || []);
    } catch (err) {
      console.error('Error loading skills:', err);
      setInDemandSkills([]);
    } finally {
      setLoading(prev => ({ ...prev, skills: false }));
    }
  };

  const loadInstitutes = async () => {
    setLoading(prev => ({ ...prev, institutes: true }));
    try {
      const response = await api.get('/career/institutes');
      setInstitutes(response.data.institutes || []);
    } catch (err) {
      console.error('Error loading institutes:', err);
      setInstitutes([]);
    } finally {
      setLoading(prev => ({ ...prev, institutes: false }));
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await api.get('/career-chat/history');
      if (response.data.messages?.length > 0) {
        setChatMessages(response.data.messages);
      } else {
        setChatMessages([{
          id: Date.now(),
          sender: 'ai',
          text: "👋 Hi! I'm your AI Career Coach. Ask me about careers, skills, roadmaps, or interview preparation!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      setChatMessages([{
        id: Date.now(),
        sender: 'ai',
        text: "👋 Hi! I'm your AI Career Coach. Ask me about careers in Pakistan's tech industry!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  // ─── CHAT SEND (FIXED) ───────────────────────────────────────────────────────
  const handleChatSend = async (overrideMessage) => {
    const messageToSend = overrideMessage || chatInput;
    if (!messageToSend.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: messageToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMessage]);
    if (!overrideMessage) setChatInput('');

    setLoading(prev => ({ ...prev, chat: true }));
    setSidebarContent({ type: 'loading', data: null, title: 'Loading...', isLoading: true });

    try {
      const response = await api.post('/career-chat/send', { message: messageToSend });
      console.log('API RESPONSE:', response.data);

      const res = response.data;
      // intent and data are TOP-LEVEL fields on the response object
      const intent = res.intent;
      const data = res.data || {};

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: res.ai_response?.text || "I'm here to help!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMessage]);

      // ── Helper: show loader briefly, then reveal content ────────────────────
      const showWithDelay = (contentObj, delay = 1000) => {
        setSidebarContent({ type: 'loading', data: null, title: null, isLoading: true });
        setTimeout(() => setSidebarContent({ ...contentObj, isLoading: false }), delay);
      };

      // ── INTENT → SIDEBAR MAPPING (use intent as sole discriminator) ──────────
      if (intent === 'show_recommendations') {
        const recs = data.recommendations;
        showWithDelay({
          type: 'recommendations',
          data: Array.isArray(recs) ? recs : [],
          title: '🎯 Recommended Career Paths',
        });
      } else if (intent === 'show_skills') {
        showWithDelay({
          type: 'skills',
          data: data,
          title: `💡 Skills for ${data.domain || 'Tech Industry'}`,
        });
      } else if (intent === 'show_roadmap') {
        showWithDelay({
          type: 'roadmap',
          data: data,
          title: `🗺️ Roadmap: ${data.career ? data.career.charAt(0).toUpperCase() + data.career.slice(1) : 'Learning Path'}`,
        });
      } else if (intent === 'show_resume') {
        showWithDelay({
          type: 'resume',
          data: data,
          title: '📄 Resume Tips for Pakistani Job Market',
        });
      } else if (intent === 'show_salary') {
        showWithDelay({
          type: 'salary',
          data: data,
          title: '💰 Salary Guide - Pakistan Tech Industry',
        });
      } else if (intent === 'show_freelancing') {
        showWithDelay({
          type: 'freelancing',
          data: data,
          title: '💼 Freelancing Guide for Pakistan',
        });
      } else if (intent === 'show_interview') {
        showWithDelay({
          type: 'interview',
          data: data,
          title: '🎯 Interview Preparation Tips',
        });
      } else {
        // fallback / roadmap_prompt / welcome — clear sidebar
        setSidebarContent({ type: null, data: null, title: null, isLoading: false });
      }

    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: "Sorry, I'm having trouble connecting. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setSidebarContent({ type: null, data: null, title: null, isLoading: false });
    } finally {
      setLoading(prev => ({ ...prev, chat: false }));
    }
  };

  // ─── INTERVIEW QUESTIONS ─────────────────────────────────────────────────────
  const loadInterviewQuestions = async () => {
    setLoading(prev => ({ ...prev, interview: true }));
    try {
      const response = await api.get(
        `/career/interview-questions?domain=${encodeURIComponent(selectedDomain)}&limit=${questionLimit}`
      );
      setInterviewQuestions(response.data.questions || []);
      setCurrentQuestionIndex(0);
      setShowAnswer(false);
    } catch (err) {
      console.error('Error loading questions:', err);
      setInterviewQuestions([]);
    } finally {
      setLoading(prev => ({ ...prev, interview: false }));
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < interviewQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowAnswer(false);
    }
  };

  // ─── FORMAT CHAT TEXT ─────────────────────────────────────────────────────────
  const formatMessageText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className="font-bold text-lg mt-2 mb-1 text-purple-700">{line.replace(/\*\*/g, '')}</h4>;
      } else if (line.startsWith('•') || line.startsWith('-')) {
        return <li key={i} className="text-sm ml-4 text-gray-700">{line.substring(1).trim()}</li>;
      } else if (line.match(/^\d+\./)) {
        return <p key={i} className="text-sm font-semibold mt-2 text-gray-800">{line}</p>;
      } else {
        return <p key={i} className="text-sm mb-1 text-gray-600">{line}</p>;
      }
    });
  };

  // ─── SIDEBAR CLOSE ────────────────────────────────────────────────────────────
  const closeSidebar = () =>
    setSidebarContent({ type: null, data: null, title: null, isLoading: false });

  // ─── RENDER SIDEBAR ───────────────────────────────────────────────────────────
  const renderSidebarContent = () => {
    // Loading
    if (sidebarContent.isLoading) {
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            {[0, 0.15, 0.3].map((delay, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ width: '70%' }} />
          </div>
          <p className="text-gray-500 text-sm">Preparing results...</p>
        </div>
      );
    }

    // Empty / welcome state
    if (!sidebarContent.type) {
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center hover:shadow-xl transition-all duration-300">
          <div className="text-6xl mb-4 animate-pulse">💬</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Ask me about careers!</h3>
          <p className="text-gray-500 text-sm">Type your question in the chat box.</p>
        </div>
      );
    }

    // ── Career Recommendations ─────────────────────────────────────────────────
    if (sidebarContent.type === 'recommendations') {
      const recs = Array.isArray(sidebarContent.data) ? sidebarContent.data : [];
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {sidebarContent.title}
            </h2>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          {recs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No career paths loaded yet.</p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {recs.map((path, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{path.title}</h3>
                    {path.confidence && (
                      <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                        {path.confidence}% Match
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{path.description}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {path.timeline && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        ⏱️ {path.timeline}
                      </span>
                    )}
                    {path.salary_range && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        💰 {path.salary_range}
                      </span>
                    )}
                  </div>
                  {path.companies && (
                    <p className="text-xs text-gray-500 mb-3">🏢 {path.companies}</p>
                  )}
                  <button
                    onClick={() => handleChatSend(`Show me roadmap for ${path.title}`)}
                    className="w-full py-2 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-all duration-300"
                  >
                    📍 View Learning Roadmap →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Skills ─────────────────────────────────────────────────────────────────
    if (sidebarContent.type === 'skills') {
      const raw = sidebarContent.data?.skills;
      const skillsList = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
        ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {sidebarContent.title}
            </h2>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          {skillsList.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No skills data found.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4 max-h-[400px] overflow-y-auto">
              {skillsList.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full text-sm font-medium hover:scale-105 transition-transform duration-200 cursor-pointer"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => handleChatSend(`Show me roadmap for ${sidebarContent.data?.domain || 'Web Development'}`)}
            className="w-full py-2 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-all duration-300"
          >
            📍 View Learning Roadmap →
          </button>
        </div>
      );
    }

    // ── Roadmap ────────────────────────────────────────────────────────────────
    if (sidebarContent.type === 'roadmap') {
      const roadmap = sidebarContent.data?.roadmap || {};
      const steps = Array.isArray(roadmap.steps) ? roadmap.steps : [];
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {sidebarContent.title}
            </h2>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <p className="text-sm">
                <span className="font-semibold">⏱️ Duration:</span>{' '}
                {roadmap.duration || '6-8 months'}
              </p>
            </div>
            <h4 className="font-semibold text-gray-800 mt-3">📚 Learning Path:</h4>
            {steps.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-2">No steps found for this roadmap.</p>
            ) : (
              steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-300"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center text-xs font-bold shadow-md flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-700 flex-1">{step}</p>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // ── Resume Tips ────────────────────────────────────────────────────────────
    if (sidebarContent.type === 'resume') {
      const tips = Array.isArray(sidebarContent.data?.tips)
        ? sidebarContent.data.tips
        : typeof sidebarContent.data?.tips === 'string'
        ? sidebarContent.data.tips.split('\n').filter(Boolean)
        : [];
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {sidebarContent.title}
            </h2>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {tips.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No resume tips loaded.</p>
            ) : (
              tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-green-50 transition-all duration-300"
                >
                  <span className="text-green-500 text-lg flex-shrink-0">✅</span>
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // ── Salary Guide ───────────────────────────────────────────────────────────
    if (sidebarContent.type === 'salary') {
      const salaryData = sidebarContent.data?.salary || sidebarContent.data || {};
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {sidebarContent.title}
            </h2>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <p className="text-sm">
                <span className="font-semibold">💰 Salary Range:</span>{' '}
                {salaryData.salary_range || 'Rs. 150,000 – 350,000'}
              </p>
              <p className="text-sm mt-2">
                <span className="font-semibold">📈 Demand:</span>{' '}
                <span className="text-green-600">{salaryData.demand || 'High'}</span>
              </p>
              <p className="text-sm mt-2">
                <span className="font-semibold">🚀 Growth Rate:</span>{' '}
                {salaryData.growth_rate || '25%'}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">🏢 Top Companies:</p>
              <div className="flex flex-wrap gap-2">
                {(salaryData.companies || ['Systems Limited', 'Techlogix', 'Afiniti']).map((company, i) => (
                  <span key={i} className="px-2 py-1 bg-white rounded-full text-xs text-gray-600 shadow-sm">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Freelancing Guide ──────────────────────────────────────────────────────
    if (sidebarContent.type === 'freelancing') {
      const guide = sidebarContent.data?.guide || '';
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {sidebarContent.title}
            </h2>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-[500px] overflow-y-auto">
            {guide ? guide.substring(0, 1500) + (guide.length > 1500 ? '...' : '') : 'No guide loaded.'}
          </div>
        </div>
      );
    }

    // ── Interview Tips ─────────────────────────────────────────────────────────
    if (sidebarContent.type === 'interview') {
      const raw = sidebarContent.data?.tips;
      const tips = typeof raw === 'string'
        ? raw.split('\n').filter(Boolean)
        : Array.isArray(raw)
        ? raw
        : [];
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {sidebarContent.title}
            </h2>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {tips.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No interview tips loaded.</p>
            ) : (
              tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-purple-50 transition-all duration-300"
                >
                  <span className="text-purple-500 text-lg flex-shrink-0">🎯</span>
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── LOADING SCREEN ───────────────────────────────────────────────────────────
  if (authLoading || !dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your career coach...</p>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>

      <div className="min-h-screen py-6 bg-gradient-to-br from-purple-50 via-white to-pink-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Banners */}
          {!serverAvailable && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              ⚠️ Cannot connect to backend server. Please make sure Flask server is running on port 5001.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Header & Tabs */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  AI Career Coach — Pakistan
                </h1>
                <p className="mt-2 text-gray-600">Personalized career guidance for Pakistan's tech industry</p>
              </div>
              <button
                onClick={loadAllData}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow-md"
              >
                Refresh Data
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mt-6 border-b border-gray-200">
              {[
                { id: 'overview',   label: '📊 Overview' },
                { id: 'skills',     label: '💡 Skills & Future' },
                { id: 'interview',  label: '🎯 Interview Learning' },
                { id: 'institutes', label: '🏫 Training Institutes' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'interview') loadInterviewQuestions();
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Chat Section ──────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                {/* Chat header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      🇵🇰
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Pakistan Career Coach AI</h3>
                      <p className="text-xs text-gray-600">Specialized in Pakistan's tech market</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 h-96 overflow-y-auto bg-gray-50">
                  <div className="space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 transition-all duration-300 ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none shadow-md'
                              : 'bg-white text-gray-900 rounded-bl-none shadow-sm hover:shadow-md'
                          }`}
                        >
                          {msg.sender === 'ai' ? (
                            <div className="text-sm">{formatMessageText(msg.text)}</div>
                          ) : (
                            <p className="text-sm">{msg.text}</p>
                          )}
                          <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {loading.chat && (
                      <div className="flex justify-start animate-fadeIn">
                        <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                          <div className="flex space-x-1">
                            {[0, 0.1, 0.2].map((delay, i) => (
                              <div
                                key={i}
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: `${delay}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                      placeholder="Ask me about careers, skills, roadmaps, or interview preparation..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                      disabled={loading.chat}
                    />
                    <button
                      onClick={() => handleChatSend()}
                      disabled={loading.chat}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 hover:shadow-lg"
                    >
                      {loading.chat ? '...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Sidebar ─────────────────────────────────────────────── */}
            <div className="space-y-8">

              {/* Overview: chat-driven sidebar */}
              {activeTab === 'overview' && renderSidebarContent()}

              {/* Skills tab */}
              {activeTab === 'skills' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                    💡 In-Demand Skills for 2026+
                  </h2>
                  {inDemandSkills.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No skills data loaded.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-[500px] overflow-y-auto">
                      {inDemandSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full text-sm font-medium hover:scale-105 transition-all duration-200 cursor-pointer shadow-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Interview tab */}
              {activeTab === 'interview' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                    🎯 Interview Learning
                  </h2>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Domain:</label>
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                    >
                      {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Questions (3–10):
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="10"
                      value={questionLimit}
                      onChange={(e) => setQuestionLimit(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-center text-sm text-gray-600 mt-1">{questionLimit} questions</div>
                  </div>

                  <button
                    onClick={loadInterviewQuestions}
                    disabled={loading.interview}
                    className="w-full mb-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:from-purple-700 hover:to-pink-600 transition-all duration-300 hover:shadow-md"
                  >
                    {loading.interview ? 'Loading...' : 'Generate Questions'}
                  </button>

                  {loading.interview ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : interviewQuestions.length > 0 ? (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-purple-600 font-semibold">
                          Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={prevQuestion}
                            disabled={currentQuestionIndex === 0}
                            className="px-3 py-1 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-all duration-300 disabled:opacity-50"
                          >
                            Prev
                          </button>
                          <button
                            onClick={nextQuestion}
                            disabled={currentQuestionIndex === interviewQuestions.length - 1}
                            className="px-3 py-1 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-all duration-300 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                      <p className="font-medium text-gray-900 mb-3">
                        {interviewQuestions[currentQuestionIndex]?.question}
                      </p>
                      <button
                        onClick={() => setShowAnswer(!showAnswer)}
                        className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        🔍 {showAnswer ? 'Hide Answer' : 'Show Answer'}
                      </button>
                      {showAnswer && (
                        <p className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg text-sm animate-fadeIn">
                          {interviewQuestions[currentQuestionIndex]?.answer}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4 text-sm">
                      Select a domain and generate questions!
                    </p>
                  )}
                </div>
              )}

              {/* Institutes tab */}
              {activeTab === 'institutes' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                    🏫 Training Institutes
                  </h2>
                  {institutes.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No institutes data loaded.</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {institutes.map((inst, i) => (
                        <div
                          key={i}
                          className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 transition-all duration-300 hover:shadow-md"
                        >
                          <h3 className="font-bold text-gray-900">{inst.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">📜 {inst.certificates}</p>
                          <p className="text-xs text-gray-500">🎯 {inst.focus}</p>
                          <p className="text-xs text-gray-500">💰 {inst.cost}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* end sidebar column */}
          </div>
          {/* end grid */}
        </div>
      </div>
    </>
  );
};

export default CareerCoach;
