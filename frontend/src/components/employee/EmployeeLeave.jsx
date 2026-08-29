import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  FaCalendarAlt, FaFileAlt, FaExclamationTriangle, FaSync, 
  FaPlus, FaEye, FaEdit, FaTrash, FaCheckCircle, FaClock,
  FaChartPie, FaLeaf, FaHourglassHalf, FaPlane, FaUserCheck
} from 'react-icons/fa';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api/leaves';

// Helper function to decode JWT token
const decodeToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Create axios instance with auth token
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced error handler
const handleApiError = (error, defaultMessage = 'Something went wrong') => {
  console.log('🔴 API Error Details:', {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message
  });
  
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return 'Session expired. Please login again.';
  }
  
  if (error.response?.status === 400) {
    const errors = error.response?.data?.errors || error.response?.data?.error;
    if (errors && typeof errors === 'object') {
      return Object.values(errors).join(', ');
    }
  }
  
  return error.response?.data?.message || 
         error.response?.data?.error || 
         error.message || 
         defaultMessage;
};

// Constants for Monthly Leave System (2 leaves per month)
const MONTHLY_LEAVE_CONFIG = {
  totalLeavesPerMonth: 2,
  leaveTypes: [
    { 
      id: 'monthly', 
      name: 'Monthly Leave', 
      icon: '📅', 
      description: 'Monthly allocation of 2 leaves'
    },
    { 
      id: 'emergency', 
      name: 'Emergency Leave', 
      icon: '🚨', 
      description: 'For urgent situations (counts toward monthly limit)'
    }
  ],
  maxConsecutiveDays: 5
};

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'default' }
};

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Badge Component - Matching Payroll style
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// KpiCard Component - Matching Payroll style
const KpiCard = ({ title, value, icon, color, subtitle }) => {
  const colors = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    purple: 'bg-purple-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
    rose: 'bg-rose-500', cyan: 'bg-cyan-500', orange: 'bg-orange-500'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    <span className="ml-3 text-gray-600">{text}</span>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="text-center py-12">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
      <FaExclamationTriangle className="text-red-500 text-2xl" />
    </div>
    <p className="text-gray-700 mb-4">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
        Retry
      </button>
    )}
  </div>
);

// Success Message Component
const SuccessMessage = ({ message, onClose }) => (
  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
    <FaCheckCircle className="text-green-500 flex-shrink-0 w-5 h-5" />
    <span className="text-green-700 flex-1">{message}</span>
    <button onClick={onClose} className="text-green-400 hover:text-green-600">✕</button>
  </div>
);

// Main EmployeeLeave Component
const EmployeeLeave = () => {
  const [monthlyBalance, setMonthlyBalance] = useState(MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState({ balances: true, requests: true });
  const [error, setError] = useState({ balances: '', requests: '' });
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMonthlyBalance = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, balances: true }));
      setError(prev => ({ ...prev, balances: '' }));
      
      const response = await api.get('/balance');
      
      if (response.data?.success) {
        const data = response.data.data;
        if (typeof data === 'object' && data !== null) {
          if ('monthly' in data) {
            setMonthlyBalance(data.monthly);
          } else if ('leavesAvailable' in data) {
            setMonthlyBalance(data.leavesAvailable);
          } else {
            setMonthlyBalance(MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth);
          }
        } else {
          setMonthlyBalance(MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth);
        }
      } else {
        setMonthlyBalance(MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth);
      }
    } catch (error) {
      console.error('❌ Error fetching monthly balance:', error);
      const errorMsg = handleApiError(error, 'Failed to load balance');
      setError(prev => ({ ...prev, balances: errorMsg }));
      setMonthlyBalance(MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth);
    } finally {
      setLoading(prev => ({ ...prev, balances: false }));
    }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      setError(prev => ({ ...prev, requests: '' }));
      
      const response = await api.get('/my-leaves');
      
      if (response.data?.success) {
        setLeaveRequests(response.data.data || []);
      } else {
        setError(prev => ({ 
          ...prev, 
          requests: response.data?.message || 'Failed to load leave requests' 
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching leave requests:', error);
      const errorMsg = handleApiError(error, 'Failed to load leave requests');
      setError(prev => ({ ...prev, requests: errorMsg }));
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  }, []);

  const fetchAllData = useCallback(() => {
    fetchMonthlyBalance();
    fetchLeaveRequests();
  }, [fetchMonthlyBalance, fetchLeaveRequests]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const usedLeavesThisMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return leaveRequests
      .filter(request => {
        const requestDate = new Date(request.startDate || request.createdAt);
        return requestDate.getMonth() === currentMonth && 
               requestDate.getFullYear() === currentYear &&
               request.status === 'approved';
      })
      .reduce((total, request) => total + (request.leaveCount || 1), 0);
  }, [leaveRequests]);

  const filteredLeaveRequests = useMemo(() => {
    if (statusFilter === 'all') return leaveRequests;
    return leaveRequests.filter(req => req.status === statusFilter);
  }, [leaveRequests, statusFilter]);

  const getFilteredCounts = useMemo(() => {
    const pending = leaveRequests.filter(req => req.status === 'pending').length;
    const approved = leaveRequests.filter(req => req.status === 'approved').length;
    const rejected = leaveRequests.filter(req => req.status === 'rejected').length;
    return { pending, approved, rejected, total: leaveRequests.length };
  }, [leaveRequests]);

  const handleSubmitLeave = useCallback(async (formData) => {
    try {
      if (editingLeave) {
        const response = await api.put(`/${editingLeave}`, formData);
        if (response.data.success) {
          setSuccessMessage('Leave request updated successfully!');
          fetchAllData();
          setEditingLeave(null);
          setShowLeaveForm(false);
        }
      } else {
        const response = await api.post('/apply', formData);
        if (response.data.success) {
          setSuccessMessage('Leave application submitted successfully!');
          fetchAllData();
          setShowLeaveForm(false);
        }
      }
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error submitting leave:', error);
      const errorMessage = handleApiError(error, 'Failed to submit leave application');
      return Promise.reject(new Error(errorMessage));
    }
  }, [editingLeave, fetchAllData]);

  const handleEditLeave = useCallback((leave) => {
    setEditingLeave(leave._id);
    setShowLeaveForm(true);
  }, []);

  const handleCancelLeave = useCallback(async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      await api.delete(`/${leaveId}`);
      setSuccessMessage('Leave request cancelled successfully!');
      fetchAllData();
    } catch (error) {
      console.error('❌ Error cancelling leave:', error);
      alert(handleApiError(error, 'Failed to cancel leave request'));
    }
  }, [fetchAllData]);

  const handleViewDetails = useCallback((leaveId) => {
    setSelectedLeaveId(leaveId);
    setShowLeaveDetails(true);
  }, []);

  const handleDeleteFromModal = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleCloseForm = useCallback(() => {
    setShowLeaveForm(false);
    setEditingLeave(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowLeaveDetails(false);
    setSelectedLeaveId(null);
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const icons = {
      pending: <FaClock className="mr-1 text-xs" />,
      approved: <FaCheckCircle className="mr-1 text-xs" />,
      rejected: <FaExclamationTriangle className="mr-1 text-xs" />,
      cancelled: <FaClock className="mr-1 text-xs" />
    };
    return (
      <Badge variant={config.variant}>
        {icons[status]} {config.label}
      </Badge>
    );
  };

  if (loading.balances && loading.requests) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leave data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Matching Payroll Style */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaCalendarAlt className="text-indigo-600" /> Leave Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                You have {MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves per month
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaPlane className="w-5 h-5" />
              <span className="text-sm">Leave Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Error Message */}
        {error.balances || error.requests ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <FaExclamationTriangle className="text-red-500 flex-shrink-0 w-5 h-5" />
            <span className="text-red-700 flex-1">{error.balances || error.requests}</span>
            <button onClick={() => { setError({ balances: '', requests: '' }); fetchAllData(); }} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        ) : null}

        {/* Success Message */}
        {successMessage && (
          <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />
        )}

        {/* KPI Cards - Matching Payroll Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard 
            title="Remaining Balance" 
            value={monthlyBalance} 
            icon={<FaLeaf className="w-6 h-6 text-white" />} 
            color="emerald"
            subtitle={`${currentMonth} ${currentYear}`}
          />
          <KpiCard 
            title="Used This Month" 
            value={usedLeavesThisMonth} 
            icon={<FaChartPie className="w-6 h-6 text-white" />} 
            color="blue"
            subtitle={`${Math.round((usedLeavesThisMonth / MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth) * 100)}% used`}
          />
          <KpiCard 
            title="Pending Requests" 
            value={getFilteredCounts.pending} 
            icon={<FaHourglassHalf className="w-6 h-6 text-white" />} 
            color="yellow"
            subtitle="Awaiting approval"
          />
          <KpiCard 
            title="Approved Leaves" 
            value={getFilteredCounts.approved} 
            icon={<FaUserCheck className="w-6 h-6 text-white" />} 
            color="purple"
            subtitle="Total approved"
          />
        </div>

        {/* Leave Requests Table - Matching Payroll Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FaFileAlt className="w-4 h-4 text-indigo-500" /> My Leave History
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{leaveRequests.length} total requests</p>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchAllData} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
                  <FaSync className={`w-3.5 h-3.5 ${loading.requests ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={() => setShowLeaveForm(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                  <FaPlus className="w-3.5 h-3.5" /> Apply
                </button>
              </div>
            </div>
          </div>

          {/* Filters - Matching Payroll Style */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button 
                onClick={() => { setStatusFilter('all'); }} 
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <FaCalendarAlt className="w-3 h-3" /> Reset Filters
              </button>
              <div className="col-span-2 flex items-center gap-3 text-xs text-gray-400">
                <span>Pending: {getFilteredCounts.pending}</span>
                <span>Approved: {getFilteredCounts.approved}</span>
                <span>Rejected: {getFilteredCounts.rejected}</span>
              </div>
            </div>
          </div>

          {/* Table - Matching Payroll Style */}
          <div className="overflow-x-auto">
            {error.requests ? (
              <ErrorMessage message={error.requests} onRetry={fetchLeaveRequests} />
            ) : loading.requests ? (
              <LoadingSpinner text="Loading leave requests..." />
            ) : filteredLeaveRequests.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <FaCalendarAlt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No leave requests found</p>
                <p className="text-xs text-gray-400 mt-1">Apply for a new leave to get started</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date Range</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Applied</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeaveRequests.map((request) => {
                    const typeInfo = MONTHLY_LEAVE_CONFIG.leaveTypes.find(t => t.id === request.type);
                    return (
                      <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{typeInfo?.icon || '📅'}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{typeInfo?.name || 'Leave'}</div>
                              <div className="text-xs text-gray-400">{request.reason?.substring(0, 30)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-800">{formatDate(request.startDate)}</div>
                          <div className="text-xs text-gray-400">to {formatDate(request.endDate)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm font-semibold text-indigo-600">{request.leaveCount || 1}</div>
                          <div className="text-xs text-gray-400">day(s)</div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">{formatDate(request.appliedAt || request.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(request._id)}
                              className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FaEye className="w-3 h-3" /> View
                            </button>
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleEditLeave(request)}
                                  className="flex items-center gap-1 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-medium rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <FaEdit className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleCancelLeave(request._id)}
                                  className="flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <FaTrash className="w-3 h-3" /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Help Section - Matching Payroll Style */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaCalendarAlt className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">Need Help with Your Leave?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              For leave queries, approvals, or policy questions, contact our HR team at <span className="text-indigo-600 font-medium">hr@company.com</span>
            </p>
          </div>
        </div>
      </div>

      {/* Leave Form Modal - Matching Payroll Style */}
      {showLeaveForm && (
        <LeaveFormModal
          isOpen={showLeaveForm}
          onClose={handleCloseForm}
          onSubmit={handleSubmitLeave}
          initialData={editingLeave ? leaveRequests.find(l => l._id === editingLeave) : null}
          monthlyBalance={monthlyBalance}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      )}

      {/* Leave Details Modal - Matching Payroll Style */}
      {showLeaveDetails && (
        <LeaveDetailsModal
          isOpen={showLeaveDetails}
          leaveId={selectedLeaveId}
          onClose={handleCloseDetails}
          onSuccess={fetchAllData}
          onDelete={handleDeleteFromModal}
        />
      )}
    </div>
  );
};

// Leave Form Modal - Redesigned
const LeaveFormModal = ({ isOpen, onClose, onSubmit, initialData, monthlyBalance, currentMonth, currentYear }) => {
  const [formData, setFormData] = useState({
    type: 'monthly',
    startDate: '',
    endDate: '',
    reason: '',
    leaveCount: 1
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type || 'monthly',
        startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
        endDate: initialData.endDate ? initialData.endDate.split('T')[0] : '',
        reason: initialData.reason || '',
        leaveCount: initialData.leaveCount || 1
      });
    } else {
      setFormData({
        type: 'monthly',
        startDate: '',
        endDate: '',
        reason: '',
        leaveCount: 1
      });
    }
  }, [initialData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (new Date(formData.startDate) < new Date().setHours(0, 0, 0, 0)) {
      newErrors.startDate = 'Start date cannot be in the past';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date cannot be before start date';
    }
    
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > MONTHLY_LEAVE_CONFIG.maxConsecutiveDays) {
        newErrors.days = `Maximum consecutive days allowed is ${MONTHLY_LEAVE_CONFIG.maxConsecutiveDays}`;
      }
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }
    
    if (formData.leaveCount > monthlyBalance) {
      newErrors.leaveCount = `Insufficient monthly balance. You have ${monthlyBalance} leave(s) remaining.`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const formattedData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        contactNumber: ''
      };
      
      await onSubmit(formattedData);
      onClose();
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to submit leave application');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    const hasChanges = Object.values(formData).some(value => 
      value !== '' && value !== 'monthly' && value !== 1
    );
    
    if (hasChanges) {
      const shouldClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (shouldClose) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeSelect = (typeId) => {
    setFormData(prev => ({ ...prev, type: typeId }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {initialData ? 'Edit Leave Request' : 'Apply for Leave'}
            </h3>
            <p className="text-sm text-gray-500">{currentMonth} {currentYear}</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <FaTimes className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Balance Info */}
            <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <FaLeaf className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Monthly Leave Balance</p>
                <p className="text-xs text-gray-500">
                  {monthlyBalance} of {MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves remaining
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-600">{monthlyBalance}</p>
                <p className="text-xs text-gray-400">days left</p>
              </div>
            </div>

            {/* Leave Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Leave Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MONTHLY_LEAVE_CONFIG.leaveTypes.map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                      formData.type === type.id
                        ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    } ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!!initialData}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{type.name}</p>
                        <p className="text-xs text-gray-500">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    errors.startDate ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    errors.endDate ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
              </div>
            </div>

            {errors.days && (
              <div className="text-xs text-red-600 flex items-center gap-1.5">
                <FaExclamationTriangle className="w-3.5 h-3.5" /> {errors.days}
              </div>
            )}

            {/* Leave Count */}
            <div>
              <label htmlFor="leaveCount" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Leaves to Use *
              </label>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <input
                    type="range"
                    id="leaveCount"
                    name="leaveCount"
                    min="1"
                    max={Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth)}
                    value={formData.leaveCount}
                    onChange={handleInputChange}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 day</span>
                    <span>{Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth)} days</span>
                  </div>
                </div>
                <div className="w-16 text-center bg-gray-50 rounded-lg p-2">
                  <span className="text-2xl font-bold text-indigo-600">{formData.leaveCount}</span>
                  <p className="text-xs text-gray-500">day(s)</p>
                </div>
              </div>
              {errors.leaveCount && <p className="mt-1 text-xs text-red-600">{errors.leaveCount}</p>}
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Leave *
              </label>
              <textarea
                id="reason"
                name="reason"
                required
                value={formData.reason}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none ${
                  errors.reason ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="Please provide details about your leave..."
              />
              {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={handleClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" disabled={loading}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading || formData.leaveCount > monthlyBalance} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <FaSync className="animate-spin w-4 h-4" /> 
                {initialData ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              <>
                <FaPlus className="w-4 h-4" />
                {initialData ? 'Update Leave' : 'Submit Application'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Leave Details Modal - Redesigned
const LeaveDetailsModal = ({ isOpen, leaveId, onClose, onSuccess, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [leave, setLeave] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const modalRef = useRef(null);

  const fetchLeaveDetails = useCallback(async () => {
    if (!leaveId) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/${leaveId}`);
      if (response.data.success) {
        setLeave(response.data.data);
      } else {
        setError('Failed to load leave details');
      }
    } catch (error) {
      setError(handleApiError(error, 'Failed to load leave details'));
    } finally {
      setLoading(false);
    }
  }, [leaveId]);

  useEffect(() => {
    if (isOpen && leaveId) {
      fetchLeaveDetails();
    }
  }, [isOpen, leaveId, fetchLeaveDetails]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleDelete = async () => {
    if (!leave || leave.status !== 'pending') {
      alert('Only pending leave requests can be deleted');
      return;
    }
    
    const confirmDelete = window.confirm('Are you sure you want to delete this leave request? This action cannot be undone.');
    if (!confirmDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/${leaveId}`);
      onClose();
      if (onDelete) onDelete();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('❌ Error deleting leave:', error);
      alert(handleApiError(error, 'Failed to delete leave request'));
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const typeInfo = leave ? MONTHLY_LEAVE_CONFIG.leaveTypes.find(t => t.id === leave.type) : null;
  const isPending = leave?.status === 'pending';

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const icons = {
      pending: <FaClock className="mr-1 text-xs" />,
      approved: <FaCheckCircle className="mr-1 text-xs" />,
      rejected: <FaExclamationTriangle className="mr-1 text-xs" />,
      cancelled: <FaClock className="mr-1 text-xs" />
    };
    return (
      <Badge variant={config.variant}>
        {icons[status]} {config.label}
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Leave Details</h3>
            <p className="text-sm text-gray-500">Complete leave information</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <FaTimes className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <LoadingSpinner text="Loading leave details..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchLeaveDetails} />
          ) : leave ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{typeInfo?.icon || '📅'}</div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{typeInfo?.name || 'Leave'}</h4>
                    {getStatusBadge(leave.status)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">{leave.leaveCount || 1}</p>
                  <p className="text-xs text-gray-400">day(s)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Start Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.startDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">End Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.endDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Applied On</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.appliedAt || leave.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Leave Count</p>
                  <p className="font-medium text-gray-900">{leave.leaveCount || 1} day(s)</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Reason for Leave</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-line">{leave.reason}</p>
                </div>
              </div>

              {leave.contactNumber && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Number</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{leave.contactNumber}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Close
          </button>
          {isPending && (
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <FaSync className="animate-spin w-4 h-4" /> Deleting...
                </>
              ) : (
                <>
                  <FaTrash className="w-4 h-4" /> Delete Request
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Add FaTimes import at the top
import { FaTimes } from 'react-icons/fa';

export default EmployeeLeave;