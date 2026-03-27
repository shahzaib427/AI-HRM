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

// Inline SVG Icons
const CalendarIcon = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CheckCircleIcon = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationCircleIcon = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserGroupIcon = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const FilterIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const DownloadIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const PlusIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const RefreshIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const FileCSVIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Monthly Leave System Configuration
const MONTHLY_LEAVE_CONFIG = {
  TOTAL_LEAVES_PER_MONTH: 2,
  MAX_CONSECUTIVE_DAYS: 5,
  LEAVE_TYPES: [
    { id: 'monthly', name: 'Monthly Leave', color: 'bg-blue-100 text-blue-800' },
    { id: 'emergency', name: 'Emergency Leave', color: 'bg-red-100 text-red-800' }
  ]
};

// Loading Spinner Component
const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">{text}</span>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
    <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
    <p className="text-red-600 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

// Leave Form Modal Component for HR (Monthly System) - UPDATED with scroll
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
  const formRef = useRef(null);

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
      
      // Recalculate days if both dates are set
      if (newData.startDate && newData.endDate) {
        const days = calculateDays(newData.startDate, newData.endDate);
        setCalculatedDays(days);
        
        // Validate consecutive days
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
    
    if (calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS) {
      newErrors.days = `Maximum ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days allowed`;
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }
    
    if (formData.leaveCount > monthlyBalance) {
      newErrors.leaveCount = `Only ${monthlyBalance} leave${monthlyBalance !== 1 ? 's' : ''} available this month`;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Apply for Leave</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-900">Monthly Leave Balance</p>
                <p className="text-sm text-blue-700">
                  {currentMonth} {currentYear}: {monthlyBalance} of {MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} leaves remaining
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-900">{monthlyBalance}/{MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH}</p>
              </div>
            </div>
          </div>
          
          {/* Scrollable form area */}
          <div className="max-h-[60vh] overflow-y-auto pr-2" ref={formRef}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>
              
              {calculatedDays > 0 && (
                <div className={`p-3 rounded-lg ${calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS ? 'text-red-800' : 'text-blue-800'}`}>
                    <span className="font-medium">Duration:</span> {calculatedDays} days
                    {calculatedDays > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS && ` (Max ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} days)`}
                  </p>
                  {errors.days && (
                    <p className="mt-1 text-xs text-red-600">{errors.days}</p>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Leaves to Use *
                  <span className="text-gray-500 text-xs ml-2">(Each leave counts as 1)</span>
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      name="leaveCount"
                      min="1"
                      max={Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH)}
                      value={formData.leaveCount}
                      onChange={handleInputChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1 leave</span>
                      <span>{Math.min(monthlyBalance, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH)} leaves</span>
                    </div>
                  </div>
                  <div className="w-16 text-center">
                    <span className="text-2xl font-bold text-gray-900">{formData.leaveCount}</span>
                    <p className="text-xs text-gray-600">leave{formData.leaveCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {errors.leaveCount && (
                  <p className="mt-1 text-xs text-red-600">{errors.leaveCount}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.reason ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Please provide details about your leave..."
                />
                {errors.reason && (
                  <p className="mt-1 text-xs text-red-600">{errors.reason}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+91 9876543210"
                />
              </div>
              
              {/* Scroll indicator */}
              <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal for Delete Operations
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700">{message}</p>
            {title.includes("DELETE_ALL") && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "DELETE_ALL_LEAVES" to confirm:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="DELETE_ALL_LEAVES"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={title.includes("DELETE_ALL") && confirmInput !== "DELETE_ALL_LEAVES"}
              className={`px-4 py-2 ${confirmButtonClass} text-white rounded-lg disabled:opacity-50`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export Modal Component
const ExportModal = ({ isOpen, onClose, onExportCSV, onExportMonthlyReport }) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Export Options</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Type *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportType"
                    value="csv"
                    checked={exportType === 'csv'}
                    onChange={(e) => setExportType(e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Export All Leaves (CSV)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportType"
                    value="monthly"
                    checked={exportType === 'monthly'}
                    onChange={(e) => setExportType(e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Monthly Leave Report</span>
                </label>
              </div>
            </div>
            
            {exportType === 'monthly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month *
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="2000"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                {exportType === 'csv' 
                  ? 'This will export all leave requests to a CSV file with employee details, dates, status, and approval information.'
                  : 'This will generate a monthly report showing leaves used by each employee for the selected month.'}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Export
              </button>
            </div>
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
  const [leaveStats, setLeaveStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalRequests: 0
  });
  const [loading, setLoading] = useState({
    requests: true,
    myLeaves: true,
    balance: true
  });
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

  // Calculate used leaves this month for HR
  const calculateUsedLeavesThisMonth = useCallback((leaves) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return leaves
      .filter(request => {
        const requestDate = new Date(request.startDate || request.createdAt);
        return requestDate.getMonth() === currentMonth && 
               requestDate.getFullYear() === currentYear &&
               request.status === 'approved';
      })
      .reduce((total, request) => total + (request.leaveCount || 1), 0);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchLeaveRequests();
    fetchMyLeaves();
    fetchMyMonthlyBalance();
    fetchLeaveStats();
  }, []);

  // Fetch all leave requests for HR to manage
  const fetchLeaveRequests = async () => {
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const response = await api.get('/all');
      
      if (response.data?.success) {
        // Filter out HR's own leaves
        const hrUserId = getUserId();
        const filteredLeaves = response.data.data?.filter(leave => 
          leave.employee?._id !== hrUserId
        ) || [];
        
        setLeaveRequests(filteredLeaves);
      }
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      if (err.response?.status === 403) {
        setError('Access denied. Only HR/Admin can view all leaves.');
      } else {
        setError('Failed to load leave requests');
      }
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  };

  // Fetch HR's own leaves
  const fetchMyLeaves = async () => {
    try {
      setLoading(prev => ({ ...prev, myLeaves: true }));
      const response = await api.get('/my-leaves');
      
      if (response.data?.success) {
        setMyLeaves(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching my leaves:', err);
    } finally {
      setLoading(prev => ({ ...prev, myLeaves: false }));
    }
  };

  // Fetch HR's monthly balance
  const fetchMyMonthlyBalance = async () => {
    try {
      setLoading(prev => ({ ...prev, balance: true }));
      const response = await api.get('/monthly-balance');
      
      if (response.data?.success) {
        setMyMonthlyBalance(response.data.data?.leavesAvailable || MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
      }
    } catch (err) {
      console.error('Error fetching monthly balance:', err);
      // Default to max if API fails
      setMyMonthlyBalance(MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH);
    } finally {
      setLoading(prev => ({ ...prev, balance: false }));
    }
  };

  // Fetch leave statistics
  const fetchLeaveStats = async () => {
    try {
      const response = await api.get('/all');
      if (response.data?.success) {
        const allLeaves = response.data.data || [];
        const hrUserId = getUserId();
        
        // Filter out HR's own leaves for stats
        const employeeLeaves = allLeaves.filter(leave => 
          leave.employee?._id !== hrUserId
        );
        
        const pending = employeeLeaves.filter(l => l.status === 'pending').length;
        const approved = employeeLeaves.filter(l => l.status === 'approved').length;
        const rejected = employeeLeaves.filter(l => l.status === 'rejected').length;
        
        setLeaveStats({
          pending,
          approved,
          rejected,
          totalRequests: employeeLeaves.length
        });
      }
    } catch (err) {
      console.error('Failed to load leave stats:', err);
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    setLoading({ requests: true, myLeaves: true, balance: true });
    await Promise.all([
      fetchLeaveRequests(),
      fetchMyLeaves(),
      fetchMyMonthlyBalance(),
      fetchLeaveStats()
    ]);
  };

  // HR approves an employee leave
  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this leave request?')) return;

    try {
      const response = await api.post(`/${id}/review`, {
        action: 'approve',
        rejectionReason: ''
      });

      if (response.data.success) {
        setSuccessMessage('Leave approved successfully!');
        refreshAllData();
      } else {
        alert(response.data.message || 'Failed to approve leave');
      }
    } catch (err) {
      console.error('Approve error:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to approve leave');
    }
  };

  // HR rejects an employee leave
  const handleReject = async (id) => {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason || !window.confirm('Are you sure you want to reject this leave request?')) return;

    try {
      const response = await api.post(`/${id}/review`, {
        action: 'reject',
        rejectionReason
      });

      if (response.data.success) {
        setSuccessMessage('Leave rejected successfully!');
        refreshAllData();
      } else {
        alert(response.data.message || 'Failed to reject leave');
      }
    } catch (err) {
      console.error('Reject error:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to reject leave');
    }
  };

  // HR applies for their own leave (Monthly System)
  const handleSubmitLeave = async (formData) => {
    try {
      const response = await api.post('/apply', {
        ...formData,
        // For monthly system, each leave uses 1 leave from monthly quota
        leaveCount: formData.leaveCount || 1
      });
      if (response.data.success) {
        setSuccessMessage('Your leave application has been submitted! It requires admin approval.');
        setShowLeaveForm(false);
        refreshAllData();
      }
    } catch (error) {
      throw error;
    }
  };

  // Handle delete all leaves
  const handleDeleteAll = async (confirmationInput) => {
    try {
      let filters = {};
      
      if (deleteType === 'status') {
        filters.status = selectedStatus;
      } else if (deleteType === 'date') {
        const dateStr = prompt('Delete leaves before date (YYYY-MM-DD):', '2023-01-01');
        if (!dateStr) return;
        filters.endDate = dateStr;
        filters.startDate = '2000-01-01';
      }
      
      // Prepare request data
      const requestData = { 
        confirmation: confirmationInput || 'DELETE_ALL_LEAVES', 
        filters: Object.keys(filters).length > 0 ? filters : undefined 
      };
      
      console.log('Sending delete request:', requestData);
      
      const response = await api.delete('/delete-all', {
        data: requestData
      });
      
      if (response.data.success) {
        setSuccessMessage(`Successfully deleted ${response.data.data.deletedCount} leave request(s)`);
        refreshAllData();
      }
    } catch (err) {
      console.error('Delete all error:', err);
      console.error('Error response:', err.response?.data);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete leaves');
    }
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      // Get current filter parameters
      const params = new URLSearchParams();
      
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      // Add search term if any
      if (searchTerm) {
        // Note: You might need to adjust your backend to handle search terms
        // For now, we'll export all with status filter
      }
      
      // Create download link
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/export?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      // Get the blob and create download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `leaves_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      setSuccessMessage('CSV export completed successfully!');
      
    } catch (err) {
      console.error('Export CSV error:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle monthly report export
  const handleExportMonthlyReport = async (month, year) => {
    try {
      setExporting(true);
      
      // Create download link
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/export/monthly-report?month=${month}&year=${year}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export monthly report');
      }
      
      // Get the blob and create download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `monthly_leave_report_${month}_${year}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      setSuccessMessage('Monthly report export completed successfully!');
      
    } catch (err) {
      console.error('Export monthly report error:', err);
      alert('Failed to export monthly report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle export with modal
  const handleExport = () => {
    setShowExportModal(true);
  };

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter requests
  const filteredRequests = leaveRequests.filter(request => {
    if (filter !== 'all' && request.status?.toLowerCase() !== filter) return false;
    if (searchTerm && !request.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'rejected': return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const formatLeaveType = (type) => {
    const typeInfo = MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.find(t => t.id === type);
    return typeInfo ? typeInfo.name : type;
  };

  const getLeaveTypeColor = (type) => {
    const typeInfo = MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.find(t => t.id === type);
    return typeInfo ? typeInfo.color : 'bg-gray-100 text-gray-800';
  };

  const isAdminOrHR = getUserRole() === 'admin' || getUserRole() === 'hr';

  // Calculate HR's used leaves this month
  const myUsedLeavesThisMonth = useMemo(() => {
    return calculateUsedLeavesThisMonth(myLeaves);
  }, [myLeaves, calculateUsedLeavesThisMonth]);

  if (loading.requests && activeTab === 'manage') {
    return <LoadingSpinner text="Loading leave requests..." />;
  }

  if (error && activeTab === 'manage') {
    return <ErrorMessage message={error} onRetry={() => { setError(null); fetchLeaveRequests(); }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HR Leave Management</h1>
              <p className="text-gray-600 mt-2">Manage employee leave requests and apply for your own leaves</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshAllData}
                className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Refresh Data"
              >
                <RefreshIcon className="h-5 w-5" />
                Refresh
              </button>
              
              {activeTab === 'myLeaves' && (
                <button
                  onClick={() => setShowLeaveForm(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Apply for Leave
                </button>
              )}
              
              {isAdminOrHR && (
                <>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    title="Export Data"
                  >
                    <FileCSVIcon className="h-5 w-5" />
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    title="Delete all leaves (dangerous)"
                  >
                    <TrashIcon className="h-5 w-5" />
                    Delete All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manage Employee Leaves
              </button>
              <button
                onClick={() => setActiveTab('myLeaves')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'myLeaves'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Leaves (Requires Admin Approval)
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'manage' ? (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-yellow-100 p-3">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Pending Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{leaveStats.pending}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{leaveStats.approved}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-red-100 p-3">
                    <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Rejected</p>
                    <p className="text-2xl font-bold text-gray-900">{leaveStats.rejected}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-3">
                    <UserGroupIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{leaveStats.totalRequests}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FilterIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">Filter by:</span>
                  </div>
                  <select 
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search by employee name..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Employee Leave Requests Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Employee Leave Requests</h2>
                  <span className="text-sm text-gray-500">
                    {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {leaveRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">No employee leave requests</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no employee leave requests to display at this time
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leaves Used</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRequests.map((request) => (
                        <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="font-semibold text-blue-600">
                                  {request.employee?.name?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {request.employee?.name || 'Unknown Employee'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {request.employee?.employeeId || 'No ID'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{request.employee?.department || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLeaveTypeColor(request.type)}`}>
                              {formatLeaveType(request.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(request.startDate)} to {formatDate(request.endDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{request.days || 0} days</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {request.leaveCount || 1} leave{request.leaveCount !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              <span className="ml-2">{request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {request.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleApprove(request._id)}
                                  className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-1 rounded-lg transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(request._id)}
                                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-1 rounded-lg transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => alert(`Status: ${request.status}\nReason: ${request.reason}\nLeaves Used: ${request.leaveCount || 1}`)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {leaveRequests.length > 0 && filteredRequests.length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">No matching leave requests</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search' : 'No leave requests match your current filter'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* HR's Monthly Leave Status */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">My Monthly Leave Status</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Balance Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                        <span className="text-2xl">📅</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Monthly Leave Balance</h4>
                        <p className="text-sm text-gray-600">
                          {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Allocation</span>
                      <span className="font-medium text-gray-900">{MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} leaves</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Used this Month</span>
                      <span className="font-medium text-red-600">{myUsedLeavesThisMonth} leaves</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining Balance</span>
                      <span className="font-medium text-green-600">{myMonthlyBalance} leaves</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="pt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900">{Math.round((myUsedLeavesThisMonth / MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                          style={{ width: `${Math.min((myUsedLeavesThisMonth / MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        • Each approved leave counts as 1 against your monthly balance
                        <br />
                        • Maximum {MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days per leave
                        <br />
                        • Balance resets at the start of each month
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Leave Summary */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Leave Summary</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">Pending Requests</span>
                      <span className="font-medium text-yellow-600">
                        {myLeaves.filter(l => l.status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Approved Requests</span>
                      <span className="font-medium text-green-600">
                        {myLeaves.filter(l => l.status === 'approved').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Rejected Requests</span>
                      <span className="font-medium text-red-600">
                        {myLeaves.filter(l => l.status === 'rejected').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* My Leaves Section */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">My Leave Applications</h2>
                  <p className="text-gray-600 mt-1">Your leaves require admin approval</p>
                </div>
                <div className="text-sm text-gray-500">
                  {myLeaves.length} application{myLeaves.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {myLeaves.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">No leave applications</h3>
                  <p className="mt-1 text-sm text-gray-500 mb-4">
                    You haven't applied for any leaves yet
                  </p>
                  <button
                    onClick={() => setShowLeaveForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Apply for Your First Leave
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myLeaves.map((leave) => (
                    <div key={leave._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                              {leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLeaveTypeColor(leave.type)}`}>
                              {formatLeaveType(leave.type)}
                            </span>
                          </div>
                          <p className="text-gray-900 font-medium">
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                            <span className="text-gray-600 ml-2">({leave.days} days)</span>
                            <span className="ml-2 text-blue-600 font-medium">
                              • {leave.leaveCount || 1} leave{leave.leaveCount !== 1 ? 's' : ''} used
                            </span>
                          </p>
                          <p className="text-gray-600 text-sm mt-1">
                            Applied on: {formatDate(leave.appliedAt || leave.createdAt)}
                          </p>
                          <p className="text-gray-700 mt-2">{leave.reason}</p>
                          
                          {leave.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                              <p className="text-sm text-red-700">
                                <span className="font-medium">Rejection Reason:</span> {leave.rejectionReason}
                              </p>
                            </div>
                          )}
                          
                          {leave.approvedBy && typeof leave.approvedBy === 'object' && (
                            <p className="text-sm text-green-700 mt-2">
                              Approved by: {leave.approvedBy?.name || 'Admin'}
                            </p>
                          )}
                        </div>
                        
                        <div className="mt-4 md:mt-0 flex space-x-2">
                          {leave.status === 'pending' && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to cancel this leave request?')) {
                                  try {
                                    await api.delete(`/${leave._id}`);
                                    setSuccessMessage('Leave request cancelled');
                                    fetchMyLeaves();
                                    fetchMyMonthlyBalance();
                                  } catch (error) {
                                    alert(error.response?.data?.message || 'Failed to cancel leave');
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                            >
                              Cancel
                            </button>
                          )}
                          {leave.status === 'rejected' && (
                            <button
                              onClick={() => {
                                // Option to re-apply with same details
                                alert('You can re-apply by clicking "Apply for Leave" button');
                              }}
                              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
                            >
                              Re-apply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Monthly Leave System • {MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} leaves per month</p>
          <p className="mt-1 text-xs text-gray-400">
            {activeTab === 'manage' 
              ? 'Note: HR can approve/reject employee leaves. Your own leaves require admin approval.' 
              : 'Note: Your leaves require admin approval. You cannot approve your own leaves.'}
          </p>
        </div>
      </div>

      {/* Leave Form Modal */}
      <LeaveFormModal
        isOpen={showLeaveForm}
        onClose={() => setShowLeaveForm(false)}
        onSubmit={handleSubmitLeave}
        monthlyBalance={myMonthlyBalance}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportCSV={handleExportCSV}
        onExportMonthlyReport={handleExportMonthlyReport}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAll}
        title="DELETE ALL LEAVES"
        message={
          <div>
            <p className="text-red-600 font-bold mb-4">⚠️ WARNING: This action cannot be undone!</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="deleteAll"
                  name="deleteType"
                  checked={deleteType === 'all'}
                  onChange={() => setDeleteType('all')}
                />
                <label htmlFor="deleteAll">Delete all leaves</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="deleteByStatus"
                  name="deleteType"
                  checked={deleteType === 'status'}
                  onChange={() => setDeleteType('status')}
                />
                <label htmlFor="deleteByStatus">Delete by status:</label>
                <select 
                  className="border rounded px-2 py-1"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={deleteType !== 'status'}
                >
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="deleteByDate"
                  name="deleteType"
                  checked={deleteType === 'date'}
                  onChange={() => setDeleteType('date')}
                />
                <label htmlFor="deleteByDate">Delete leaves before date</label>
              </div>
            </div>
          </div>
        }
        confirmText="Delete All"
        confirmColor="red"
      />
    </div>
  );
};

export default HRLeave;