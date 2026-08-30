import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaUsers, FaBuilding, FaHeartbeat, FaStar, FaChartLine,
  FaClock, FaBell, FaUser, FaSpinner, FaChevronDown, FaChevronUp,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaMoneyBillWave,
  FaSearch, FaRobot, FaDatabase, FaServer, FaUserPlus, FaFileInvoiceDollar,
  FaCalendarCheck, FaChartPie, FaChartBar, FaCircle, FaArrowUp, FaArrowDown,
  FaWifi, FaBrain, FaChartArea
} from 'react-icons/fa';

/* ────────────────────────────────────────────────────────────────────────
   Small presentational primitives
   ──────────────────────────────────────────────────────────────────────── */

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-indigo-50 text-indigo-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const SectionCard = ({ title, icon: Icon, action, children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    {title && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 tracking-wide">
          {Icon && <Icon className="text-indigo-600 text-sm" />}
          {title}
        </h2>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const EmptyState = ({ label = 'No data available yet' }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
      <FaChartBar className="text-gray-300 text-sm" />
    </div>
    <p className="text-xs text-gray-400">{label}</p>
  </div>
);

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-100 rounded-md ${className}`} />
);

/* ────────────────────────────────────────────────────────────────────────
   KPI Card
   ──────────────────────────────────────────────────────────────────────── */

const KpiCard = ({ icon: Icon, label, value, change, iconBg }) => {
  const trendUp = typeof change === 'number' ? change >= 0 : null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 tracking-wide uppercase">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className="text-white text-xs" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {trendUp !== null && (
        <div className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {trendUp ? <FaArrowUp className="text-[10px]" /> : <FaArrowDown className="text-[10px]" />}
          <span>{Math.abs(change)}% this month</span>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────
   Lightweight, dependency-free charts (SVG). No charting library required.
   ──────────────────────────────────────────────────────────────────────── */

// Simple multi-series area/line chart for attendance trends
const AttendanceLineChart = ({ series, categories }) => {
  if (!series || series.length === 0) return <EmptyState label="Attendance analytics unavailable — connect the attendance-overview endpoint" />;

  const width = 560;
  const height = 200;
  const padding = 28;
  const allValues = series.flatMap(s => s.data);
  const maxVal = Math.max(...allValues, 1);

  const colors = { Present: '#6366F1', Absent: '#F43F5E', Late: '#F59E0B' };

  const pointsFor = (data) => data.map((v, i) => {
    const x = padding + (i * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - (v / maxVal) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padding} x2={width - padding} y1={height - padding - f * (height - padding * 2)} y2={height - padding - f * (height - padding * 2)} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        {series.map((s) => (
          <polyline key={s.name} points={pointsFor(s.data)} fill="none" stroke={colors[s.name] || '#6366F1'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {series.map((s) => s.data.map((v, i) => {
          const x = padding + (i * (width - padding * 2)) / Math.max(s.data.length - 1, 1);
          const y = height - padding - (v / maxVal) * (height - padding * 2);
          return <circle key={`${s.name}-${i}`} cx={x} cy={y} r="2.5" fill={colors[s.name] || '#6366F1'} />;
        }))}
      </svg>
      <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-gray-400">
        {categories.map((c) => <span key={c}>{c}</span>)}
      </div>
      <div className="flex items-center gap-4 mt-3">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[s.name] || '#6366F1' }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
};

// Donut chart used for employee distribution by department
const DonutChart = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState label="No department data available" />;

  const size = 160;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const palette = ['#6366F1', '#8B5CF6', '#22C55E', '#F59E0B', '#F43F5E', '#06B6D4', '#EAB308'];

  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, idx) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={palette[idx % palette.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text x="50%" y="48%" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 22, fontWeight: 700 }}>{total}</text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>Employees</text>
      </svg>
      <div className="space-y-2 flex-1">
        {data.map((d, idx) => (
          <div key={d.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette[idx % palette.length] }} />
              {d.label}
            </div>
            <span className="font-semibold text-gray-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Leave overview — horizontal proportional bars
const LeaveOverview = ({ pending, approved, rejected, hasFullData }) => {
  const total = pending + approved + rejected;
  const rows = [
    { label: 'Pending', value: pending, color: 'bg-amber-500' },
    { label: 'Approved', value: approved, color: 'bg-emerald-500' },
    { label: 'Rejected', value: rejected, color: 'bg-red-500' }
  ];

  if (total === 0) return <EmptyState label="No leave requests to display" />;

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-600">{r.label}</span>
            <span className="font-semibold text-gray-900">{r.value}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${r.color} rounded-full transition-all duration-500`} style={{ width: `${total ? (r.value / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
      {!hasFullData && (
        <p className="text-[11px] text-gray-400 pt-1">Showing pending requests only — connect the leave-overview endpoint for approved/rejected breakdown.</p>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────
   Main Dashboard
   ──────────────────────────────────────────────────────────────────────── */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeDepartments: 0,
    systemHealth: 0,
    pendingTasks: 0,
    payrollCost: 0,
    performance: 0,
    employeeSatisfaction: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('weekly');
  const [notifications, setNotifications] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllTeam, setShowAllTeam] = useState(false);

  const [attendanceOverview, setAttendanceOverview] = useState(null);
  const [leaveOverview, setLeaveOverview] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [systemStatus, setSystemStatus] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const createApi = (token) => axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  useEffect(() => {
    const loadStaticData = async () => {
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
          api.get('/admin/dashboard/quick-actions'),
          api.get('/admin/dashboard/leave-overview'),
          api.get('/admin/dashboard/ai-insights'),
          api.get('/admin/dashboard/system-status')
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
            payrollCost: d.payrollCost || 0,
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
          setQuickActions(results[4].value.data.data || []);
        }

        if (results[5].status === 'fulfilled' && results[5].value.data?.success) {
          setLeaveOverview(results[5].value.data.data || null);
        }
        if (results[6].status === 'fulfilled' && results[6].value.data?.success) {
          setAiInsights(results[6].value.data.data || []);
        }
        if (results[7].status === 'fulfilled' && results[7].value.data?.success) {
          setSystemStatus(results[7].value.data.data || []);
        }

      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Error loading dashboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStaticData();
  }, []);

  useEffect(() => {
    const loadPerformance = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const api = createApi(token);
      try {
        const res = await api.get(`/admin/dashboard/performance-metrics?timeRange=${timeRange}`);
        if (res.data.success) {
          setPerformanceData(res.data.data || []);
        }
      } catch (err) {
        console.error('Error loading performance metrics:', err);
      }
    };

    const loadAttendanceOverview = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const api = createApi(token);
      try {
        const res = await api.get(`/admin/dashboard/attendance-overview?timeRange=${timeRange}`);
        if (res.data.success) {
          setAttendanceOverview(res.data.data || null);
        }
      } catch (err) {
        console.error('Error loading attendance overview:', err);
      }
    };

    loadPerformance();
    loadAttendanceOverview();
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

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '₨0';
    return `₨${amount.toLocaleString()}`;
  };

  const departmentDistribution = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) return [];
    const counts = {};
    teamMembers.forEach((m) => {
      const dept = m.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [teamMembers]);

  const resolvedSystemStatus = systemStatus.length > 0
    ? systemStatus
    : [{ name: 'Overall System', status: stats.systemHealth >= 90 ? 'Operational' : stats.systemHealth >= 70 ? 'Warning' : 'Critical' }];

  const statusMeta = {
    Operational: { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    Warning: { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    Critical: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' }
  };

  const aiIconMap = {
    resume: FaUserPlus,
    attendance: FaCalendarCheck,
    wellness: FaHeartbeat,
    assistant: FaRobot
  };
  const defaultAiFeatures = [
    { type: 'resume', title: 'AI Resume Screening', insight: 'Connect the ai-insights endpoint to see live screening results.' },
    { type: 'attendance', title: 'AI Attendance Insights', insight: 'Connect the ai-insights endpoint to see attendance pattern alerts.' },
    { type: 'wellness', title: 'AI Employee Wellness', insight: 'Connect the ai-insights endpoint to see wellness signals.' },
    { type: 'assistant', title: 'AI HR Assistant', insight: 'Ask the assistant about policies, leave balances, or payroll.' }
  ];
  const aiFeatures = aiInsights.length > 0 ? aiInsights : defaultAiFeatures;

  const displayedActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 4);
  const displayedNotifications = showAllNotifications ? notifications : notifications.slice(0, 4);
  const displayedTeam = showAllTeam ? teamMembers : teamMembers.slice(0, 4);

  const quickActionIconMap = {
    'add employee': FaUserPlus,
    'process payroll': FaFileInvoiceDollar,
    'manage leave': FaCalendarCheck,
    'view reports': FaChartArea
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
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
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Monitor your workforce and HR operations</p>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full hidden md:block">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees, departments..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden lg:block text-xs text-gray-400 whitespace-nowrap">
              {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => navigate('/admin/notifications')}
              className="relative w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
            >
              <FaBell className="text-sm" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <FaUser className="text-xs" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

        {/* KPI Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={FaUsers} label="Total Employees" value={stats.totalEmployees} iconBg="bg-indigo-500" />
          <KpiCard icon={FaBuilding} label="Departments" value={stats.activeDepartments} iconBg="bg-violet-500" />
          <KpiCard icon={FaHeartbeat} label="System Health" value={`${stats.systemHealth}%`} iconBg="bg-emerald-500" />
          <KpiCard icon={FaStar} label="Employee Satisfaction" value={`${stats.employeeSatisfaction}%`} iconBg="bg-amber-500" />
          <KpiCard icon={FaMoneyBillWave} label="Payroll This Month" value={formatCurrency(stats.payrollCost)} iconBg="bg-rose-500" />
        </div>

        {/* Attendance Analytics + Employee Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard
            title="Attendance Overview"
            icon={FaChartArea}
            className="lg:col-span-2"
            action={
              <div className="flex rounded-lg bg-gray-50 border border-gray-200 p-0.5">
                {['weekly', 'monthly'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                      timeRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            }
          >
            <AttendanceLineChart
              series={attendanceOverview?.series}
              categories={attendanceOverview?.categories || []}
            />
          </SectionCard>

          <SectionCard title="Employee Distribution" icon={FaChartPie}>
            <DonutChart data={departmentDistribution} />
          </SectionCard>
        </div>

        {/* Leave Overview + AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Leave Overview" icon={FaCalendarCheck}>
            <LeaveOverview
              pending={leaveOverview?.pending ?? stats.pendingTasks}
              approved={leaveOverview?.approved ?? 0}
              rejected={leaveOverview?.rejected ?? 0}
              hasFullData={!!leaveOverview}
            />
          </SectionCard>

          <SectionCard title="AI Insights" icon={FaBrain} className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiFeatures.map((f, idx) => {
                const Icon = aiIconMap[f.type] || FaRobot;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-indigo-50/50 hover:border-indigo-100 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="text-indigo-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.insight}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Quick Actions + System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Quick Actions" icon={FaClock} className="lg:col-span-2">
            {quickActions.length === 0 ? (
              <EmptyState label="No quick actions available" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map((action) => {
                  const Icon = quickActionIconMap[action.title?.toLowerCase()] || FaChartArea;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <Icon className="text-indigo-600 text-sm" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{action.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="System Status" icon={FaServer}>
            <div className="space-y-3">
              {resolvedSystemStatus.map((s, idx) => {
                const meta = statusMeta[s.status] || statusMeta.Operational;
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <FaCircle className={`text-[6px] ${meta.color.replace('bg-', 'text-')}`} />
                      {s.name}
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${meta.bg} ${meta.text}`}>
                      {s.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Recent Activity + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SectionCard title="Recent Activity" icon={FaClock}>
            {recentActivity.length === 0 ? (
              <EmptyState label="No recent activity" />
            ) : (
              <>
                <div className="relative space-y-4">
                  {displayedActivity.map((activity, idx) => (
                    <div key={activity.id || idx} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        activity.status === 'completed' || activity.status === 'success' ? 'bg-emerald-50' :
                        activity.status === 'pending' ? 'bg-amber-50' : 'bg-indigo-50'
                      }`}>
                        {activity.status === 'completed' || activity.status === 'success' ? (
                          <FaCheckCircle className="text-emerald-500 text-[11px]" />
                        ) : activity.status === 'pending' ? (
                          <FaClock className="text-amber-500 text-[11px]" />
                        ) : (
                          <FaExclamationTriangle className="text-indigo-500 text-[11px]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-snug">{activity.message}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{activity.time || 'Just now'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {recentActivity.length > 4 && (
                  <button
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="w-full mt-4 py-2 text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllActivity ? <>Show Less <FaChevronUp className="text-[10px]" /></> : <>Show All ({recentActivity.length}) <FaChevronDown className="text-[10px]" /></>}
                  </button>
                )}
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Notifications"
            icon={FaBell}
            action={unreadCount > 0 && <Badge variant="warning">{unreadCount} new</Badge>}
          >
            {notifications.length === 0 ? (
              <EmptyState label="You're all caught up" />
            ) : (
              <>
                <div className="space-y-2">
                  {displayedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        notification.read ? 'bg-white border-gray-100' : 'bg-indigo-50/50 border-indigo-100'
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${notification.read ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-snug truncate">{notification.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="info">{notification.type}</Badge>
                          {notification.createdAt && <p className="text-[11px] text-gray-400">{notification.createdAt}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {notifications.length > 4 && (
                  <button
                    onClick={() => setShowAllNotifications(!showAllNotifications)}
                    className="w-full mt-3 py-2 text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllNotifications ? <>Show Less <FaChevronUp className="text-[10px]" /></> : <>Show All ({notifications.length}) <FaChevronDown className="text-[10px]" /></>}
                  </button>
                )}
              </>
            )}
          </SectionCard>
        </div>

        {/* Team + Performance (kept from the existing dashboard, restyled) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {performanceData.length > 0 && (
            <SectionCard title="Performance Metrics" icon={FaChartLine}>
              <div className="space-y-4">
                {performanceData.map((metric, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-gray-600">{metric.label}</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {metric.label.includes('Response Time') ? `${metric.value}ms` :
                         metric.label.includes('Uptime') ? `${metric.value}h` :
                         `${metric.value}%`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${metric.label.includes('Response Time') ? Math.min(100, Math.max(0, 100 - metric.value / 10)) : Math.min(100, metric.value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {teamMembers.length > 0 && (
            <SectionCard title="Team Overview" icon={FaUsers}>
              <div className="space-y-1">
                {displayedTeam.map((member, idx) => (
                  <div key={member.id || idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
                        {member.avatar || member.name?.charAt(0) || 'U'}
                      </div>
                      <div className={`w-2 h-2 rounded-full border-2 border-white absolute -top-0.5 -right-0.5 ${member.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{member.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{member.role}{member.department ? ` · ${member.department}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-900">{member.productivity || 0}%</p>
                      <p className="text-[10px] text-gray-400">Attendance</p>
                    </div>
                  </div>
                ))}
              </div>
              {teamMembers.length > 4 && (
                <button
                  onClick={() => setShowAllTeam(!showAllTeam)}
                  className="w-full mt-3 py-2 text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  {showAllTeam ? <>Show Less <FaChevronUp className="text-[10px]" /></> : <>Show All ({teamMembers.length}) <FaChevronDown className="text-[10px]" /></>}
                </button>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;