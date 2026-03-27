import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeDepartments: 0,
    systemHealth: 0,
    pendingTasks: 0,
    revenue: 0,
    performance: 0,
    employeeSatisfaction: 0
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('monthly');
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Create axios instance with auth header
  const getApi = () => {
    const token = localStorage.getItem('token');
    
    // Log token for debugging
    console.log('Token from localStorage:', token ? 'Present' : 'Missing');
    
    if (!token) {
      setError('No authentication token found. Please login again.');
      return null;
    }

    return axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
  };

  // Test authentication first
  const testAuth = async () => {
    try {
      const api = getApi();
      if (!api) return false;

      const response = await api.get('/auth/me');
      console.log('Auth test response:', response.data);
      return response.data.success;
    } catch (error) {
      console.error('Auth test failed:', error.response?.data || error.message);
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First, test authentication
        const isAuthenticated = await testAuth();
        if (!isAuthenticated) {
          setError('Authentication failed. Please login again.');
          setIsLoading(false);
          return;
        }

        const api = getApi();
        if (!api) return;

        console.log('Fetching dashboard data...');

        // Fetch all dashboard data in parallel with individual error handling
        const results = await Promise.allSettled([
          api.get('/admin/dashboard/stats'),
          api.get('/admin/dashboard/recent-activity'),
          api.get('/admin/dashboard/team-members'),
          api.get('/admin/dashboard/notifications'),
          api.get(`/admin/dashboard/performance-metrics?timeRange=${timeRange}`),
          api.get('/admin/dashboard/quick-actions')
        ]);

        console.log('API Results:', results);

        // Process stats
        if (results[0].status === 'fulfilled' && results[0].value.data.success) {
          const statsData = results[0].value.data.data;
          setStats({
            totalEmployees: statsData.totalUsers || statsData.totalEmployees || 0,
            activeDepartments: statsData.activeDepartments || statsData.departments?.length || 0,
            systemHealth: statsData.systemHealth || 99.9,
            pendingTasks: statsData.pendingLeaves || statsData.pendingTasks || 0,
            revenue: statsData.revenue || 125000,
            performance: statsData.performance || 87,
            employeeSatisfaction: statsData.employeeSatisfaction || 94
          });
        } else {
          console.error('Stats API failed:', results[0].reason);
        }

        // Process recent activity
        if (results[1].status === 'fulfilled' && results[1].value.data.success) {
          setRecentActivity(results[1].value.data.data);
        } else {
          console.log('Using mock activity data');
          setRecentActivity(getMockActivities());
        }

        // Process team members
        if (results[2].status === 'fulfilled' && results[2].value.data.success) {
          setTeamMembers(results[2].value.data.data);
        } else {
          console.log('Using mock team data');
          setTeamMembers(getMockTeamMembers());
        }

        // Process notifications
        if (results[3].status === 'fulfilled' && results[3].value.data.success) {
          setNotifications(results[3].value.data.data.notifications || []);
          setUnreadCount(results[3].value.data.data.unreadCount || 0);
        } else {
          console.log('Using mock notification data');
          const mockNotifications = getMockNotifications();
          setNotifications(mockNotifications);
          setUnreadCount(mockNotifications.filter(n => !n.read).length);
        }

        // Process performance data
        if (results[4].status === 'fulfilled' && results[4].value.data.success) {
          setPerformanceData(results[4].value.data.data);
        } else {
          console.log('Using mock performance data');
          setPerformanceData(getMockPerformanceData());
        }

        // Process quick actions
        if (results[5].status === 'fulfilled' && results[5].value.data.success) {
          setQuickActions(results[5].value.data.data);
        } else {
          console.log('Using mock quick actions');
          setQuickActions(getMockQuickActions());
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        if (error.code === 'ECONNABORTED') {
          setError('Request timeout. Please check if server is running.');
        } else if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (error.response.status === 401) {
            setError('Unauthorized. Please login again.');
            localStorage.removeItem('token');
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          } else {
            setError(`Server error: ${error.response.data.error || error.response.statusText}`);
          }
        } else if (error.request) {
          // The request was made but no response was received
          setError('Cannot connect to server. Please check if backend is running on port 5000.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError('Error setting up request: ' + error.message);
        }
        
        // Load mock data as fallback
        loadMockData();
      } finally {
        setIsLoading(false);
      }
    };

    const loadMockData = () => {
      console.log('Loading mock data as fallback');
      setStats({
        totalEmployees: 247,
        activeDepartments: 14,
        systemHealth: 99.9,
        pendingTasks: 8,
        revenue: 125000,
        performance: 87,
        employeeSatisfaction: 94
      });
      setRecentActivity(getMockActivities());
      setTeamMembers(getMockTeamMembers());
      setNotifications(getMockNotifications());
      setUnreadCount(getMockNotifications().filter(n => !n.read).length);
      setPerformanceData(getMockPerformanceData());
      setQuickActions(getMockQuickActions());
    };

    // Check if token exists, if not redirect to login
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    loadData();
  }, [timeRange]);

  // Mock data functions
  const getMockActivities = () => [
    { id: 1, type: 'user', message: 'Sarah Johnson joined the team as Senior Developer', time: '2 min ago', icon: '👤', status: 'success' },
    { id: 2, type: 'payroll', message: 'Payroll processed for March - All employees paid', time: '1 hour ago', icon: '💰', status: 'completed' },
    { id: 3, type: 'system', message: 'System backup completed successfully', time: '3 hours ago', icon: '💾', status: 'success' },
    { id: 4, type: 'update', message: 'New security update available for installation', time: '5 hours ago', icon: '🛡️', status: 'warning' },
    { id: 5, type: 'award', message: 'Mike Rodriguez selected as Employee of the Month', time: '6 hours ago', icon: '🏆', status: 'info' },
    { id: 6, type: 'project', message: 'Project "Phoenix" completed ahead of schedule', time: '1 day ago', icon: '🚀', status: 'success' }
  ];

  const getMockTeamMembers = () => [
    { id: 1, name: 'Alex Johnson', role: 'Team Lead', avatar: 'AJ', status: 'online', productivity: 95, department: 'Engineering' },
    { id: 2, name: 'Sarah Chen', role: 'Senior Developer', avatar: 'SC', status: 'online', productivity: 88, department: 'Engineering' },
    { id: 3, name: 'Mike Rodriguez', role: 'UI/UX Designer', avatar: 'MR', status: 'offline', productivity: 92, department: 'Design' },
    { id: 4, name: 'Emily Davis', role: 'Data Analyst', avatar: 'ED', status: 'online', productivity: 85, department: 'Analytics' }
  ];

  const getMockNotifications = () => [
    { id: 1, message: 'Team meeting in Conference Room A in 15 minutes', type: 'meeting', read: false, createdAt: '5m ago' },
    { id: 2, message: '3 new employee applications received', type: 'recruitment', read: false, createdAt: '2h ago' },
    { id: 3, message: 'System maintenance scheduled for tonight at 10 PM', type: 'system', read: true, createdAt: '1d ago' },
    { id: 4, message: 'Performance reviews due by end of week', type: 'reminder', read: false, createdAt: '1h ago' }
  ];

  const getMockPerformanceData = () => [
    { label: 'System Uptime', value: 99.9, color: 'from-green-500 to-emerald-500' },
    { label: 'Response Time', value: 128, color: 'from-blue-500 to-cyan-500' },
    { label: 'User Satisfaction', value: 94, color: 'from-purple-500 to-pink-500' },
    { label: 'Task Completion', value: 87, color: 'from-amber-500 to-orange-500' }
  ];

  const getMockQuickActions = () => [
    {
      id: 'manage-users',
      title: 'Manage Users',
      description: 'Add or remove system users',
      icon: '👤',
      color: 'bg-blue-100 text-blue-600',
      path: '/admin/users'
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure preferences',
      icon: '⚙️',
      color: 'bg-green-100 text-green-600',
      path: '/admin/settings'
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Generate analytics',
      icon: '📊',
      color: 'bg-purple-100 text-purple-600',
      path: '/admin/reports'
    },
    {
      id: 'employee-onboarding',
      title: 'Employee Onboarding',
      description: 'Manage new hires',
      icon: '🎯',
      color: 'bg-amber-100 text-amber-600',
      path: '/admin/onboarding'
    }
  ];

  // Update time range handler
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  // Handle quick action clicks
  const handleQuickAction = (action) => {
    if (action.path) {
      window.location.href = action.path;
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const api = getApi();
      if (!api) return;

      await api.put(`/admin/dashboard/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Animated Counter Component
  const AnimatedCounter = ({ value, duration = 2000, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isLoading) {
        let start = 0;
        const increment = value / (duration / 20);
        const timer = setInterval(() => {
          start += increment;
          if (start >= value) {
            setCount(value);
            clearInterval(timer);
          } else {
            setCount(Math.floor(start));
          }
        }, 20);
        
        return () => clearInterval(timer);
      }
    }, [value, duration, isLoading]);

    return (
      <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {prefix}{isLoading ? '--' : count}{suffix}
      </span>
    );
  };

  const StatCard = ({ title, value, change, icon, color, delay, suffix = '', prefix = '' }) => (
    <div 
      className={`rounded-2xl shadow-2xl border p-6 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 group animate-fade-in-up ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' 
          : 'bg-white border-gray-100'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <div className="flex items-baseline space-x-1">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </div>
          {change && (
            <p className={`text-sm mt-2 flex items-center ${change.startsWith('+') ? 'text-green-500' : 'text-rose-500'}`}>
              <span className={`mr-1 ${change.startsWith('+') ? 'animate-bounce' : ''}`}>
                {change.startsWith('+') ? '↗' : '↘'}
              </span>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} text-white transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const QuickAction = ({ title, description, icon, color, onClick }) => (
    <button 
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 transform hover:scale-102 group shadow-lg hover:shadow-xl ${
        darkMode 
          ? 'border-gray-700 hover:border-cyan-500 hover:bg-cyan-900/20' 
          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      <div className="flex items-center space-x-4">
        <div className={`p-2 rounded-lg ${color} transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-md`}>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold transition-colors duration-300 ${
            darkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-blue-600'
          }`}>{title}</h4>
          <p className={`text-sm mt-1 ${
            darkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-700'
          }`}>{description}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <span className={darkMode ? 'text-cyan-400 text-lg' : 'text-blue-500 text-lg'}>→</span>
        </div>
      </div>
    </button>
  );

  const ActivityItem = ({ activity, index }) => (
    <div 
      className={`flex items-start space-x-4 p-4 rounded-xl border transition-all duration-300 transform hover:scale-102 group animate-slide-in ${
        darkMode 
          ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-900/20' 
          : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-1 shadow-md ${
        darkMode ? 'bg-blue-900/50' : 'bg-blue-100'
      }`}>
        <span className="text-lg">{activity.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium transition-colors duration-300 leading-tight ${
          darkMode ? 'text-gray-200 group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'
        }`}>
          {activity.message}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${darkMode ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-500 group-hover:text-gray-600'}`}>
            {activity.time}
          </p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            activity.status === 'success' ? (darkMode ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-green-100 text-green-800') :
            activity.status === 'warning' ? (darkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' : 'bg-yellow-100 text-yellow-800') :
            (darkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-700' : 'bg-blue-100 text-blue-800')
          }`}>
            {activity.status}
          </span>
        </div>
      </div>
    </div>
  );

  const NotificationItem = ({ notification }) => (
    <div 
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 transform hover:scale-102 cursor-pointer ${
        notification.read 
          ? (darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200') 
          : (darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200')
      }`}
      onClick={() => !notification.read && markAsRead(notification.id)}
    >
      <div className={`w-2 h-2 rounded-full ${
        notification.read ? (darkMode ? 'bg-gray-600' : 'bg-gray-400') : (darkMode ? 'bg-blue-500 animate-pulse' : 'bg-blue-500 animate-pulse')
      }`}></div>
      <div className="flex-1">
        <p className={`text-sm leading-tight ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          {notification.message}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs capitalize ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {notification.type}
          </p>
          {notification.createdAt && (
            <p className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              {notification.createdAt}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const PerformanceMetric = ({ metric, index }) => (
    <div 
      className={`p-4 rounded-2xl border transform transition-all duration-300 hover:scale-105 animate-fade-in-up ${
        darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
      }`}
      style={{ animationDelay: `${index * 200}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {metric.label}
        </span>
        <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {metric.value}{metric.label === 'Response Time' ? 'ms' : '%'}
        </span>
      </div>
      <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div 
          className={`h-full bg-gradient-to-r ${metric.color} rounded-full transition-all duration-1500`}
          style={{ width: `${metric.value}%` }}
        ></div>
      </div>
    </div>
  );

  const TeamMember = ({ member, index }) => (
    <div 
      className={`flex items-center space-x-3 p-3 rounded-xl border transition-all duration-300 transform hover:scale-102 animate-slide-in ${
        darkMode 
          ? 'border-gray-700 hover:border-cyan-500 hover:bg-cyan-900/20' 
          : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
          {member.avatar}
        </div>
        <div className={`w-2 h-2 rounded-full border-2 ${
          darkMode ? 'border-gray-900' : 'border-white'
        } absolute -top-0.5 -right-0.5 ${
          member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
        }`}></div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'} truncate`}>
          {member.name}
        </p>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
          {member.role} {member.department && `• ${member.department}`}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {member.productivity}%
        </p>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Progress
        </p>
      </div>
    </div>
  );

  // Error display with login redirect
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-2xl">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="w-full px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/30'
    }`}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse ${
          darkMode ? 'bg-cyan-500/10' : 'bg-blue-200/20'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 ${
          darkMode ? 'bg-blue-500/10' : 'bg-indigo-200/20'
        }`}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold transition-colors duration-500 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Admin Dashboard
              </h1>
              <p className={`mt-2 text-lg transition-colors duration-500 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Welcome back! Here's what's happening today.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <div className={`flex rounded-lg p-1 border shadow-sm transition-colors duration-500 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-all duration-200 ${
                      timeRange === range 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 hover:rotate-12 ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 shadow-lg' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-lg border border-gray-200'
                }`}
              >
                <span className="text-xl">{darkMode ? '🌙' : '☀️'}</span>
              </button>

              {/* Profile */}
              <div className="relative group">
                <div className="w-3 h-3 bg-green-500 rounded-full absolute -top-1 -right-1 animate-ping"></div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg transform transition-transform duration-300 group-hover:scale-110 ${
                  darkMode 
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                }`}>
                  A
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            change="+12% from last month"
            icon="👥"
            color="bg-gradient-to-br from-blue-500 to-cyan-500"
            delay={0}
          />
          <StatCard
            title="Active Departments"
            value={stats.activeDepartments}
            change="+2 new departments"
            icon="🏢"
            color="bg-gradient-to-br from-green-500 to-emerald-500"
            delay={100}
          />
          <StatCard
            title="System Health"
            value={stats.systemHealth}
            icon="💚"
            color="bg-gradient-to-br from-purple-500 to-pink-500"
            delay={200}
            suffix="%"
          />
          <StatCard
            title="Employee Satisfaction"
            value={stats.employeeSatisfaction}
            change="+5% this quarter"
            icon="⭐"
            color="bg-gradient-to-br from-amber-500 to-orange-500"
            delay={300}
            suffix="%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Quick Actions
                </h2>
                <span className={`font-medium text-sm cursor-pointer transition-colors duration-200 ${
                  darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-500 hover:text-blue-600'
                }`}>
                  View all →
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.length > 0 ? quickActions.map((action) => (
                  <QuickAction
                    key={action.id}
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    color={darkMode ? action.color.replace('bg-', 'bg-').replace('text-', 'text-') : action.color}
                    onClick={() => handleQuickAction(action)}
                  />
                )) : (
                  <>
                    <QuickAction
                      title="Manage Users"
                      description="Add or remove system users"
                      icon="👤"
                      color="bg-blue-100 text-blue-600"
                      onClick={() => {}}
                    />
                    <QuickAction
                      title="System Settings"
                      description="Configure preferences"
                      icon="⚙️"
                      color="bg-green-100 text-green-600"
                      onClick={() => {}}
                    />
                    <QuickAction
                      title="View Reports"
                      description="Generate analytics"
                      icon="📊"
                      color="bg-purple-100 text-purple-600"
                      onClick={() => {}}
                    />
                    <QuickAction
                      title="Employee Onboarding"
                      description="Manage new hires"
                      icon="🎯"
                      color="bg-amber-100 text-amber-600"
                      onClick={() => {}}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Recent Activity
                </h2>
                <span className={`font-medium text-sm cursor-pointer transition-colors duration-200 ${
                  darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-500 hover:text-blue-600'
                }`}>
                  See all →
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                  <ActivityItem key={activity.id} activity={activity} index={index} />
                )) : (
                  <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className={`text-sm font-medium ${
                    darkMode ? 'text-cyan-400' : 'text-blue-500'
                  }`}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {notifications.length > 0 ? notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                )) : (
                  <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No notifications
                  </p>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                System Performance
              </h3>
              <div className="space-y-4">
                {performanceData.length > 0 ? performanceData.map((metric, index) => (
                  <PerformanceMetric key={index} metric={metric} index={index} />
                )) : (
                  <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No performance data
                  </p>
                )}
              </div>
            </div>

            {/* Team Overview */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                Team Overview
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {teamMembers.length > 0 ? teamMembers.map((member, index) => (
                  <TeamMember key={member.id} member={member} index={index} />
                )) : (
                  <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No team members
                  </p>
                )}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                Upcoming Events
              </h3>
              <div className="space-y-3">
                <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
                  darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                    15
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Team Meeting</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>10:00 AM • Conference Room A</p>
                  </div>
                </div>
                <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
                  darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                    16
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Project Review</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>2:00 PM • Virtual Meeting</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-700 dark:text-gray-300">Loading dashboard data...</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${darkMode ? '#374151' : '#f1f5f9'};
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#4b5563' : '#cbd5e1'};
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#6b7280' : '#94a3b8'};
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;