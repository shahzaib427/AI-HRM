import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaUsers, FaBuilding, FaHeartbeat, FaStar, FaChartLine, 
  FaClock, FaBell, FaUser, FaSpinner, FaChevronDown, FaChevronUp,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// KPI Card Component
const KpiCard = ({ icon: Icon, label, value, sub, iconBg }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="text-white text-sm" />
      </div>
    </div>
  </div>
);

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
  const [quickActions, setQuickActions] = useState([]);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllTeam, setShowAllTeam] = useState(false);

  const createApi = (token) => axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Redirecting to login...');
        setTimeout(() => { window.location.href = '/login'; }, 2000);
        return;
      }

      const api = createApi(token);

      try {
        const results = await Promise.allSettled([
          api.get('/admin/dashboard/stats'),
          api.get('/admin/dashboard/recent-activity'),
          api.get('/admin/dashboard/team-members'),
          api.get('/admin/dashboard/notifications'),
          api.get(`/admin/dashboard/performance-metrics?timeRange=${timeRange}`),
          api.get('/admin/dashboard/quick-actions')
        ]);

        const unauthorizedCall = results.find(
          r => r.status === 'rejected' && r.reason?.response?.status === 401
        );
        if (unauthorizedCall) {
          localStorage.removeItem('token');
          setError('Session expired. Redirecting to login...');
          setTimeout(() => { window.location.href = '/login'; }, 2000);
          return;
        }

        if (results[0].status === 'fulfilled' && results[0].value.data.success) {
          const d = results[0].value.data.data;
          setStats({
            totalEmployees: d.totalEmployees || 0,
            activeDepartments: d.activeDepartments || 0,
            systemHealth: d.systemHealth || 0,
            pendingTasks: d.pendingTasks || d.pendingLeaves || 0,
            revenue: d.revenue || 0,
            performance: d.performance || 0,
            employeeSatisfaction: d.employeeSatisfaction || 0
          });
        } else if (results[0].status === 'rejected') {
          const status = results[0].reason?.response?.status;
          throw new Error(
            status === 403
              ? 'Access denied. Admin role required.'
              : 'Failed to load stats. Please check the server.'
          );
        }

        if (results[1].status === 'fulfilled' && results[1].value.data.success) {
          setRecentActivity(results[1].value.data.data || []);
        }

        if (results[2].status === 'fulfilled' && results[2].value.data.success) {
          setTeamMembers(results[2].value.data.data || []);
        }

        if (results[3].status === 'fulfilled' && results[3].value.data.success) {
          setNotifications(results[3].value.data.data.notifications || []);
          setUnreadCount(results[3].value.data.data.unreadCount || 0);
        }

        if (results[4].status === 'fulfilled' && results[4].value.data.success) {
          setPerformanceData(results[4].value.data.data || []);
        }

        if (results[5].status === 'fulfilled' && results[5].value.data.success) {
          setQuickActions(results[5].value.data.data || []);
        }

      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Error loading dashboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const api = createApi(token);
      await api.patch(`/admin/dashboard/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleQuickAction = (action) => {
    if (action.path) window.location.href = action.path;
  };

  // Display helpers
  const displayedActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 4);
  const displayedNotifications = showAllNotifications ? notifications : notifications.slice(0, 3);
  const displayedTeam = showAllTeam ? teamMembers : teamMembers.slice(0, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-500 text-lg" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-500 text-sm mb-5">{error}</p>
          <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
              Retry
            </button>
            <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} className="w-full px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaChartLine className="text-indigo-600" /> Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back! Here's what's happening today.
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaUsers className="w-5 h-5" />
              <span className="text-sm">Admin Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-end">
          <div className="flex rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
            {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                  timeRange === range
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard icon={FaUsers} label="Total Employees" value={stats.totalEmployees} iconBg="bg-indigo-500" />
          <KpiCard icon={FaBuilding} label="Active Departments" value={stats.activeDepartments} iconBg="bg-emerald-500" />
          <KpiCard icon={FaHeartbeat} label="System Health" value={`${stats.systemHealth}%`} iconBg="bg-amber-500" />
          <KpiCard icon={FaStar} label="Employee Satisfaction" value={`${stats.employeeSatisfaction}%`} iconBg="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaClock className="text-indigo-600" /> Quick Actions
              </h2>
              {quickActions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No quick actions available</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color || 'bg-indigo-100'} group-hover:scale-110 transition-transform duration-300`}>
                          <span className="text-lg">{action.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {action.title}
                          </h4>
                          <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          <span className="text-indigo-500 text-lg">→</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaClock className="text-indigo-600" /> Recent Activity
                </h2>
                <div className="space-y-3">
                  {displayedActivity.map((activity, idx) => (
                    <div key={activity.id || idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activity.status === 'completed' || activity.status === 'success' ? 'bg-emerald-100' :
                        activity.status === 'pending' ? 'bg-amber-100' : 'bg-indigo-100'
                      }`}>
                        {activity.status === 'completed' || activity.status === 'success' ? (
                          <FaCheckCircle className="text-emerald-600 text-sm" />
                        ) : activity.status === 'pending' ? (
                          <FaClock className="text-amber-600 text-sm" />
                        ) : (
                          <FaExclamationTriangle className="text-indigo-600 text-sm" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time || 'Just now'}</p>
                      </div>
                      <Badge variant={
                        activity.status === 'completed' || activity.status === 'success' ? 'success' :
                        activity.status === 'pending' ? 'warning' : 'info'
                      }>
                        {activity.status || 'Info'}
                      </Badge>
                    </div>
                  ))}
                </div>
                {recentActivity.length > 4 && (
                  <button
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="w-full mt-3 py-2 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllActivity ? (
                      <>Show Less <FaChevronUp className="text-xs" /></>
                    ) : (
                      <>Show All ({recentActivity.length}) <FaChevronDown className="text-xs" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FaBell className="text-indigo-600" /> Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <Badge variant="warning">{unreadCount} new</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {displayedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        notification.read
                          ? 'bg-white border-gray-200'
                          : 'bg-indigo-50 border-indigo-200'
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                        notification.read ? 'bg-gray-400' : 'bg-indigo-500 animate-pulse'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="info">{notification.type}</Badge>
                          {notification.createdAt && (
                            <p className="text-xs text-gray-400">{notification.createdAt}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {notifications.length > 3 && (
                  <button
                    onClick={() => setShowAllNotifications(!showAllNotifications)}
                    className="w-full mt-3 py-2 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllNotifications ? (
                      <>Show Less <FaChevronUp className="text-xs" /></>
                    ) : (
                      <>Show All ({notifications.length}) <FaChevronDown className="text-xs" /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Performance Metrics */}
            {performanceData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-indigo-600" /> System Performance
                </h2>
                <div className="space-y-4">
                  {performanceData.map((metric, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-700">{metric.label}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {metric.label === 'Response Time' ? `${metric.value}ms` : `${metric.value}%`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${metric.label === 'Response Time' ? Math.min(100, (1000 - metric.value) / 10) : metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Overview */}
            {teamMembers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaUsers className="text-indigo-600" /> Team Overview
                </h2>
                <div className="space-y-3">
                  {displayedTeam.map((member, idx) => (
                    <div key={member.id || idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {member.avatar || member.name?.charAt(0) || 'U'}
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -top-0.5 -right-0.5 ${
                          member.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}{member.department ? ` • ${member.department}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{member.productivity || 0}%</p>
                        <p className="text-xs text-gray-400">Progress</p>
                      </div>
                    </div>
                  ))}
                </div>
                {teamMembers.length > 3 && (
                  <button
                    onClick={() => setShowAllTeam(!showAllTeam)}
                    className="w-full mt-3 py-2 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllTeam ? (
                      <>Show Less <FaChevronUp className="text-xs" /></>
                    ) : (
                      <>Show All ({teamMembers.length}) <FaChevronDown className="text-xs" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;