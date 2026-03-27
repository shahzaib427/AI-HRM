import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { 
  FiSearch, FiDownload, FiFilter, FiX, FiCheck, FiClock, FiUser, FiAlertCircle, 
  FiCalendar, FiMapPin, FiEdit3, FiTrash2, FiPlus, FiRefreshCw, FiChevronLeft, 
  FiChevronRight, FiRotateCcw, FiEye, FiMoreVertical, FiCheckCircle, FiXCircle,
  FiMail, FiFileText // Added new icons
} from 'react-icons/fi';
import { CSVLink } from 'react-csv';
import { format, parseISO, differenceInMinutes, isValid, addDays } from 'date-fns';

const AdminAttendance = () => {
  // States
  const [attendances, setAttendances] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState({ type: '', actualTime: '', remarks: '' });
  const [stats, setStats] = useState({ total: 0, pending: 0, present: 0, late: 0, avgHours: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [showActionsDropdown, setShowActionsDropdown] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sendingReport, setSendingReport] = useState(false);
  const csvLinkRef = useRef(null);
  const tableContainerRef = useRef(null);
  const actionsRefs = useRef({});

  // 🔒 Safe date formatting utility
  const safeDateFormat = (dateValue, formatStr = 'hh:mm a') => {
    if (!dateValue) return '-';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime()) || !isValid(date)) return 'Invalid';
      return format(date, formatStr);
    } catch {
      return 'Error';
    }
  };

  const safeTimeAgo = (dateValue) => {
    if (!dateValue) return 'Never';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Unknown';
      const minutes = differenceInMinutes(new Date(), date);
      if (minutes < 60) return `${minutes}m ago`;
      if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
      return `${Math.floor(minutes / 1440)}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  // 📊 Fetch attendance data with pagination
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      }).toString();

      // ✅ FIXED: Changed from '/attendance/all' to '/attendance'
      const { data } = await axiosInstance.get(`/attendance?${params}`);
      
      if (data.success) {
        setAttendances(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
        prepareCSVData(data.data || []);
        calculateStats(data.data || []);
      } else {
        setError(data.message || 'Failed to load attendance data');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load attendance data');
      console.error('Attendance fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // 🔄 Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
     const { data } = await axiosInstance.get('/attendance/pending-requests');
      if (data.success) {
        setPendingRequests(data.data || []);
        setStats(prev => ({ ...prev, pending: data.count || 0 }));
      }
    } catch (error) {
      console.error('Pending requests error:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // 📈 Calculate statistics
  const calculateStats = (records) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = records.filter(r => r.lateMinutes > 0).length;
    const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.totalHours) || 0), 0);
    const avgHours = total > 0 ? (totalHours / total).toFixed(1) : 0;

    setStats({
      total,
      pending: pendingRequests.length,
      present,
      late,
      avgHours
    });
  };

  // 📄 Prepare CSV data for export - UPDATED
  const prepareCSVData = (data) => {
    const formattedData = data.map(record => ({
      'Employee Name': record.employee?.name || 'N/A',
      'Employee ID': record.employee?.employeeId || 'N/A',
      'Department': record.employee?.department || 'N/A',
      'Date': safeDateFormat(record.date, 'yyyy-MM-dd'),
      'Check-in Time': record.approvedCheckIn ? safeDateFormat(record.approvedCheckIn) : 
                       (record.checkInRequest?.approved === false ? 'Pending' : 'Not Checked In'),
      'Check-out Time': record.approvedCheckOut ? safeDateFormat(record.approvedCheckOut) :
                        (record.checkOutRequest?.approved === false ? 'Pending' : 'Not Checked Out'),
      'Total Hours': record.totalHours?.toFixed(2) || '0.00',
      'Status': record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'N/A',
      'Late Minutes': record.lateMinutes || 0,
      'Remarks': record.checkInRequest?.remarks || record.checkOutRequest?.remarks || record.remarks || 'N/A',
      'Check-in Request Status': record.checkInRequest ? (record.checkInRequest.approved === false ? 'Pending' : 'Approved') : 'No Request',
      'Check-out Request Status': record.checkOutRequest ? (record.checkOutRequest.approved === false ? 'Pending' : 'Approved') : 'No Request'
    }));
    setCsvData(formattedData);
  };

// ✅ FIXED: Handle approve request with better debugging
const handleApproveRequest = async () => {
  try {
    console.log('🔍 Starting approval...');
    console.log('📋 Selected request:', selectedRequest);
    console.log('📋 Approval data:', approvalData);
    
    const { type, actualTime, remarks } = approvalData;
    
    // Validate actualTime format
    let payload = { remarks: remarks || '' };
    
    if (actualTime) {
      // Check if actualTime is already in ISO format (from datetime-local input)
      if (actualTime.includes('T')) {
        payload.actualTime = actualTime;
      } else {
        // Parse HH:mm format
        const [hours, minutes] = actualTime.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        payload.actualTime = date.toISOString();
      }
    }

    const endpoint = type === 'checkin' ? 
      `/attendance/approve-checkin/${selectedRequest._id}` : 
      `/attendance/approve-checkout/${selectedRequest._id}`; 
    
    console.log('📤 Sending to endpoint:', endpoint);
    console.log('📦 Payload:', payload);
    
    // First, debug the attendance record
    try {
      const debugRes = await axiosInstance.get(`/attendance/debug/${selectedRequest._id}`);
      console.log('🔍 Debug attendance data:', debugRes.data);
    } catch (debugError) {
      console.error('❌ Debug failed:', debugError.response?.data || debugError.message);
    }

    // Then try to approve
    const { data } = await axiosInstance.put(endpoint, payload);

    console.log('✅ Approval response:', data);

    if (data && data.success) {
      alert(`✅ ${type === 'checkin' ? 'Check-in' : 'Check-out'} approved successfully!`);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalData({ type: '', actualTime: '', remarks: '' });
      
      // Refresh data
      fetchAttendance();
      fetchPendingRequests();
    } else {
      alert(data?.message || 'Approval failed - Invalid response from server');
    }
  } catch (error) {
    console.error('❌ Approval error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });
    
    // Better error handling
    if (error.response) {
      const errorData = error.response.data;
      
      if (errorData?.message) {
        alert(`❌ Approval failed: ${errorData.message}`);
      } else if (errorData?.error) {
        alert(`❌ Server error: ${errorData.error}`);
      } else {
        alert(`❌ Server error: ${error.response.status}`);
      }
      
      // Log detailed error
      console.error('Full error response:', error.response);
    } else if (error.request) {
      alert('❌ No response from server. Please check your connection.');
    } else {
      alert(`❌ Error: ${error.message}`);
    }
  }
};

  // ❌ Handle reject request - UPDATED
 // ✅ FIXED: Handle reject request
const handleRejectRequest = async (request, type) => {
  const reason = prompt(`Enter reason for rejecting ${type} request:`, 'Request does not comply with company policy');
  if (!reason) return;

  try {
    const { data } = await axiosInstance.put(`/attendance/reject/${request._id}`, { type, reason });
    
    if (data && data.success) {
      alert(`❌ ${type === 'checkin' ? 'Check-in' : 'Check-out'} request rejected`);
      fetchPendingRequests();
      fetchAttendance();
    } else {
      alert(data?.message || 'Rejection failed');
    }
  } catch (error) {
    console.error('Reject error:', error);
    alert(error.response?.data?.message || 'Rejection failed. Please try again.');
  }
};
  // 🗑️ Handle delete record - UPDATED
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
      return;
    }

    try {
      await axiosInstance.delete(`/attendance/${id}`);
      if (data.success) {
        alert('✅ Record deleted successfully');
        fetchAttendance();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete record. Please try again.');
    }
  };

  // ✏️ Handle update record - UPDATED
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;

    try {
      // Prepare update payload
      const updatePayload = {
        status: editing.status,
        lateMinutes: editing.lateMinutes || 0,
        remarks: editing.remarks || '',
        totalHours: editing.totalHours || 0
      };

      // If dates are being updated
      if (editing.approvedCheckIn) updatePayload.approvedCheckIn = editing.approvedCheckIn;
      if (editing.approvedCheckOut) updatePayload.approvedCheckOut = editing.approvedCheckOut;

      await axiosInstance.put(`/attendance/${editing._id}`, updatePayload);
      
      if (data.success) {
        alert('✅ Record updated successfully');
        setEditing(null);
        fetchAttendance();
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Update failed. Please try again.');
      console.error('Update error:', error);
    }
  };

  // 📧 Send attendance report email
  const handleSendReport = async (employee) => {
    try {
      setSendingReport(true);
      await axiosInstance.post(`/attendance/send-report/${employee._id}`, {
        periodStart: filters.dateFrom,
        periodEnd: filters.dateTo
      });

      if (data.success) {
        alert(`📧 Report sent to ${employee.email}`);
        setShowReportModal(false);
        setSelectedEmployee(null);
      } else {
        alert(data.message || 'Failed to send report');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send report');
    } finally {
      setSendingReport(false);
    }
  };

  // 🆕 Clear stuck checkout request - UPDATED
  const clearStuckCheckout = async (attendanceId, employeeName) => {
    if (!confirm(`Clear stuck checkout request for ${employeeName}? This will allow them to request checkout again.`)) return;
    
    try {
      await axiosInstance.put(`/attendance/clear-stuck-checkout/${attendanceId}`);
      if (data.success) {
        alert('✅ Stuck checkout cleared! Employee can now request checkout.');
        fetchAttendance();
        fetchPendingRequests();
      } else {
        alert(data.message || 'Failed to clear stuck checkout');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to clear stuck checkout');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showActionsDropdown && 
          !actionsRefs.current[showActionsDropdown]?.contains(event.target)) {
        setShowActionsDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsDropdown]);

  // 🎨 Status badge color mapping
  const getStatusColor = (status) => {
    const colors = {
      present: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      late: 'bg-amber-100 text-amber-800 border border-amber-200',
      absent: 'bg-rose-100 text-rose-800 border border-rose-200',
      pending: 'bg-blue-100 text-blue-800 border border-blue-200',
      checkout_pending: 'bg-purple-100 text-purple-800 border border-purple-200',
      'Not Checked In': 'bg-gray-100 text-gray-800 border border-gray-200',
      'half-day': 'bg-indigo-100 text-indigo-800 border border-indigo-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  // 📅 Set default date filters
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = addDays(today, -7);
    
    setFilters(prev => ({
      ...prev,
      dateFrom: format(sevenDaysAgo, 'yyyy-MM-dd'),
      dateTo: format(today, 'yyyy-MM-dd')
    }));
  }, []);

  // 🔄 Fetch data when filters or pagination changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchAttendance();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [filters, pagination.page, fetchAttendance]);

  // 🔄 Fetch pending requests on mount and when needed
  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // Format date for datetime-local input
  const formatDateTimeLocal = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return date.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      {/* 📊 Header Section */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Attendance Management
          </h1>
          <p className="text-gray-600">
            Monitor and manage employee attendance records and requests
          </p>
        </div>

        {/* 📈 Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { 
              label: 'Total Records', 
              value: stats.total, 
              icon: FiUser, 
              color: 'bg-blue-500',
              bgColor: 'bg-blue-50'
            },
            { 
              label: 'Pending Requests', 
              value: stats.pending, 
              icon: FiAlertCircle, 
              color: 'bg-amber-500',
              bgColor: 'bg-amber-50'
            },
            { 
              label: 'Present Today', 
              value: stats.present, 
              icon: FiCheck, 
              color: 'bg-emerald-500',
              bgColor: 'bg-emerald-50'
            },
            { 
              label: 'Late Arrivals', 
              value: stats.late, 
              icon: FiClock, 
              color: 'bg-orange-500',
              bgColor: 'bg-orange-50'
            },
            { 
              label: 'Avg Hours', 
              value: `${stats.avgHours}h`, 
              icon: FiClock, 
              color: 'bg-purple-500',
              bgColor: 'bg-purple-50'
            }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor} mr-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ⚠️ Pending Requests Section - UPDATED */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiAlertCircle className="w-5 h-5 text-amber-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Pending Approval Requests ({pendingRequests.length})
                </h2>
              </div>
              <button
                onClick={fetchPendingRequests}
                disabled={loadingRequests}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 mr-1 ${loadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {loadingRequests ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <FiCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-gray-600">No pending requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-full inline-block align-middle">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Requested Time</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pendingRequests.map((request) => {
                        const isCheckin = request.checkInRequest?.approved === false;
                        const requestedTime = isCheckin 
                          ? request.checkInRequest?.requestedAt 
                          : request.checkOutRequest?.requestedAt;
                        
                        return (
                          <tr key={request._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{request.employee?.name}</div>
                              <div className="text-sm text-gray-500">{request.employee?.employeeId}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isCheckin 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {isCheckin ? 'Check-in' : 'Check-out'}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Requested: {safeTimeAgo(requestedTime)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">{safeDateFormat(requestedTime)}</div>
                              <div className="text-xs text-gray-500">{safeTimeAgo(requestedTime)}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {safeDateFormat(request.date, 'MMM dd, yyyy')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setApprovalData({ 
                                      type: isCheckin ? 'checkin' : 'checkout', 
                                      actualTime: '', 
                                      remarks: '' 
                                    });
                                    setShowApprovalModal(true);
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                                >
                                  <FiCheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(request, isCheckin ? 'checkin' : 'checkout')}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                                >
                                  <FiXCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🔍 Filters and Export Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FiFilter className="w-4 h-4 mr-2" />
                Filters
              </button>
              
              <CSVLink
                ref={csvLinkRef}
                data={csvData}
                filename={`attendance-export-${format(new Date(), 'yyyy-MM-dd')}.csv`}
                className="hidden"
              />
              
              <button
                onClick={() => csvLinkRef.current?.link.click()}
                disabled={csvData.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="pending">Pending</option>
                    <option value="checkout_pending">Checkout Pending</option>
                    <option value="Not Checked In">Not Checked In</option>
                    <option value="half-day">Half Day</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const sevenDaysAgo = addDays(today, -7);
                      setFilters({
                        search: '',
                        status: '',
                        dateFrom: format(sevenDaysAgo, 'yyyy-MM-dd'),
                        dateTo: format(today, 'yyyy-MM-dd')
                      });
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 📋 Attendance Records Table - UPDATED */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {pagination.total} records • Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={fetchAttendance}
                  disabled={loading}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-12">
              <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No attendance records found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Scrollable table container */}
              <div 
                ref={tableContainerRef}
                className="max-h-[calc(100vh-400px)] min-h-[400px] overflow-y-auto custom-scrollbar"
              >
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3 sticky left-0 bg-gray-50 z-20">Employee</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Check-in</th>
                      <th className="px-6 py-3">Check-out</th>
                      <th className="px-6 py-3">Hours</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right sticky right-0 bg-gray-50 z-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendances.map((record) => {
                      const hasStuckCheckout = record.checkOutRequest?.approved === false && record.approvedCheckIn;
                      
                      return (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 sticky left-0 bg-white z-10">
                            <div className="font-medium text-gray-900">{record.employee?.name}</div>
                            <div className="text-sm text-gray-500">
                              {record.employee?.employeeId} • {record.employee?.department}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {safeDateFormat(record.date, 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-medium ${
                              record.approvedCheckIn ? 'text-emerald-600' : 'text-gray-400'
                            }`}>
                              {safeDateFormat(record.approvedCheckIn) || '-'}
                            </div>
                            {record.checkInRequest?.approved === false && (
                              <button
                                onClick={() => {
                                  setSelectedRequest(record);
                                  setApprovalData({ type: 'checkin', actualTime: '', remarks: '' });
                                  setShowApprovalModal(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center"
                              >
                                <FiAlertCircle className="w-3 h-3 mr-1" />
                                Approve pending
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-medium ${
                              record.approvedCheckOut ? 'text-emerald-600' : 'text-gray-400'
                            }`}>
                              {safeDateFormat(record.approvedCheckOut) || '-'}
                            </div>
                            {record.checkOutRequest?.approved === false && (
                              <div className="mt-1 space-y-1">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(record);
                                    setApprovalData({ type: 'checkout', actualTime: '', remarks: '' });
                                    setShowApprovalModal(true);
                                  }}
                                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center"
                                >
                                  <FiAlertCircle className="w-3 h-3 mr-1" />
                                  Approve pending
                                </button>
                                {hasStuckCheckout && (
                                  <button
                                    onClick={() => clearStuckCheckout(record._id, record.employee?.name)}
                                    className="text-xs text-amber-600 hover:text-amber-800 flex items-center"
                                    title="Clear stuck checkout"
                                  >
                                    <FiRotateCcw className="w-3 h-3 mr-1" />
                                    Clear stuck
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-bold ${
                              parseFloat(record.totalHours) >= 7 ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {record.totalHours?.toFixed(1) || 0}h
                            </span>
                            {record.lateMinutes > 0 && (
                              <div className="text-xs text-amber-600">
                                Late: {record.lateMinutes}m
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                              {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right sticky right-0 bg-white z-10">
                            <div className="relative inline-block text-left" 
                                 ref={el => actionsRefs.current[record._id] = el}>
                              <button
                                onClick={() => setShowActionsDropdown(
                                  showActionsDropdown === record._id ? null : record._id
                                )}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                                title="More actions"
                              >
                                <FiMoreVertical className="w-5 h-5" />
                              </button>
                              
                              {showActionsDropdown === record._id && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                  <button
                                    onClick={() => {
                                      setEditing({
                                        ...record,
                                        _id: record._id,
                                        employee: record.employee?._id,
                                        date: record.date ? new Date(record.date).toISOString().split('T')[0] : ''
                                      });
                                      setShowActionsDropdown(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <FiEdit3 className="w-4 h-4 mr-3 text-blue-600" />
                                    Edit Record
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setSelectedEmployee(record.employee);
                                      setShowReportModal(true);
                                      setShowActionsDropdown(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <FiMail className="w-4 h-4 mr-3 text-green-600" />
                                    Send Report
                                  </button>
                                  
                                  {hasStuckCheckout && (
                                    <button
                                      onClick={() => {
                                        clearStuckCheckout(record._id, record.employee?.name);
                                        setShowActionsDropdown(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <FiRotateCcw className="w-4 h-4 mr-3 text-amber-600" />
                                      Clear Stuck Checkout
                                    </button>
                                  )}
                                  
                                  <div className="border-t border-gray-200 my-1"></div>
                                  
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this record?')) {
                                        handleDelete(record._id);
                                        setShowActionsDropdown(null);
                                      }
                                    }}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                                  >
                                    <FiTrash2 className="w-4 h-4 mr-3" />
                                    Delete Record
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page <= 1}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.pages}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <FiChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ✅ Approval Modal - UPDATED */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Approve {approvalData.type === 'checkin' ? 'Check-in' : 'Check-out'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedRequest.employee?.name} • {safeDateFormat(selectedRequest.date, 'MMM dd, yyyy')}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjust Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={approvalData.actualTime || formatDateTimeLocal(
                    approvalData.type === 'checkin' 
                      ? selectedRequest.requestedCheckIn 
                      : selectedRequest.requestedCheckOut
                  )}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, actualTime: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Requested: {safeDateFormat(
                    approvalData.type === 'checkin' 
                      ? selectedRequest.requestedCheckIn 
                      : selectedRequest.requestedCheckOut
                  )}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks (Optional)
                </label>
                <textarea
                  value={approvalData.remarks}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any remarks..."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setApprovalData({ type: '', actualTime: '', remarks: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveRequest}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ Edit Modal - UPDATED */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Attendance Record</h3>
              <p className="text-sm text-gray-600 mt-1">
                {attendances.find(a => a._id === editing._id)?.employee?.name || 'Unknown Employee'}
              </p>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editing.date || ''}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editing.status || ''}
                    onChange={(e) => setEditing(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="pending">Pending</option>
                    <option value="half-day">Half Day</option>
                    <option value="Not Checked In">Not Checked In</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Late Minutes</label>
                  <input
                    type="number"
                    min="0"
                    value={editing.lateMinutes || 0}
                    onChange={(e) => setEditing(prev => ({ ...prev, lateMinutes: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={editing.totalHours || 0}
                    onChange={(e) => setEditing(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                <input
                  type="datetime-local"
                  value={formatDateTimeLocal(editing.approvedCheckIn)}
                  onChange={(e) => setEditing(prev => ({ ...prev, approvedCheckIn: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                <input
                  type="datetime-local"
                  value={formatDateTimeLocal(editing.approvedCheckOut)}
                  onChange={(e) => setEditing(prev => ({ ...prev, approvedCheckOut: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editing.remarks || ''}
                  onChange={(e) => setEditing(prev => ({ ...prev, remarks: e.target.value }))}
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add remarks..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📧 Report Modal */}
      {showReportModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Send Attendance Report
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Send report to {selectedEmployee.name}
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period
                </label>
                <div className="text-sm text-gray-600">
                  {filters.dateFrom ? safeDateFormat(filters.dateFrom, 'MMM dd, yyyy') : 'Last 2 weeks'} 
                  {' to '}
                  {filters.dateTo ? safeDateFormat(filters.dateTo, 'MMM dd, yyyy') : 'Today'}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <div className="text-sm text-gray-600">{selectedEmployee.email}</div>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                A detailed attendance report will be sent to the employee's email address.
              </p>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendReport(selectedEmployee)}
                disabled={sendingReport}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {sendingReport ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FiMail className="w-4 h-4 mr-2" />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Error Notification */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-rose-50 border border-rose-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start">
              <FiAlertCircle className="w-5 h-5 text-rose-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-rose-800">Error</h4>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-4 text-rose-500 hover:text-rose-700"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f1f5f9;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e0;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        
        /* Sticky table header fix */
        .sticky {
          position: sticky;
        }
        
        .sticky.top-0 {
          top: 0;
        }
        
        .sticky.left-0 {
          left: 0;
          box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.1);
        }
        
        .sticky.right-0 {
          right: 0;
          box-shadow: -2px 0 5px -2px rgba(0, 0, 0, 0.1);
        }
        
        /* Ensure z-index layers work properly */
        .z-10 {
          z-index: 10;
        }
        
        .z-20 {
          z-index: 20;
        }
        
        .z-50 {
          z-index: 50;
        }
      `}</style>
    </div>
  );
};

export default AdminAttendance;