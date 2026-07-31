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

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-indigo-50 text-indigo-700'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

// KPI Card Component with colored icons
const KpiCard = ({ label, value, icon, iconBg, sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        <span className="text-white text-lg">{icon}</span>
      </div>
    </div>
  </div>
);

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
        fetchLeaves();
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

  // Get status styling
  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <Badge variant="success">Approved</Badge>;
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'cancelled': return <Badge variant="default">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // Get leave type badge
  const getLeaveTypeBadge = (type) => {
    const types = {
      'annual': <Badge variant="info">Annual</Badge>,
      'sick': <Badge variant="success">Sick</Badge>,
      'casual': <Badge variant="default">Casual</Badge>,
      'earned': <Badge variant="info">Earned</Badge>,
      'maternity': <Badge variant="default">Maternity</Badge>,
      'paternity': <Badge variant="default">Paternity</Badge>
    };
    return types[type] || <Badge>{type}</Badge>;
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Error</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={fetchLeaves}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
          {userRole === 'employee' && (
            <p className="mt-4 text-sm text-slate-400">
              This page is only accessible to Admin, HR, and Manager roles.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-indigo-500 text-xl">📋</span>
                Leave Management Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {userRole === 'admin' && 'Administrator View - All Leaves'}
                {userRole === 'hr' && 'HR View - All Leaves'}
                {userRole === 'manager' && 'Manager View - Team Leaves'}
              </p>
            </div>
            <button 
              onClick={fetchLeaves}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <span className="text-sm">🔄</span> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Grid with Colored Icons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard 
            label="Total Leaves" 
            value={stats.total} 
            icon="📋" 
            iconBg="bg-indigo-500"
            sub="All time"
          />
          <KpiCard 
            label="Pending" 
            value={stats.pending} 
            icon="⏳" 
            iconBg="bg-amber-500"
            sub="Awaiting approval"
          />
          <KpiCard 
            label="Approved" 
            value={stats.approved} 
            icon="✅" 
            iconBg="bg-emerald-500"
            sub="Confirmed"
          />
          <KpiCard 
            label="Rejected" 
            value={stats.rejected} 
            icon="❌" 
            iconBg="bg-red-500"
            sub="Declined"
          />
          <KpiCard 
            label="This Month" 
            value={stats.thisMonth} 
            icon="📊" 
            iconBg="bg-purple-500"
            sub="Current period"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors min-w-[130px]"
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
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors min-w-[150px]"
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
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-500 text-sm">📋</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Leave Requests</p>
                  <p className="text-xs text-slate-500">{filteredLeaves.length} requests</p>
                </div>
              </div>
            </div>
          </div>
          
          {filteredLeaves.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-gray-700 font-medium mb-2">No leave requests found</h3>
              <p className="text-slate-400 text-sm mb-4">
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
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Leave Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dates</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {leave.employee?.name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-slate-800">
                              {leave.employee?.name || 'Employee'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {leave.employee?.employeeId || 'N/A'} • {leave.employee?.department || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {getLeaveTypeBadge(leave.type)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-800">{leave.days} day(s)</div>
                        <div className="text-xs text-slate-400">
                          Applied: {formatDate(leave.appliedAt || leave.createdAt)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-800">
                          {formatDate(leave.startDate)}<br/>
                          <span className="text-xs text-slate-400">to</span> {formatDate(leave.endDate)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(leave.status)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleViewDetails(leave)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <span className="text-sm">👁️</span>
                          </button>
                          
                          {leave.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleEditClick(leave)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <span className="text-sm">✏️</span>
                              </button>
                              
                              <button 
                                onClick={() => handleApprove(leave._id)}
                                disabled={processingId === leave._id}
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                {processingId === leave._id ? (
                                  <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <span className="text-sm">✅</span>
                                )}
                              </button>
                              
                              <button 
                                onClick={() => handleReject(leave._id)}
                                disabled={processingId === leave._id}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                {processingId === leave._id ? (
                                  <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <span className="text-sm">❌</span>
                                )}
                              </button>
                            </>
                          )}
                          
                          {/* Delete Button - Always visible for all statuses */}
                          <button 
                            onClick={() => confirmDelete(leave)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={leave.status === 'pending' ? "Cancel Leave" : "Delete Record"}
                          >
                            <span className="text-sm">🗑️</span>
                          </button>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <span className="text-indigo-500">📋</span>
                  Leave Request Details
                </h3>
                <button 
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  {selectedLeave.employee?.name?.charAt(0) || 'E'}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {selectedLeave.employee?.name || 'Employee'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedLeave.employee?.employeeId || 'N/A'} • {selectedLeave.employee?.department || 'N/A'}
                  </p>
                  <div className="mt-2">
                    {getStatusBadge(selectedLeave.status)}
                  </div>
                </div>
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Leave Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Leave Type:</span>
                      <span>{getLeaveTypeBadge(selectedLeave.type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Duration:</span>
                      <span className="text-sm font-medium text-slate-700">{selectedLeave.days} day(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Start Date:</span>
                      <span className="text-sm text-slate-700">{formatDate(selectedLeave.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">End Date:</span>
                      <span className="text-sm text-slate-700">{formatDate(selectedLeave.endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Applied On:</span>
                      <span className="text-sm text-slate-700">{formatDate(selectedLeave.appliedAt || selectedLeave.createdAt)}</span>
                    </div>
                    {selectedLeave.approvedBy && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Approved By:</span>
                        <span className="text-sm font-medium text-slate-700">
                          {selectedLeave.approvedBy?.name || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Reason</h4>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-600">
                      {selectedLeave.reason || 'No reason provided'}
                    </p>
                  </div>
                  
                  {selectedLeave.contactNumber && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Contact Number</h4>
                      <p className="text-sm text-indigo-600">
                        {selectedLeave.contactNumber}
                      </p>
                    </div>
                  )}
                  
                  {selectedLeave.rejectionReason && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-red-600 mb-2">Rejection Reason</h4>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm text-red-600">
                          {selectedLeave.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedLeave.status === 'pending' && (
                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={() => {
                          handleApprove(selectedLeave._id);
                          setShowDetails(false);
                        }}
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <span>✅</span> Approve
                      </button>
                      <button 
                        onClick={() => {
                          handleReject(selectedLeave._id);
                          setShowDetails(false);
                        }}
                        className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <span>❌</span> Reject
                      </button>
                    </div>
                  )}
                  
                  {/* Delete button in details modal */}
                  <div className="mt-4">
                    <button 
                      onClick={() => {
                        setShowDetails(false);
                        confirmDelete(selectedLeave);
                      }}
                      className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium border border-red-200"
                    >
                      <span>🗑️</span> {selectedLeave.status === 'pending' ? 'Cancel Leave' : 'Delete Record'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Leave Modal */}
      {showEdit && editingLeave && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <span className="text-indigo-500">✏️</span>
                  Edit Leave Request
                </h3>
                <button 
                  onClick={() => {
                    setShowEdit(false);
                    setEditingLeave(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={editForm.startDate}
                      onChange={handleEditChange}
                      min={formatDateForInput(new Date())}
                      required
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={editForm.endDate}
                      onChange={handleEditChange}
                      min={editForm.startDate || formatDateForInput(new Date())}
                      required
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Reason
                    </label>
                    <textarea
                      name="reason"
                      value={editForm.reason}
                      onChange={handleEditChange}
                      rows="4"
                      required
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Contact Number (Optional)
                    </label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={editForm.contactNumber}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEdit(false);
                      setEditingLeave(null);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingId === editingLeave._id}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl text-red-500">⚠️</span>
                <h3 className="text-lg font-semibold text-slate-800">
                  {leaveToDelete.status === 'pending' ? 'Cancel Leave Request' : 'Delete Record'}
                </h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to {leaveToDelete.status === 'pending' ? 'cancel' : 'delete'} this leave request? This action cannot be undone.
              </p>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 mb-5">
                <p className="text-sm font-medium text-slate-800">
                  {leaveToDelete.employee?.name || 'Employee'} - {formatLeaveType(leaveToDelete.type)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatDate(leaveToDelete.startDate)} to {formatDate(leaveToDelete.endDate)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Status: <span className="capitalize">{leaveToDelete.status}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteConfirm(false);
                    setLeaveToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(leaveToDelete._id)}
                  disabled={processingId === leaveToDelete._id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === leaveToDelete._id ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    leaveToDelete.status === 'pending' ? 'Yes, Cancel Leave' : 'Yes, Delete Record'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeave;