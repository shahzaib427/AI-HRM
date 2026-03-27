import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5001';

const API_BASE_URL = 'http://localhost:5001/api';

// Constants
const MOODS = ['😢', '😔', '😐', '🙂', '😊', '🤩'];
const STORAGE_KEYS = {
  USER: 'wellness_user',
  CHECK_IN_DRAFT: 'wellness_checkin_draft',
  CHAT_HISTORY: 'wellness_chat_history'
};

const Wellness = () => {
  // User state
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  
  // Check-in status state
  const [checkinStatus, setCheckinStatus] = useState({
    today_checkins: 0,
    remaining: 2,
    can_checkin: true,
    checkin_number: 1,
    daily_completed: false
  });
  
  // Weekly wellness data
  const [weeklyWellness, setWeeklyWellness] = useState({
    streak: 0,
    avg_weekly: 0,
    total_checkins_week: 0,
    completed_days: 0,
    weekly_data: []
  });
  
  // Wellness data state
  const [wellnessScore, setWellnessScore] = useState({
    overall: 0,
    physical: 0,
    mental: 0,
    emotional: 0,
    social: 0
  });

  const [dailyCheckIn, setDailyCheckIn] = useState(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEYS.CHECK_IN_DRAFT);
    return savedDraft ? JSON.parse(savedDraft) : {
      mood: 3,
      energy: 7,
      stress: 4,
      sleep: 7,
      productivity: 8,
      message: ''
    };
  });

  const [recommendations, setRecommendations] = useState([]);
  const [stressPatterns, setStressPatterns] = useState([]);
  const [chatHistory, setChatHistory] = useState(() => {
    const savedChat = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    return savedChat ? JSON.parse(savedChat) : [];
  });
  
  const [chatInput, setChatInput] = useState('');
  const [selectedMood, setSelectedMood] = useState(3);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stats state
  const [stats, setStats] = useState({
    streak: 0,
    total_days: 0,
    total_checkins: 0,
    averages: {}
  });

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Save check-in draft to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHECK_IN_DRAFT, JSON.stringify(dailyCheckIn));
  }, [dailyCheckIn]);

  // Auto-login from HRM system on load
  useEffect(() => {
    const autoLoginFromHRM = async () => {
      try {
        // Check if we have employee ID from HRM system
        const searchParams = new URLSearchParams(window.location.search);
        const urlEmployeeId = searchParams.get('employee_id');
        const urlUsername = searchParams.get('username');
        
        // Check if HRM has stored user info in localStorage
        const hrmUser = localStorage.getItem('hrm_user');
        let employeeId = urlEmployeeId;
        let employeeName = urlUsername;
        
        if (hrmUser) {
          try {
            const hrmData = JSON.parse(hrmUser);
            employeeId = employeeId || hrmData.employee_id || hrmData.id;
            employeeName = employeeName || hrmData.name || hrmData.username;
          } catch (e) {
            console.error('Error parsing HRM user data:', e);
          }
        }
        
        // If we have employee ID from HRM, auto-login
        if (employeeId) {
          console.log('Auto-login with employee ID:', employeeId);
          await handleHRMLogin(employeeId, employeeName || `Employee_${employeeId}`);
          return;
        }
        
        // Otherwise check for saved user
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          console.log('Found saved user:', userData);
          
          setUser(userData);
          setShowLogin(false);
          
          // Verify session with server
          try {
            const sessionCheck = await axios.get(`${API_BASE_URL}/check-session`).catch(() => null);
            
            if (!sessionCheck?.data?.logged_in) {
              console.log('Session expired, attempting to re-authenticate...');
              const reloginResponse = await axios.post(`${API_BASE_URL}/user/login`, {
                username: userData.username
              });
              
              if (reloginResponse.data.success) {
                console.log('Re-authentication successful:', reloginResponse.data);
              }
            }
          } catch (sessionError) {
            console.error('Session verification error:', sessionError);
          }
          
          // Fetch all data
          await fetchCheckinStatus();
          await fetchWeeklyWellness();
          await fetchHistory();
          await fetchStats();
        }
      } catch (error) {
        console.error('Auto-login error:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    autoLoginFromHRM();
  }, []);

  // Handle HRM login
  const handleHRMLogin = async (employeeId, employeeName) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/user/login`, {
        employee_id: employeeId,
        username: employeeName
      });
      
      console.log('HRM Login response:', response.data);
      
      setUser(response.data);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
      setShowLogin(false);
      setUsername('');
      
      const welcomeMessage = {
        id: Date.now(),
        sender: 'ai',
        text: response.data.is_new 
          ? `Hi ${response.data.username}! Welcome to your wellness journey! You can check in twice daily.`
          : `Welcome back, ${response.data.username}! Great to see you again.`,
        time: new Date().toLocaleTimeString()
      };
      
      setChatHistory(prev => [...prev, welcomeMessage]);
      
      await fetchCheckinStatus();
      await fetchWeeklyWellness();
      await fetchHistory();
      await fetchStats();
      
    } catch (error) {
      console.error('HRM Login error:', error);
      setError(error.response?.data?.error || 'Auto-login failed. Please login manually.');
      setShowLogin(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch check-in status
  const fetchCheckinStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/checkin/status`);
      console.log('Check-in status fetched:', response.data);
      setCheckinStatus(response.data);
    } catch (error) {
      console.error('Error fetching check-in status:', error);
    }
  }, [user]);

  // Fetch weekly wellness
  const fetchWeeklyWellness = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/weekly-wellness?days=7`);
      console.log('Weekly wellness fetched:', response.data);
      setWeeklyWellness(response.data);
    } catch (error) {
      console.error('Error fetching weekly wellness:', error);
    }
  }, [user]);

  // Fetch user history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/history`);
      
      if (response.data.checkins?.length > 0) {
        const patterns = response.data.checkins.slice(0, 7).map((checkin) => ({
          day: new Date(checkin.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
          value: checkin.stress * 10,
          peak: new Date(checkin.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cause: getStressCause(checkin.stress),
          wellness: checkin.wellness_score,
          mood: checkin.mood,
          checkin_number: checkin.checkin_number
        }));
        setStressPatterns(patterns);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [user]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      console.log('Stats fetched:', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user]);

  // Manual login (fallback if HRM auto-login fails)
  const handleManualLogin = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/user/login`, {
        username: username.trim()
      });
      
      console.log('Manual Login response:', response.data);
      
      setUser(response.data);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
      setShowLogin(false);
      
      const welcomeMessage = {
        id: Date.now(),
        sender: 'ai',
        text: response.data.is_new 
          ? `Hi ${username}! Welcome to your wellness journey! You can check in twice daily.`
          : `Welcome back, ${username}! Great to see you again.`,
        time: new Date().toLocaleTimeString()
      };
      
      setChatHistory(prev => [...prev, welcomeMessage]);
      
      await fetchCheckinStatus();
      await fetchWeeklyWellness();
      await fetchHistory();
      await fetchStats();
      
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/user/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.CHECK_IN_DRAFT);
      
      setUser(null);
      setShowLogin(true);
      setUsername('');
      setRecommendations([]);
      setStressPatterns([]);
      setCheckinStatus({
        today_checkins: 0,
        remaining: 2,
        can_checkin: true,
        checkin_number: 1,
        daily_completed: false
      });
      setWeeklyWellness({
        streak: 0,
        avg_weekly: 0,
        total_checkins_week: 0,
        completed_days: 0,
        weekly_data: []
      });
      setWellnessScore({
        overall: 0,
        physical: 0,
        mental: 0,
        emotional: 0,
        social: 0
      });
      setStats({
        streak: 0,
        total_days: 0,
        total_checkins: 0,
        averages: {}
      });
      setError(null);
    }
  };

  // Submit daily check-in
  const handleCheckIn = async () => {
    if (!user) {
      setError('Please login first');
      return;
    }
    
    if (!checkinStatus.can_checkin) {
      setError(`You've already completed 2 check-ins today. Come back tomorrow!`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const checkInData = {
        mood: selectedMood + 1,
        stress: dailyCheckIn.stress,
        sleep: dailyCheckIn.sleep,
        energy: dailyCheckIn.energy,
        productivity: dailyCheckIn.productivity,
        message: dailyCheckIn.message.trim() || `Check-in #${checkinStatus.checkin_number}`
      };
      
      const response = await axios.post(`${API_BASE_URL}/checkin`, checkInData);
      
      console.log('Check-in response:', response.data);
      
      setWellnessScore({
        overall: response.data.wellness_score,
        physical: calculatePhysicalScore(dailyCheckIn),
        mental: calculateMentalScore(dailyCheckIn, response.data.emotion),
        emotional: calculateEmotionalScore(dailyCheckIn, response.data.emotion),
        social: calculateSocialScore(dailyCheckIn)
      });
      
      const formattedRecs = response.data.recommendations.map((rec, index) => ({
        id: Date.now() + index,
        title: rec.length > 35 ? rec.substring(0, 35) + '...' : rec,
        description: rec,
        type: getRecommendationType(rec),
        priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
        icon: getRecommendationIcon(rec)
      }));
      
      setRecommendations(formattedRecs);
      
      const checkInMessages = [
        {
          id: Date.now(),
          sender: 'user',
          text: dailyCheckIn.message.trim() || `Check-in #${checkinStatus.checkin_number}`,
          time: new Date().toLocaleTimeString()
        },
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: response.data.daily_completed 
            ? `🎉 Great! You've completed both check-ins for today! Your daily wellness score is ${response.data.daily_wellness.avg_wellness}%.`
            : `Thanks for check-in #${checkinStatus.checkin_number}! Your wellness score is ${response.data.wellness_score}%. ${response.data.remaining_checkins} check-in remaining today.`,
          time: new Date().toLocaleTimeString()
        }
      ];
      
      setChatHistory(prev => [...prev, ...checkInMessages]);
      setDailyCheckIn(prev => ({ ...prev, message: '' }));
      
      await fetchCheckinStatus();
      await fetchWeeklyWellness();
      await fetchStats();
      await fetchHistory();
      
    } catch (error) {
      console.error('Check-in error:', error);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(handleLogout, 2000);
      } else {
        setError(error.response?.data?.error || 'Check-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    
    setTimeout(() => {
      let response = generateAIResponse(chatInput);
      
      if (chatInput.toLowerCase().includes('check-in') || chatInput.toLowerCase().includes('checkin')) {
        response = checkinStatus.daily_completed 
          ? "You've already completed both check-ins today! Great job! Come back tomorrow for more."
          : `You have ${checkinStatus.remaining} check-in${checkinStatus.remaining !== 1 ? 's' : ''} remaining today. Would you like to do it now?`;
      }
      
      const aiResponse = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response,
        time: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, aiResponse]);
    }, 1000);
  };

  // Clear chat history
  const clearChatHistory = () => {
    if (window.confirm('Clear chat history?')) {
      setChatHistory([]);
      localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    }
  };

  // Helper functions
  const calculatePhysicalScore = (data) => {
    return Math.round((data.energy * 10 + data.sleep * 10) / 2);
  };

  const calculateMentalScore = (data, emotion) => {
    let base = (data.productivity * 10 + (10 - data.stress) * 10) / 2;
    if (emotion === 'stress' || emotion === 'anxiety') base *= 0.8;
    if (emotion === 'joy' || emotion === 'love') base *= 1.1;
    return Math.min(Math.round(base), 100);
  };

  const calculateEmotionalScore = (data, emotion) => {
    let base = data.mood * 20;
    if (emotion === 'joy' || emotion === 'love') base *= 1.2;
    if (emotion === 'sadness' || emotion === 'fear') base *= 0.7;
    if (emotion === 'anger') base *= 0.8;
    return Math.min(Math.round(base), 100);
  };

  const calculateSocialScore = (data) => {
    let base = (data.mood * 20 + (10 - data.stress) * 5) / 1.5;
    return Math.min(Math.round(base), 100);
  };

  const getRecommendationType = (text) => {
    if (text.includes('meditation') || text.includes('breathe') || text.includes('mindful')) return 'meditation';
    if (text.includes('walk') || text.includes('exercise') || text.includes('stretch')) return 'exercise';
    if (text.includes('sleep') || text.includes('bed') || text.includes('rest')) return 'sleep';
    if (text.includes('eat') || text.includes('breakfast') || text.includes('hydrat')) return 'nutrition';
    if (text.includes('friend') || text.includes('talk') || text.includes('social')) return 'social';
    if (text.includes('journal') || text.includes('write') || text.includes('grateful')) return 'journaling';
    return 'general';
  };

  const getRecommendationIcon = (text) => {
    if (text.includes('meditation') || text.includes('breathe')) return '🧘';
    if (text.includes('walk') || text.includes('exercise')) return '🚶';
    if (text.includes('sleep')) return '😴';
    if (text.includes('eat') || text.includes('breakfast')) return '🥗';
    if (text.includes('friend') || text.includes('talk')) return '💬';
    if (text.includes('grateful') || text.includes('journal')) return '📝';
    if (text.includes('music') || text.includes('listen')) return '🎵';
    return '💡';
  };

  const getStressCause = (stressLevel) => {
    if (stressLevel >= 8) return 'High stress';
    if (stressLevel >= 5) return 'Moderate stress';
    return 'Low stress';
  };

  const generateAIResponse = (message) => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('stress') || lowerMsg.includes('anxious') || lowerMsg.includes('worry')) {
      return "I hear you're feeling stressed. Try this quick exercise: Breathe in for 4 counts, hold for 4, exhale for 4. Repeat 3 times. Would you like a guided meditation?";
    }
    if (lowerMsg.includes('sad') || lowerMsg.includes('down') || lowerMsg.includes('depress')) {
      return "I'm sorry you're feeling this way. Remember it's okay to have these feelings. Would you like to talk about what's bothering you, or would you prefer some uplifting activities?";
    }
    if (lowerMsg.includes('happy') || lowerMsg.includes('good') || lowerMsg.includes('great')) {
      return "That's wonderful to hear! Your positive energy is contagious. What's contributing to your good mood today?";
    }
    if (lowerMsg.includes('tired') || lowerMsg.includes('exhausted') || lowerMsg.includes('fatigue')) {
      return "Getting quality rest is important. Try taking short breaks throughout the day. How many hours of sleep did you get last night?";
    }
    if (lowerMsg.includes('angry') || lowerMsg.includes('frustrated') || lowerMsg.includes('annoyed')) {
      return "It's normal to feel frustrated sometimes. Try stepping away for 5 minutes, take deep breaths, or do some light stretching to release tension.";
    }
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      return `Hello! How are you feeling today? Remember you can check in twice daily. You've done ${checkinStatus.today_checkins} check-in${checkinStatus.today_checkins !== 1 ? 's' : ''} today.`;
    }
    if (lowerMsg.includes('help') || lowerMsg.includes('support')) {
      return "I'm here to help! You can track your daily wellness with up to 2 check-ins per day, get personalized recommendations, or just chat. What would you like to do?";
    }
    
    return "Thanks for sharing. I'm here to support your wellness journey. Would you like to do a quick check-in, get some recommendations, or just chat?";
  };

  // Score Card Component
  const ScoreCard = ({ title, score, color }) => (
    <div className="text-center p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="text-3xl mb-2">{getScoreIcon(score)}</div>
      <div className={`text-2xl font-bold mb-1 ${color}`}>{score}%</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${color.replace('text', 'bg')}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );

  const getScoreIcon = (score) => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '👍';
    if (score >= 40) return '😊';
    return '😔';
  };

  // Recommendation Card Component
  const RecommendationCard = ({ rec }) => {
    const priorityColors = {
      high: 'border-red-200 bg-red-50',
      medium: 'border-yellow-200 bg-yellow-50',
      low: 'border-green-200 bg-green-50'
    };
    
    return (
      <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${priorityColors[rec.priority]}`}>
        <div className="flex items-start space-x-3">
          <div className="text-3xl">{rec.icon}</div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-1">{rec.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">⏱️ 5-10 mins</span>
              <button className="px-3 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors">
                Start
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Weekly Wellness Card Component
  const WeeklyWellnessCard = ({ day }) => {
    return (
      <div className="flex flex-col items-center">
        <div className="text-sm font-medium text-gray-600 mb-1">{day.day_name}</div>
        <div className="relative w-12 h-12 mb-1">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke={day.completed ? (day.wellness_score >= 60 ? '#10b981' : '#ef4444') : '#9ca3af'}
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - (day.wellness_score / 100))}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold">
              {day.completed ? '✓' : day.checkins}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {day.completed ? `${day.wellness_score}%` : `${day.checkins}/2`}
        </div>
        {day.sleep && (
          <div className="text-xs text-gray-400 mt-1">😴 {day.sleep}h</div>
        )}
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50/30">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🧘</div>
          <div className="text-xl text-gray-600">Loading your wellness space...</div>
        </div>
      </div>
    );
  }

  // Login Screen (fallback if auto-login fails)
  if (showLogin && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50/30 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🧘</div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600 mb-2">
              AI Wellness Coach
            </h1>
            <p className="text-gray-600">Check in twice daily for better wellness tracking</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your name to continue
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleManualLogin()}
                autoFocus
              />
            </div>
            
            <button
              onClick={handleManualLogin}
              disabled={loading || !username.trim()}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {loading ? 'Loading...' : 'Continue to Wellness'}
            </button>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>✨ Track your wellness with 2 daily check-ins</p>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard - COMPLETE DASHBOARD JSX
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50/30">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-200/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-pink-200/20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600">
                  AI Wellness Coach
                </h1>
                <span className="px-3 py-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-sm rounded-full shadow-md">
                  🔥 {weeklyWellness.streak} day streak
                </span>
              </div>
              <p className="mt-2 text-gray-600">
                Welcome back, <span className="font-semibold text-rose-600">{user?.username}</span>! 
                {stats.total_days > 0 && ` You've completed ${stats.total_days} full days.`}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg shadow-md">
                <span className="font-bold">Today: {checkinStatus.today_checkins}/2</span>
              </div>
              <button 
                onClick={handleCheckIn}
                disabled={loading || !checkinStatus.can_checkin}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all ${
                  checkinStatus.can_checkin
                    ? 'bg-gradient-to-r from-rose-600 to-pink-500 text-white hover:from-rose-700 hover:to-pink-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Processing...' : checkinStatus.can_checkin ? `📝 Check-in #${checkinStatus.checkin_number}` : '✅ Done for today'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm shadow-sm hover:shadow"
              >
                Logout
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Wellness Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <ScoreCard title="Overall" score={wellnessScore.overall} color="text-purple-600" />
          <ScoreCard title="Physical" score={wellnessScore.physical} color="text-green-600" />
          <ScoreCard title="Mental" score={wellnessScore.mental} color="text-blue-600" />
          <ScoreCard title="Emotional" score={wellnessScore.emotional} color="text-yellow-600" />
          <ScoreCard title="Social" score={wellnessScore.social} color="text-pink-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Daily Check-in & Stress Patterns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Daily Check-in */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Daily Check-in</h2>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    checkinStatus.daily_completed 
                      ? 'bg-green-100 text-green-700' 
                      : checkinStatus.today_checkins > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {checkinStatus.daily_completed ? '✓ Completed' : `${checkinStatus.today_checkins}/2 check-ins`}
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Mood Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    How are you feeling today?
                  </label>
                  <div className="flex justify-between">
                    {MOODS.map((mood, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedMood(index)}
                        disabled={!checkinStatus.can_checkin}
                        className={`text-4xl transition-all transform hover:scale-110 ${
                          !checkinStatus.can_checkin ? 'opacity-30 cursor-not-allowed' :
                          selectedMood === index 
                            ? 'scale-125 filter drop-shadow-lg' 
                            : 'opacity-50 hover:opacity-100'
                        }`}
                        title={['Very Sad', 'Sad', 'Neutral', 'Good', 'Happy', 'Excellent'][index]}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Energy</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={dailyCheckIn.energy}
                      onChange={(e) => setDailyCheckIn({...dailyCheckIn, energy: parseInt(e.target.value)})}
                      disabled={!checkinStatus.can_checkin}
                      className="w-full accent-rose-500 disabled:opacity-50"
                    />
                    <div className="text-center text-sm font-semibold text-rose-600">{dailyCheckIn.energy}/10</div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Stress</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={dailyCheckIn.stress}
                      onChange={(e) => setDailyCheckIn({...dailyCheckIn, stress: parseInt(e.target.value)})}
                      disabled={!checkinStatus.can_checkin}
                      className="w-full accent-rose-500 disabled:opacity-50"
                    />
                    <div className="text-center text-sm font-semibold text-rose-600">{dailyCheckIn.stress}/10</div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Sleep (hrs)</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={dailyCheckIn.sleep}
                      onChange={(e) => setDailyCheckIn({...dailyCheckIn, sleep: parseFloat(e.target.value) || 0})}
                      disabled={!checkinStatus.can_checkin}
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Productivity</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={dailyCheckIn.productivity}
                      onChange={(e) => setDailyCheckIn({...dailyCheckIn, productivity: parseInt(e.target.value)})}
                      disabled={!checkinStatus.can_checkin}
                      className="w-full accent-rose-500 disabled:opacity-50"
                    />
                    <div className="text-center text-sm font-semibold text-rose-600">{dailyCheckIn.productivity}/10</div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    How would you describe your day?
                  </label>
                  <textarea
                    value={dailyCheckIn.message}
                    onChange={(e) => setDailyCheckIn({...dailyCheckIn, message: e.target.value})}
                    disabled={!checkinStatus.can_checkin}
                    placeholder={checkinStatus.can_checkin ? "Share your thoughts..." : "You've completed both check-ins for today"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-100"
                    rows="3"
                  />
                </div>
                
                <button 
                  onClick={handleCheckIn}
                  disabled={loading || !checkinStatus.can_checkin}
                  className={`w-full py-3 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-md ${
                    checkinStatus.can_checkin
                      ? 'bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Processing...' : 
                   checkinStatus.can_checkin ? `Submit Check-in #${checkinStatus.checkin_number} ✨` : 
                   '✓ Daily Check-ins Complete'}
                </button>
              </div>
            </div>

            {/* Stress Patterns */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Check-ins</h2>
                {stressPatterns.length > 0 && (
                  <span className="text-xs text-gray-500">Last 7 check-ins</span>
                )}
              </div>
              
              <div className="space-y-4">
                {stressPatterns.length > 0 ? stressPatterns.map((day, index) => (
                  <div key={index} className="flex items-center group">
                    <div className="w-16 text-sm font-medium text-gray-600">
                      {day.day}
                      {day.checkin_number && (
                        <span className="text-xs text-gray-400 block">#{day.checkin_number}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-500 group-hover:opacity-80"
                            style={{ width: `${day.value}%` }}
                          ></div>
                        </div>
                        <div className="text-sm font-semibold text-gray-700 w-12">{day.value}%</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                        <span>Wellness: {day.wellness}%</span>
                        <span>•</span>
                        <span>Mood: {day.mood}/5</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-gray-500">Complete check-ins to see your data</p>
                    <p className="text-sm text-gray-400 mt-2">Your wellness journey starts here</p>
                  </div>
                )}
              </div>
              
              {stressPatterns.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">AI Insight</p>
                      <p className="text-sm text-blue-800">
                        {getAIInsight(stressPatterns)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recommendations & Chat */}
          <div className="space-y-8">
            {/* AI Recommendations */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">AI Recommendations</h2>
                {recommendations.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-rose-100 text-rose-600 rounded-full">Personalized</span>
                )}
              </div>
              
              <div className="space-y-4">
                {recommendations.length > 0 ? recommendations.map(rec => (
                  <RecommendationCard key={rec.id} rec={rec} />
                )) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🧘</div>
                    <p className="text-gray-500">Complete your daily check-in</p>
                    <p className="text-sm text-gray-400 mt-2">Get personalized wellness recommendations</p>
                  </div>
                )}
              </div>
            </div>

            {/* Wellness Stats */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                <span>Your Wellness Stats</span>
                {stats.total_days > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                    {stats.total_days} days
                  </span>
                )}
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">🔥 Current Streak</span>
                  <span className="font-bold text-orange-600">{stats.streak} days</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-600 mb-1">Avg Sleep</div>
                    <div className="font-bold text-blue-700">{stats.averages?.sleep?.toFixed(1) || '0'} hrs</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-600 mb-1">Avg Energy</div>
                    <div className="font-bold text-green-700">{stats.averages?.energy?.toFixed(1) || '0'}/10</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xs text-yellow-600 mb-1">Avg Stress</div>
                    <div className="font-bold text-yellow-700">{stats.averages?.stress?.toFixed(1) || '0'}/10</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-purple-600 mb-1">Avg Mood</div>
                    <div className="font-bold text-purple-700">{stats.averages?.mood?.toFixed(1) || '0'}/5</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Assistant */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Chat with AI Assistant</h3>
                {chatHistory.length > 0 && (
                  <button
                    onClick={clearChatHistory}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <div className="h-80 overflow-y-auto mb-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300">
                {chatHistory.length > 0 ? chatHistory.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-rose-100' : 'text-gray-500'
                      }`}>{msg.time}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-sm">Start a conversation with your AI wellness assistant</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim()}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Wellness View */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Week at a Glance</h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-600">Weekly Avg: </span>
                <span className="font-bold text-rose-600">{weeklyWellness.avg_weekly}%</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Completed: </span>
                <span className="font-bold text-green-600">{weeklyWellness.completed_days}/7 days</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weeklyWellness.weekly_data.map((day, index) => (
              <WeeklyWellnessCard key={index} day={day} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span>Completed day (2/2)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
              <span>Partial day (1/2)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
              <span>No check-ins</span>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600">
            {weeklyWellness.streak > 0 ? (
              <span className="font-medium">🔥 You're on a {weeklyWellness.streak}-day streak! Keep it up!</span>
            ) : (
              <span>Complete both check-ins daily to build your streak!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for AI insight
const getAIInsight = (patterns) => {
  if (!patterns || patterns.length === 0) return '';
  
  const avgStress = patterns.reduce((acc, p) => acc + p.value, 0) / patterns.length;
  const trend = patterns[0]?.value - patterns[patterns.length - 1]?.value;
  
  if (avgStress > 70) {
    return "Your stress levels have been consistently high. Consider incorporating more relaxation techniques into your daily routine.";
  }
  if (trend < -10) {
    return "Great job! Your stress levels are trending downward. Keep up whatever you're doing!";
  }
  if (trend > 10) {
    return "I notice your stress has been increasing. Would you like some stress management techniques?";
  }
  if (patterns.some(p => p.wellness > 80)) {
    return "You've had some excellent wellness days! What's been working well for you?";
  }
  
  return "Your patterns are stable. Consistency is key to long-term wellness!";
};

export default Wellness;