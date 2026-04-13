import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api/leaves';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Get user role from token
const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'employee';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.role || 'employee';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'employee';
  }
};

// Get user ID from token
const getUserId = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?._id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

// Monthly Leave System Configuration
const MONTHLY_LEAVE_CONFIG = {
  TOTAL_LEAVES_PER_MONTH: 2,
  MAX_CONSECUTIVE_DAYS: 5,
  LEAVE_TYPES: [
    { id: 'monthly', name: 'Monthly Leave', color: 'bg-blue-100 text-blue-800' },
    { id: 'emergency', name: 'Emergency Leave', color: 'bg-red-100 text-red-800' }
  ]
};

// KPI Card Component
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

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

// Loading Spinner Component
const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    <span className="ml-3 text-gray-600">{text}</span>
  </div>
);

// Leave Form Modal Component
const LeaveFormModal = ({ isOpen, onClose, onSubmit, monthlyBalance = 2 }) => {
  const [formData, setFormData] = useState({
    type: 'monthly',
    startDate: '',
    endDate: '',
    reason: '',
    contactNumber: '',
    leaveCount: 1
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState(0);

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const handleDateChange = (name, value) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (newData.startDate && newData.endDate) {
        const days = calculateDays(newData.startDate, newData.endDate);
        setCalculatedDays(days);
        if (days > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS) {
          setErrors(prev => ({ ...prev, days: `Maximum ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days allowed` }));
        } else {
          setErrors(prev => ({ ...prev, days: null }));
        }
      }
      return newData;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    else if (new Date(formData.startDate) < new Date().setHours(0, 0, 0, 0)) newErrors.startDate = 'Start date cannot be in the past';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) newErrors.endDate = 'End date cannot be before start date';
    if (calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS) newErrors.days = `Maximum ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days allowed`;
    if (!formData.reason.trim()) newErrors.reason = 'Reason is required';
    else if (formData.reason.trim().length < 10) newErrors.reason = 'Reason must be at least 10 characters';
    if (formData.leaveCount > monthlyBalance) newErrors.leaveCount = `Only ${monthlyBalance} leave(s) available this month`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'startDate' || name === 'endDate') {
      handleDateChange(name, value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Apply for Leave</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-indigo-900">Monthly Leave Balance</p>
                <p className="text-xs text-indigo-700">{currentMonth} {currentYear}: {monthlyBalance} leaves remaining</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-900">{monthlyBalance}/{MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH}</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
              <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                {MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.map(type => (<option key={type.id} value={type.id}>{type.name}</option>))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} min={new Date().toISOString().split('T')[0]} className={`w-full px-3 py-2 text-sm border rounded-lg ${errors.startDate ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`} />
                {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} min={formData.startDate || new Date().toISOString().split('T')[0]} className={`w-full px-3 py-2 text-sm border rounded-lg ${errors.endDate ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`} />
                {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
              </div>
            </div>
            
            {calculatedDays > 0 && (
              <div className={`p-3 rounded-lg ${calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS ? 'bg-red-50 border border-red-100' : 'bg-indigo-50 border border-indigo-100'}`}>
                <p className={`text-sm ${calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS ? 'text-red-700' : 'text-indigo-700'}`}>
                  Duration: {calculatedDays} days {calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS && `(Max ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} days)`}
                </p>
                {errors.days && <p className="mt-1 text-xs text-red-500">{errors.days}</p>}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Leaves to Use *</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input type="range" name="leaveCount" min="1" max={Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH)} value={formData.leaveCount} onChange={handleInputChange} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 leave</span><span>{Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH)} leaves</span></div>
                </div>
                <div className="w-16 text-center"><span className="text-2xl font-bold text-gray-900">{formData.leaveCount}</span><p className="text-xs text-gray-500">day(s)</p></div>
              </div>
              {errors.leaveCount && <p className="mt-1 text-xs text-red-500">{errors.leaveCount}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave *</label>
              <textarea name="reason" value={formData.reason} onChange={handleInputChange} rows={3} className={`w-full px-3 py-2 text-sm border rounded-lg resize-none ${errors.reason ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`} placeholder="Please provide details about your leave..." />
              {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">{loading ? 'Submitting...' : 'Submit Application'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", confirmColor = "red" }) => {
  const [confirmInput, setConfirmInput] = useState('');
  
  const handleConfirm = () => {
    onConfirm(confirmInput);
    setConfirmInput('');
    onClose();
  };

  if (!isOpen) return null;

  const confirmButtonClass = {
    red: "bg-red-600 hover:bg-red-700",
    orange: "bg-orange-600 hover:bg-orange-700",
    blue: "bg-blue-600 hover:bg-blue-700"
  }[confirmColor];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
        </div>
        <div className="p-6">
          <div className="text-sm text-gray-600 mb-4">{message}</div>
          {title.includes("DELETE_ALL") && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type "DELETE_ALL_LEAVES" to confirm:</label>
              <input type="text" value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500" placeholder="DELETE_ALL_LEAVES" />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleConfirm} disabled={title.includes("DELETE_ALL") && confirmInput !== "DELETE_ALL_LEAVES"} className={`px-4 py-2 ${confirmButtonClass} text-white text-sm font-medium rounded-lg disabled:opacity-50`}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export Modal
const ExportModal = ({ isOpen, onClose, onExportCSV, onExportMonthlyReport, exporting }) => {
  const [exportType, setExportType] = useState('csv');
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const handleSubmit = () => {
    if (exportType === 'csv') {
      onExportCSV();
    } else {
      onExportMonthlyReport(month, year);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Export Options</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Type *</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="exportType" value="csv" checked={exportType === 'csv'} onChange={(e) => setExportType(e.target.value)} className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-gray-700">Export All Leaves (CSV)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="exportType" value="monthly" checked={exportType === 'monthly'} onChange={(e) => setExportType(e.target.value)} className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-gray-700">Monthly Leave Report</span>
              </label>
            </div>
          </div>
          
          {exportType === 'monthly' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="1">January</option><option value="2">February</option><option value="3">March</option><option value="4">April</option>
                  <option value="5">May</option><option value="6">June</option><option value="7">July</option><option value="8">August</option>
                  <option value="9">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input type="number" value={year} onChange={(e) => setYear(e.target.value)} min="2000" max="2100" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>
          )}
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <p className="text-sm text-indigo-700">
              {exportType === 'csv' 
                ? 'This will export all leave requests to a CSV file with employee details, dates, status, and approval information.'
                : 'This will generate a monthly report showing leaves used by each employee for the selected month.'}
            </p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={exporting} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">{exporting ? 'Exporting...' : 'Export'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HRLeave = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myMonthlyBalance, setMyMonthlyBalance] = useState(MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
  const [leaveStats, setLeaveStats] = useState({ pending: 0, approved: 0, rejected: 0, totalRequests: 0 });
  const [loading, setLoading] = useState({ requests: true, myLeaves: true, balance: true });
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteType, setDeleteType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('cancelled');
  const [successMessage, setSuccessMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const calculateUsedLeavesThisMonth = useCallback((leaves) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return leaves.filter(request => {
      const requestDate = new Date(request.startDate || request.createdAt);
      return requestDate.getMonth() === currentMonth && requestDate.getFullYear() === currentYear && request.status === 'approved';
    }).reduce((total, request) => total + (request.leaveCount || 1), 0);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchLeaveRequests();
    fetchMyLeaves();
    fetchMyMonthlyBalance();
    fetchLeaveStats();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const response = await api.get('/all');
      if (response.data?.success) {
        const hrUserId = getUserId();
        const filteredLeaves = response.data.data?.filter(leave => leave.employee?._id !== hrUserId) || [];
        setLeaveRequests(filteredLeaves);
      }
    } catch (err) {
      if (err.response?.status === 403) setError('Access denied. Only HR/Admin can view all leaves.');
      else setError('Failed to load leave requests');
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  };

  const fetchMyLeaves = async () => {
    try {
      setLoading(prev => ({ ...prev, myLeaves: true }));
      const response = await api.get('/my-leaves');
      if (response.data?.success) setMyLeaves(response.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(prev => ({ ...prev, myLeaves: false })); }
  };

  const fetchMyMonthlyBalance = async () => {
    try {
      setLoading(prev => ({ ...prev, balance: true }));
      const response = await api.get('/monthly-balance');
      if (response.data?.success) setMyMonthlyBalance(response.data.data?.leavesAvailable || MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
      else setMyMonthlyBalance(MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
    } catch (err) { setMyMonthlyBalance(MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH); } finally { setLoading(prev => ({ ...prev, balance: false })); }
  };

  const fetchLeaveStats = async () => {
    try {
      const response = await api.get('/all');
      if (response.data?.success) {
        const allLeaves = response.data.data || [];
        const hrUserId = getUserId();
        const employeeLeaves = allLeaves.filter(leave => leave.employee?._id !== hrUserId);
        setLeaveStats({
          pending: employeeLeaves.filter(l => l.status === 'pending').length,
          approved: employeeLeaves.filter(l => l.status === 'approved').length,
          rejected: employeeLeaves.filter(l => l.status === 'rejected').length,
          totalRequests: employeeLeaves.length
        });
      }
    } catch (err) { console.error(err); }
  };

  const refreshAllData = async () => {
    setLoading({ requests: true, myLeaves: true, balance: true });
    await Promise.all([fetchLeaveRequests(), fetchMyLeaves(), fetchMyMonthlyBalance(), fetchLeaveStats()]);
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this leave request?')) return;
    try {
      const response = await api.post(`/${id}/review`, { action: 'approve', rejectionReason: '' });
      if (response.data.success) { setSuccessMessage('Leave approved successfully!'); refreshAllData(); }
      else alert(response.data.message || 'Failed to approve leave');
    } catch (err) { alert(err.response?.data?.message || 'Failed to approve leave'); }
  };

  const handleReject = async (id) => {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason || !window.confirm('Are you sure you want to reject this leave request?')) return;
    try {
      const response = await api.post(`/${id}/review`, { action: 'reject', rejectionReason });
      if (response.data.success) { setSuccessMessage('Leave rejected successfully!'); refreshAllData(); }
      else alert(response.data.message || 'Failed to reject leave');
    } catch (err) { alert(err.response?.data?.message || 'Failed to reject leave'); }
  };

  const handleSubmitLeave = async (formData) => {
    try {
      const response = await api.post('/apply', { ...formData, leaveCount: formData.leaveCount || 1 });
      if (response.data.success) {
        setSuccessMessage('Your leave application has been submitted! It requires admin approval.');
        setShowLeaveForm(false);
        refreshAllData();
      }
    } catch (error) { throw error; }
  };

  const handleDeleteAll = async (confirmationInput) => {
    try {
      let filters = {};
      if (deleteType === 'status') filters.status = selectedStatus;
      else if (deleteType === 'date') {
        const dateStr = prompt('Delete leaves before date (YYYY-MM-DD):', '2023-01-01');
        if (!dateStr) return;
        filters.endDate = dateStr; filters.startDate = '2000-01-01';
      }
      const requestData = { confirmation: confirmationInput || 'DELETE_ALL_LEAVES', filters: Object.keys(filters).length > 0 ? filters : undefined };
      const response = await api.delete('/delete-all', { data: requestData });
      if (response.data.success) {
        setSuccessMessage(`Successfully deleted ${response.data.data.deletedCount} leave request(s)`);
        refreshAllData();
      }
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete leaves'); }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/export${filter !== 'all' ? `?status=${filter}` : ''}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to export data');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `leaves_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      setSuccessMessage('CSV export completed successfully!');
    } catch (err) { alert('Failed to export CSV. Please try again.'); } finally { setExporting(false); }
  };

  const handleExportMonthlyReport = async (month, year) => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/export/monthly-report?month=${month}&year=${year}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to export monthly report');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `monthly_leave_report_${month}_${year}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      setSuccessMessage('Monthly report export completed successfully!');
    } catch (err) { alert('Failed to export monthly report. Please try again.'); } finally { setExporting(false); }
  };

  useEffect(() => { if (successMessage) { const timer = setTimeout(() => setSuccessMessage(''), 5000); return () => clearTimeout(timer); } }, [successMessage]);

  const filteredRequests = leaveRequests.filter(request => {
    if (filter !== 'all' && request.status?.toLowerCase() !== filter) return false;
    if (searchTerm && !request.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    const variants = { 'approved': 'success', 'pending': 'warning', 'rejected': 'danger', 'cancelled': 'default' };
    return <Badge variant={variants[status] || 'default'}>{status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}</Badge>;
  };

  const getLeaveTypeBadge = (type) => {
    const typeInfo = MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.find(t => t.id === type);
    return <Badge variant={type === 'monthly' ? 'info' : 'danger'}>{typeInfo?.name || type}</Badge>;
  };

  const myUsedLeavesThisMonth = useMemo(() => calculateUsedLeavesThisMonth(myLeaves), [myLeaves, calculateUsedLeavesThisMonth]);
  const isAdminOrHR = getUserRole() === 'admin' || getUserRole() === 'hr';

  if (loading.requests && activeTab === 'manage') return <LoadingSpinner text="Loading leave requests..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-indigo-500 text-xl">📋</span>
                HR Leave Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage employee leave requests and apply for your own leaves</p>
            </div>
            <div className="flex gap-3">
              <button onClick={refreshAllData} disabled={loading.requests} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
              </button>
              {activeTab === 'myLeaves' && (
                <button onClick={() => setShowLeaveForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                  <span className="text-sm">+</span> Apply for Leave
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <div className="flex items-center gap-3"><span className="text-green-500">✅</span><p className="text-sm text-green-700">{successMessage}</p></div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button onClick={() => { setActiveTab('manage'); setFilter('all'); setSearchTerm(''); }} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'manage' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Manage Employee Leaves</button>
            <button onClick={() => { setActiveTab('myLeaves'); setShowLeaveForm(false); }} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'myLeaves' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>My Leaves</button>
          </div>
        </div>

        {activeTab === 'manage' ? (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={() => <span className="text-white text-lg">⏳</span>} label="Pending Requests" value={leaveStats.pending} sub="Awaiting approval" iconBg="bg-amber-500" />
              <KpiCard icon={() => <span className="text-white text-lg">✅</span>} label="Approved" value={leaveStats.approved} sub="Confirmed" iconBg="bg-emerald-500" />
              <KpiCard icon={() => <span className="text-white text-lg">❌</span>} label="Rejected" value={leaveStats.rejected} sub="Declined" iconBg="bg-red-500" />
              <KpiCard icon={() => <span className="text-white text-lg">📊</span>} label="Total Requests" value={leaveStats.totalRequests} sub="All time" iconBg="bg-indigo-500" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-100 p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input type="text" placeholder="Search by employee name..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All Requests</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                </select>
                <button onClick={() => setShowExportModal(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">Export Data</button>
              </div>
            </div>

            {/* Leave Requests Table */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><span className="text-indigo-500 text-sm">📋</span></div><div><p className="text-sm font-semibold text-gray-800">Employee Leave Requests</p><p className="text-xs text-gray-400">{filteredRequests.length} requests</p></div></div></div>
              </div>
              
              {filteredRequests.length === 0 ? (
                <div className="text-center py-16"><div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4"><span className="text-2xl">📝</span></div><p className="text-gray-700 font-medium">No leave requests found</p><p className="text-gray-400 text-sm mt-1">{searchTerm ? 'Try adjusting your search' : 'No employee leave requests to display'}</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr><th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th><th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th><th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th><th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th><th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRequests.map((request) => (
                        <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4"><div className="font-medium text-gray-900">{request.employee?.name || 'Unknown'}</div><div className="text-xs text-gray-500">{request.employee?.employeeId || 'N/A'} • {request.employee?.department || 'N/A'}</div></td>
                          <td className="px-5 py-4">{getLeaveTypeBadge(request.type)}</td>
                          <td className="px-5 py-4"><div className="text-sm text-gray-800">{formatDate(request.startDate)}<br/><span className="text-xs text-gray-400">to</span> {formatDate(request.endDate)}</div></td>
                          <td className="px-5 py-4"><span className="font-medium text-gray-800">{request.days || 0}</span><span className="text-xs text-gray-500 ml-1">days</span><div className="text-xs text-gray-400">{request.leaveCount || 1} leave(s) used</div></td>
                          <td className="px-5 py-4">{getStatusBadge(request.status)}</td>
                          <td className="px-5 py-4">{request.status === 'pending' ? (<div className="flex gap-2"><button onClick={() => handleApprove(request._id)} className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">Approve</button><button onClick={() => handleReject(request._id)} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Reject</button></div>) : (<button onClick={() => alert(`Status: ${request.status}\nReason: ${request.reason}\nLeaves Used: ${request.leaveCount || 1}`)} className="text-xs text-indigo-600 hover:text-indigo-700">View Details</button>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Monthly Leave Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4"><div><p className="text-xs text-gray-400 font-medium mb-1">Monthly Leave Balance</p><p className="text-2xl font-semibold text-gray-900">{myMonthlyBalance} / {MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH}</p><p className="text-xs text-gray-400 mt-1">{new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}</p></div><div className="text-3xl">📅</div></div>
                <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-500">Used this Month</span><span className="font-medium text-red-600">{myUsedLeavesThisMonth} days</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Remaining</span><span className="font-medium text-green-600">{myMonthlyBalance} days</span></div><div className="w-full bg-gray-100 rounded-full h-1.5"><div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min((myUsedLeavesThisMonth / MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH) * 100, 100)}%` }}></div></div><div className="pt-3 border-t border-gray-100"><p className="text-xs text-gray-400">• Each approved leave counts as 1 day<br/>• Max {MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days<br/>• Balance resets monthly</p></div></div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-6"><div className="flex items-center justify-between mb-4"><div><p className="text-xs text-gray-400 font-medium mb-1">Leave Summary</p><p className="text-2xl font-semibold text-gray-900">{myLeaves.length}</p><p className="text-xs text-gray-400 mt-1">Total applications</p></div><div className="text-3xl">📊</div></div><div className="space-y-3"><div className="flex justify-between p-3 bg-amber-50 rounded-lg"><span className="text-sm text-gray-600">Pending</span><span className="font-medium text-amber-600">{myLeaves.filter(l => l.status === 'pending').length}</span></div><div className="flex justify-between p-3 bg-green-50 rounded-lg"><span className="text-sm text-gray-600">Approved</span><span className="font-medium text-green-600">{myLeaves.filter(l => l.status === 'approved').length}</span></div><div className="flex justify-between p-3 bg-red-50 rounded-lg"><span className="text-sm text-gray-600">Rejected</span><span className="font-medium text-red-600">{myLeaves.filter(l => l.status === 'rejected').length}</span></div></div></div>
            </div>

            {/* My Leaves List */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><span className="text-indigo-500 text-sm">📋</span></div><div><p className="text-sm font-semibold text-gray-800">My Leave Applications</p><p className="text-xs text-gray-400">{myLeaves.length} applications</p></div></div></div>
              {myLeaves.length === 0 ? (<div className="text-center py-16"><div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4"><span className="text-2xl">📝</span></div><p className="text-gray-700 font-medium">No leave applications</p><p className="text-gray-400 text-sm mt-1 mb-4">You haven't applied for any leaves yet</p><button onClick={() => setShowLeaveForm(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Apply for Leave</button></div>) : (
                <div className="p-5 space-y-4">
                  {myLeaves.map((leave) => (
                    <div key={leave._id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div><div className="flex items-center gap-2 mb-2">{getStatusBadge(leave.status)}{getLeaveTypeBadge(leave.type)}</div><p className="text-sm font-medium text-gray-800">{formatDate(leave.startDate)} - {formatDate(leave.endDate)} <span className="text-gray-500">({leave.days} days)</span></p><p className="text-xs text-gray-400 mt-1">Applied on {formatDate(leave.appliedAt || leave.createdAt)}</p><p className="text-sm text-gray-600 mt-2">{leave.reason}</p>{leave.rejectionReason && (<div className="mt-2 p-2 bg-red-50 rounded"><p className="text-xs text-red-600"><span className="font-medium">Rejection Reason:</span> {leave.rejectionReason}</p></div>)}</div>
                        <div>{leave.status === 'pending' && (<button onClick={async () => { if (window.confirm('Cancel this leave request?')) { try { await api.delete(`/${leave._id}`); setSuccessMessage('Leave request cancelled'); refreshAllData(); } catch (error) { alert('Failed to cancel leave'); } } }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Cancel</button>)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <LeaveFormModal isOpen={showLeaveForm} onClose={() => setShowLeaveForm(false)} onSubmit={handleSubmitLeave} monthlyBalance={myMonthlyBalance} />
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExportCSV={handleExportCSV} onExportMonthlyReport={handleExportMonthlyReport} exporting={exporting} />
      <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAll} title="DELETE ALL LEAVES" message={<div><p className="text-red-600 font-bold mb-4">⚠️ WARNING: This action cannot be undone!</p><div className="space-y-3"><label className="flex items-center gap-2"><input type="radio" checked={deleteType === 'all'} onChange={() => setDeleteType('all')} /> Delete all leaves</label><label className="flex items-center gap-2"><input type="radio" checked={deleteType === 'status'} onChange={() => setDeleteType('status')} /> Delete by status:</label><select className="ml-6 px-2 py-1 border rounded" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} disabled={deleteType !== 'status'}><option value="cancelled">Cancelled</option><option value="rejected">Rejected</option><option value="pending">Pending</option><option value="approved">Approved</option></select><label className="flex items-center gap-2"><input type="radio" checked={deleteType === 'date'} onChange={() => setDeleteType('date')} /> Delete leaves before date</label></div></div>} confirmText="Delete All" confirmColor="red" />
    </div>
  );
};

export default HRLeave;