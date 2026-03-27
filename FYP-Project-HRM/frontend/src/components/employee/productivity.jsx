import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/productivity';
const AUTH_BASE_URL = 'http://localhost:5001/api/auth';

const Productivity = () => {
  const [user, setUser] = useState(null);
  const [productivityScore, setProductivityScore] = useState({
    today: 0,
    week: 0,
    month: 0,
    focus: 0,
    efficiency: 0
  });

  const [timeTracking, setTimeTracking] = useState({
    productiveHours: 0,
    meetings: 0,
    breaks: 0,
    distractions: 0,
    deepWork: 0
  });

  const [focusSessions, setFocusSessions] = useState([]);
  const [distractions, setDistractions] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-login with default user on mount
  useEffect(() => {
    const autoLogin = async () => {
      // Check if user exists in localStorage
      const savedUser = localStorage.getItem('user');
      
      if (savedUser) {
        // Use existing user
        setUser(JSON.parse(savedUser));
        loadTodayData();
      } else {
        // Create default user
        try {
          const response = await axios.post(`${AUTH_BASE_URL}/login`, {
            username: 'default_user'
          }, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const userData = response.data.user;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Load user's data after login
          loadTodayData();
          
        } catch (err) {
          console.error('Auto-login error:', err);
          setError('Failed to initialize user. Please check if backend is running.');
          setLoading(false);
        }
      }
    };

    autoLogin();
  }, []);

  // Load today's data from API
  const loadTodayData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/today`, {
        withCredentials: true
      });
      
      const data = response.data;
      
      setProductivityScore(data.productivity_score);
      setTimeTracking(data.timeTracking);
      setFocusSessions(data.focusSessions);
      setDistractions(data.distractions);
      setAiSuggestions(data.suggestions);
      
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        // Session expired, clear user
        setUser(null);
        localStorage.removeItem('user');
        
        // Try to login again
        try {
          const response = await axios.post(`${AUTH_BASE_URL}/login`, {
            username: 'default_user'
          }, {
            withCredentials: true
          });
          
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          loadTodayData();
          
        } catch (loginErr) {
          setError('Session expired. Please refresh the page.');
        }
      } else {
        setError('Failed to load productivity data');
        console.error('Load error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (activeSession) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  // Start focus session
  const startFocusSession = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/start-session`, {
        task: 'Deep Work Session'
      }, {
        withCredentials: true
      });

      setActiveSession({
        id: response.data.session_id,
        task: 'Deep Work Session',
        startTime: new Date()
      });
      setSessionTime(0);
      
    } catch (err) {
      setError('Failed to start session');
      console.error('Start session error:', err);
    }
  };

  // Stop focus session
  const stopFocusSession = async () => {
    if (!activeSession) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/end-session`, {
        session_id: activeSession.id
      }, {
        withCredentials: true
      });

      const completedSession = {
        id: activeSession.id,
        task: activeSession.task,
        duration: response.data.session.duration,
        focus: response.data.session.focus,
        completed: true
      };

      setFocusSessions(prev => [completedSession, ...prev]);
      
      // Update deep work time
      const hoursWorked = response.data.session.duration / 60;
      setTimeTracking(prev => ({
        ...prev,
        deepWork: prev.deepWork + hoursWorked
      }));

      setActiveSession(null);
      
      // Refresh data
      loadTodayData();
      
    } catch (err) {
      setError('Failed to end session');
      console.error('End session error:', err);
    }
  };

  // Handle time input changes
  const handleTimeChange = async (field, value) => {
    const newValue = parseFloat(value) || 0;
    
    const updatedTracking = {
      ...timeTracking,
      [field]: newValue
    };

    setTimeTracking(updatedTracking);

    try {
      await axios.post(`${API_BASE_URL}/update-time`, updatedTracking, {
        withCredentials: true
      });
      
      // Refresh data to get updated scores
      loadTodayData();
      
    } catch (err) {
      console.error('Failed to update time:', err);
    }
  };

  // Log distraction
  const logDistraction = async (source) => {
    try {
      await axios.post(`${API_BASE_URL}/log-distraction`, {
        source,
        duration: 5
      }, {
        withCredentials: true
      });

      // Update local state
      const newDistraction = {
        source,
        count: 1,
        time: 5
      };

      setDistractions(prev => [...prev, newDistraction]);
      
      // Update distraction time
      setTimeTracking(prev => ({
        ...prev,
        distractions: prev.distractions + (5 / 60)
      }));

      // Refresh data
      loadTodayData();
      
    } catch (err) {
      console.error('Failed to log distraction:', err);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your productivity data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
            AI Productivity Assistant
          </h2>
          <p className="text-gray-600 mb-6">Unable to initialize user session. Please check if the backend server is running.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 bg-gradient-to-br from-amber-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                Welcome back, {user?.username || 'Productivity Master'}!
              </h1>
              <p className="mt-2 text-gray-600">
                Today's productivity score: {productivityScore.today}%
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadTodayData}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Focus Timer */}
        {activeSession ? (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 text-white text-center">
            <div className="text-5xl font-bold mb-4">{formatTime(sessionTime)}</div>
            <p className="text-xl mb-2">Deep Work Session</p>
            <p className="text-blue-100 mb-6">Focus on your current task without distractions</p>
            <button
              onClick={stopFocusSession}
              className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-colors"
            >
              Complete Session
            </button>
          </div>
        ) : (
          <div className="mb-8 bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl p-6 text-white text-center">
            <button
              onClick={startFocusSession}
              className="px-8 py-4 bg-white text-amber-600 hover:bg-amber-50 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105"
            >
              Start Focus Session
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Time Tracking */}
          <div className="lg:col-span-2 space-y-8">
            {/* Time Distribution */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Today's Time Tracking</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <input
                    type="number"
                    value={timeTracking.productiveHours}
                    onChange={(e) => handleTimeChange('productiveHours', e.target.value)}
                    className="w-16 text-center text-2xl font-bold text-green-600 bg-transparent border-none focus:outline-none"
                    step="0.1"
                    min="0"
                    max="24"
                  />
                  <div className="text-sm text-green-800">Productive</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <input
                    type="number"
                    value={timeTracking.meetings}
                    onChange={(e) => handleTimeChange('meetings', e.target.value)}
                    className="w-16 text-center text-2xl font-bold text-blue-600 bg-transparent border-none focus:outline-none"
                    step="0.1"
                    min="0"
                    max="24"
                  />
                  <div className="text-sm text-blue-800">Meetings</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <input
                    type="number"
                    value={timeTracking.breaks}
                    onChange={(e) => handleTimeChange('breaks', e.target.value)}
                    className="w-16 text-center text-2xl font-bold text-amber-600 bg-transparent border-none focus:outline-none"
                    step="0.1"
                    min="0"
                    max="24"
                  />
                  <div className="text-sm text-amber-800">Breaks</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                  <input
                    type="number"
                    value={timeTracking.distractions}
                    onChange={(e) => handleTimeChange('distractions', e.target.value)}
                    className="w-16 text-center text-2xl font-bold text-red-600 bg-transparent border-none focus:outline-none"
                    step="0.1"
                    min="0"
                    max="24"
                  />
                  <div className="text-sm text-red-800">Distracted</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <input
                    type="number"
                    value={timeTracking.deepWork}
                    onChange={(e) => handleTimeChange('deepWork', e.target.value)}
                    className="w-16 text-center text-2xl font-bold text-purple-600 bg-transparent border-none focus:outline-none"
                    step="0.1"
                    min="0"
                    max="24"
                  />
                  <div className="text-sm text-purple-800">Deep Work</div>
                </div>
              </div>
            </div>

            {/* Focus Sessions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Today's Focus Sessions</h2>
              
              {focusSessions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No focus sessions yet today. Start one now!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {focusSessions.map(session => (
                    <div key={session.id} className="p-4 rounded-xl border border-gray-200">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{session.task}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          session.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {session.completed ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{session.duration} mins</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                          style={{ width: `${session.focus}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Insights */}
          <div className="space-y-8">
            {/* AI Suggestions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">AI Insights</h2>
              
              {aiSuggestions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Keep tracking to get personalized insights!</p>
              ) : (
                <div className="space-y-4">
                  {aiSuggestions.map(suggestion => (
                    <div key={suggestion.id} className={`p-4 rounded-xl border ${
                      suggestion.priority === 'high' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
                    }`}>
                      <h4 className="font-bold text-gray-900 mb-2">{suggestion.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-600">{suggestion.impact}</span>
                        <button 
                          onClick={() => logDistraction(suggestion.category)}
                          className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => logDistraction('Email')}
                  className="p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                  📧 Log Email
                </button>
                <button 
                  onClick={() => logDistraction('Slack')}
                  className="p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  💬 Log Slack
                </button>
                <button 
                  onClick={() => logDistraction('Meeting')}
                  className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  📅 Log Meeting
                </button>
                <button 
                  onClick={() => logDistraction('Break')}
                  className="p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  ☕ Log Break
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Productivity;