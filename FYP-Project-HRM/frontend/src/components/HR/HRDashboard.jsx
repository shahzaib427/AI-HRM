import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { 
  FaUsers, FaBriefcase, FaUmbrellaBeach, FaChartLine, 
  FaUserPlus, FaFileAlt, FaCalendarAlt, FaClock, FaHistory,
  FaCheckCircle, FaExclamationTriangle, FaUserTie, FaMoneyBillWave,
  FaClipboardList, FaBuilding, FaIdCard, FaEnvelope, FaBell,
  FaChevronDown, FaChevronUp, FaSpinner
} from 'react-icons/fa';

// ─── UI Primitives ────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default:  'bg-gray-100 text-gray-600',
    success:  'bg-emerald-50 text-emerald-700',
    warning:  'bg-amber-50 text-amber-700',
    danger:   'bg-red-50 text-red-700',
    info:     'bg-blue-50 text-blue-700',
    primary:  'bg-indigo-50 text-indigo-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

const KpiCard = ({ icon: Icon, label, value, sub, iconBg, subValue }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {subValue && <p className={`text-xs mt-1 ${subValue.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{subValue}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="text-white text-sm" />
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, title, description, color, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 group"
  >
    <div className="flex items-center space-x-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="text-white text-sm" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">
          {title}
        </h4>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
        <span className="text-indigo-500 text-lg">→</span>
      </div>
    </div>
  </button>
);

const ActivityItem = ({ activity }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
      activity.status === 'completed' ? 'bg-emerald-100' :
      activity.status === 'pending' ? 'bg-amber-100' : 'bg-blue-100'
    }`}>
      {activity.status === 'completed' ? (
        <FaCheckCircle className="text-emerald-600 text-sm" />
      ) : activity.status === 'pending' ? (
        <FaClock className="text-amber-600 text-sm" />
      ) : (
        <FaUserPlus className="text-blue-600 text-sm" />
      )}
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-800">{activity.message}</p>
      <p className="text-xs text-gray-400 mt-1">{activity.time || 'Just now'}</p>
    </div>
    <Badge variant={
      activity.status === 'completed' ? 'success' :
      activity.status === 'pending' ? 'warning' : 'info'
    }>
      {activity.status}
    </Badge>
  </div>
);

const ApprovalItem = ({ approval }) => {
  const getColorClass = () => {
    switch(approval.color) {
      case 'yellow': return 'bg-amber-100 border-amber-200';
      case 'green': return 'bg-emerald-100 border-emerald-200';
      case 'purple': return 'bg-purple-100 border-purple-200';
      default: return 'bg-blue-100 border-blue-200';
    }
  };

  return (
    <div className={`flex justify-between items-center p-4 rounded-lg border ${getColorClass()}`}>
      <div>
        <p className="text-sm font-medium text-gray-800">{approval.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {approval.count} {approval.count === 1 ? 'item' : 'items'} waiting
        </p>
      </div>
      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
        Review
      </button>
    </div>
  );
};

const RecruitmentProgress = ({ recruitment }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
    <div className="flex justify-between items-start mb-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">{recruitment.position}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {recruitment.applicants} applicants • {recruitment.stage}
        </p>
      </div>
      <span className="text-sm font-bold text-indigo-600">{recruitment.progress}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
        style={{ width: `${recruitment.progress}%` }}
      />
    </div>
  </div>
);

const MetricBar = ({ metric }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm text-gray-700">{metric.label}</span>
      <span className="text-sm font-semibold text-gray-900">
        {metric.label === 'Time to Hire' ? `${metric.value} days` : `${metric.value}%`}
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div 
        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, metric.value)}%` }}
      />
    </div>
    {metric.description && (
      <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const HRDashboard = () => {
  const navigate = useNavigate();
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
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllApprovals, setShowAllApprovals] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled([
          axiosInstance.get('/hr/dashboard/stats'),
          axiosInstance.get('/hr/dashboard/recent-activity'),
          axiosInstance.get('/hr/dashboard/pending-approvals'),
          axiosInstance.get('/hr/dashboard/recruitment-data'),
          axiosInstance.get('/hr/dashboard/metrics')
        ]);

        // Check for 401
        const unauthorized = results.find(
          r => r.status === 'rejected' && r.reason?.response?.status === 401
        );
        if (unauthorized) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        // Check for 403
        const forbidden = results.find(
          r => r.status === 'rejected' && r.reason?.response?.status === 403
        );
        if (forbidden) {
          setError('Access denied. Your account does not have HR dashboard permissions.');
          setIsLoading(false);
          return;
        }

        // Stats
        if (results[0].status === 'fulfilled' && results[0].value?.data?.success) {
          setStats(results[0].value.data.data);
        }

        // Recent Activity
        if (results[1].status === 'fulfilled' && results[1].value.data.success) {
          setRecentActivity(results[1].value.data.data || []);
        }

        // Pending Approvals
        if (results[2].status === 'fulfilled' && results[2].value.data.success) {
          setPendingApprovals(results[2].value.data.data || []);
        }

        // Recruitment Data
        if (results[3].status === 'fulfilled' && results[3].value.data.success) {
          setRecruitmentData(results[3].value.data.data || []);
        }

        // Metrics
        if (results[4].status === 'fulfilled' && results[4].value.data.success) {
          setTeamMetrics(results[4].value.data.data || []);
        }

      } catch (err) {
        console.error('Error loading HR dashboard:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Navigation handlers
  const handleEmployeeManagement = () => navigate('/hr/employees');
  const handleProcessPayroll = () => navigate('/hr/payroll');
  const handleRecruitment = () => navigate('/hr/recruitment');
  const handlePerformanceReviews = () => navigate('/hr/performance');

  // Display helpers
  const displayedActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 4);
  const displayedApprovals = showAllApprovals ? pendingApprovals : pendingApprovals.slice(0, 3);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-500 text-lg" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-500 text-sm mb-5">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            Retry
          </button>
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
                <FaUserTie className="text-indigo-600" /> HR Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage employees, payroll, and recruitment
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaBell className="w-5 h-5" />
              <span className="text-sm">HR Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard 
            icon={FaUsers} 
            label="Total Employees" 
            value={stats.totalEmployees} 
            subValue={stats.newHires > 0 ? `+${stats.newHires} this month` : null}
            iconBg="bg-indigo-500" 
          />
          <KpiCard 
            icon={FaBriefcase} 
            label="Open Positions" 
            value={stats.openPositions} 
            sub="Active job postings"
            iconBg="bg-emerald-500" 
          />
          <KpiCard 
            icon={FaUmbrellaBeach} 
            label="Pending Leave" 
            value={stats.pendingLeave} 
            sub="Awaiting approval"
            iconBg="bg-amber-500" 
          />
          <KpiCard 
            icon={FaChartLine} 
            label="Training Progress" 
            value={`${stats.trainingProgress}%`} 
            sub="Completion rate"
            iconBg="bg-violet-500" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaClock className="text-indigo-600" /> Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickAction
                  icon={FaUsers}
                  title="Employee Management"
                  description="View and manage employee records"
                  color="bg-indigo-500"
                  onClick={handleEmployeeManagement}
                />
                <QuickAction
                  icon={FaMoneyBillWave}
                  title="Process Payroll"
                  description="Run payroll for current period"
                  color="bg-emerald-500"
                  onClick={handleProcessPayroll}
                />
                <QuickAction
                  icon={FaClipboardList}
                  title="Recruitment"
                  description="Manage job postings and candidates"
                  color="bg-amber-500"
                  onClick={handleRecruitment}
                />
                <QuickAction
                  icon={FaChartLine}
                  title="Performance Reviews"
                  description="Schedule and conduct reviews"
                  color="bg-violet-500"
                  onClick={handlePerformanceReviews}
                />
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaHistory className="text-indigo-600" /> Recent Activity
                </h2>
                <div className="space-y-2">
                  {displayedActivity.map((activity, idx) => (
                    <ActivityItem key={idx} activity={activity} />
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

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FaFileAlt className="text-indigo-600" /> Pending Approvals
                  </h2>
                  <Badge variant="primary">
                    {pendingApprovals.reduce((sum, item) => sum + item.count, 0)} total
                  </Badge>
                </div>
                <div className="space-y-3">
                  {displayedApprovals.map((approval, idx) => (
                    <ApprovalItem key={idx} approval={approval} />
                  ))}
                </div>
                {pendingApprovals.length > 3 && (
                  <button
                    onClick={() => setShowAllApprovals(!showAllApprovals)}
                    className="w-full mt-3 py-2 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllApprovals ? (
                      <>Show Less <FaChevronUp className="text-xs" /></>
                    ) : (
                      <>Show All ({pendingApprovals.length}) <FaChevronDown className="text-xs" /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Recruitment Progress */}
            {recruitmentData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaUserPlus className="text-indigo-600" /> Recruitment Progress
                </h2>
                <div className="space-y-3">
                  {recruitmentData.map((recruitment, idx) => (
                    <RecruitmentProgress key={idx} recruitment={recruitment} />
                  ))}
                </div>
              </div>
            )}

            {/* HR Metrics */}
            {teamMetrics.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-indigo-600" /> HR Metrics
                </h2>
                <div className="space-y-4">
                  {teamMetrics.map((metric, idx) => (
                    <MetricBar key={idx} metric={metric} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;