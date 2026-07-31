import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { 
  FaBell, FaCheckCircle, FaTimesCircle, FaClock, FaTrash, 
  FaEye, FaSpinner, FaChevronDown, FaChevronUp, FaArrowLeft,
  FaCalendarAlt, FaMoneyBillWave, FaUserClock, FaFileContract,
  FaUsers, FaEnvelope, FaExclamationTriangle
} from 'react-icons/fa';

const API_URL    = import.meta.env.VITE_API_URL    || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const TYPE_META = {
  leave_request:       { icon: FaCalendarAlt, color: 'bg-amber-500', label: 'Leave Request', nav: '/hr/leave' },
  leave_approved:      { icon: FaCheckCircle, color: 'bg-emerald-500', label: 'Leave Approved', nav: '/hr/leave' },
  leave_rejected:      { icon: FaTimesCircle, color: 'bg-red-500', label: 'Leave Rejected', nav: '/hr/leave' },
  payroll_processed:   { icon: FaMoneyBillWave, color: 'bg-blue-500', label: 'Payroll', nav: '/hr/payroll' },
  attendance_marked:   { icon: FaUserClock, color: 'bg-purple-500', label: 'Attendance', nav: '/hr/attendance' },
  attendance_updated:  { icon: FaUserClock, color: 'bg-purple-500', label: 'Attendance', nav: '/hr/attendance' },
  employee_onboarded:  { icon: FaUsers, color: 'bg-emerald-500', label: 'Onboarding', nav: '/hr/onboarding' },
  contract_signed:     { icon: FaFileContract, color: 'bg-orange-500', label: 'Contract', nav: '/hr/contracts' },
  message_received:    { icon: FaEnvelope, color: 'bg-cyan-500', label: 'Message', nav: '/hr/messages' },
  recruitment_update:  { icon: FaUsers, color: 'bg-pink-500', label: 'Recruitment', nav: '/hr/recruitment' },
  announcement:        { icon: FaBell, color: 'bg-indigo-500', label: 'Announcement', nav: null },
  system_maintenance:  { icon: FaExclamationTriangle, color: 'bg-gray-500', label: 'System', nav: null },
};

const getMeta = type => TYPE_META[type] || { icon: FaBell, color: 'bg-gray-500', label: 'Notice', nav: null };

function timeAgo(date) {
  const ms    = Date.now() - new Date(date);
  const mins  = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days  = Math.floor(ms / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function getUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return { ...u, _id: u._id || u.id };
  } catch { return {}; }
}

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

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'unread',      label: 'Unread' },
  { key: 'leave',       label: 'Leave' },
  { key: 'attendance',  label: 'Attendance' },
  { key: 'payroll',     label: 'Payroll' },
  { key: 'contract',    label: 'Contract' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'message',     label: 'Messages' },
];

const TYPE_FILTER_MAP = {
  leave:       ['leave_request','leave_approved','leave_rejected'],
  attendance:  ['attendance_marked','attendance_updated'],
  payroll:     ['payroll_processed'],
  contract:    ['contract_signed','contract_expiring'],
  recruitment: ['recruitment_update','employee_onboarded'],
  message:     ['message_received'],
};

export default function HRNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('all');
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [selected,      setSelected]      = useState(null);
  const socketRef = useRef(null);
  const navigate  = useNavigate();
  const user      = getUser();

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user._id) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('new_notification', n => {
      setNotifications(prev => [n, ...prev]);
      setUnreadCount(c => c + 1);
    });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, [user._id]);

  // Fetch notifications
  const fetch = useCallback(async (reset = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const p = reset ? 1 : page;
      const { data } = await axios.get(`${API_URL}/notifications`, {
        params:  { page: p, limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setNotifications(prev => reset ? data.data : [...prev, ...data.data]);
        setUnreadCount(data.unreadCount ?? 0);
        setHasMore((data.pagination?.pages ?? 1) > p);
        if (!reset) setPage(p + 1);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [page]);

  useEffect(() => { fetch(true); }, []);

  // Mark as read
  const markRead = async id => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/notifications/mark-all-read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  const deleteOne = async id => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { console.error(e); }
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const handleClick = n => {
    if (!n.isRead) markRead(n._id);
    setSelected(n);
  };

  const handleNavigate = n => {
    const meta = getMeta(n.type);
    if (meta.nav) navigate(meta.nav);
  };

  // Filter notifications
  const visible = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (TYPE_FILTER_MAP[filter]) return TYPE_FILTER_MAP[filter].includes(n.type);
    return true;
  });

  const displayedNotifications = visible.slice(0, 10);

  // Stats
  const stats = {
    total:  notifications.length,
    unread: unreadCount,
    urgent: notifications.filter(n => n.priority === 'urgent' && !n.isRead).length,
    today:  notifications.filter(n => {
      const d = new Date(n.createdAt); const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  };

  const priorityColors = {
    urgent: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default'
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading notifications...</p>
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
                <FaBell className="text-indigo-600" /> Notification Centre
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Stay on top of leave, payroll, and team activity
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaBell className="w-5 h-5" />
              <span className="text-sm">Notifications</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Notifications</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                <FaBell className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Unread</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.unread}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <FaEye className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                <FaExclamationTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Today</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.today}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                <FaClock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Mark All Read Button */}
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <FaCheckCircle className="text-xs" /> Mark all as read
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Notification List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      filter === f.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            {visible.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaBell className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-500 font-medium mb-2">No notifications found</p>
                <p className="text-gray-400 text-sm">Try changing your filter settings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedNotifications.map(n => {
                  const meta = getMeta(n.type);
                  const Icon = meta.icon;
                  const isSelected = selected?._id === n._id;
                  return (
                    <div
                      key={n._id}
                      onClick={() => handleClick(n)}
                      className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200'
                      } ${!n.isRead ? 'border-l-4 border-l-indigo-500' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <Icon className="text-white text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                            {!n.isRead && (
                              <Badge variant="primary">New</Badge>
                            )}
                            {n.priority && n.priority !== 'normal' && (
                              <Badge variant={priorityColors[n.priority] || 'default'}>
                                {n.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-400">{meta.label}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteOne(n._id); }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More */}
            {hasMore && visible.length > 0 && (
              <button
                onClick={() => fetch(false)}
                disabled={loadingMore}
                className="w-full py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-indigo-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loadingMore ? <FaSpinner className="animate-spin inline mr-1" /> : null}
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>

          {/* Right Column - Details Panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getMeta(selected.type).color}`}>
                    {(() => {
                      const Icon = getMeta(selected.type).icon;
                      return <Icon className="text-white text-lg" />;
                    })()}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selected.title}</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{selected.message}</p>
                
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900">{getMeta(selected.type).label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Priority</span>
                    <Badge variant={priorityColors[selected.priority] || 'default'}>
                      {selected.priority || 'Normal'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Received</span>
                    <span className="text-gray-900">{timeAgo(selected.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <Badge variant={selected.isRead ? 'success' : 'warning'}>
                      {selected.isRead ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                </div>
                
                {getMeta(selected.type).nav && (
                  <button
                    onClick={() => handleNavigate(selected)}
                    className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Go to {getMeta(selected.type).label} →
                  </button>
                )}
                
                <button
                  onClick={() => deleteOne(selected._id)}
                  className="w-full mt-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <FaTrash className="inline mr-1 text-xs" /> Delete Notification
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center sticky top-24">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaBell className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-500 font-medium mb-1">No notification selected</p>
                <p className="text-gray-400 text-sm">Click on a notification to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}