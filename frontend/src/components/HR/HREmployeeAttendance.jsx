import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  FaSpinner, FaUserClock, FaCalendarDay, FaClock,
  FaEye, FaDownload, FaFileCsv, FaChartLine,
  FaChevronDown, FaChevronUp, FaTimesCircle, FaSearch,
  FaUser, FaBuilding, FaEnvelope
} from 'react-icons/fa';

const HREmployeeAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [filteredRecords, setFilteredRecords] = useState([]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      let params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '1000'); // Get all records for HR view
      
      if (dateFilter.start) params.append('dateFrom', dateFilter.start);
      if (dateFilter.end) params.append('dateTo', dateFilter.end);
      
      // Use the correct endpoint - this gets all attendance with pagination
      const response = await axiosInstance.get(`/attendance?${params.toString()}`);
      
      let data = [];
      if (response.data?.data) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      
      setAttendanceRecords(data);
      setFilteredRecords(data);
      
      // Calculate stats
      const present = data.filter(r => r.status === 'present').length;
      const absent = data.filter(r => r.status === 'absent').length;
      const late = data.filter(r => r.status === 'late').length;
      setStats({ 
        total: data.length, 
        present, 
        absent, 
        late,
        onTime: data.filter(r => r.status === 'present' && r.lateMinutes === 0).length
      });
      
    } catch (err) {
      console.error('Error loading attendance:', err);
      if (err.response?.status === 404) {
        setError('No attendance records found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view all attendance records');
      } else {
        setError('Failed to load attendance data. Please try again.');
      }
      setAttendanceRecords([]);
      setFilteredRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  // Filter records based on search
  useEffect(() => {
    if (!searchTerm.trim() && !dateFilter.start && !dateFilter.end) {
      setFilteredRecords(attendanceRecords);
      return;
    }

    const filtered = attendanceRecords.filter(record => {
      let matches = true;
      
      // Search by employee name or ID
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase().trim();
        const employeeName = (record.employee?.name || '').toLowerCase();
        const employeeId = (record.employee?.employeeId || '').toLowerCase();
        matches = matches && (employeeName.includes(search) || employeeId.includes(search));
      }
      
      // Date filter
      if (dateFilter.start && record.date) {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        if (recordDate < dateFilter.start) matches = false;
      }
      if (dateFilter.end && record.date) {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        if (recordDate > dateFilter.end) matches = false;
      }
      
      return matches;
    });
    
    setFilteredRecords(filtered);
  }, [searchTerm, dateFilter, attendanceRecords]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: 'bg-green-100 text-green-700',
      late: 'bg-orange-100 text-orange-700',
      absent: 'bg-red-100 text-red-700',
      'half-day': 'bg-yellow-100 text-yellow-700',
      'checkin_pending': 'bg-blue-100 text-blue-700',
      'checkout_pending': 'bg-purple-100 text-purple-700',
      pending: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      present: 'Present',
      late: 'Late',
      absent: 'Absent',
      'half-day': 'Half Day',
      'checkin_pending': 'Check-in Pending',
      'checkout_pending': 'Check-out Pending',
      pending: 'Pending'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status || 'Pending'}
      </span>
    );
  };

  const displayedRecords = showAll ? filteredRecords : filteredRecords.slice(0, 10);

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaUserClock className="text-indigo-600" />
            Employee Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all employee attendance records</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-green-100">
            <p className="text-sm text-gray-500">Present</p>
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-red-100">
            <p className="text-sm text-gray-500">Absent</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-orange-100">
            <p className="text-sm text-gray-500">Late</p>
            <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-emerald-100">
            <p className="text-sm text-gray-500">On Time</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.onTime || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Start Date"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="End Date"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button 
              onClick={() => {
                setSearchTerm('');
                setDateFilter({ start: '', end: '' });
              }}
              className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
            <button 
              onClick={loadAttendance}
              disabled={loading}
              className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin inline" /> : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <FaTimesCircle className="text-red-500" />
            <span className="text-red-700 text-sm flex-1">{error}</span>
            <button onClick={loadAttendance} className="text-xs text-red-600 underline">Retry</button>
          </div>
        )}

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">All Attendance Records</p>
              <p className="text-xs text-gray-400">{filteredRecords.length} records found</p>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="py-16 text-center">
              <FaUserClock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No attendance records found</p>
              {searchTerm && <p className="text-sm text-gray-400 mt-1">Try adjusting your search filters</p>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Check In</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Check Out</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Late</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayedRecords.map((record, index) => (
                      <tr key={record._id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{record.employee?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{record.employee?.employeeId || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.employee?.department || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(record.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatTime(record.approvedCheckIn || record.requestedCheckIn)}
                          {record.checkInRequest?.approved === false && 
                            <span className="ml-1 text-xs text-yellow-600">(pending)</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatTime(record.approvedCheckOut || record.requestedCheckOut)}
                          {record.checkOutRequest?.approved === false && 
                            <span className="ml-1 text-xs text-yellow-600">(pending)</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{record.totalHours?.toFixed(1) || '0.0'}h</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.lateMinutes > 0 ? `${record.lateMinutes} min` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(record.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRecords.length > 10 && (
                <button 
                  onClick={() => setShowAll(!showAll)}
                  className="w-full py-3 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 border-t border-gray-100 bg-gray-50"
                >
                  {showAll ? 'Show Less' : `Show All (${filteredRecords.length})`}
                  {showAll ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HREmployeeAttendance;