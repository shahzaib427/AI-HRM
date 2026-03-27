import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    userInfo: {
      name: '',
      email: '',
      department: '',
      position: '',
      joiningDate: ''
    },
    stats: {
      leaveBalance: {},
      totalAvailableLeaves: 0,
      totalUsedLeaves: 0,
      leaveRequests: {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      },
      attendance: {
        presentDays: 0,
        workingDays: 0,
        attendanceRate: 0
      }
    }
  });
  
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('monthly');
  const [darkMode, setDarkMode] = useState(false);

  // Fetch all dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        console.log('🔄 Loading dashboard data...');
        
        // Fetch all dashboard endpoints concurrently
        const endpoints = [
          '/employee-dashboard/stats',
          '/employee-dashboard/upcoming-events',
          '/employee-dashboard/activities',
          '/employee-dashboard/team-members',
          '/employee-dashboard/performance-metrics'
        ];

        const requests = endpoints.map(endpoint => 
          axiosInstance.get(endpoint).catch(err => {
            console.log(`⚠️ Failed to load ${endpoint}:`, err.message);
            return { data: { success: false, data: null } };
          })
        );

        const [
          statsResponse,
          eventsResponse,
          activityResponse,
          teamResponse,
          performanceResponse
        ] = await Promise.all(requests);

        console.log('📊 API Responses:', {
          stats: statsResponse?.data,
          events: eventsResponse?.data,
          activity: activityResponse?.data,
          team: teamResponse?.data,
          performance: performanceResponse?.data
        });

        // Process stats data
        if (statsResponse?.data?.success) {
          const data = statsResponse.data.data;
          console.log('✅ Dashboard stats loaded:', data);
          setDashboardData(data);
        } else {
          console.log('❌ Stats API failed, loading fallback');
          loadFallbackData();
          return;
        }

        // Process upcoming events
        if (eventsResponse?.data?.success) {
          setUpcomingEvents(eventsResponse.data.data || []);
        }

        // Process recent activity
        if (activityResponse?.data?.success) {
          setRecentActivity(activityResponse.data.data || []);
        }

        // Process team members
        if (teamResponse?.data?.success) {
          setTeamMembers(teamResponse.data.data || []);
        }

        // Process performance metrics
        if (performanceResponse?.data?.success) {
          setPerformanceMetrics(performanceResponse.data.data || []);
        }

      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        loadFallbackData();
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Fallback data
  const loadFallbackData = () => {
    console.log('📋 Loading fallback data...');
    
    setDashboardData({
      userInfo: {
        name: 'John Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        position: 'Software Developer',
        joiningDate: '2023-01-15'
      },
      stats: {
        leaveBalance: { annual: 12, casual: 6, sick: 5 },
        totalAvailableLeaves: 23,
        totalUsedLeaves: 5,
        leaveRequests: {
          pending: 1,
          approved: 3,
          rejected: 0,
          total: 4
        },
        attendance: {
          presentDays: 18,
          workingDays: 20,
          attendanceRate: 90
        }
      }
    });

    setUpcomingEvents([
      { 
        id: 1, 
        title: 'Annual Leave', 
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'leave',
        description: 'Vacation time',
        icon: '🏖️',
        color: 'blue'
      },
      { 
        id: 2, 
        title: 'Team Meeting', 
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        type: 'meeting',
        description: 'Weekly team sync',
        icon: '👥',
        color: 'indigo'
      }
    ]);

    setRecentActivity([
      {
        id: 1,
        type: 'leave',
        title: 'Annual Leave Approved',
        description: '2 day(s): Vacation',
        time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'approved',
        icon: '✅',
        color: 'green'
      },
      {
        id: 2,
        type: 'leave',
        title: 'Sick Leave Pending',
        description: '1 day(s): Not feeling well',
        time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'pending',
        icon: '⏳',
        color: 'yellow'
      }
    ]);

    setTeamMembers([
      { 
        id: 1, 
        name: 'Alex Johnson', 
        email: 'alex@company.com',
        role: 'Senior Developer',
        department: 'Engineering',
        avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=random&color=fff',
        status: 'online',
        productivity: 92
      },
      { 
        id: 2, 
        name: 'Sarah Miller', 
        email: 'sarah@company.com',
        role: 'Project Manager',
        department: 'Engineering',
        avatar: 'https://ui-avatars.com/api/?name=Sarah+Miller&background=random&color=fff',
        status: 'online',
        productivity: 88
      }
    ]);

    setPerformanceMetrics([
      {
        label: 'Attendance',
        value: 95,
        icon: '📅',
        color: 'from-green-500 to-emerald-500',
        description: 'Present days this month'
      },
      {
        label: 'Productivity',
        value: 88,
        icon: '📊',
        color: 'from-blue-500 to-cyan-500',
        description: 'Based on task completion'
      }
    ]);
  };

  // ===== NAVIGATION HANDLERS =====
  const handleApplyLeave = () => {
    navigate('/employee/leave');
  };

  const handleViewPayslip = () => {
    navigate('/employee/payroll');
  };

  const handleUpdateProfile = () => {
    navigate('/employee/profile');
  };

  const handleViewDocuments = () => {
    navigate('/employee/documents');
  };

  const handleViewCalendar = () => {
    navigate('/employee/calendar');
  };

  const handleViewTeam = () => {
    navigate('/employee/team');
  };

  const handleViewDetails = () => {
    navigate('/employee/attendance');
  };

  const handleViewLeaves = () => {
    navigate('/employee/leave');
  };

  // ===== COMPONENTS =====
  const AnimatedCounter = ({ value, duration = 2000, suffix = '', prefix = '' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isLoading && value > 0) {
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

  const StatCard = ({ title, value, description, icon, color, delay, suffix = '' }) => (
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
            <AnimatedCounter value={value} suffix={suffix} />
          </div>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>{description}</p>
        </div>
        <div className={`p-3 rounded-xl ${color} text-white transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 shadow-lg`}>
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

  const EventItem = ({ event, index }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
      <div 
        className={`flex items-center space-x-4 p-4 rounded-xl border transition-all duration-300 transform hover:scale-102 group animate-slide-in ${
          darkMode 
            ? 'border-gray-700 hover:border-cyan-500 hover:bg-cyan-900/20' 
            : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50'
        }`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-lg">{event.icon || '📅'}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <p className={`text-sm font-medium transition-colors duration-300 ${
              darkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-blue-600'
            }`}>{event.title}</p>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${
              event.type === 'leave' ? (darkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-700' : 'bg-blue-100 text-blue-800') :
              event.type === 'meeting' ? (darkMode ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-700' : 'bg-indigo-100 text-indigo-800') :
              (darkMode ? 'bg-amber-900/30 text-amber-400 border border-amber-700' : 'bg-amber-100 text-amber-800')
            }`}>
              {event.type}
            </span>
          </div>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatDate(event.date)} {event.endDate ? `- ${formatDate(event.endDate)}` : ''}
          </p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{event.description}</p>
        </div>
      </div>
    );
  };

  const ActivityItem = ({ activity, index }) => {
    const formatTime = (time) => {
      if (!time) return 'Just now';
      const now = new Date();
      const activityTime = new Date(time);
      const diffHours = Math.floor((now - activityTime) / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    return (
      <div 
        className={`flex items-start space-x-4 p-4 rounded-xl border transition-all duration-300 transform hover:scale-102 group animate-slide-in ${
          darkMode 
            ? 'border-gray-700 hover:border-green-500 hover:bg-green-900/20' 
            : 'border-gray-200 hover:border-green-200 hover:bg-green-50'
        }`}
        style={{ animationDelay: `${index * 150}ms` }}
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-1 shadow-md ${
          activity.status === 'approved' ? (darkMode ? 'bg-green-900/50' : 'bg-green-100') :
          activity.status === 'pending' ? (darkMode ? 'bg-yellow-900/50' : 'bg-yellow-100') :
          (darkMode ? 'bg-red-900/50' : 'bg-red-100')
        }`}>
          <span className="text-lg">{activity.icon || '📝'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium transition-colors duration-300 leading-tight ${
            darkMode ? 'text-gray-200 group-hover:text-green-400' : 'text-gray-900 group-hover:text-green-600'
          }`}>
            {activity.title}
          </p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {activity.description}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${darkMode ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-500 group-hover:text-gray-600'}`}>
              {formatTime(activity.time)}
            </p>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                activity.status === 'approved' ? (darkMode ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-green-100 text-green-800') :
                activity.status === 'pending' ? (darkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' : 'bg-yellow-100 text-yellow-800') :
                (darkMode ? 'bg-red-900/30 text-red-400 border border-red-700' : 'bg-red-100 text-red-800')
              }`}>
                {activity.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        <img 
          src={member.avatar} 
          alt={member.name}
          className="w-10 h-10 rounded-full object-cover shadow-lg"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`;
          }}
        />
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
          {member.role}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {member.productivity || 0}%
        </p>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Productivity
        </p>
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
          {metric.value}%
        </span>
      </div>
      <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div 
          className={`h-full bg-gradient-to-r ${metric.color} rounded-full transition-all duration-1500`}
          style={{ width: `${metric.value}%` }}
        ></div>
      </div>
      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        {metric.description}
      </p>
    </div>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold transition-colors duration-500 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Employee Dashboard
              </h1>
              <p className={`mt-2 text-lg transition-colors duration-500 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Welcome back, {dashboardData.userInfo.name}! Here's your overview for today.
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  {dashboardData.userInfo.department}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  {dashboardData.userInfo.position}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <div className={`flex rounded-lg p-1 border shadow-sm transition-colors duration-500 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                {['daily', 'weekly', 'monthly'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
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
                className={`p-2 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-12 ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-lg border border-gray-200'
                }`}
              >
                <span className="text-xl">{darkMode ? '🌙' : '☀️'}</span>
              </button>

              {/* Profile */}
              <div className="relative group">
                <div className="w-3 h-3 bg-green-500 rounded-full absolute -top-1 -right-1 animate-ping"></div>
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg transform transition-transform duration-300 group-hover:scale-110 cursor-pointer ${
                    darkMode 
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white' 
                      : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                  }`}
                  onClick={() => navigate('/employee/profile')}
                >
                  {dashboardData.userInfo.name?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Leave Balance"
            value={dashboardData.stats.totalAvailableLeaves}
            description={`${dashboardData.stats.totalUsedLeaves} days used`}
            icon="🏖️"
            color="bg-gradient-to-br from-blue-500 to-cyan-500"
            delay={0}
          />
          <StatCard
            title="Working Days"
            value={dashboardData.stats.attendance.workingDays}
            description={`${dashboardData.stats.attendance.presentDays} present this month`}
            icon="📅"
            color="bg-gradient-to-br from-green-500 to-emerald-500"
            delay={100}
          />
          <StatCard
            title="Leave Requests"
            value={dashboardData.stats.leaveRequests.total}
            description={`${dashboardData.stats.leaveRequests.pending} pending`}
            icon="📋"
            color="bg-gradient-to-br from-purple-500 to-pink-500"
            delay={200}
          />
          <StatCard
            title="Attendance Rate"
            value={dashboardData.stats.attendance.attendanceRate}
            description="This month"
            icon="📊"
            color="bg-gradient-to-br from-amber-500 to-orange-500"
            delay={300}
            suffix="%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickAction
                  title="Apply Leave"
                  description="Submit a new leave request"
                  icon="📝"
                  color={darkMode ? "bg-cyan-900/50 text-cyan-400" : "bg-blue-100 text-blue-600"}
                  onClick={handleApplyLeave}
                />
                <QuickAction
                  title="View Payroll"
                  description="Access salary and payslips"
                  icon="💰"
                  color={darkMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-600"}
                  onClick={handleViewPayslip}
                />
                <QuickAction
                  title="My Profile"
                  description="Update personal information"
                  icon="👤"
                  color={darkMode ? "bg-purple-900/50 text-purple-400" : "bg-purple-100 text-purple-600"}
                  onClick={handleUpdateProfile}
                />
                <QuickAction
                  title="View Leaves"
                  description="Check leave history and status"
                  icon="📋"
                  color={darkMode ? "bg-amber-900/50 text-amber-400" : "bg-amber-100 text-amber-600"}
                  onClick={handleViewLeaves}
                />
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Recent Activity
                  </h2>
                  <span 
                    className={`font-medium text-sm cursor-pointer transition-colors duration-200 ${
                      darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-500 hover:text-blue-600'
                    }`}
                    onClick={handleViewLeaves}
                  >
                    View all →
                  </span>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                  {recentActivity.map((activity, index) => (
                    <ActivityItem key={activity.id || index} activity={activity} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Leave Balance Breakdown */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Leave Balance Breakdown
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(dashboardData.stats.leaveBalance || {}).map(([type, balance], index) => (
                  <div 
                    key={type}
                    className={`p-4 rounded-xl border ${
                      darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium capitalize ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {type} Leave
                        </p>
                        <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {balance}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${
                        type === 'annual' ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600') :
                        type === 'sick' ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600') :
                        (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600')
                      }`}>
                        <span className="text-lg">
                          {type === 'annual' ? '🏖️' : type === 'sick' ? '🤒' : '😊'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Upcoming Events
                </h2>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event, index) => (
                    <EventItem key={event.id || index} event={event} index={index} />
                  ))
                ) : (
                  <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No upcoming events
                  </p>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Team Members
                </h2>
                <span 
                  className={`font-medium text-sm cursor-pointer transition-colors duration-200 ${
                    darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-500 hover:text-blue-600'
                  }`}
                  onClick={handleViewTeam}
                >
                  View all →
                </span>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {teamMembers.length > 0 ? (
                  teamMembers.map((member, index) => (
                    <TeamMember key={member.id || index} member={member} index={index} />
                  ))
                ) : (
                  <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No team members available
                  </p>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            {performanceMetrics.length > 0 && (
              <div className={`rounded-2xl shadow-2xl border p-6 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Performance Metrics
                </h3>
                <div className="space-y-4">
                  {performanceMetrics.map((metric, index) => (
                    <PerformanceMetric key={index} metric={metric} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Styles */}
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

export default EmployeeDashboard;