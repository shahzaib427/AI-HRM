import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Delete as DeleteIcon, Visibility as ViewIcon, Reply as ReplyIcon,
  Send as SendIcon, Email as EmailIcon, Close as CloseIcon,
  Inbox as InboxIcon, StarBorder as StarIcon, PriorityHigh as UrgentIcon,
  CheckCircle as CheckCircleIcon, Error as ErrorIcon,
  Schedule as ScheduleIcon, People as PeopleIcon,
  Assignment as AssignIcon, Filter as FilterIcon,
  Refresh as RefreshIcon, Search as SearchIcon,
  PersonAdd as PersonAddIcon, Assessment as StatsIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axiosInstance';
import { FaUser, FaEnvelope, FaPaperPlane, FaTrash, FaEye, FaReply, FaDownload, FaChartLine, FaFilter, FaSync } from 'react-icons/fa';

// ─── Reusable UI Primitives ───────────────────────────────────────────────────

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default:  'bg-gray-100 text-gray-600',
    primary:  'bg-indigo-50 text-indigo-700',
    success:  'bg-green-50 text-green-700',
    warning:  'bg-yellow-50 text-yellow-700',
    danger:   'bg-red-50 text-red-700',
    info:     'bg-sky-50 text-sky-700',
    orange:   'bg-orange-50 text-orange-700',
    purple:   'bg-purple-50 text-purple-700'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Avatar = ({ name = 'U', size = 'md' }) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, sub, iconBg }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const IconBtn = ({ icon: Icon, onClick, title, className = '' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-md transition-colors ${className}`}
  >
    <Icon style={{ fontSize: 16 }} />
  </button>
);

const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="text-gray-400" style={{ fontSize: 28 }} />
    </div>
    <p className="text-gray-800 font-medium mb-1">{title}</p>
    <p className="text-gray-400 text-sm mb-5">{subtitle}</p>
    {action}
  </div>
);

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

const ConfirmDialog = ({ open, onClose, onConfirm, loading, count = 1, permanent = false }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
          <DeleteIcon className="text-red-500" style={{ fontSize: 22 }} />
        </div>
        <h3 className="text-gray-900 font-semibold text-lg mb-1">Delete {count > 1 ? `${count} messages` : 'message'}?</h3>
        <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
        {permanent && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-600 font-medium">⚠️ Warning: This will permanently delete these messages.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Message View Drawer ──────────────────────────────────────────────────────

const MessageDrawer = ({ message, open, onClose, onReply }) => {
  if (!open || !message) return null;
  
  const getPriorityColor = (priority) => {
    if (priority === 'high' || priority === 'urgent') return 'danger';
    if (priority === 'medium') return 'warning';
    return 'default';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full flex flex-col shadow-xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-gray-900 font-semibold text-base truncate">{message.subject || 'No Subject'}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={message.status === 'read' ? 'default' : 'primary'}>{message.status || 'sent'}</Badge>
              {message.priority === 'high' || message.priority === 'urgent' ? (
                <Badge variant="danger">{message.priority}</Badge>
              ) : null}
              {message.confidential && <Badge variant="warning">Confidential</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <CloseIcon style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Sender strip */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
          <Avatar name={message.sender?.name || 'U'} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{message.sender?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{message.sender?.role?.toUpperCase() || 'Employee'} · {message.category || 'General'}</p>
          </div>
          {message.createdAt && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {format(new Date(message.createdAt), 'MMM dd, yyyy · h:mm a')}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { onReply(message._id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FaReply className="text-xs" />
            Reply
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 0, label: 'All', icon: InboxIcon },
  { id: 1, label: 'Pending', icon: ScheduleIcon },
  { id: 2, label: 'Urgent', icon: UrgentIcon },
  { id: 3, label: 'My Cases', icon: PersonAddIcon },
  { id: 4, label: 'Resolved', icon: CheckCircleIcon },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const HRMessageDashboard = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignedToMe: false,
    search: '',
    timeRange: 'today'
  });
  const [pagination, setPagination] = useState({ page: 0, limit: 15, total: 0 });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, messageId: null, permanent: false });
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        excludeDeleted: 'true',
        page: (pagination.page + 1).toString(),
        limit: pagination.limit.toString()
      });
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.assignedToMe) params.append('assignedToMe', 'true');

      const response = await axiosInstance.get(`/messages?${params.toString()}`);
      
      if (response.data.success) {
        const filteredMessages = (response.data.data || []).filter(msg => msg.status !== 'deleted');
        setMessages(filteredMessages);
        setPagination(prev => ({
          ...prev,
          total: response.data.count || filteredMessages.length || 0
        }));
        
        // Calculate stats
        const total = filteredMessages.length;
        const newMessages = filteredMessages.filter(m => m.status === 'new' || m.status === 'sent').length;
        const urgent = filteredMessages.filter(m => m.priority === 'urgent').length;
        const resolved = filteredMessages.filter(m => m.status === 'resolved' || m.status === 'closed').length;
        const pending = filteredMessages.filter(m => m.status === 'pending-approval' || m.status === 'awaiting-approval').length;
        const assignedToMe = currentUser ? filteredMessages.filter(m => m.assignedTo?.id === currentUser._id).length : 0;

        setStats({ total, new: newMessages, urgent, resolved, pending, assignedToMe });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [pagination.page, filters, currentUser]);

  // Handle tab changes
  useEffect(() => {
    const tabFilters = {
      0: { status: '', priority: '', assignedToMe: false },
      1: { status: 'pending-approval' },
      2: { priority: 'urgent' },
      3: { assignedToMe: true },
      4: { status: 'resolved' }
    };
    
    if (tabValue !== 0) {
      setFilters(prev => ({ ...prev, ...tabFilters[tabValue] }));
    } else {
      setFilters(prev => ({ ...prev, status: '', priority: '', assignedToMe: false }));
    }
    setPagination(prev => ({ ...prev, page: 0 }));
  }, [tabValue]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handleSelectMessage = (id) => {
    setSelectedMessages(prev =>
      prev.includes(id) ? prev.filter(msgId => msgId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(msg => msg._id));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 0 }));
    fetchMessages();
  };

  const handleViewMessage = (messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (message) { setSelectedMessage(message); setViewDialog(true); }
  };

  const handleCloseView = () => { setViewDialog(false); setSelectedMessage(null); };

  const handleReplyMessage = (messageId) => {
    navigate(`/hr/messages/${messageId}/reply`);
  };

  const handleDelete = async (messageId) => {
    try {
      setLoading(true);
      await axiosInstance.delete(`/messages/${messageId}`);
      toast.success('Message deleted');
      await fetchMessages();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    } finally {
      setDeleteDialog({ open: false, messageId: null, permanent: false });
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) return;
    try {
      setLoading(true);
      let successCount = 0;
      for (const messageId of selectedMessages) {
        try {
          await axiosInstance.delete(`/messages/${messageId}`);
          successCount++;
        } catch (error) {
          console.warn('Bulk delete error:', error);
        }
      }
      await fetchMessages();
      setSelectedMessages([]);
      setBulkDeleteOpen(false);
      toast.success(`Deleted ${successCount}/${selectedMessages.length} messages`);
    } catch (error) {
      toast.error('Bulk delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompose = () => navigate('/hr/messages/compose');
  const handleAnalytics = () => navigate('/hr/messages/stats');

  const handleClearFilters = () => {
    setFilters({
      status: '', priority: '', category: '', assignedToMe: false, search: '', timeRange: 'today'
    });
    setTabValue(0);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const getStatusBadge = (status) => {
    const variants = {
      'new': 'warning',
      'sent': 'info',
      'read': 'default',
      'in-progress': 'primary',
      'pending-approval': 'warning',
      'awaiting-approval': 'warning',
      'approved': 'success',
      'resolved': 'success',
      'closed': 'default',
      'rejected': 'danger'
    };
    return <Badge variant={variants[status] || 'default'}>{status || 'unknown'}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      'urgent': 'danger',
      'high': 'warning',
      'normal': 'info',
      'low': 'success'
    };
    return <Badge variant={variants[priority] || 'default'}>{priority || 'normal'}</Badge>;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'general': '📧',
      'announcement': '📢',
      'policy': '📋',
      'training': '🎓',
      'benefits': '🏥',
      'compliance': '⚖️',
      'appreciation': '⭐',
      'warning': '⚠️',
      'survey': '📊',
      'leave': '🏖️',
      'payroll': '💰'
    };
    return icons[category] || '📧';
  };

  const filteredMessages = messages;
  const paginatedMessages = filteredMessages.slice(
    pagination.page * pagination.limit,
    (pagination.page + 1) * pagination.limit
  );
  const totalPages = Math.ceil(filteredMessages.length / pagination.limit);
  const unreadCount = messages.filter(m => m.status !== 'read').length;

  if (loading && messages.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading messages…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaEnvelope className="text-indigo-500 text-sm" />
                HR Message Center
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage employee communications and HR queries</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAnalytics}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaChartLine className="text-xs" />
                Analytics
              </button>
              <button
                onClick={handleCompose}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <FaPaperPlane className="text-xs" />
                Compose
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={InboxIcon} label="Total Messages" value={stats?.total || 0} sub={`${unreadCount} unread`} iconBg="bg-indigo-500" />
          <KpiCard icon={ScheduleIcon} label="Pending Approval" value={stats?.pending || 0} sub="Awaiting review" iconBg="bg-amber-500" />
          <KpiCard icon={UrgentIcon} label="Urgent" value={stats?.urgent || 0} sub="High priority" iconBg="bg-red-500" />
          <KpiCard icon={PersonAddIcon} label="My Cases" value={stats?.assignedToMe || 0} sub="Assigned to you" iconBg="bg-purple-500" />
          <KpiCard icon={CheckCircleIcon} label="Resolved" value={stats?.resolved || 0} sub="Completed" iconBg="bg-emerald-500" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabValue(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    tabValue === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon style={{ fontSize: 16 }} />
                  {tab.label}
                  {tab.id === 0 && messages.length > 0 && (
                    <span className="ml-1.5 bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">{messages.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
              <input
                type="text"
                placeholder="Search by subject, sender, or message..."
                value={filters.search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaFilter className="text-xs" />
              Filters
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-100 pt-5 mt-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">All Status</option>
                    <option value="new">New</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending-approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">All Categories</option>
                    <option value="general">General</option>
                    <option value="announcement">Announcement</option>
                    <option value="policy">Policy</option>
                    <option value="training">Training</option>
                    <option value="benefits">Benefits</option>
                    <option value="compliance">Compliance</option>
                    <option value="appreciation">Appreciation</option>
                    <option value="warning">Warning</option>
                    <option value="leave">Leave Request</option>
                    <option value="payroll">Payroll</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleClearFilters}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        {selectedMessages.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 animate-fade-in">
            <span className="text-indigo-700 text-sm font-medium">{selectedMessages.length} message(s) selected</span>
            <div className="flex gap-2">
              <button onClick={() => setBulkDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors">
                <FaTrash className="text-xs" /> Delete
              </button>
              <button onClick={() => setSelectedMessages([])} className="px-3 py-1.5 border border-indigo-300 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Messages Table */}
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <EmailIcon className="text-indigo-500 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Messages</p>
                  <p className="text-xs text-gray-500">{filteredMessages.length} total messages</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Page {pagination.page + 1} of {totalPages || 1}
              </div>
            </div>
          </div>

          {paginatedMessages.length === 0 ? (
            <EmptyState
              icon={EmailIcon}
              title={loading ? 'Loading messages…' : 'No messages found'}
              subtitle={loading ? 'Please wait' : 'Try adjusting your filters or check back later'}
              action={!loading && (
                <button onClick={handleCompose} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  <FaPaperPlane className="text-xs" /> Compose Message
                </button>
              )}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="pl-4 pr-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ref #</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject & Sender</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-28 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedMessages.map((message) => (
                    <tr
                      key={message._id}
                      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${selectedMessages.includes(message._id) ? 'bg-indigo-50/40' : ''} ${message.status === 'new' ? 'bg-amber-50/20' : ''}`}
                      onClick={() => handleViewMessage(message._id)}
                    >
                      <td className="pl-4 pr-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(message._id)}
                          onChange={() => handleSelectMessage(message._id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs font-mono font-medium text-indigo-600">
                          {message.referenceNumber || message._id?.substring(0, 8) || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={message.sender?.name || 'U'} size="sm" />
                          <div>
                            <p className={`text-sm ${message.status === 'new' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'} truncate max-w-xs`}>
                              {message.subject || 'No Subject'}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-xs">
                              From: {message.sender?.name || 'Unknown'} · {message.sender?.employeeId || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{getCategoryIcon(message.category)}</span>
                          <Badge variant="default">{message.category || 'general'}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {getStatusBadge(message.status)}
                      </td>
                      <td className="px-3 py-3.5">
                        {getPriorityBadge(message.priority)}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-400">
                          {message.createdAt ? format(new Date(message.createdAt), 'MMM dd, hh:mm a') : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => handleViewMessage(message._id)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <FaEye className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleReplyMessage(message._id)}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Reply"
                          >
                            <FaReply className="text-xs" />
                          </button>
                          <button
                            onClick={() => setDeleteDialog({ open: true, messageId: message._id, permanent: false })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredMessages.length > pagination.limit && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <span className="text-sm text-gray-500">
                {pagination.page * pagination.limit + 1}–{Math.min((pagination.page + 1) * pagination.limit, filteredMessages.length)} of {filteredMessages.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.max(0, p.page - 1) }))}
                  disabled={pagination.page === 0}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600">{pagination.page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages - 1, p.page + 1) }))}
                  disabled={pagination.page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose FAB */}
      <button
        onClick={handleCompose}
        title="Compose new message"
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
      >
        <FaPaperPlane style={{ fontSize: 18 }} />
      </button>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, messageId: null, permanent: false })}
        onConfirm={() => handleDelete(deleteDialog.messageId)}
        loading={loading}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={loading}
        count={selectedMessages.length}
      />

      <MessageDrawer
        message={selectedMessage}
        open={viewDialog}
        onClose={handleCloseView}
        onReply={handleReplyMessage}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HRMessageDashboard;