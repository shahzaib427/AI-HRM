import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FaCalendarAlt, FaFileAlt, FaExclamationTriangle, FaSync, FaPlus, FaEye, FaEdit, FaTrash, FaCheckCircle, FaClock } from 'react-icons/fa';

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
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 border-gray-200' }
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

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-700',
    danger: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

// Loading Spinner Component
const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    <span className="ml-2 text-gray-600">{text}</span>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="text-center py-8">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
      <FaExclamationTriangle className="text-red-500 text-xl" />
    </div>
    <p className="text-lg text-gray-700 mb-4">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
        Retry
      </button>
    )}
  </div>
);

// Success Message Component
const SuccessMessage = ({ message }) => (
  <div className="p-4 bg-green-50 border border-green-100 rounded-lg mb-4">
    <div className="flex items-center">
      <FaCheckCircle className="h-5 w-5 text-green-500" />
      <div className="ml-3">
        <p className="text-sm text-green-700">{message}</p>
      </div>
    </div>
  </div>
);

// Monthly Leave Balance Card Component (Simplified)
const MonthlyLeaveBalanceCard = ({ balance, month, year, isLoading }) => {
  const percentage = Math.min((balance / MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth) * 100, 100);
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">Monthly Leave Balance</p>
          <p className="text-2xl font-semibold text-gray-900">
            {isLoading ? '...' : `${balance} / ${MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth}`}
          </p>
          <p className="text-xs text-gray-400 mt-1">{month} {year}</p>
        </div>
        <div className="text-3xl">📅</div>
      </div>
      
      <div className="space-y-2">
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full bg-gray-900 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-400">
          {Math.round(percentage)}% of monthly allocation remaining
        </p>
      </div>
    </div>
  );
};

// Leave Request Card Component
const LeaveRequestCard = ({ request, onEdit, onCancel, onViewDetails }) => {
  const typeInfo = MONTHLY_LEAVE_CONFIG.leaveTypes.find(t => t.id === request.type);
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{typeInfo?.icon}</div>
          <div>
            <h4 className="font-semibold text-gray-900">{typeInfo?.name}</h4>
            <p className="text-xs text-gray-400">
              {formatDate(request.startDate)} - {formatDate(request.endDate)}
            </p>
          </div>
        </div>
        <Badge variant={
          request.status === 'approved' ? 'success' : 
          request.status === 'pending' ? 'warning' : 
          request.status === 'rejected' ? 'danger' : 'default'
        }>
          {statusConfig.label}
        </Badge>
      </div>
      
      <div className="space-y-1 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Leave Count</span>
          <span className="font-medium text-gray-700">{request.leaveCount || 1} day(s)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Applied on</span>
          <span className="text-gray-600">{formatDate(request.appliedAt || request.createdAt)}</span>
        </div>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Reason:</span> {request.reason}
        </p>
      </div>
      
      <div className="flex space-x-2">
        {request.status === 'pending' && (
          <>
            <button 
              onClick={() => onEdit(request)}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-lg transition-colors border border-gray-200"
            >
              <FaEdit className="text-xs" /> Edit
            </button>
            <button 
              onClick={() => onCancel(request._id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors border border-red-200"
            >
              <FaTrash className="text-xs" /> Cancel
            </button>
          </>
        )}
        <button 
          onClick={() => onViewDetails(request._id)}
          className={`flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-lg transition-colors border border-gray-200 ${request.status !== 'pending' ? 'flex-2' : ''}`}
        >
          <FaEye className="text-xs" /> View
        </button>
      </div>
    </div>
  );
};

// Leave Details Modal (UPDATED with Delete Button)
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
      alert('Leave request deleted successfully!');
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
  const statusConfig = leave ? STATUS_CONFIG[leave.status] : STATUS_CONFIG.pending;
  const isPending = leave?.status === 'pending';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Leave Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">×</button>
          </div>
          
          {loading ? (
            <LoadingSpinner text="Loading leave details..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchLeaveDetails} />
          ) : leave ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{typeInfo?.icon}</div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{typeInfo?.name}</h4>
                    <Badge variant={
                      leave.status === 'approved' ? 'success' : 
                      leave.status === 'pending' ? 'warning' : 
                      leave.status === 'rejected' ? 'danger' : 'default'
                    }>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{leave.leaveCount || 1}</p>
                  <p className="text-xs text-gray-400">day(s)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Start Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.startDate)}</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">End Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.endDate)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Reason for Leave</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">{leave.reason}</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-6 border-t border-gray-100">
                <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg transition-colors">
                  Close
                </button>
                {isPending && (
                  <button 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FaTrash className="text-xs" />
                        Delete Request
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Leave Form Modal
const LeaveFormModal = ({ isOpen, onClose, onSubmit, initialData, monthlyBalance }) => {
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

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {initialData ? 'Edit Leave Request' : 'Apply for Leave'}
            </h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">×</button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">Monthly Leave Balance</p>
                  <p className="text-xs text-gray-500">
                    {currentMonth} {currentYear}: {monthlyBalance} of {MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves remaining
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{monthlyBalance}/{MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth}</p>
                </div>
              </div>
            </div>

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
                    className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                      formData.type === type.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!!initialData}
                  >
                    <div className="flex items-center space-x-3">
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors ${
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors ${
                    errors.endDate ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="leaveCount" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Leaves to Use *
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="range"
                    id="leaveCount"
                    name="leaveCount"
                    min="1"
                    max={Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth)}
                    value={formData.leaveCount}
                    onChange={handleInputChange}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 day</span>
                    <span>{Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth)} days</span>
                  </div>
                </div>
                <div className="w-16 text-center">
                  <span className="text-2xl font-bold text-gray-900">{formData.leaveCount}</span>
                  <p className="text-xs text-gray-500">day(s)</p>
                </div>
              </div>
              {errors.leaveCount && <p className="mt-1 text-xs text-red-600">{errors.leaveCount}</p>}
            </div>

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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors resize-none ${
                  errors.reason ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="Please provide details about your leave..."
              />
              {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <button type="button" onClick={handleClose} className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium" disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading || formData.leaveCount > monthlyBalance} className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {initialData ? 'Updating...' : 'Submitting...'}
                  </span>
                ) : initialData ? 'Update Leave' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

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

  useEffect(() => {
    console.log('🔍 EmployeeLeave Component Mounted');
    const token = localStorage.getItem('token');
    console.log('🔍 Token exists:', !!token);
    if (token) {
      const decoded = decodeToken();
      console.log('🔍 Decoded token:', decoded);
    }
  }, []);

  const fetchMonthlyBalance = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, balances: true }));
      setError(prev => ({ ...prev, balances: '' }));
      
      console.log('📊 Fetching monthly leave balance...');
      const response = await api.get('/balance');
      console.log('📊 Monthly balance API response:', response.data);
      
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
        console.error('📊 API returned success: false', response.data);
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
      
      console.log('📋 Fetching leave requests...');
      const response = await api.get('/my-leaves');
      console.log('📋 Leave requests API response:', response.data);
      
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

  const handleSubmitLeave = useCallback(async (formData) => {
    try {
      console.log('📝 Submitting leave application:', formData);
      
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
        console.log('✅ Leave application response:', response.data);
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
    console.log('✏️ Editing leave:', leave._id);
    setEditingLeave(leave._id);
    setShowLeaveForm(true);
  }, []);

  const handleCancelLeave = useCallback(async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      console.log('🗑️ Cancelling leave:', leaveId);
      await api.delete(`/${leaveId}`);
      setSuccessMessage('Leave request cancelled successfully!');
      fetchAllData();
    } catch (error) {
      console.error('❌ Error cancelling leave:', error);
      alert(handleApiError(error, 'Failed to cancel leave request'));
    }
  }, [fetchAllData]);

  const handleViewDetails = useCallback((leaveId) => {
    console.log('👁️ Viewing leave details:', leaveId);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaCalendarAlt className="text-gray-600 text-sm" />
                Leave Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                You have {MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves per month
              </p>
            </div>
            <button 
              onClick={() => setShowLeaveForm(true)} 
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <FaPlus className="text-xs" />
              Apply Leave
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Success Message */}
        {successMessage && <SuccessMessage message={successMessage} />}

        {/* Monthly Leave Balance */}
        {error.balances ? (
          <ErrorMessage message={error.balances} onRetry={fetchMonthlyBalance} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyLeaveBalanceCard
              balance={monthlyBalance}
              month={currentMonth}
              year={currentYear}
              isLoading={loading.balances}
            />
            
            {/* Leave Usage Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <p className="text-sm font-semibold text-gray-800 mb-4">Leave Usage Summary</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Monthly Allocation</span>
                  <span className="font-medium text-gray-900">{MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Used this Month</span>
                  <span className="font-medium text-red-600">{usedLeavesThisMonth} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Remaining Balance</span>
                  <span className="font-medium text-green-600">{monthlyBalance} days</span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• Each leave counts as 1 day against your monthly balance</p>
                    <p>• Maximum {MONTHLY_LEAVE_CONFIG.maxConsecutiveDays} consecutive days per leave</p>
                    <p>• Balance resets at the start of each month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Requests */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <FaFileAlt className="text-gray-600 text-sm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">My Leave Requests</p>
                <p className="text-xs text-gray-400">{leaveRequests.length} requests</p>
              </div>
            </div>
            <button onClick={fetchAllData} disabled={loading.requests} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              <FaSync className={`text-xs ${loading.requests ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {error.requests ? (
            <ErrorMessage message={error.requests} onRetry={fetchLeaveRequests} />
          ) : loading.requests ? (
            <LoadingSpinner text="Loading leave requests..." />
          ) : leaveRequests.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FaCalendarAlt className="text-gray-400 text-lg" />
              </div>
              <p className="text-gray-700 font-medium">No leave requests</p>
              <p className="text-gray-400 text-sm mt-1">Get started by applying for a new leave</p>
              <button onClick={() => setShowLeaveForm(true)} className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                Apply for Leave
              </button>
            </div>
          ) : (
            <div className="p-5">
              <div className="space-y-4">
                {leaveRequests.map((request) => (
                  <LeaveRequestCard
                    key={request._id}
                    request={request}
                    onEdit={handleEditLeave}
                    onCancel={handleCancelLeave}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leave Form Modal */}
      <LeaveFormModal
        isOpen={showLeaveForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitLeave}
        initialData={editingLeave ? leaveRequests.find(l => l._id === editingLeave) : null}
        monthlyBalance={monthlyBalance}
      />

      {/* Leave Details Modal with Delete Button */}
      <LeaveDetailsModal
        isOpen={showLeaveDetails}
        leaveId={selectedLeaveId}
        onClose={handleCloseDetails}
        onSuccess={fetchAllData}
        onDelete={handleDeleteFromModal}
      />
    </div>
  );
};

export default EmployeeLeave;