import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';

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

// NEW: Constants for Monthly Leave System (2 leaves per month)
const MONTHLY_LEAVE_CONFIG = {
  totalLeavesPerMonth: 2,
  leaveTypes: [
    { 
      id: 'monthly', 
      name: 'Monthly Leave', 
      icon: '📅', 
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500', 
      bgColor: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      description: 'Monthly allocation of 2 leaves'
    },
    { 
      id: 'emergency', 
      name: 'Emergency Leave', 
      icon: '🚨', 
      color: 'bg-gradient-to-br from-red-500 to-pink-500', 
      bgColor: 'bg-gradient-to-br from-red-500 to-pink-500',
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

// Loading Spinner Component
const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">{text}</span>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="text-center py-8">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
      <span className="text-2xl">⚠️</span>
    </div>
    <p className="text-lg text-gray-700 mb-4">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Retry
      </button>
    )}
  </div>
);

// Success Message Component
const SuccessMessage = ({ message }) => (
  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <p className="text-sm text-green-700">{message}</p>
      </div>
    </div>
  </div>
);

// NEW: Monthly Leave Balance Card Component
const MonthlyLeaveBalanceCard = ({ balance, month, year, isLoading }) => {
  const percentage = Math.min((balance / MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth) * 100, 100);
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md">
            <span className="text-2xl">📅</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Monthly Leave Balance</h4>
            <p className="text-sm text-gray-600">
              {month} {year} • {isLoading ? 'Loading...' : `${balance} of ${MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves remaining`}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Remaining Leaves</span>
          <span className="font-medium text-gray-900">
            {isLoading ? '...' : `${balance} / ${MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth}`}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500">
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${typeInfo?.bgColor} text-white`}>
            <span className="text-lg">{typeInfo?.icon}</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{typeInfo?.name}</h4>
            <p className="text-sm text-gray-600">
              {formatDate(request.startDate)} - {formatDate(request.endDate)}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Leave Count</span>
          <span className="font-medium text-gray-900">
            {request.leaveCount || 1} leave{request.leaveCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Applied on</span>
          <span className="text-gray-900">{formatDate(request.appliedAt || request.createdAt)}</span>
        </div>
        {request.approvedBy && typeof request.approvedBy === 'object' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Approved by</span>
            <span className="font-medium text-gray-900">{request.approvedBy.name}</span>
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Reason:</span> {request.reason}
        </p>
        {request.rejectionReason && (
          <p className="text-sm text-red-600 mt-1">
            <span className="font-medium">Rejection Reason:</span> {request.rejectionReason}
          </p>
        )}
      </div>
      
      <div className="flex space-x-2">
        {request.status === 'pending' && (
          <>
            <button 
              onClick={() => onEdit(request)}
              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 text-sm border border-blue-200"
            >
              Edit
            </button>
            <button 
              onClick={() => onCancel(request._id)}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 text-sm border border-red-200"
            >
              Cancel
            </button>
          </>
        )}
        <button 
          onClick={() => onViewDetails(request._id)}
          className={`flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 text-sm border border-gray-200 ${request.status !== 'pending' ? 'flex-2' : ''}`}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

// Leave Details Modal
const LeaveDetailsModal = ({ isOpen, leaveId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [leave, setLeave] = useState(null);
  const [error, setError] = useState('');
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

  if (!isOpen) return null;

  const typeInfo = leave ? MONTHLY_LEAVE_CONFIG.leaveTypes.find(t => t.id === leave.type) : null;
  const statusConfig = leave ? STATUS_CONFIG[leave.status] : STATUS_CONFIG.pending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Leave Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors" aria-label="Close modal">×</button>
          </div>
          
          {loading ? (
            <LoadingSpinner text="Loading leave details..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchLeaveDetails} />
          ) : leave ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${typeInfo?.bgColor} text-white`}>
                    <span className="text-2xl">{typeInfo?.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{typeInfo?.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{leave.leaveCount || 1}</p>
                  <p className="text-sm text-gray-600">leave{leave.leaveCount !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Start Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.startDate)}</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">End Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.endDate)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Applied on</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(leave.appliedAt)}</span>
                  </div>
                  {leave.approvedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Processed on</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(leave.approvedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Reason for Leave</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">{leave.reason}</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-6 border-t border-gray-200">
                <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg transition-colors duration-200">
                  Close
                </button>
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
      // Format dates properly for backend
      const formattedData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        contactNumber: '' // Add if your backend requires it
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {initialData ? 'Edit Leave Request' : 'Apply for Leave'}
            </h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors" aria-label="Close modal">×</button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-900">Monthly Leave Balance</p>
                  <p className="text-sm text-blue-700">
                    {currentMonth} {currentYear}: {monthlyBalance} of {MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves remaining
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-900">{monthlyBalance}/{MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth}</p>
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
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      formData.type === type.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    } ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!!initialData}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${type.bgColor} text-white`}>
                        <span className="text-lg">{type.icon}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{type.name}</p>
                        <p className="text-xs text-gray-600">{type.description}</p>
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
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
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 leave</span>
                    <span>{Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth)} leaves</span>
                  </div>
                </div>
                <div className="w-16 text-center">
                  <span className="text-2xl font-bold text-gray-900">{formData.leaveCount}</span>
                  <p className="text-xs text-gray-600">leave{formData.leaveCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {errors.leaveCount && <p className="mt-1 text-sm text-red-600">{errors.leaveCount}</p>}
              <p className="mt-2 text-sm text-gray-500">
                Each leave counts as 1 against your monthly balance of {MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth}
              </p>
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please provide details about your leave..."
              />
              {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button type="button" onClick={handleClose} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium" disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading || formData.leaveCount > monthlyBalance} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed">
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

  // Debug useEffect
  useEffect(() => {
    console.log('🔍 EmployeeLeave Component Mounted');
    const token = localStorage.getItem('token');
    console.log('🔍 Token exists:', !!token);
    if (token) {
      const decoded = decodeToken();
      console.log('🔍 Decoded token:', decoded);
    }
  }, []);

  // Fetch monthly leave balance
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

  // Fetch leave requests
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

  // Fetch all data
  const fetchAllData = useCallback(() => {
    fetchMonthlyBalance();
    fetchLeaveRequests();
  }, [fetchMonthlyBalance, fetchLeaveRequests]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Calculate used leaves this month
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

  // Handle leave submission
const handleSubmitLeave = useCallback(async (formData) => {
  try {
    console.log('📝 Submitting leave application:', formData);
    
    if (editingLeave) {
      // Update existing leave
      const response = await api.put(`/${editingLeave}`, formData);
      if (response.data.success) {
        setSuccessMessage('Leave request updated successfully!');
        fetchAllData();
        setEditingLeave(null);
        setShowLeaveForm(false);
      }
    } else {
      // Create new leave - CHANGED from '/apply-leave' to '/apply'
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
  // Handle edit leave
  const handleEditLeave = useCallback((leave) => {
    console.log('✏️ Editing leave:', leave._id);
    setEditingLeave(leave._id);
    setShowLeaveForm(true);
  }, []);

  // Handle cancel leave
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

  // Handle view details
  const handleViewDetails = useCallback((leaveId) => {
    console.log('👁️ Viewing leave details:', leaveId);
    setSelectedLeaveId(leaveId);
    setShowLeaveDetails(true);
  }, []);

  // Close modals
  const handleCloseForm = useCallback(() => {
    setShowLeaveForm(false);
    setEditingLeave(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowLeaveDetails(false);
    setSelectedLeaveId(null);
  }, []);

  // Clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monthly Leave Management</h1>
              <p className="mt-2 text-gray-600">You have {MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves per month</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowLeaveForm(true)} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Apply Leave
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && <SuccessMessage message={successMessage} />}

        {/* Monthly Leave Balance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Leave Status</h2>
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
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Leave Usage Summary</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Monthly Allocation</span>
                    <span className="font-medium text-gray-900">{MONTHLY_LEAVE_CONFIG.totalLeavesPerMonth} leaves</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Used this Month</span>
                    <span className="font-medium text-red-600">{usedLeavesThisMonth} leaves</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining Balance</span>
                    <span className="font-medium text-green-600">{monthlyBalance} leaves</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      <p>• Each leave counts as 1 against your monthly balance</p>
                      <p className="mt-1">• Maximum {MONTHLY_LEAVE_CONFIG.maxConsecutiveDays} consecutive days per leave</p>
                      <p className="mt-1">• Balance resets at the start of each month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Leave Requests</h2>
            <div className="text-sm text-gray-500">
              {loading.requests ? 'Loading...' : `${leaveRequests.length} requests`}
            </div>
          </div>
          
          {error.requests ? (
            <ErrorMessage message={error.requests} onRetry={fetchLeaveRequests} />
          ) : loading.requests ? (
            <LoadingSpinner text="Loading leave requests..." />
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
              <p className="text-gray-600">Get started by applying for a new leave</p>
              <button onClick={() => setShowLeaveForm(true)} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Apply for Leave
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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

      {/* Leave Details Modal */}
      <LeaveDetailsModal
        isOpen={showLeaveDetails}
        leaveId={selectedLeaveId}
        onClose={handleCloseDetails}
        onSuccess={fetchAllData}
      />
    </div>
  );
};

export default EmployeeLeave;