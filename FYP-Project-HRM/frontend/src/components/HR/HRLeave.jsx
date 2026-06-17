import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  FaUsers, FaCheckCircle, FaTimesCircle, FaClock, FaFilter, 
  FaSearch, FaDownload, FaSync, FaPlus, FaCalendarAlt, 
  FaUser, FaBriefcase, FaExclamationTriangle, FaChevronDown, 
  FaChevronUp, FaSpinner, FaEnvelope
} from 'react-icons/fa';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api/leaves';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper: decode JWT
const decodeToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch { return null; }
};

const getUserId = () => decodeToken()?._id || null;

const MONTHLY_LEAVE_CONFIG = {
  TOTAL_LEAVES_PER_MONTH: 2,
  MAX_CONSECUTIVE_DAYS: 5,
  LEAVE_TYPES: [
    { id: 'monthly',   name: 'Monthly Leave',   icon: '📅', description: 'Monthly allocation' },
    { id: 'emergency', name: 'Emergency Leave',  icon: '🚨', description: 'For urgent situations' }
  ]
};

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   variant: 'warning' },
  approved:  { label: 'Approved',  variant: 'success' },
  rejected:  { label: 'Rejected',  variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'default' }
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    info:    'bg-blue-50 text-blue-700',
    danger:  'bg-red-50 text-red-700',
    purple:  'bg-purple-50 text-purple-700',
    primary: 'bg-indigo-50 text-indigo-700'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>
      {children}
    </span>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
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

// ─── Leave Form Modal ─────────────────────────────────────────────────────────
const LeaveFormModal = ({ isOpen, onClose, onSubmit, monthlyBalance }) => {
  const [formData, setFormData] = useState({ type: 'monthly', startDate: '', endDate: '', reason: '', leaveCount: 1 });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setFormData({ type: 'monthly', startDate: '', endDate: '', reason: '', leaveCount: 1 });
      setErrors({});
      setCalculatedDays(0);
    }
  }, [isOpen]);

  const calcDays = (s, e) => {
    if (!s || !e) return 0;
    const diff = new Date(e) - new Date(s);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'startDate' || name === 'endDate') {
        setCalculatedDays(calcDays(next.startDate, next.endDate));
      }
      return next;
    });
  };

  const validate = () => {
    const err = {};
    if (!formData.startDate) err.startDate = 'Start date required';
    else if (new Date(formData.startDate) < new Date().setHours(0,0,0,0)) err.startDate = 'Cannot be in the past';
    if (!formData.endDate) err.endDate = 'End date required';
    else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) err.endDate = 'Before start date';
    if (calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS) err.days = `Max ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days`;
    if (!formData.reason.trim() || formData.reason.trim().length < 10) err.reason = 'Reason must be at least 10 chars';
    if (formData.leaveCount > monthlyBalance) err.leaveCount = `Only ${monthlyBalance} leave(s) remaining`;
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Apply for Leave</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6">
          <div className="mb-5 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-indigo-900">Monthly Balance</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className="text-lg font-bold text-indigo-800">
              {monthlyBalance}/{MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH}
            </span>
          </div>

          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 font-medium">
              ℹ️ Your leave request will be reviewed and approved by an <strong>Admin</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
              <div className="grid grid-cols-2 gap-3">
                {MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.map(t => (
                  <button type="button" key={t.id} onClick={() => setFormData(p => ({ ...p, type: t.id }))}
                    className={`p-3 rounded-lg border text-left transition-all ${formData.type === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="text-xl">{t.icon}</span>
                    <p className="font-medium text-gray-900 text-sm mt-1">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${errors.startDate ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${errors.endDate ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
              </div>
            </div>

            {calculatedDays > 0 && (
              <div className={`p-3 rounded-lg text-sm ${calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                Duration: {calculatedDays} calendar days
                {calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS && ` (max ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS})`}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Leaves to Use *</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input type="range" name="leaveCount" min="1"
                    max={Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH)}
                    value={formData.leaveCount} onChange={handleChange}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>{Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH)}</span>
                  </div>
                </div>
                <div className="w-14 text-center">
                  <span className="text-2xl font-bold text-gray-900">{formData.leaveCount}</span>
                  <p className="text-xs text-gray-500">day(s)</p>
                </div>
              </div>
              {errors.leaveCount && <p className="mt-1 text-xs text-red-500">{errors.leaveCount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <textarea name="reason" value={formData.reason} onChange={handleChange} rows={3}
                className={`w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${errors.reason ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Minimum 10 characters..." />
              {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading || formData.leaveCount > monthlyBalance}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loading ? <FaSpinner className="animate-spin inline mr-1" /> : null}
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Export Modal ─────────────────────────────────────────────────────────────
const ExportModal = ({ isOpen, onClose, onExportCSV, onExportMonthlyReport, exporting }) => {
  const [exportType, setExportType] = useState('csv');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const handleSubmit = () => {
    if (exportType === 'csv') onExportCSV();
    else onExportMonthlyReport(month, year);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Export Options</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {[
              { v: 'csv',     label: 'Export All Leaves (CSV)' },
              { v: 'monthly', label: 'Monthly Leave Report' }
            ].map(o => (
              <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="exportType" value={o.v} checked={exportType === o.v}
                  onChange={() => setExportType(o.v)} className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-gray-700">{o.label}</span>
              </label>
            ))}
          </div>

          {exportType === 'monthly' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select value={month} onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  {['January','February','March','April','May','June','July','August','September','October','November','December']
                    .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input type="number" value={year} onChange={e => setYear(e.target.value)}
                  min="2000" max="2100"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={exporting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {exporting ? <FaSpinner className="animate-spin inline mr-1" /> : <FaDownload className="inline mr-1 text-xs" />}
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main HRLeave Component ───────────────────────────────────────────────────
const HRLeave = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myMonthlyBalance, setMyMonthlyBalance] = useState(MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
  const [leaveStats, setLeaveStats] = useState({ pending: 0, approved: 0, rejected: 0, totalRequests: 0 });
  const [loading, setLoading] = useState({ requests: true, myLeaves: true, balance: true });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  const [showExportModal, setShowExportModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAllMyLeaves, setShowAllMyLeaves] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const res = await api.get('/all');
      if (res.data?.success) {
        const hrUserId = getUserId();
        setLeaveRequests((res.data.data || []).filter(l => l.employee?._id !== hrUserId));
        const allLeaves = res.data.data || [];
        const empLeaves = allLeaves.filter(l => l.employee?._id !== hrUserId);
        setLeaveStats({
          pending:       empLeaves.filter(l => l.status === 'pending').length,
          approved:      empLeaves.filter(l => l.status === 'approved').length,
          rejected:      empLeaves.filter(l => l.status === 'rejected').length,
          totalRequests: empLeaves.length
        });
      }
    } catch (err) {
      console.error('Fetch leave requests error:', err);
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  }, []);

  const fetchMyLeaves = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, myLeaves: true }));
      const res = await api.get('/my-leaves');
      if (res.data?.success) setMyLeaves(res.data.data || []);
    } catch (err) {
      console.error('Fetch my leaves error:', err);
    } finally {
      setLoading(prev => ({ ...prev, myLeaves: false }));
    }
  }, []);

  const fetchMyMonthlyBalance = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, balance: true }));
      const res = await api.get('/balance');
      if (res.data?.success) {
        const d = res.data.data;
        setMyMonthlyBalance(d?.leavesAvailable ?? d?.monthly ?? MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
      }
    } catch (err) {
      console.error('Fetch balance error:', err);
      setMyMonthlyBalance(MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
    } finally {
      setLoading(prev => ({ ...prev, balance: false }));
    }
  }, []);

  const refreshAllData = useCallback(() => {
    fetchLeaveRequests();
    fetchMyLeaves();
    fetchMyMonthlyBalance();
  }, [fetchLeaveRequests, fetchMyLeaves, fetchMyMonthlyBalance]);

  useEffect(() => { refreshAllData(); }, [refreshAllData]);

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const canHRReview = (request) => {
    const applicantRole = request.employee?.role;
    if (request.employee?._id === getUserId()) return false;
    if (['admin', 'hr'].includes(applicantRole)) return false;
    return true;
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return;
    try {
      const res = await api.post(`/${id}/review`, { action: 'approve', rejectionReason: '' });
      if (res.data.success) { setSuccessMessage('Leave approved successfully!'); refreshAllData(); }
      else alert(res.data.message || 'Failed to approve');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Provide a rejection reason:');
    if (!reason?.trim()) return;
    if (!window.confirm('Reject this leave request?')) return;
    try {
      const res = await api.post(`/${id}/review`, { action: 'reject', rejectionReason: reason });
      if (res.data.success) { setSuccessMessage('Leave rejected successfully!'); refreshAllData(); }
      else alert(res.data.message || 'Failed to reject');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject leave');
    }
  };

  const handleSubmitLeave = async (formData) => {
    const res = await api.post('/apply', { ...formData, leaveCount: formData.leaveCount || 1 });
    if (res.data.success) {
      setSuccessMessage('Leave submitted! An Admin will review and approve it.');
      setShowLeaveForm(false);
      refreshAllData();
    }
  };

  const handleCancelMyLeave = async (leaveId) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await api.delete(`/${leaveId}`);
      setSuccessMessage('Leave cancelled successfully.');
      refreshAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel leave');
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/export${filter !== 'all' ? `?status=${filter}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `leaves_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setSuccessMessage('CSV exported!');
    } catch { alert('Export failed. Please try again.'); } finally { setExporting(false); }
  };

  const handleExportMonthlyReport = async (month, year) => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/export/monthly-report?month=${month}&year=${year}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `monthly_leave_report_${month}_${year}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setSuccessMessage('Monthly report exported!');
    } catch { alert('Export failed.'); } finally { setExporting(false); }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredRequests = leaveRequests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (searchTerm && !r.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const displayedRequests = showAllRequests ? filteredRequests : filteredRequests.slice(0, 5);
  const displayedMyLeaves = showAllMyLeaves ? myLeaves : myLeaves.slice(0, 5);

  const myUsedLeavesThisMonth = useMemo(() => {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    return myLeaves
      .filter(l => {
        const d = new Date(l.startDate || l.createdAt);
        return d.getMonth() === m && d.getFullYear() === y && l.status === 'approved';
      })
      .reduce((sum, l) => sum + (l.leaveCount || 1), 0);
  }, [myLeaves]);

  const getStatusBadge = (status) => {
    const m = { approved: 'success', pending: 'warning', rejected: 'danger', cancelled: 'default' };
    return <Badge variant={m[status] || 'default'}>{STATUS_CONFIG[status]?.label || status}</Badge>;
  };

  const getTypeBadge = (type) => (
    <Badge variant={type === 'monthly' ? 'primary' : 'danger'}>
      {type === 'monthly' ? 'Monthly Leave' : 'Emergency Leave'}
    </Badge>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaCalendarAlt className="text-indigo-600" /> HR Leave Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Review employee leaves · Your own leaves require Admin approval
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaCalendarAlt className="w-5 h-5" />
              <span className="text-sm">Leave Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Success */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <FaCheckCircle className="text-emerald-500" />
            <p className="text-sm text-emerald-700">{successMessage}</p>
          </div>
        )}

        {/* Policy Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <FaExclamationTriangle className="text-blue-500 text-lg" />
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1">Leave Approval Policy</p>
              <ul className="text-xs text-blue-700 space-y-0.5">
                <li>• <strong>You (HR)</strong> can approve/reject leaves for <strong>Employees</strong> and <strong>Managers</strong></li>
                <li>• <strong>Your own leave requests</strong> must be approved by an <strong>Admin</strong></li>
                <li>• <strong>Other HR members' leaves</strong> must also be approved by an <strong>Admin</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { id: 'manage', label: 'Manage Employee Leaves', icon: FaUsers },
              { id: 'myLeaves', label: 'My Leaves', icon: FaUser }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                <tab.icon className="text-sm" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── MANAGE TAB ── */}
        {activeTab === 'manage' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <KpiCard icon={FaClock} label="Pending Requests" value={leaveStats.pending} sub="Awaiting approval" iconBg="bg-amber-500" />
              <KpiCard icon={FaCheckCircle} label="Approved" value={leaveStats.approved} sub="Confirmed" iconBg="bg-emerald-500" />
              <KpiCard icon={FaTimesCircle} label="Rejected" value={leaveStats.rejected} sub="Declined" iconBg="bg-red-500" />
              <KpiCard icon={FaUsers} label="Total Requests" value={leaveStats.totalRequests} sub="All time" iconBg="bg-indigo-500" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input type="text" placeholder="Search by employee name..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="all">All Requests</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  <FaDownload className="text-xs" /> Export Data
                </button>
                <button onClick={refreshAllData} disabled={loading.requests}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
                  <FaSync className="text-xs" /> Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <FaUsers className="text-indigo-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Employee Leave Requests</p>
                    <p className="text-xs text-gray-400">{filteredRequests.length} requests</p>
                  </div>
                </div>
              </div>

              {loading.requests ? (
                <div className="py-16 text-center">
                  <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400 text-sm">Loading...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FaCalendarAlt className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500 font-medium">No leave requests found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dates</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Days</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayedRequests.map(req => (
                          <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold">
                                  {req.employee?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{req.employee?.name || 'Unknown'}</p>
                                  <p className="text-xs text-gray-400">{req.employee?.employeeId || 'N/A'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">{getTypeBadge(req.type)}</td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-800">{formatDate(req.startDate)}</div>
                              <div className="text-xs text-gray-400">to {formatDate(req.endDate)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-800">{req.days || 0}</span>
                              <span className="text-xs text-gray-400 ml-1">days</span>
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                            <td className="px-4 py-3">
                              {req.status === 'pending' ? (
                                canHRReview(req) ? (
                                  <div className="flex gap-2">
                                    <button onClick={() => handleApprove(req._id)}
                                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                                      Approve
                                    </button>
                                    <button onClick={() => handleReject(req._id)}
                                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Admin approval required</span>
                                )
                              ) : (
                                <span className="text-xs text-gray-500 capitalize">{req.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredRequests.length > 5 && (
                    <button
                      onClick={() => setShowAllRequests(!showAllRequests)}
                      className="w-full py-3 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors border-t border-gray-100 bg-gray-50"
                    >
                      {showAllRequests ? (
                        <>Show Less <FaChevronUp className="text-xs" /></>
                      ) : (
                        <>Show All ({filteredRequests.length}) <FaChevronDown className="text-xs" /></>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ── MY LEAVES TAB ── */}
        {activeTab === 'myLeaves' && (
          <>
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Monthly Leave Balance</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {myMonthlyBalance} / {MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                    <FaCalendarAlt className="text-white text-sm" />
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                  <div className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.min((myUsedLeavesThisMonth / MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400">
                  {myUsedLeavesThisMonth} used · {myMonthlyBalance} remaining
                </p>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    ⚠️ Your leave requests are pending <strong>Admin</strong> approval.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">My Leave Summary</p>
                <p className="text-2xl font-bold text-gray-800 mb-4">{myLeaves.length} total</p>
                <div className="space-y-2">
                  {[
                    { label: 'Pending',  color: 'bg-amber-50 text-amber-800', status: 'pending', icon: FaClock },
                    { label: 'Approved', color: 'bg-emerald-50 text-emerald-800', status: 'approved', icon: FaCheckCircle },
                    { label: 'Rejected', color: 'bg-red-50 text-red-800', status: 'rejected', icon: FaTimesCircle }
                  ].map(item => (
                    <div key={item.status} className={`flex justify-between items-center p-3 rounded-lg ${item.color}`}>
                      <div className="flex items-center gap-2">
                        <item.icon className="text-sm" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="font-semibold text-lg">{myLeaves.filter(l => l.status === item.status).length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply Leave Button */}
            <div className="flex justify-end">
              <button onClick={() => setShowLeaveForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                <FaPlus className="text-xs" /> Apply for Leave
              </button>
            </div>

            {/* My Leaves List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <FaUser className="text-indigo-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">My Leave Applications</p>
                    <p className="text-xs text-gray-400">{myLeaves.length} applications</p>
                  </div>
                </div>
              </div>

              {myLeaves.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FaCalendarAlt className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500 font-medium mb-2">No leave applications yet</p>
                  <button onClick={() => setShowLeaveForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                    Apply for Leave
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-5 space-y-4">
                    {displayedMyLeaves.map(leave => (
                      <div key={leave._id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-all">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {getStatusBadge(leave.status)}
                              {getTypeBadge(leave.type)}
                            </div>
                            <p className="text-sm font-medium text-gray-800">
                              {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                              <span className="text-gray-400 ml-2">({leave.days} days)</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Applied: {formatDate(leave.appliedAt || leave.createdAt)}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>
                            {leave.status === 'pending' && (
                              <p className="text-xs text-amber-600 mt-2 font-medium">
                                ⏳ Awaiting Admin approval
                              </p>
                            )}
                            {leave.rejectionReason && (
                              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                                <p className="text-xs text-red-600">
                                  <span className="font-medium">Rejection reason:</span> {leave.rejectionReason}
                                </p>
                              </div>
                            )}
                          </div>
                          {leave.status === 'pending' && (
                            <button onClick={() => handleCancelMyLeave(leave._id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap">
                              Cancel Leave
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {myLeaves.length > 5 && (
                    <button
                      onClick={() => setShowAllMyLeaves(!showAllMyLeaves)}
                      className="w-full py-3 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors border-t border-gray-100 bg-gray-50"
                    >
                      {showAllMyLeaves ? (
                        <>Show Less <FaChevronUp className="text-xs" /></>
                      ) : (
                        <>Show All ({myLeaves.length}) <FaChevronDown className="text-xs" /></>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <LeaveFormModal
        isOpen={showLeaveForm}
        onClose={() => setShowLeaveForm(false)}
        onSubmit={handleSubmitLeave}
        monthlyBalance={myMonthlyBalance}
      />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportCSV={handleExportCSV}
        onExportMonthlyReport={handleExportMonthlyReport}
        exporting={exporting}
      />
    </div>
  );
};

export default HRLeave;