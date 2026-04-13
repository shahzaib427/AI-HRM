import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { 
  FiSearch, FiDownload, FiFilter, FiX, FiCheck, FiClock, FiUser, FiAlertCircle, 
  FiCalendar, FiEdit3, FiTrash2, FiRefreshCw, FiChevronLeft, 
  FiChevronRight, FiRotateCcw, FiEye, FiMoreVertical, FiCheckCircle, FiXCircle,
  FiMail, FiUsers
} from 'react-icons/fi';
import { CSVLink } from 'react-csv';
import { format, differenceInMinutes, isValid, addDays } from 'date-fns';

// KPI Card component with colored icons
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

// Badge component
const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
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

  const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...options });
    } catch { return 'N/A'; }
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

  // 📄 Prepare CSV data for export
  const prepareCSVData = (data) => {
    const formattedData = data.map(record => ({
      'Employee Name': record.employee?.name || 'N/A',
      'Employee ID': record.employee?.employeeId || 'N/A',
      'Department': record.employee?.department || 'N/A',
      'Date': formatDate(record.date, { year: 'numeric', month: 'short', day: 'numeric' }),
      'Check-in Time': record.approvedCheckIn ? safeDateFormat(record.approvedCheckIn) : 
                       (record.checkInRequest?.approved === false ? 'Pending' : 'Not Checked In'),
      'Check-out Time': record.approvedCheckOut ? safeDateFormat(record.approvedCheckOut) :
                        (record.checkOutRequest?.approved === false ? 'Pending' : 'Not Checked Out'),
      'Total Hours': record.totalHours?.toFixed(2) || '0.00',
      'Status': record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'N/A',
      'Late Minutes': record.lateMinutes || 0
    }));
    setCsvData(formattedData);
  };

  // ✅ Handle approve request
  const handleApproveRequest = async () => {
    try {
      const { type, actualTime, remarks } = approvalData;
      
      let payload = { remarks: remarks || '' };
      
      if (actualTime) {
        if (actualTime.includes('T')) {
          payload.actualTime = actualTime;
        } else {
          const [hours, minutes] = actualTime.split(':');
          const date = new Date();
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          payload.actualTime = date.toISOString();
        }
      }

      const endpoint = type === 'checkin' ? 
        `/attendance/approve-checkin/${selectedRequest._id}` : 
        `/attendance/approve-checkout/${selectedRequest._id}`;
      
      const { data } = await axiosInstance.put(endpoint, payload);

      if (data && data.success) {
        alert(`✅ ${type === 'checkin' ? 'Check-in' : 'Check-out'} approved successfully!`);
        setShowApprovalModal(false);
        setSelectedRequest(null);
        setApprovalData({ type: '', actualTime: '', remarks: '' });
        
        fetchAttendance();
        fetchPendingRequests();
      } else {
        alert(data?.message || 'Approval failed');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Approval failed');
    }
  };

  // ❌ Handle reject request
  const handleRejectRequest = async (request, type) => {
    const reason = prompt(`Enter reason for rejecting ${type} request:`);
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
      alert(error.response?.data?.message || 'Rejection failed');
    }
  };

  // 🗑️ Handle delete record with confirmation
  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      const { data } = await axiosInstance.delete(`/attendance/${recordToDelete._id}`);
      if (data.success) {
        alert('✅ Record deleted successfully');
        fetchAttendance();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete record');
    } finally {
      setDeleteConfirm(false);
      setRecordToDelete(null);
    }
  };

  // ✏️ Handle update record
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;

    try {
      const updatePayload = {
        status: editing.status,
        lateMinutes: editing.lateMinutes || 0,
        remarks: editing.remarks || '',
        totalHours: editing.totalHours || 0
      };

      if (editing.approvedCheckIn) updatePayload.approvedCheckIn = editing.approvedCheckIn;
      if (editing.approvedCheckOut) updatePayload.approvedCheckOut = editing.approvedCheckOut;

      const { data } = await axiosInstance.put(`/attendance/${editing._id}`, updatePayload);
      
      if (data.success) {
        alert('✅ Record updated successfully');
        setEditing(null);
        fetchAttendance();
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Update failed');
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
      present: 'bg-green-100 text-green-800 border-green-200',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      absent: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
      checkout_pending: 'bg-gray-100 text-gray-800 border-gray-200',
      'Not Checked In': 'bg-gray-100 text-gray-800 border-gray-200',
      'half-day': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
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

  // 🔄 Fetch pending requests on mount
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
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FiUsers className="text-indigo-500 text-sm" />
                Attendance Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Monitor and manage employee attendance records
              </p>
            </div>
            <button
              onClick={fetchAttendance}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Statistics Cards with Colored Icons */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={FiUser} label="Total Records" value={stats.total} sub="All time" iconBg="bg-indigo-500" />
          <KpiCard icon={FiAlertCircle} label="Pending Requests" value={stats.pending} sub="Awaiting approval" iconBg="bg-amber-500" />
          <KpiCard icon={FiCheck} label="Present Today" value={stats.present} sub="Checked in" iconBg="bg-emerald-500" />
          <KpiCard icon={FiClock} label="Late Arrivals" value={stats.late} sub="Today" iconBg="bg-red-500" />
          <KpiCard icon={FiClock} label="Avg Hours" value={`${stats.avgHours}h`} sub="Per day" iconBg="bg-purple-500" />
        </div>

        {/* Pending Requests Section */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FiAlertCircle className="text-amber-500 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Pending Approval Requests</p>
                  <p className="text-xs text-gray-400">{pendingRequests.length} requests</p>
                </div>
              </div>
              <button
                onClick={fetchPendingRequests}
                disabled={loadingRequests}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FiRefreshCw className={`text-xs ${loadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-5">
            {loadingRequests ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="text-gray-400 text-lg" />
                </div>
                <p className="text-gray-700 font-medium">No pending requests</p>
                <p className="text-gray-400 text-sm mt-1">All requests have been processed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                  <tbody className="divide-y divide-gray-100">
                    {pendingRequests.map((request) => {
                      const isCheckin = request.checkInRequest?.approved === false;
                      const requestedTime = isCheckin 
                        ? request.checkInRequest?.requestedAt 
                        : request.checkOutRequest?.requestedAt;
                      
                      return (
                        <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{request.employee?.name}</div>
                            <div className="text-xs text-gray-500">{request.employee?.employeeId}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={isCheckin ? 'info' : 'default'}>
                              {isCheckin ? 'Check-in' : 'Check-out'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{safeDateFormat(requestedTime)}</div>
                            <div className="text-xs text-gray-400">{safeTimeAgo(requestedTime)}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(request.date, { month: 'short', day: 'numeric', year: 'numeric' })}
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
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                              >
                                <FiCheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request, isCheckin ? 'checkin' : 'checkout')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <FiXCircle className="w-3.5 h-3.5" />
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
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiFilter className="w-4 h-4" />
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                <FiDownload className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-100 pt-5 mt-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">All Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="pending">Pending</option>
                    <option value="half-day">Half Day</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <FiCalendar className="text-indigo-500 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Attendance Records</p>
                  <p className="text-xs text-gray-400">{pagination.total} records</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FiCalendar className="text-gray-400 text-lg" />
              </div>
              <p className="text-gray-700 font-medium">No attendance records found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendances.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">{record.employee?.name}</div>
                          <div className="text-xs text-gray-500">{record.employee?.employeeId}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-900">
                          {formatDate(record.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <span className={record.approvedCheckIn ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {safeDateFormat(record.approvedCheckIn) || '-'}
                          </span>
                          {record.checkInRequest?.approved === false && (
                            <button
                              onClick={() => {
                                setSelectedRequest(record);
                                setApprovalData({ type: 'checkin', actualTime: '', remarks: '' });
                                setShowApprovalModal(true);
                              }}
                              className="text-xs text-amber-600 hover:text-amber-700 mt-1 block"
                            >
                              Pending approval
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={record.approvedCheckOut ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {safeDateFormat(record.approvedCheckOut) || '-'}
                          </span>
                          {record.checkOutRequest?.approved === false && (
                            <button
                              onClick={() => {
                                setSelectedRequest(record);
                                setApprovalData({ type: 'checkout', actualTime: '', remarks: '' });
                                setShowApprovalModal(true);
                              }}
                              className="text-xs text-amber-600 hover:text-amber-700 mt-1 block"
                            >
                              Pending approval
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-semibold ${parseFloat(record.totalHours) >= 7 ? 'text-green-600' : 'text-amber-600'}`}>
                            {record.totalHours?.toFixed(1) || 0}h
                          </span>
                          {record.lateMinutes > 0 && (
                            <div className="text-xs text-amber-600">Late: {record.lateMinutes}m</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="relative inline-block" ref={el => actionsRefs.current[record._id] = el}>
                            <button
                              onClick={() => setShowActionsDropdown(showActionsDropdown === record._id ? null : record._id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <FiMoreVertical className="w-4 h-4" />
                            </button>
                            
                            {showActionsDropdown === record._id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1">
                                <button
                                  onClick={() => {
                                    setEditing(record);
                                    setShowActionsDropdown(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <FiEdit3 className="w-4 h-4 text-indigo-500" />
                                  Edit Record
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedEmployee(record.employee);
                                    setShowReportModal(true);
                                    setShowActionsDropdown(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <FiMail className="w-4 h-4 text-emerald-500" />
                                  Send Report
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    handleDeleteClick(record);
                                    setShowActionsDropdown(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                  Delete Record
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page <= 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <FiChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.pages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Next
                        <FiChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Approve {approvalData.type === 'checkin' ? 'Check-in' : 'Check-out'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedRequest.employee?.name} • {formatDate(selectedRequest.date, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjust Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={approvalData.actualTime}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, actualTime: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty to use requested time
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <textarea
                  value={approvalData.remarks}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows="3"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Add any remarks..."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setApprovalData({ type: '', actualTime: '', remarks: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveRequest}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Edit Attendance Record</h3>
              <p className="text-sm text-gray-500 mt-1">
                {editing.employee?.name || 'Unknown Employee'}
              </p>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editing.date ? format(new Date(editing.date), 'yyyy-MM-dd') : ''}
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editing.status || ''}
                    onChange={(e) => setEditing(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="half-day">Half Day</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Late Minutes</label>
                  <input
                    type="number"
                    min="0"
                    value={editing.lateMinutes || 0}
                    onChange={(e) => setEditing(prev => ({ ...prev, lateMinutes: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                <input
                  type="datetime-local"
                  value={formatDateTimeLocal(editing.approvedCheckIn)}
                  onChange={(e) => setEditing(prev => ({ ...prev, approvedCheckIn: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                <input
                  type="datetime-local"
                  value={formatDateTimeLocal(editing.approvedCheckOut)}
                  onChange={(e) => setEditing(prev => ({ ...prev, approvedCheckOut: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editing.remarks || ''}
                  onChange={(e) => setEditing(prev => ({ ...prev, remarks: e.target.value }))}
                  rows="3"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Add remarks..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <FiTrash2 className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Attendance Record</h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this attendance record? This action cannot be undone.
              </p>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 mb-5">
                <p className="text-sm font-medium text-gray-800">
                  {recordToDelete.employee?.name || 'Employee'} • {formatDate(recordToDelete.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Check-in: {safeDateFormat(recordToDelete.approvedCheckIn) || 'Not checked in'}
                </p>
                <p className="text-xs text-gray-500">
                  Check-out: {safeDateFormat(recordToDelete.approvedCheckOut) || 'Not checked out'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteConfirm(false);
                    setRecordToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Send Attendance Report</h3>
              <p className="text-sm text-gray-500 mt-1">Send report to {selectedEmployee.name}</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <div className="text-sm text-gray-600">
                  {filters.dateFrom ? formatDate(filters.dateFrom, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Last 2 weeks'} 
                  {' to '}
                  {filters.dateTo ? formatDate(filters.dateTo, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                <div className="text-sm text-gray-600">{selectedEmployee.email}</div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Report feature coming soon');
                  setShowReportModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Send Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start">
              <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;