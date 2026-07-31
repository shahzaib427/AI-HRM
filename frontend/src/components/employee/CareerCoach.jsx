// CareerCoach.jsx - FIXED: sidebar data extraction + auto-switch to overview tab
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  Briefcase, TrendingUp, Sparkles, MessageCircle, Send,
  ChevronRight, ChevronLeft, X, AlertCircle, RefreshCw,
  BookOpen, Target, Award, GraduationCap, Brain,
  Zap, Star, Clock, DollarSign, Building2, Users,
  Lightbulb, FileText, BarChart3, Globe, Shield,
  ChevronDown, ChevronUp, Play, CheckCircle, Loader2
} from 'lucide-react';

// ── Badge Component ──
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    pink: 'bg-pink-100 text-pink-700',
    orange: 'bg-orange-100 text-orange-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// ── KPI Card ──
const KpiCard = ({ title, value, icon, color, subtitle, onClick }) => {
  const colors = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    purple: 'bg-purple-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
    red: 'bg-red-500', rose: 'bg-rose-500', amber: 'bg-amber-500',
    cyan: 'bg-cyan-500', violet: 'bg-violet-500', pink: 'bg-pink-500'
  };
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ── Sidebar Content Components ──

const RecommendationsContent = ({ data, title, onClose, onAction }) => {
  const recs = Array.isArray(data) ? data : [];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" /> {title}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      {recs.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No career paths loaded yet.</p>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {recs.map((path, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-base text-gray-900">{path.title}</h3>
                {path.confidence && (
                  <Badge variant="purple">{path.confidence}% Match</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{path.description}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {path.timeline && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {path.timeline}
                  </span>
                )}
                {path.salary_range && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> {path.salary_range}
                  </span>
                )}
              </div>
              {path.companies && (
                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {path.companies}
                </p>
              )}
              <button
                onClick={() => onAction(`Show me roadmap for ${path.title}`)}
                className="w-full py-2 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" /> View Learning Roadmap →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SkillsContent = ({ data, title, onClose, onAction }) => {
  const raw = data?.skills;
  const skillsList = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-purple-600" /> {title}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      {skillsList.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No skills data found.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          {skillsList.map((skill, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full text-sm font-medium hover:scale-105 transition-transform duration-200 cursor-pointer shadow-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={() => onAction(`Show me roadmap for ${data?.domain || 'Web Development'}`)}
        className="w-full py-2 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <BookOpen className="w-4 h-4" /> View Learning Roadmap →
      </button>
    </div>
  );
};

const RoadmapContent = ({ data, title, onClose }) => {
  const roadmap = data?.roadmap || {};
  const steps = Array.isArray(roadmap.steps) ? roadmap.steps : [];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" /> {title}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600" />
          <p className="text-sm">
            <span className="font-semibold">Duration:</span>{' '}
            {roadmap.duration || '6-8 months'}
          </p>
        </div>
        <h4 className="font-semibold text-gray-800 mt-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-600" /> Learning Path:
        </h4>
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
};

const ResumeContent = ({ data, title, onClose }) => {
  const tips = Array.isArray(data?.tips)
    ? data.tips
    : typeof data?.tips === 'string'
    ? data.tips.split('\n').filter(Boolean)
    : [];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" /> {title}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {tips.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No resume tips loaded.</p>
        ) : (
          tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-green-50 transition-all duration-300"
            >
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm text-gray-700">{tip}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SalaryContent = ({ data, title, onClose }) => {
  const salaryData = data?.salary || data || {};
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-purple-600" /> {title}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
          <p className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-semibold">Salary Range:</span>{' '}
            {salaryData.salary_range || 'Rs. 150,000 – 350,000'}
          </p>
          <p className="text-sm mt-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-semibold">Demand:</span>{' '}
            <Badge variant="success">{salaryData.demand || 'High'}</Badge>
          </p>
          <p className="text-sm mt-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="font-semibold">Growth Rate:</span>{' '}
            {salaryData.growth_rate || '25%'}
          </p>
        </div>
        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> Top Companies:
          </p>
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
};

const FreelancingContent = ({ data, title, onClose }) => {
  const guide = data?.guide || '';
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-600" /> {title}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
        {guide ? guide.substring(0, 1500) + (guide.length > 1500 ? '...' : '') : 'No guide loaded.'}
      </div>
    </div>
  );
};

const InterviewContent = ({ data, title, onClose }) => {
  const raw = data?.tips;
  const tips = typeof raw === 'string'
    ? raw.split('\n').filter(Boolean)
    : Array.isArray(raw)
    ? raw
    : [];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" /> {title}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {tips.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No interview tips loaded.</p>
        ) : (
          tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-purple-50 transition-all duration-300"
            >
              <Target className="w-5 h-5 text-purple-500 flex-shrink-0" />
              <p className="text-sm text-gray-700">{tip}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Loading Skeleton ──
const SidebarSkeleton = () => (
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

// ── Welcome Sidebar ──
const WelcomeSidebar = ({ onAction }) => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center hover:shadow-xl transition-all duration-300">
    <div className="text-6xl mb-4 animate-pulse">💬</div>
    <h3 className="text-xl font-semibold text-gray-800 mb-2">Ask me about careers!</h3>
    <p className="text-gray-500 text-sm mb-4">Type your question in the chat box.</p>
    <div className="space-y-2 text-left">
      {[
        '🎯 Which career should I choose?',
        '🗺️ Show me roadmap for MERN Stack',
        '💡 What skills are in demand?',
        '📄 Give me resume tips',
        '💰 What is the salary range?',
        '💼 How to start freelancing?',
      ].map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onAction(suggestion)}
          className="w-full text-left text-xs px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          <Sparkles className="w-3 h-3" /> {suggestion}
        </button>
      ))}
    </div>
  </div>
);

// ── Main Component ──
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

      const res = response.data;
      console.log('API RESPONSE:', JSON.stringify(res, null, 2));

      const intent = res.intent;
      const data = res.data || {};

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: res.ai_response?.text || "I'm here to help!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMessage]);

      // ── FIX: Auto-switch to overview tab so sidebar is visible ────────────
      const sidebarIntents = [
        'show_recommendations', 'show_skills', 'show_roadmap',
        'show_resume', 'show_salary', 'show_freelancing', 'show_interview'
      ];
      if (sidebarIntents.includes(intent)) {
        setActiveTab('overview');
      }

      const showWithDelay = (contentObj, delay = 800) => {
        setTimeout(() => setSidebarContent({ ...contentObj, isLoading: false }), delay);
      };

      // ── INTENT → SIDEBAR MAPPING ──────────────────────────────────────────
      if (intent === 'show_recommendations') {
        const recs = data.recommendations || res.recommendations || [];
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
          title: `🗺️ Roadmap: ${data.career
            ? data.career.charAt(0).toUpperCase() + data.career.slice(1)
            : 'Learning Path'}`,
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
      return <SidebarSkeleton />;
    }

    // Empty / welcome state
    if (!sidebarContent.type) {
      return <WelcomeSidebar onAction={handleChatSend} />;
    }

    // ── Career Recommendations ─────────────────────────────────────────────────
    if (sidebarContent.type === 'recommendations') {
      return (
        <RecommendationsContent
          data={sidebarContent.data}
          title={sidebarContent.title}
          onClose={closeSidebar}
          onAction={handleChatSend}
        />
      );
    }

    // ── Skills ─────────────────────────────────────────────────────────────────
    if (sidebarContent.type === 'skills') {
      return (
        <SkillsContent
          data={sidebarContent.data}
          title={sidebarContent.title}
          onClose={closeSidebar}
          onAction={handleChatSend}
        />
      );
    }

    // ── Roadmap ────────────────────────────────────────────────────────────────
    if (sidebarContent.type === 'roadmap') {
      return (
        <RoadmapContent
          data={sidebarContent.data}
          title={sidebarContent.title}
          onClose={closeSidebar}
        />
      );
    }

    // ── Resume Tips ────────────────────────────────────────────────────────────
    if (sidebarContent.type === 'resume') {
      return (
        <ResumeContent
          data={sidebarContent.data}
          title={sidebarContent.title}
          onClose={closeSidebar}
        />
      );
    }

    // ── Salary Guide ───────────────────────────────────────────────────────────
    if (sidebarContent.type === 'salary') {
      return (
        <SalaryContent
          data={sidebarContent.data}
          title={sidebarContent.title}
          onClose={closeSidebar}
        />
      );
    }

    // ── Freelancing Guide ──────────────────────────────────────────────────────
    if (sidebarContent.type === 'freelancing') {
      return (
        <FreelancingContent
          data={sidebarContent.data}
          title={sidebarContent.title}
          onClose={closeSidebar}
        />
      );
    }

    // ── Interview Tips ─────────────────────────────────────────────────────────
    if (sidebarContent.type === 'interview') {
      return (
        <InterviewContent
          data={sidebarContent.data}
          title={sidebarContent.title}
          onClose={closeSidebar}
        />
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
          <p className="text-gray-600 font-medium">Loading your career coach...</p>
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c4b5fd;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a78bfa;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* ── Header ── */}
          <div className="bg-white border-b border-gray-200 px-6 py-5 rounded-xl shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Briefcase className="text-purple-600 w-6 h-6" /> AI Career Coach — Pakistan
                  </h1>
                  <Badge variant="purple">🇵🇰 Localized</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">Personalized career guidance for Pakistan's tech industry</p>
              </div>
              <button
                onClick={loadAllData}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" /> Refresh Data
              </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex flex-wrap gap-1 mt-6 border-b border-gray-200">
              {[
                { id: 'overview',   label: '📊 Overview', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'skills',     label: '💡 Skills & Future', icon: <Lightbulb className="w-4 h-4" /> },
                { id: 'interview',  label: '🎯 Interview Learning', icon: <Target className="w-4 h-4" /> },
                { id: 'institutes', label: '🏫 Training Institutes', icon: <GraduationCap className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'interview') loadInterviewQuestions();
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white text-purple-600 border-b-2 border-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Banners ── */}
          {!serverAvailable && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Cannot connect to backend server. Please make sure Flask server is running on port 5001.</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Content Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Chat Section ── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                {/* Chat header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Pakistan Career Coach AI</h3>
                      <p className="text-xs text-gray-600">Specialized in Pakistan's tech market</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="px-6 py-4 h-[400px] overflow-y-auto bg-gray-50 custom-scrollbar">
                  <div className="space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 transition-all duration-300 ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-md'
                              : 'bg-white text-gray-900 rounded-bl-none shadow-sm hover:shadow-md'
                          }`}
                        >
                          {msg.sender === 'ai' ? (
                            <div className="text-sm">{formatMessageText(msg.text)}</div>
                          ) : (
                            <p className="text-sm">{msg.text}</p>
                          )}
                          <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
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
                <div className="px-6 py-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                      placeholder="Ask me about careers, skills, roadmaps, or interview preparation..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 outline-none"
                      disabled={loading.chat}
                    />
                    <button
                      onClick={() => handleChatSend()}
                      disabled={loading.chat || !chatInput.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 hover:shadow-lg flex items-center gap-2"
                    >
                      {loading.chat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Sidebar ── */}
            <div className="space-y-6">

              {/* Overview tab - sidebar */}
              {activeTab === 'overview' && renderSidebarContent()}

              {/* Skills tab */}
              {activeTab === 'skills' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-purple-500" /> In-Demand Skills for 2026+
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Top skills in Pakistan's tech market</p>
                  </div>
                  <div className="p-6">
                    {inDemandSkills.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No skills data loaded.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-[500px] overflow-y-auto custom-scrollbar">
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
                </div>
              )}

              {/* Interview tab */}
              {activeTab === 'interview' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-500" /> Interview Learning
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Practice with domain-specific questions</p>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-gray-400" /> Select Domain:
                      </label>
                      <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 outline-none"
                      >
                        {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" /> Questions: {questionLimit}
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="10"
                        value={questionLimit}
                        onChange={(e) => setQuestionLimit(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>3</span>
                        <span>10</span>
                      </div>
                    </div>

                    <button
                      onClick={loadInterviewQuestions}
                      disabled={loading.interview}
                      className="w-full mb-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:from-purple-700 hover:to-pink-600 transition-all duration-300 hover:shadow-md flex items-center justify-center gap-2"
                    >
                      {loading.interview ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate Questions
                    </button>

                    {loading.interview ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : interviewQuestions.length > 0 ? (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm text-purple-600 font-semibold">
                            Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={prevQuestion}
                              disabled={currentQuestionIndex === 0}
                              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-all duration-300 disabled:opacity-50 flex items-center gap-1"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" /> Prev
                            </button>
                            <button
                              onClick={nextQuestion}
                              disabled={currentQuestionIndex === interviewQuestions.length - 1}
                              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-all duration-300 disabled:opacity-50 flex items-center gap-1"
                            >
                              Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="font-medium text-gray-900 mb-3">
                          {interviewQuestions[currentQuestionIndex]?.question}
                        </p>
                        <button
                          onClick={() => setShowAnswer(!showAnswer)}
                          className="text-sm text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1.5"
                        >
                          {showAnswer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {showAnswer ? 'Hide Answer' : 'Show Answer'}
                        </button>
                        {showAnswer && (
                          <p className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg text-sm animate-fadeIn border border-green-200">
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
                </div>
              )}

              {/* Institutes tab */}
              {activeTab === 'institutes' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-purple-500" /> Training Institutes
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Top training providers in Pakistan</p>
                  </div>
                  <div className="p-6">
                    {institutes.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No institutes data loaded.</p>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {institutes.map((inst, i) => (
                          <div
                            key={i}
                            className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-all duration-300 hover:shadow-md"
                          >
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-purple-600" /> {inst.name}
                            </h3>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Award className="w-3 h-3" /> {inst.certificates}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Target className="w-3 h-3" /> {inst.focus}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> {inst.cost}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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