import React, { useState, useEffect, useCallback } from 'react';
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

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// Helper to get user role from token
const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'employee';
    
    // Check if token is properly formatted
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format');
      return 'employee';
    }
    
    const payload = JSON.parse(atob(parts[1]));
    return payload?.role || 'employee';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'employee';
  }
};

const AdminLeave = () => {
  // State management
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    total: 0,
    thisMonth: 0
  });
  const [userRole, setUserRole] = useState('employee');
  const [processingId, setProcessingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState(null);
  const [editForm, setEditForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    contactNumber: ''
  });

  // Filter options
  const leaveTypes = ['All', 'annual', 'casual', 'sick', 'earned', 'maternity', 'paternity'];
  const statusOptions = ['All', 'pending', 'approved', 'rejected', 'cancelled'];

  // Get user role on mount
  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
    console.log('User role:', role);
  }, []);

  // Fetch leaves from backend
  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const role = getUserRole();
      let response;

      // Choose API endpoint based on role
      if (role === 'admin' || role === 'hr') {
        response = await api.get('/all');
      } else if (role === 'manager') {
        response = await api.get('/team/leaves');
      } else {
        setError('Access denied. Admin/HR/Manager access required.');
        setLoading(false);
        return;
      }

      if (response.data?.success) {
        const leavesData = response.data.data || [];
        setLeaves(leavesData);
      } else {
        setError('Failed to load leave data');
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to view leave requests.');
      } else {
        setError(error.response?.data?.message || 'Failed to load leave data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Calculate stats
  useEffect(() => {
    if (leaves.length > 0) {
      const pending = leaves.filter(l => l.status === 'pending').length;
      const approved = leaves.filter(l => l.status === 'approved').length;
      const rejected = leaves.filter(l => l.status === 'rejected').length;
      const cancelled = leaves.filter(l => l.status === 'cancelled').length;
      const thisMonth = leaves.filter(l => {
        const startDate = new Date(l.startDate);
        return startDate.getMonth() === new Date().getMonth() && 
               startDate.getFullYear() === new Date().getFullYear();
      }).length;
      
      setStats({
        pending,
        approved,
        rejected,
        cancelled,
        total: leaves.length,
        thisMonth
      });
    }
  }, [leaves]);

  // Filter leaves
  const filteredLeaves = leaves.filter(leave => {
    const employeeName = leave.employee?.name || '';
    const employeeId = leave.employee?.employeeId || '';
    
    const matchesSearch = 
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || leave.status === statusFilter;
    const matchesType = leaveTypeFilter === 'All' || leave.type === leaveTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle approve leave
  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this leave request?')) return;

    try {
      setProcessingId(id);
      const response = await api.post(`/${id}/review`, {
        action: 'approve',
        rejectionReason: ''
      });

      if (response.data.success) {
        alert('Leave approved successfully!');
        fetchLeaves(); // Refresh data
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert(error.response?.data?.message || 'Failed to approve leave');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject leave
  const handleReject = async (id) => {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason || !window.confirm('Are you sure you want to reject this leave request?')) return;

    try {
      setProcessingId(id);
      const response = await api.post(`/${id}/review`, {
        action: 'reject',
        rejectionReason
      });

      if (response.data.success) {
        alert('Leave rejected successfully!');
        fetchLeaves();
      }
    } catch (error) {
      console.error('Reject error:', error);
      alert(error.response?.data?.message || 'Failed to reject leave');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle update leave
  const handleUpdate = async (id, formData) => {
    try {
      setProcessingId(id);
      const response = await api.put(`/${id}`, formData);

      if (response.data.success) {
        alert('Leave updated successfully!');
        setShowEdit(false);
        setEditingLeave(null);
        fetchLeaves();
      }
    } catch (error) {
      console.error('Update error:', error);
      alert(error.response?.data?.message || 'Failed to update leave');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle delete/cancel leave
  const handleDelete = async (id) => {
    try {
      setProcessingId(id);
      const response = await api.delete(`/${id}`);

      if (response.data.success) {
        alert('Leave cancelled successfully!');
        setDeleteConfirm(false);
        setLeaveToDelete(null);
        fetchLeaves();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.message || 'Failed to cancel leave');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle view details
  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setShowDetails(true);
  };

  // Handle edit click
  const handleEditClick = (leave) => {
    // Only allow editing pending leaves
    if (leave.status !== 'pending') {
      alert('Only pending leaves can be edited.');
      return;
    }
    
    setEditingLeave(leave);
    setEditForm({
      startDate: formatDateForInput(leave.startDate),
      endDate: formatDateForInput(leave.endDate),
      reason: leave.reason || '',
      contactNumber: leave.contactNumber || ''
    });
    setShowEdit(true);
  };

  // Handle delete confirmation
  const confirmDelete = (leave) => {
    setLeaveToDelete(leave);
    setDeleteConfirm(true);
  };

  // Handle edit form change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle edit form submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingLeave) return;
    
    if (window.confirm('Are you sure you want to update this leave request?')) {
      handleUpdate(editingLeave._id, editForm);
    }
  };

  // Animated Counter Component
  const AnimatedCounter = ({ value, duration = 2000, suffix = '' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let start = 0;
      const increment = value / (duration / 20);
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 20);
      
      return () => clearInterval(timer);
    }, [value, duration]);

    return (
      <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {count}{suffix}
      </span>
    );
  };

  // Stat Card Component
  const StatCard = ({ title, value, change, icon, color, suffix = '' }) => (
    <div className={`rounded-2xl shadow-2xl border p-6 transition-all duration-300 hover:shadow-3xl transform hover:-translate-y-1 group ${
      darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <div className="flex items-baseline space-x-1">
            <AnimatedCounter value={value} suffix={suffix} />
          </div>
          {change && (
            <p className={`text-sm mt-2 flex items-center ${change.startsWith('+') ? 'text-green-500' : 'text-rose-500'}`}>
              <span className={`mr-1 ${change.startsWith('+') ? 'animate-bounce' : ''}`}>
                {change.startsWith('+') ? '↗' : '↘'}
              </span>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} text-white transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  // Get status styling
  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return darkMode ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-green-100 text-green-800';
      case 'pending': return darkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' : 'bg-yellow-100 text-yellow-800';
      case 'rejected': return darkMode ? 'bg-red-900/30 text-red-400 border border-red-700' : 'bg-red-100 text-red-800';
      case 'cancelled': return darkMode ? 'bg-gray-900/30 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-800';
      default: return darkMode ? 'bg-gray-900/30 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-800';
    }
  };

  // Get leave type styling
  const getLeaveTypeColor = (type) => {
    const colors = {
      'annual': darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800',
      'sick': darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800',
      'casual': darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800',
      'earned': darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800',
      'maternity': darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-100 text-pink-800',
      'paternity': darkMode ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-100 text-teal-800'
    };
    return colors[type] || (darkMode ? 'bg-gray-900/30 text-gray-400' : 'bg-gray-100 text-gray-800');
  };

  // Format leave type for display
  const formatLeaveType = (type) => {
    const types = {
      'annual': 'Annual Leave',
      'casual': 'Casual Leave',
      'sick': 'Sick Leave',
      'earned': 'Earned Leave',
      'maternity': 'Maternity Leave',
      'paternity': 'Paternity Leave'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Error</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchLeaves}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          {userRole === 'employee' && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              This page is only accessible to Admin, HR, and Manager roles.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/30'
    }`}>
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse ${
          darkMode ? 'bg-amber-500/10' : 'bg-amber-200/20'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 ${
          darkMode ? 'bg-yellow-500/10' : 'bg-yellow-200/20'
        }`}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Leave Management Dashboard
              </h1>
              <p className={`mt-2 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {userRole === 'admin' && 'Administrator View - All Leaves'}
                {userRole === 'hr' && 'HR View - All Leaves'}
                {userRole === 'manager' && 'Manager View - Team Leaves'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Refresh Button */}
              <button 
                onClick={fetchLeaves}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
              >
                <span className="text-lg">🔄</span> Refresh
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 hover:rotate-12 ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 shadow-lg' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-lg border border-gray-200'
                }`}
              >
                <span className="text-xl">{darkMode ? '🌙' : '☀️'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Leaves"
            value={stats.total}
            icon="📅"
            color="bg-gradient-to-br from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon="⏳"
            color="bg-gradient-to-br from-yellow-500 to-amber-500"
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon="✅"
            color="bg-gradient-to-br from-green-500 to-emerald-500"
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon="❌"
            color="bg-gradient-to-br from-red-500 to-rose-500"
          />
          <StatCard
            title="This Month"
            value={stats.thisMonth}
            icon="📊"
            color="bg-gradient-to-br from-purple-500 to-pink-500"
          />
        </div>

        {/* Filters */}
        <div className={`rounded-2xl shadow-2xl border p-6 mb-6 ${
          darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div className="flex gap-3">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[150px] ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
              <select 
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className={`rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[180px] ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {leaveTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Types' : formatLeaveType(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className={`rounded-2xl shadow-2xl border overflow-hidden mb-6 ${
          darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div className="px-4 sm:px-6 py-4 border-b">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              Leave Requests ({filteredLeaves.length})
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Review and manage leave applications
            </p>
          </div>
          
          {filteredLeaves.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'} mb-2`}>
                No leave requests found
              </h3>
              <p className={`text-gray-600 dark:text-gray-400 mb-4`}>
                {searchTerm || statusFilter !== 'All' || leaveTypeFilter !== 'All' 
                  ? 'Try changing your search filters'
                  : 'No leave requests to display at the moment'}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setLeaveTypeFilter('All');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y">
                <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap">Dates</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredLeaves.map((leave) => (
                    <tr key={leave._id} className={`hover:${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'} transition-colors`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm mr-2 sm:mr-3 shadow-md">
                            {leave.employee?.name?.charAt(0) || 'E'}
                          </div>
                          <div className="min-w-0">
                            <div className={`font-medium text-sm sm:text-base truncate ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {leave.employee?.name || 'Employee'}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                              {leave.employee?.employeeId || 'N/A'}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} truncate`}>
                              {leave.employee?.department || 'Department'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.type)}`}>
                          {formatLeaveType(leave.type)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {leave.days} day(s)
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          Applied: {formatDate(leave.appliedAt || leave.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {formatDate(leave.startDate)}<br/>
                          to {formatDate(leave.endDate)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button 
                            onClick={() => handleViewDetails(leave)}
                            className={`p-1 sm:p-2 rounded transition-colors ${
                              darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title="View Details"
                          >
                            <span className="text-sm sm:text-base">👁️</span>
                          </button>
                          
                          {leave.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleEditClick(leave)}
                                className={`p-1 sm:p-2 rounded transition-colors ${
                                  darkMode ? 'text-yellow-400 hover:bg-yellow-900/30' : 'text-yellow-600 hover:bg-yellow-50'
                                }`}
                                title="Edit"
                              >
                                <span className="text-sm sm:text-base">✏️</span>
                              </button>
                              
                              <button 
                                onClick={() => handleApprove(leave._id)}
                                disabled={processingId === leave._id}
                                className={`p-1 sm:p-2 rounded transition-colors ${
                                  processingId === leave._id
                                    ? 'opacity-50 cursor-not-allowed'
                                    : darkMode ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'
                                }`}
                                title="Approve"
                              >
                                {processingId === leave._id ? (
                                  <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <span className="text-sm sm:text-base">✅</span>
                                )}
                              </button>
                              
                              <button 
                                onClick={() => handleReject(leave._id)}
                                disabled={processingId === leave._id}
                                className={`p-1 sm:p-2 rounded transition-colors ${
                                  processingId === leave._id
                                    ? 'opacity-50 cursor-not-allowed'
                                    : darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'
                                }`}
                                title="Reject"
                              >
                                {processingId === leave._id ? (
                                  <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <span className="text-sm sm:text-base">❌</span>
                                )}
                              </button>
                            </>
                          )}
                          
                          {(leave.status === 'pending' || leave.status === 'approved') && (
                            <button 
                              onClick={() => confirmDelete(leave)}
                              className={`p-1 sm:p-2 rounded transition-colors ${
                                darkMode ? 'text-gray-400 hover:bg-gray-900/30' : 'text-gray-600 hover:bg-gray-50'
                              }`}
                              title="Cancel"
                            >
                              <span className="text-sm sm:text-base">🗑️</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Leave Details Modal */}
      {showDetails && selectedLeave && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`rounded-2xl shadow-3xl max-w-2xl w-full ${
            darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'
          }`}>
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Leave Request Details
                </h3>
                <button 
                  onClick={() => setShowDetails(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {selectedLeave.employee?.name?.charAt(0) || 'E'}
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedLeave.employee?.name || 'Employee'}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedLeave.employee?.employeeId || 'N/A'} • {selectedLeave.employee?.department || 'Department'}
                  </p>
                  <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedLeave.status)}`}>
                    {selectedLeave.status.charAt(0).toUpperCase() + selectedLeave.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Leave Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Leave Type:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getLeaveTypeColor(selectedLeave.type)}`}>
                        {formatLeaveType(selectedLeave.type)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Duration:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>{selectedLeave.days} day(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Start Date:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>{formatDate(selectedLeave.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>End Date:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>{formatDate(selectedLeave.endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Applied On:</span>
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>{formatDate(selectedLeave.appliedAt || selectedLeave.createdAt)}</span>
                    </div>
                    {selectedLeave.approvedBy && (
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Approved By:</span>
                        <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                          {selectedLeave.approvedBy?.name || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Reason
                  </h4>
                  <div className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {selectedLeave.reason || 'No reason provided'}
                    </p>
                  </div>
                  
                  {selectedLeave.contactNumber && (
                    <div className="mt-4">
                      <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Contact Number
                      </h4>
                      <p className={darkMode ? 'text-blue-300' : 'text-blue-700'}>
                        {selectedLeave.contactNumber}
                      </p>
                    </div>
                  )}
                  
                  {selectedLeave.rejectionReason && (
                    <div className="mt-4">
                      <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        Rejection Reason
                      </h4>
                      <div className={`p-3 rounded-lg border ${
                        darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                      }`}>
                        <p className={darkMode ? 'text-red-300' : 'text-red-700'}>
                          {selectedLeave.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedLeave.status === 'pending' && (
                    <div className="mt-6 flex space-x-3">
                      <button 
                        onClick={() => {
                          handleApprove(selectedLeave._id);
                          setShowDetails(false);
                        }}
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        <span>✅</span> Approve
                      </button>
                      <button 
                        onClick={() => {
                          handleReject(selectedLeave._id);
                          setShowDetails(false);
                        }}
                        className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                      >
                        <span>❌</span> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Leave Modal */}
      {showEdit && editingLeave && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`rounded-2xl shadow-3xl max-w-2xl w-full ${
            darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'
          }`}>
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Edit Leave Request
                </h3>
                <button 
                  onClick={() => {
                    setShowEdit(false);
                    setEditingLeave(null);
                  }}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={editForm.startDate}
                      onChange={handleEditChange}
                      min={formatDateForInput(new Date())}
                      required
                      className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={editForm.endDate}
                      onChange={handleEditChange}
                      min={editForm.startDate || formatDateForInput(new Date())}
                      required
                      className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Reason
                    </label>
                    <textarea
                      name="reason"
                      value={editForm.reason}
                      onChange={handleEditChange}
                      rows="4"
                      required
                      className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Contact Number (Optional)
                    </label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={editForm.contactNumber}
                      onChange={handleEditChange}
                      className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEdit(false);
                      setEditingLeave(null);
                    }}
                    className={`px-6 py-2.5 rounded-lg ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingId === editingLeave._id}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {processingId === editingLeave._id ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      'Update Leave'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && leaveToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`rounded-2xl shadow-3xl max-w-md w-full ${
            darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className={`text-lg font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Cancel Leave Request
              </h3>
              <p className={`text-center mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Are you sure you want to cancel this leave request? This action cannot be undone.
              </p>
              <div className={`p-4 rounded-lg mb-6 ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {leaveToDelete.employee?.name || 'Employee'} - {formatLeaveType(leaveToDelete.type)}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatDate(leaveToDelete.startDate)} to {formatDate(leaveToDelete.endDate)}
                </p>
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setDeleteConfirm(false);
                    setLeaveToDelete(null);
                  }}
                  className={`px-6 py-2.5 rounded-lg ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(leaveToDelete._id)}
                  disabled={processingId === leaveToDelete._id}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {processingId === leaveToDelete._id ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    'Yes, Cancel Leave'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .shadow-3xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
      `}</style>
    </div>
  );
};

export default AdminLeave;