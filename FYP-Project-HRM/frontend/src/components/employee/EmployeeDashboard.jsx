import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { 
  FaCalendarAlt, FaChartLine, FaClock, FaEnvelope, FaHistory, 
  FaHome, FaPaperPlane, FaStar, FaUser, FaUserClock, FaBell,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaFileAlt,
  FaMoneyBillWave, FaUmbrellaBeach, FaBriefcase, FaUsers,
  FaHourglassHalf, FaHeartbeat, FaSmile, FaChevronDown, FaChevronUp
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
    orange:   'bg-orange-50 text-orange-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

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

// Team Members Component with scroll
const TeamMembersList = ({ members }) => {
  const [showAll, setShowAll] = useState(false);
  const displayedMembers = showAll ? members : members.slice(0, 3);

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FaUsers className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No team members found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {displayedMembers.map((member, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-semibold">
                  {member.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -top-0.5 -right-0.5 ${
                member.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role || 'Team Member'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{member.productivity || 0}%</p>
              <p className="text-xs text-gray-400">Productivity</p>
            </div>
          </div>
        ))}
      </div>
      
      {members.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-2 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
        >
          {showAll ? (
            <>Show Less <FaChevronUp className="text-xs" /></>
          ) : (
            <>Show All ({members.length}) <FaChevronDown className="text-xs" /></>
          )}
        </button>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

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
      leaveBalance: {
        annual: 0,
        sick: 0,
        casual: 0
      },
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
  const [error, setError] = useState(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Fetch all dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('🔄 Loading dashboard data...');
        
        const endpoints = [
          '/employee-dashboard/stats',
          '/employee-dashboard/upcoming-events',
          '/employee-dashboard/activities',
          '/employee-dashboard/team-members',
          '/employee-dashboard/performance-metrics'
        ];

        const requests = endpoints.map(endpoint => 
          axiosInstance.get(endpoint).catch(err => {
            console.error(`❌ Failed to load ${endpoint}:`, err.response?.status, err.message);
            return { data: { success: false, data: [] } };
          })
        );

        const [
          statsResponse,
          eventsResponse,
          activityResponse,
          teamResponse,
          performanceResponse
        ] = await Promise.all(requests);

        if (statsResponse?.data?.success) {
          setDashboardData(statsResponse.data.data);
        }

        if (eventsResponse?.data?.success) {
          setUpcomingEvents(eventsResponse.data.data || []);
        }

        if (activityResponse?.data?.success) {
          setRecentActivity(activityResponse.data.data || []);
        }

        if (teamResponse?.data?.success) {
          setTeamMembers(teamResponse.data.data || []);
        }

        if (performanceResponse?.data?.success) {
          setPerformanceMetrics(performanceResponse.data.data || []);
        }

      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Navigation handlers
  const handleApplyLeave = () => navigate('/employee/leave');
  const handleViewPayslip = () => navigate('/employee/payroll');
  const handleUpdateProfile = () => navigate('/employee/profile');
  const handleViewAttendance = () => navigate('/employee/attendance');
  const handleViewMessages = () => navigate('/employee/messages');

  // Get icon for leave type
  const getLeaveIcon = (type) => {
    switch(type) {
      case 'annual': return <FaBriefcase className="text-indigo-600 text-lg" />;
      case 'sick': return <FaHeartbeat className="text-red-500 text-lg" />;
      case 'casual': return <FaSmile className="text-emerald-500 text-lg" />;
      default: return <FaHourglassHalf className="text-gray-500 text-lg" />;
    }
  };

  // Get color for leave type
  const getLeaveColor = (type) => {
    switch(type) {
      case 'annual': return 'bg-indigo-100';
      case 'sick': return 'bg-red-100';
      case 'casual': return 'bg-emerald-100';
      default: return 'bg-gray-100';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
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

  // Display activities (limited or all)
  const displayedActivities = showAllActivity ? recentActivity : recentActivity.slice(0, 3);
  const displayedEvents = showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaHome className="text-indigo-600" /> Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {dashboardData.userInfo.name || 'Employee'}!
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="info">{dashboardData.userInfo.department || 'Department'}</Badge>
                <Badge variant="primary">{dashboardData.userInfo.position || 'Position'}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaBell className="w-5 h-5" />
              <span className="text-sm">Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard 
            icon={FaUmbrellaBeach} 
            label="Leave Balance" 
            value={dashboardData.stats.totalAvailableLeaves} 
            sub={`${dashboardData.stats.totalUsedLeaves} days used`} 
            iconBg="bg-indigo-500" 
          />
          <KpiCard 
            icon={FaCalendarAlt} 
            label="Working Days" 
            value={dashboardData.stats.attendance.workingDays} 
            sub={`${dashboardData.stats.attendance.presentDays} present this month`} 
            iconBg="bg-emerald-500" 
          />
          <KpiCard 
            icon={FaFileAlt} 
            label="Leave Requests" 
            value={dashboardData.stats.leaveRequests.total} 
            sub={`${dashboardData.stats.leaveRequests.pending} pending`} 
            iconBg="bg-amber-500" 
          />
          <KpiCard 
            icon={FaChartLine} 
            label="Attendance Rate" 
            value={`${dashboardData.stats.attendance.attendanceRate}%`} 
            sub="This month" 
            iconBg="bg-violet-500" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaClock className="text-indigo-600" /> Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickAction
                  icon={FaUmbrellaBeach}
                  title="Apply Leave"
                  description="Submit a new leave request"
                  color="bg-indigo-500"
                  onClick={handleApplyLeave}
                />
                <QuickAction
                  icon={FaMoneyBillWave}
                  title="View Payroll"
                  description="Access salary and payslips"
                  color="bg-emerald-500"
                  onClick={handleViewPayslip}
                />
                <QuickAction
                  icon={FaUser}
                  title="My Profile"
                  description="Update personal information"
                  color="bg-amber-500"
                  onClick={handleUpdateProfile}
                />
                <QuickAction
                  icon={FaUserClock}
                  title="View Attendance"
                  description="Check attendance history"
                  color="bg-violet-500"
                  onClick={handleViewAttendance}
                />
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaHistory className="text-indigo-600" /> Recent Activity
                </h2>
                <div className="space-y-3">
                  {displayedActivities.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activity.status === 'approved' ? 'bg-emerald-100' :
                        activity.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <FaCheckCircle className={`text-sm ${
                          activity.status === 'approved' ? 'text-emerald-600' :
                          activity.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.time ? new Date(activity.time).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                      <Badge variant={
                        activity.status === 'approved' ? 'success' :
                        activity.status === 'pending' ? 'warning' : 'danger'
                      }>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                {recentActivity.length > 3 && (
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

            {/* Leave Balance Breakdown - Without Emojis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaUmbrellaBeach className="text-indigo-600" /> Leave Balance Breakdown
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(dashboardData.stats.leaveBalance || {}).map(([type, balance]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 capitalize">{type} Leave</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{balance}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getLeaveColor(type)}`}>
                        {getLeaveIcon(type)}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaCalendarAlt className="text-indigo-600" /> Upcoming Events
              </h2>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FaCalendarAlt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {displayedEvents.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <FaCalendarAlt className="text-indigo-600 text-sm" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{event.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {event.date ? new Date(event.date).toLocaleDateString() : 'Date TBD'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {upcomingEvents.length > 3 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      className="w-full mt-3 py-2 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      {showAllEvents ? (
                        <>Show Less <FaChevronUp className="text-xs" /></>
                      ) : (
                        <>Show All ({upcomingEvents.length}) <FaChevronDown className="text-xs" /></>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Performance Metrics */}
            {performanceMetrics.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-indigo-600" /> Performance Metrics
                </h2>
                <div className="space-y-4">
                  {performanceMetrics.slice(0, 4).map((metric, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-700">{metric.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{metric.value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members - With Show All functionality (scroll alternative) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaUsers className="text-indigo-600" /> Team Members
              </h2>
              <TeamMembersList members={teamMembers} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;