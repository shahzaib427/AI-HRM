import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';

const HRDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    openPositions: 0,
    pendingLeave: 0,
    newHires: 0,
    turnoverRate: 0,
    trainingProgress: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recruitmentData, setRecruitmentData] = useState([]);
  const [teamMetrics, setTeamMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('monthly');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use allSettled so one failing endpoint never crashes the whole dashboard
        const results = await Promise.allSettled([
          axiosInstance.get('/hr/dashboard/stats'),
          axiosInstance.get('/hr/dashboard/recent-activity'),
          axiosInstance.get('/hr/dashboard/pending-approvals'),
          axiosInstance.get('/hr/dashboard/recruitment-data'),
          axiosInstance.get('/hr/dashboard/metrics')
        ]);

        // Check for 401 — token expired or invalid
        const unauthorized = results.find(
          r => r.status === 'rejected' && r.reason?.response?.status === 401
        );
        if (unauthorized) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        // Check for 403 — role not allowed (likely HR role mismatch)
        const forbidden = results.find(
          r => r.status === 'rejected' && r.reason?.response?.status === 403
        );
        if (forbidden) {
          setError('Access denied. Your account does not have HR dashboard permissions. Contact your administrator.');
          setIsLoading(false);
          return;
        }

        // Stats is required — fail loudly if it's missing
        if (results[0].status === 'rejected') {
          throw new Error('Failed to load HR stats: ' + (results[0].reason?.message || 'Unknown error'));
        }
        if (!results[0].value?.data?.success) {
          throw new Error('HR stats API returned an unsuccessful response');
        }
        setStats(results[0].value.data.data);

        // All other endpoints are non-critical — use empty fallbacks
        if (results[1].status === 'fulfilled' && results[1].value.data.success) {
          setRecentActivity(results[1].value.data.data || []);
        } else {
          console.warn('Recent activity failed:', results[1].reason?.message);
        }

        if (results[2].status === 'fulfilled' && results[2].value.data.success) {
          setPendingApprovals(results[2].value.data.data || []);
        } else {
          console.warn('Pending approvals failed:', results[2].reason?.message);
        }

        if (results[3].status === 'fulfilled' && results[3].value.data.success) {
          setRecruitmentData(results[3].value.data.data || []);
        } else {
          console.warn('Recruitment data failed:', results[3].reason?.message);
        }

        if (results[4].status === 'fulfilled' && results[4].value.data.success) {
          setTeamMetrics(results[4].value.data.data || []);
        } else {
          console.warn('HR metrics failed:', results[4].reason?.message);
        }

      } catch (err) {
        console.error('Error loading HR dashboard:', err);

        if (err.code === 'ECONNABORTED') {
          setError('Request timeout. Please check if the server is running.');
        } else if (err.request && !err.response) {
          setError('Cannot connect to server. Please check if the backend is running on port 5000.');
        } else {
          setError(err.message || 'Failed to load dashboard data. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // ==================== SUB-COMPONENTS ====================

  const AnimatedCounter = ({ value, duration = 2000, prefix = '', suffix = '' }) => {
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

  const StatCard = ({ title, value, change, icon, color, delay, suffix = '' }) => (
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
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {activity.time || 'Just now'}
          </p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            activity.status === 'completed'
              ? (darkMode ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-green-100 text-green-800')
              : activity.status === 'pending'
                ? (darkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' : 'bg-yellow-100 text-yellow-800')
                : activity.status === 'active'
                  ? (darkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-700' : 'bg-blue-100 text-blue-800')
                  : (darkMode ? 'bg-purple-900/30 text-purple-400 border border-purple-700' : 'bg-purple-100 text-purple-800')
          }`}>
            {activity.status}
          </span>
        </div>
      </div>
    </div>
  );

  const ApprovalItem = ({ approval, index }) => {
    const colorMap = {
      yellow: {
        card: darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200',
        btn: darkMode ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-yellow-500 hover:bg-yellow-600'
      },
      blue: {
        card: darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200',
        btn: darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
      },
      green: {
        card: darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200',
        btn: darkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'
      },
      purple: {
        card: darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200',
        btn: darkMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-500 hover:bg-purple-600'
      }
    };
    const colors = colorMap[approval.color] || colorMap.blue;

    return (
      <div
        className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-300 transform hover:scale-102 animate-slide-in ${colors.card}`}
        style={{ animationDelay: `${index * 150}ms` }}
      >
        <div>
          <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            {approval.title}
          </p>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {approval.count} {approval.count === 1 ? 'item' : 'items'} waiting
          </p>
        </div>
        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg text-white ${colors.btn}`}>
          Review
        </button>
      </div>
    );
  };

  const RecruitmentProgress = ({ recruitment, index }) => (
    <div
      className={`p-4 rounded-xl border transition-all duration-300 transform hover:scale-102 animate-fade-in-up ${
        darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
      }`}
      style={{ animationDelay: `${index * 200}ms` }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            {recruitment.position}
          </p>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {recruitment.applicants} applicants • {recruitment.stage}
          </p>
        </div>
        <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {recruitment.progress}%
        </span>
      </div>
      <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
          style={{ width: `${recruitment.progress}%` }}
        />
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
          {metric.value}{metric.label === 'Time to Hire' ? ' days' : '%'}
        </span>
      </div>
      <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className={`h-full bg-gradient-to-r ${metric.color} rounded-full transition-all duration-1500`}
          style={{ width: `${Math.min(100, metric.value)}%` }}
        />
      </div>
      {metric.description && (
        <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          {metric.description}
        </p>
      )}
    </div>
  );

  // ==================== ERROR STATE ====================
  if (error && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/30">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-2xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ==================== LOADING STATE ====================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading HR dashboard...</p>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className={`min-h-screen py-8 transition-all duration-500 ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/30'
    }`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse ${darkMode ? 'bg-cyan-500/10' : 'bg-blue-200/20'}`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 ${darkMode ? 'bg-blue-500/10' : 'bg-indigo-200/20'}`} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold transition-colors duration-500 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                HR Manager Dashboard
              </h1>
              <p className={`mt-2 text-lg transition-colors duration-500 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage employees, payroll, and recruitment
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex rounded-lg p-1 border shadow-sm transition-colors duration-500 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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

              <div className="relative group">
                <div className="w-3 h-3 bg-green-500 rounded-full absolute -top-1 -right-1 animate-ping" />
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg transform transition-transform duration-300 group-hover:scale-110 ${
                  darkMode
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                }`}>
                  HR
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
            change={stats.newHires > 0 ? `+${stats.newHires} this month` : null}
            icon="👥"
            color="bg-gradient-to-br from-blue-500 to-cyan-500"
            delay={0}
          />
          <StatCard
            title="Open Positions"
            value={stats.openPositions}
            icon="💼"
            color="bg-gradient-to-br from-green-500 to-emerald-500"
            delay={100}
          />
          <StatCard
            title="Pending Leave"
            value={stats.pendingLeave}
            icon="🏖️"
            color="bg-gradient-to-br from-yellow-500 to-amber-500"
            delay={200}
          />
          <StatCard
            title="Training Progress"
            value={stats.trainingProgress}
            icon="📚"
            color="bg-gradient-to-br from-purple-500 to-pink-500"
            delay={300}
            suffix="%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className={`rounded-2xl shadow-2xl border p-6 animate-fade-in-up ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h2 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                HR Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickAction
                  title="Employee Management"
                  description="View and manage employee records"
                  icon="👥"
                  color={darkMode ? 'bg-cyan-900/50 text-cyan-400' : 'bg-blue-100 text-blue-600'}
                />
                <QuickAction
                  title="Process Payroll"
                  description="Run payroll for current period"
                  icon="💰"
                  color={darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'}
                />
                <QuickAction
                  title="Recruitment"
                  description="Manage job postings and candidates"
                  icon="📝"
                  color={darkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'}
                />
                <QuickAction
                  title="Performance Reviews"
                  description="Schedule and conduct reviews"
                  icon="📊"
                  color={darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}
                />
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className={`rounded-2xl shadow-2xl border p-6 animate-fade-in-up ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                <h2 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Recent HR Activity
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                  {recentActivity.map((activity, index) => (
                    <ActivityItem key={activity.id || index} activity={activity} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <div className={`rounded-2xl shadow-2xl border p-6 animate-fade-in-up ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Pending Approvals
                  </h2>
                  <span className={`font-medium text-sm ${darkMode ? 'text-cyan-400' : 'text-blue-500'}`}>
                    {pendingApprovals.reduce((sum, item) => sum + item.count, 0)} total
                  </span>
                </div>
                <div className="space-y-4">
                  {pendingApprovals.map((approval, index) => (
                    <ApprovalItem key={approval.id || index} approval={approval} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Recruitment Progress */}
            {recruitmentData.length > 0 && (
              <div className={`rounded-2xl shadow-2xl border p-6 animate-fade-in-up ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  Recruitment Progress
                </h3>
                <div className="space-y-4">
                  {recruitmentData.map((recruitment, index) => (
                    <RecruitmentProgress key={index} recruitment={recruitment} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* HR Metrics */}
            {teamMetrics.length > 0 && (
              <div className={`rounded-2xl shadow-2xl border p-6 animate-fade-in-up ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  HR Metrics
                </h3>
                <div className="space-y-4">
                  {teamMetrics.map((metric, index) => (
                    <PerformanceMetric key={index} metric={metric} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-slide-in   { animation: slideIn  0.6s ease-out forwards; }
        .hover\\:scale-102:hover { transform: scale(1.02); }
        .shadow-3xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
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

export default HRDashboard;