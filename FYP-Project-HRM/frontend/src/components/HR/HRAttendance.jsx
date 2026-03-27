import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaCalendarDay,
  FaHistory,
  FaUserClock,
  FaExclamationTriangle,
  FaTrash,
  FaEye,
  FaDownload,
  FaFileCsv,
  FaChartLine
} from 'react-icons/fa';

// Add this helper function for time formatting
const formatTime = (timeString) => {
  if (!timeString) return '--:--';
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return '--:--';
    
    // Format to 12-hour with AM/PM
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '--:--';
  }
};

// Add this helper function to get actual time
const getActualTime = (record) => {
  return {
    checkIn: record.approvedCheckIn || record.requestedCheckIn || record.checkIn,
    checkOut: record.approvedCheckOut || record.requestedCheckOut || record.checkOut
  };
};

// Format date consistently
const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const defaultOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch {
    return 'N/A';
  }
};

// Helper function to get time-based status
const getTimeBasedStatus = (checkInTime, checkOutTime = null) => {
  if (!checkInTime) return { status: 'Not Checked In', color: 'gray', message: 'Not checked in yet' };
  
  const checkInDate = new Date(checkInTime);
  const checkInHour = checkInDate.getHours();
  const checkInMinute = checkInDate.getMinutes();
  
  // Convert to total minutes for easier comparison
  const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
  
  // Define thresholds (in minutes from midnight)
  const PRESENT_THRESHOLD = 9 * 60; // 9:00 AM = 540 minutes
  const LATE_THRESHOLD = 9 * 60 + 30; // 9:30 AM = 570 minutes
  
  if (checkOutTime) {
    const checkOutDate = new Date(checkOutTime);
    const checkOutHour = checkOutDate.getHours();
    const checkOutMinute = checkOutDate.getMinutes();
    const checkOutTotalMinutes = checkOutHour * 60 + checkOutMinute;
    
    const ON_TIME_THRESHOLD = 17 * 60; // 5:00 PM = 1020 minutes
    const EARLY_THRESHOLD = 17 * 60 - 30; // 4:30 PM = 990 minutes
    
    // Check in status
    let checkInStatus = '';
    let checkInColor = '';
    
    if (checkInTotalMinutes < PRESENT_THRESHOLD) {
      checkInStatus = 'Present';
      checkInColor = 'green';
    } else if (checkInTotalMinutes < LATE_THRESHOLD) {
      checkInStatus = 'Late';
      checkInColor = 'orange';
    } else {
      checkInStatus = 'Very Late';
      checkInColor = 'red';
    }
    
    // Check out status
    let checkOutStatus = '';
    let checkOutColor = '';
    
    if (checkOutTotalMinutes >= ON_TIME_THRESHOLD) {
      checkOutStatus = 'On Time';
      checkOutColor = 'green';
    } else if (checkOutTotalMinutes >= EARLY_THRESHOLD) {
      checkOutStatus = 'Early Leave';
      checkOutColor = 'yellow';
    } else {
      checkOutStatus = 'Very Early';
      checkOutColor = 'red';
    }
    
    // Calculate total hours worked
    const totalHours = (checkOutTotalMinutes - checkInTotalMinutes) / 60;
    
    return {
      status: checkInStatus,
      checkOutStatus: checkOutStatus,
      color: checkInColor,
      checkOutColor: checkOutColor,
      message: `${checkInStatus} (Checked in at ${formatTime(checkInTime)}) - ${checkOutStatus} (Checked out at ${formatTime(checkOutTime)})`,
      totalHours: totalHours
    };
  } else {
    // Only check-in available
    let status = '';
    let color = '';
    let message = '';
    
    if (checkInTotalMinutes < PRESENT_THRESHOLD) {
      status = 'Present';
      color = 'green';
      message = `Present (Checked in early at ${formatTime(checkInTime)})`;
    } else if (checkInTotalMinutes < LATE_THRESHOLD) {
      status = 'Late';
      color = 'orange';
      message = `Late (Checked in at ${formatTime(checkInTime)})`;
    } else {
      status = 'Very Late';
      color = 'red';
      message = `Very Late (Checked in at ${formatTime(checkInTime)})`;
    }
    
    return {
      status: status,
      color: color,
      message: message,
      checkInTime: formatTime(checkInTime)
    };
  }
};

// Add this helper function to get current time status
const getCurrentTimeStatus = (todayAttendance) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  // Work hours: 9 AM to 5 PM
  const WORK_START = 9 * 60; // 9:00 AM
  const WORK_END = 17 * 60; // 5:00 PM
  const LATE_THRESHOLD = WORK_START + 30; // 9:30 AM
  
  if (!todayAttendance?.approvedCheckIn) {
    // Not checked in yet
    if (currentTotalMinutes < WORK_START) {
      return {
        message: `Expected check-in: 9:00 AM (in ${WORK_START - currentTotalMinutes} minutes)`,
        color: 'blue',
        icon: '⏰'
      };
    } else if (currentTotalMinutes < LATE_THRESHOLD) {
      return {
        message: `You're late! Expected check-in was 9:00 AM`,
        color: 'orange',
        icon: '⚠️'
      };
    } else {
      return {
        message: `You're very late! Expected check-in was 9:00 AM`,
        color: 'red',
        icon: '🚨'
      };
    }
  } else if (!todayAttendance?.approvedCheckOut) {
    // Checked in but not checked out
    const checkInTime = new Date(todayAttendance.approvedCheckIn || todayAttendance.requestedCheckIn);
    const checkInHour = checkInTime.getHours();
    const checkInMinute = checkInTime.getMinutes();
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
    
    let checkInStatus = '';
    if (checkInTotalMinutes < WORK_START) {
      checkInStatus = 'Present';
    } else if (checkInTotalMinutes < LATE_THRESHOLD) {
      checkInStatus = 'Late';
    } else {
      checkInStatus = 'Very Late';
    }
    
    // Calculate expected check-out time (8 hours after check-in)
    const expectedCheckOutMinutes = checkInTotalMinutes + 8 * 60;
    const remainingMinutes = expectedCheckOutMinutes - currentTotalMinutes;
    
    if (remainingMinutes > 0) {
      return {
        message: `${checkInStatus} - Expected check-out: ${Math.floor(expectedCheckOutMinutes / 60)}:${(expectedCheckOutMinutes % 60).toString().padStart(2, '0')} (in ${remainingMinutes} minutes)`,
        color: 'green',
        icon: '⏳'
      };
    } else {
      return {
        message: `${checkInStatus} - Overdue for check-out by ${Math.abs(remainingMinutes)} minutes`,
        color: 'yellow',
        icon: '⚠️'
      };
    }
  } else {
    // Already checked out
    const timeStatus = getTimeBasedStatus(
      todayAttendance.approvedCheckIn, 
      todayAttendance.approvedCheckOut
    );
    
    return {
      message: timeStatus.message,
      color: timeStatus.color,
      icon: '✅'
    };
  }
};

// CSV Export Modal Component
const CSVExportModal = ({ isOpen, onClose, onExport, loading }) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [includeAll, setIncludeAll] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-4">
            <FaFileCsv className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Export Attendance Data</h3>
            <p className="text-gray-600 text-sm">Download your attendance records as CSV</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(e) => setIncludeAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-gray-700 font-medium">Export all records</span>
            </label>
            
            {!includeAll && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                    max={dateRange.endDate}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                    min={dateRange.startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-400 p-4 rounded-lg">
            <div className="flex">
              <FaFileCsv className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">How to Download:</p>
                <ul className="text-xs text-green-700 mt-1 space-y-1">
                  <li>1. Click "Export CSV" to start download</li>
                  <li>2. Check your browser's downloads folder</li>
                  <li>3. The file will be named: <code className="bg-green-200 px-1 rounded">attendance_YYYY-MM-DD.csv</code></li>
                  <li>4. Open with Excel, Google Sheets, or any spreadsheet software</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={() => onExport(dateRange, includeAll)}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <FaDownload className="mr-2" />
                  Export CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, record, deleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mr-4">
            <FaExclamationTriangle className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Delete Attendance Record</h3>
            <p className="text-gray-600 text-sm">This action cannot be undone</p>
          </div>
        </div>

        {record && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg mb-6 border border-red-100">
            <p className="font-medium text-gray-900">
              {formatDate(record.date, { weekday: 'short' })}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <span className="text-gray-500">Check In:</span>
                <span className="ml-2 font-medium">
                  {formatTime(getActualTime(record).checkIn)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Check Out:</span>
                <span className="ml-2 font-medium">
                  {formatTime(getActualTime(record).checkOut)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-2 font-medium">{record.status || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Hours:</span>
                <span className="ml-2 font-medium">{record.totalHours?.toFixed(1) || '0.0'}h</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong className="font-bold">Warning:</strong> Deleting this record will permanently remove it from the system. 
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-colors flex items-center disabled:opacity-50"
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <FaTrash className="mr-2" />
                Delete Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Record Details Modal Component
const RecordDetailsModal = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  const times = getActualTime(record);
  const employee = record.employee || {};
  const timeStatus = getTimeBasedStatus(times.checkIn, times.checkOut);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Attendance Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Time-based Status Banner */}
          <div className={`mb-6 p-4 rounded-xl border ${
            timeStatus.color === 'green' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' :
            timeStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200' :
            timeStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200' :
            timeStatus.color === 'red' ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200' :
            'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                timeStatus.color === 'green' ? 'bg-green-100' :
                timeStatus.color === 'orange' ? 'bg-orange-100' :
                timeStatus.color === 'yellow' ? 'bg-yellow-100' :
                timeStatus.color === 'red' ? 'bg-red-100' :
                'bg-gray-100'
              }`}>
                {timeStatus.color === 'green' ? '✅' :
                 timeStatus.color === 'orange' ? '⚠️' :
                 timeStatus.color === 'yellow' ? '⏰' :
                 timeStatus.color === 'red' ? '🚨' : '⏳'}
              </div>
              <div>
                <p className="font-bold text-gray-800">Time-based Status</p>
                <p className="text-sm text-gray-600">{timeStatus.message}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-3">Employee Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-blue-600">Name:</span>
                  <p className="font-medium">{employee.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-blue-600">Employee ID:</span>
                  <p className="font-medium">{employee.employeeId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-blue-600">Department:</span>
                  <p className="font-medium">{employee.department || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-blue-600">Email:</span>
                  <p className="font-medium">{employee.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <h4 className="font-bold text-green-800 mb-3">Attendance Summary</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-green-600">Date:</span>
                  <p className="font-medium">
                    {formatDate(record.date, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-green-600">Status:</span>
                  <span className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'present' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                    record.status === 'late' ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300' :
                    record.status === 'half-day' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                    record.status === 'absent' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                    'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                  }`}>
                    {record.status || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-green-600">Total Hours:</span>
                  <p className="font-medium">{record.totalHours?.toFixed(2) || '0.00'} hours</p>
                </div>
                <div>
                  <span className="text-sm text-green-600">Late Minutes:</span>
                  <p className="font-medium">{record.lateMinutes || 0} minutes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <FaClock className="mr-2 text-blue-600" />
                Check In Details
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Time:</span>
                  <span className="font-medium text-blue-700">{formatTime(record.approvedCheckIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested Time:</span>
                  <span className="font-medium text-blue-700">{formatTime(record.requestedCheckIn)}</span>
                </div>
                {record.checkInRequest && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Request Status:</span>
                      <span className={`font-medium ${record.checkInRequest.approved === false ? 'text-yellow-600' : 'text-green-600'}`}>
                        {record.checkInRequest.approved === false ? 'Pending' : 'Approved'}
                      </span>
                    </div>
                    {record.checkInRequest.remarks && (
                      <div>
                        <span className="text-gray-600">Remarks:</span>
                        <p className="font-medium text-sm mt-1 text-blue-700">{record.checkInRequest.remarks}</p>
                      </div>
                    )}
                  </>
                )}
                {/* Time-based check-in status */}
                {times.checkIn && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Check-in Status:</span>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                      timeStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                      timeStatus.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {timeStatus.status}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {timeStatus.status === 'Present' ? '✓ Before 9:00 AM' :
                       timeStatus.status === 'Late' ? '⚠ Between 9:00-9:30 AM' :
                       '✗ After 9:30 AM'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <FaClock className="mr-2 text-red-600" />
                Check Out Details
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Time:</span>
                  <span className="font-medium text-red-700">{formatTime(record.approvedCheckOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested Time:</span>
                  <span className="font-medium text-red-700">{formatTime(record.requestedCheckOut)}</span>
                </div>
                {record.checkOutRequest && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Request Status:</span>
                      <span className={`font-medium ${record.checkOutRequest.approved === false ? 'text-yellow-600' : 'text-green-600'}`}>
                        {record.checkOutRequest.approved === false ? 'Pending' : 'Approved'}
                      </span>
                    </div>
                    {record.checkOutRequest.remarks && (
                      <div>
                        <span className="text-gray-600">Remarks:</span>
                        <p className="font-medium text-sm mt-1 text-red-700">{record.checkOutRequest.remarks}</p>
                      </div>
                    )}
                  </>
                )}
                {/* Time-based check-out status */}
                {times.checkOut && timeStatus.checkOutStatus && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Check-out Status:</span>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                      timeStatus.checkOutColor === 'green' ? 'bg-green-100 text-green-800' :
                      timeStatus.checkOutColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {timeStatus.checkOutStatus}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {timeStatus.checkOutStatus === 'On Time' ? '✓ After 5:00 PM' :
                       timeStatus.checkOutStatus === 'Early Leave' ? '⚠ Between 4:30-5:00 PM' :
                       '✗ Before 4:30 PM'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-3">System Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Record ID:</span>
                <p className="font-medium font-mono text-gray-800">{record._id || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <p className="font-medium text-gray-800">
                  {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <p className="font-medium text-gray-800">
                  {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">IP Address:</span>
                <p className="font-medium text-gray-800">{record.ipAddress || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 HR Attendance Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex items-center justify-center">
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🚨</span>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">HR Attendance Error</h2>
            <p className="text-gray-700 mb-6">Something went wrong loading HR attendance data.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium"
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const HRAttendanceContent = () => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    averageHours: 0
  });

  // Check if check-in/out requests are pending
  const [pendingRequests, setPendingRequests] = useState({
    checkIn: false,
    checkOut: false
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // CSV Export modal state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadHRAttendance();
    // Poll every 30 seconds for updates
    const interval = setInterval(loadHRAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHRAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axiosInstance.get('/attendance/my-attendance');
      
      // Handle different API response structures
      let data = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else if (res.data?.success && Array.isArray(res.data.data)) {
        data = res.data.data;
      }
      
      setHistory(data);
      
      const today = new Date().toDateString();
      const todayRecord = data.find(r => 
        r.date && new Date(r.date).toDateString() === today
      ) || null;
      
      setTodayAttendance(todayRecord);
      
      // Check for pending requests
      if (todayRecord) {
        setPendingRequests({
          checkIn: todayRecord.checkInRequest?.approved === false,
          checkOut: todayRecord.checkOutRequest?.approved === false
        });
      } else {
        setPendingRequests({ checkIn: false, checkOut: false });
      }
      
      // Calculate stats using approved times
      const presentDays = data.filter(r => 
        r.status === 'present' || 
        r.status === 'late' || 
        r.status === 'half-day'
      ).length;
      
      // Calculate total hours using approved check-in/out times
      const totalHours = data.reduce((sum, r) => {
        if (r.approvedCheckIn && r.approvedCheckOut) {
          const diffMs = new Date(r.approvedCheckOut) - new Date(r.approvedCheckIn);
          return sum + (diffMs / (1000 * 60 * 60));
        }
        return sum + (r.totalHours || 0);
      }, 0);
      
      setStats({
        totalDays: data.length,
        presentDays,
        averageHours: data.length > 0 ? totalHours / data.length : 0
      });
    } catch (error) {
      console.error('🚨 HR Attendance load error:', error);
      setError('Failed to load HR attendance data. Please try again.');
      setHistory([]);
      setTodayAttendance(null);
      setPendingRequests({ checkIn: false, checkOut: false });
    } finally {
      setLoading(false);
    }
  };

const handleCheckIn = async () => {
  // First check if already checked in today
  const today = new Date().toDateString();
  const todayRecord = history.find(r => 
    r.date && new Date(r.date).toDateString() === today
  );
  
  if (todayRecord?.approvedCheckIn) {
    alert('❌ You have already checked in today!');
    return;
  }
  
  if (todayRecord?.checkInRequest?.approved === false) {
    alert('⏳ Your check-in request is already pending approval');
    return;
  }

  setLoading(true);
  try {
    await axiosInstance.post("/attendance/checkin");
    setPendingRequests(prev => ({ ...prev, checkIn: true }));
    await loadHRAttendance();
    alert('✅ Check-in request sent successfully! Waiting for approval.');
  } catch (error) {
    console.error('Check-in error:', error.response?.data);
    
    if (error.response?.status === 409) {
      alert('⚠️ You already have a check-in request for today');
    } else {
      alert(error.response?.data?.message || 'Check-in request failed');
    }
  } finally {
    setLoading(false);
  }
};

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await axiosInstance.post("/attendance/checkout");
      setPendingRequests(prev => ({ ...prev, checkOut: true }));
      await loadHRAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Check-out request failed');
    } finally {
      setLoading(false);
    }
  };

  // Export CSV functionality - FIXED VERSION
  const handleExportCSV = async (dateRange, includeAll) => {
    setExporting(true);
    try {
      let url = '/attendance/export/my-csv'; // ✅ Corrected endpoint
      const params = new URLSearchParams();
      
      if (!includeAll) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      
      const fullUrl = url + (params.toString() ? `?${params.toString()}` : '');
      
      const response = await axiosInstance.get(fullUrl, {
        responseType: 'blob',
        headers: {
          'Accept': 'text/csv'
        }
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const filename = includeAll 
        ? `attendance_all_${new Date().toISOString().split('T')[0]}.csv`
        : `attendance_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(downloadUrl);
      setCsvModalOpen(false);
      
    } catch (error) {
      console.error('Export error:', error);
      
      if (error.response) {
        if (error.response.status === 404) {
          alert('No attendance data found for the selected period.');
        } else {
          alert(`Export failed: ${error.response.data.message || 'Server error'}`);
        }
      } else if (error.request) {
        alert('Export failed: No response from server. Please check your connection.');
      } else {
        alert(`Export failed: ${error.message}`);
      }
    } finally {
      setExporting(false);
    }
  };

  // Delete attendance record
  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    
    setDeleting(true);
    try {
      await axiosInstance.delete(`/attendance/${recordToDelete._id}`);
      
      setHistory(prev => prev.filter(record => record._id !== recordToDelete._id));
      
      const today = new Date().toDateString();
      if (recordToDelete.date && new Date(recordToDelete.date).toDateString() === today) {
        setTodayAttendance(null);
        setPendingRequests({ checkIn: false, checkOut: false });
      }
      
      setStats(prev => ({
        totalDays: prev.totalDays - 1,
        presentDays: recordToDelete.status === 'present' || recordToDelete.status === 'late' || recordToDelete.status === 'half-day' 
          ? prev.presentDays - 1 
          : prev.presentDays,
        averageHours: prev.totalDays > 1 ? (prev.averageHours * prev.totalDays - (recordToDelete.totalHours || 0)) / (prev.totalDays - 1) : 0
      }));
      
      setDeleteModalOpen(false);
      setRecordToDelete(null);
      
      alert('Attendance record deleted successfully');
      
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.message || 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (record) => {
    setRecordToDelete(record);
    setDeleteModalOpen(true);
  };

  // Open details modal
  const openDetailsModal = (record) => {
    setSelectedRecord(record);
    setDetailsModalOpen(true);
  };

  // Get today's time display
  const getTodayDisplayTimes = () => {
    if (!todayAttendance) return { checkIn: '--:--', checkOut: '--:--' };
    
    const times = getActualTime(todayAttendance);
    
    return {
      checkIn: formatTime(times.checkIn),
      checkOut: formatTime(times.checkOut)
    };
  };

  // Determine today's status
  const getTodayStatus = () => {
    if (!todayAttendance) return { status: 'Not Checked In', color: 'bg-gradient-to-r from-gray-400 to-gray-500' };
    
    const { approvedCheckIn, approvedCheckOut, status, checkInRequest, checkOutRequest } = todayAttendance;
    
    if (checkInRequest?.approved === false) {
      return { status: 'Pending Approval (Check-in)', color: 'bg-gradient-to-r from-yellow-400 to-yellow-500' };
    }
    
    if (checkOutRequest?.approved === false) {
      return { status: 'Pending Approval (Check-out)', color: 'bg-gradient-to-r from-yellow-400 to-yellow-500' };
    }
    
    if (approvedCheckIn && approvedCheckOut) {
      return { status: 'Complete', color: 'bg-gradient-to-r from-green-400 to-green-500' };
    }
    
    if (approvedCheckIn && !approvedCheckOut) {
      return { status: 'Checked In', color: 'bg-gradient-to-r from-blue-400 to-blue-500' };
    }
    
    switch (status) {
      case 'present': return { status: 'Present', color: 'bg-gradient-to-r from-green-400 to-green-500' };
      case 'late': return { status: 'Late', color: 'bg-gradient-to-r from-orange-400 to-orange-500' };
      case 'half-day': return { status: 'Half Day', color: 'bg-gradient-to-r from-yellow-400 to-yellow-500' };
      case 'absent': return { status: 'Absent', color: 'bg-gradient-to-r from-red-400 to-red-500' };
      case 'pending': return { status: 'Pending', color: 'bg-gradient-to-r from-yellow-400 to-yellow-500' };
      default: return { status: 'Not Checked In', color: 'bg-gradient-to-r from-gray-400 to-gray-500' };
    }
  };

  // Determine if check-in/check-out buttons should be shown
  const canCheckIn = !todayAttendance?.approvedCheckIn && !pendingRequests.checkIn;
  const canCheckOut = todayAttendance?.approvedCheckIn && 
                     !todayAttendance?.approvedCheckOut && 
                     !pendingRequests.checkOut;

  // Get current time status
  const currentTimeStatus = getCurrentTimeStatus(todayAttendance);

  if (loading && history.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-blue-700 font-medium">Loading HR Attendance...</p>
        </div>
      </div>
    );
  }

  const displayTimes = getTodayDisplayTimes();
  const todayStatus = getTodayStatus();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">HR Attendance</h1>
        <p className="text-gray-600">Track your daily attendance and work hours</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-center">
            <FaTimesCircle className="text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
          <button 
            onClick={loadHRAttendance} 
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Current Time Status Banner */}
      <div className={`mb-6 p-4 rounded-xl border ${
        currentTimeStatus.color === 'green' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' :
        currentTimeStatus.color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' :
        currentTimeStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200' :
        currentTimeStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200' :
        'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
              currentTimeStatus.color === 'green' ? 'bg-green-100' :
              currentTimeStatus.color === 'blue' ? 'bg-blue-100' :
              currentTimeStatus.color === 'orange' ? 'bg-orange-100' :
              currentTimeStatus.color === 'yellow' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <span className="text-lg">{currentTimeStatus.icon}</span>
            </div>
            <div>
              <p className="font-bold text-gray-800">Current Status</p>
              <p className="text-gray-600">{currentTimeStatus.message}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">Standard Hours</p>
            <p className="font-bold text-gray-800">9:00 AM - 5:00 PM</p>
          </div>
        </div>
        
        {/* Time Guidelines */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="font-bold text-green-700">Present</p>
            <p className="text-green-600">Before 9:00 AM</p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <p className="font-bold text-orange-700">Late</p>
            <p className="text-orange-600">9:00 - 9:30 AM</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <p className="font-bold text-red-700">Very Late</p>
            <p className="text-red-600">After 9:30 AM</p>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <p className="font-bold text-yellow-700">Early Leave</p>
            <p className="text-yellow-600">Before 5:00 PM</p>
          </div>
        </div>
      </div>

      {/* Pending Requests Alert */}
      {(pendingRequests.checkIn || pendingRequests.checkOut) && (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-yellow-500 mr-3" />
            <div>
              <p className="text-yellow-700 font-medium">
                Pending Approval
              </p>
              <p className="text-yellow-600 text-sm mt-1">
                {pendingRequests.checkIn && "Your check-in request is pending admin approval. "}
                {pendingRequests.checkOut && "Your check-out request is pending admin approval."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Bright Colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-bold mb-1">Total Days</p>
              <p className="text-4xl font-extrabold text-blue-900 drop-shadow-sm">{stats.totalDays}</p>
              <p className="text-xs text-blue-600 mt-1">Attendance records count</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <FaCalendarDay className="text-white text-2xl" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-bold mb-1">Present Days</p>
              <p className="text-4xl font-extrabold text-green-900 drop-shadow-sm">{stats.presentDays}</p>
              <p className="text-xs text-green-600 mt-1">Days marked as present</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <FaUserClock className="text-white text-2xl" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-100 to-purple-200 border-2 border-purple-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-bold mb-1">Avg. Hours/Day</p>
              <p className="text-4xl font-extrabold text-purple-900 drop-shadow-sm">{stats.averageHours.toFixed(1)}h</p>
              <p className="text-xs text-purple-600 mt-1">Average daily work hours</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <FaClock className="text-white text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <FaCalendarDay className="inline mr-3 text-blue-200" />
              Today: {formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            
            <div className="flex flex-wrap items-center gap-6 mt-4">
              <div>
                <p className="text-sm text-blue-200 font-medium">Check In</p>
                <p className="text-xl font-bold">
                  {displayTimes.checkIn}
                </p>
                {pendingRequests.checkIn && (
                  <p className="text-xs text-yellow-300 mt-1">(Pending Approval)</p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-blue-200 font-medium">Check Out</p>
                <p className="text-xl font-bold">
                  {displayTimes.checkOut}
                </p>
                {pendingRequests.checkOut && (
                  <p className="text-xs text-yellow-300 mt-1">(Pending Approval)</p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-blue-200 font-medium">Status</p>
                <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${todayStatus.color} shadow-md`}>
                  {todayStatus.status}
                </span>
              </div>
              
              {/* Show total hours if completed */}
              {todayAttendance?.approvedCheckIn && todayAttendance?.approvedCheckOut && (
                <div>
                  <p className="text-sm text-blue-200 font-medium">Total Hours</p>
                  <p className="text-xl font-bold">
                    {todayAttendance.totalHours?.toFixed(1) || 0}h
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            {canCheckIn && !loading && (
              <button 
                onClick={handleCheckIn}
                disabled={loading}
                className="flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                <FaCheckCircle className="mr-2" />
                Check In Now
              </button>
            )}

            {pendingRequests.checkIn && (
              <div className="bg-gradient-to-r from-yellow-400/30 to-yellow-500/30 border border-yellow-400/50 rounded-xl p-4">
                <div className="flex items-center">
                  <FaClock className="text-yellow-300 mr-2" />
                  <p className="font-bold text-yellow-100">Check-in Pending</p>
                </div>
                <p className="text-sm mt-1 text-yellow-200">
                  Waiting for admin approval
                </p>
              </div>
            )}

            {canCheckOut && !loading && (
              <button 
                onClick={handleCheckOut}
                disabled={loading}
                className="flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                <FaTimesCircle className="mr-2" />
                Check Out Now
              </button>
            )}

            {pendingRequests.checkOut && (
              <div className="bg-gradient-to-r from-yellow-400/30 to-yellow-500/30 border border-yellow-400/50 rounded-xl p-4">
                <div className="flex items-center">
                  <FaClock className="text-yellow-300 mr-2" />
                  <p className="font-bold text-yellow-100">Check-out Pending</p>
                </div>
                <p className="text-sm mt-1 text-yellow-200">
                  Waiting for admin approval
                </p>
              </div>
            )}

            {todayAttendance?.approvedCheckIn && todayAttendance?.approvedCheckOut && (
              <div className="bg-gradient-to-r from-green-400/30 to-green-500/30 border border-green-400/50 rounded-xl p-4">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-300 mr-2" />
                  <p className="font-bold text-green-100">Today Complete!</p>
                </div>
                <p className="text-sm mt-1 text-green-200">
                  Worked: {todayAttendance.totalHours?.toFixed(1) || 0} hours
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance History with Export Button */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                <FaHistory className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Attendance History</h2>
                <p className="text-gray-600">Your complete attendance timeline</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setCsvModalOpen(true)}
                className="flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-4 py-2 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FaDownload className="mr-2" />
                Export CSV
              </button>
              <button 
                onClick={loadHRAttendance}
                disabled={loading}
                className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-4 py-2 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaChartLine className="mr-2" />
                    Refresh Data
                  </>
                )}
              </button>
            </div>
          </div>
          
          {history.length === 0 && !loading && (
            <div className="mt-4 p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaHistory className="text-blue-500 text-3xl" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No attendance records found</p>
              <p className="text-gray-400 text-sm mt-1">Start by checking in today!</p>
            </div>
          )}
        </div>
        
        {history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Hours</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((record, index) => {
                  const times = getActualTime(record);
                  const isPending = 
                    record.checkInRequest?.approved === false || 
                    record.checkOutRequest?.approved === false;
                  const timeStatus = getTimeBasedStatus(times.checkIn, times.checkOut);
                  
                  return (
                    <tr 
                      key={record._id || index} 
                      className={`hover:bg-gradient-to-r ${isPending ? 'from-yellow-50 to-yellow-100' : 'from-blue-50 to-blue-100'} transition-all duration-200`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {formatDate(record.date, { weekday: 'short' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {times.checkIn ? formatTime(times.checkIn) : '--:--'}
                          {record.checkInRequest?.approved === false && (
                            <span className="ml-2 text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">(Pending)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {times.checkOut ? formatTime(times.checkOut) : '--:--'}
                          {record.checkOutRequest?.approved === false && (
                            <span className="ml-2 text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">(Pending)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 bg-gradient-to-r from-green-100 to-green-200 px-3 py-1 rounded-full inline-block">
                          {record.totalHours?.toFixed(1) || '0.0'}h
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                          record.status === 'present' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                          record.status === 'late' ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300' :
                          record.status === 'half-day' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                          record.status === 'absent' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                        }`}>
                          {record.status === 'present' ? 'Present' :
                           record.status === 'late' ? 'Late' :
                           record.status === 'half-day' ? 'Half Day' :
                           record.status === 'absent' ? 'Absent' :
                           'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {times.checkIn ? (
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold mb-1 ${
                              timeStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                              timeStatus.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {timeStatus.status}
                            </span>
                            {times.checkOut && timeStatus.checkOutStatus && (
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                timeStatus.checkOutColor === 'green' ? 'bg-green-100 text-green-800' :
                                timeStatus.checkOutColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {timeStatus.checkOutStatus}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No check-in</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => openDetailsModal(record)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-200 transition-all duration-200"
                            title="View Details"
                          >
                            <FaEye size={18} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(record)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-gradient-to-r hover:from-red-100 hover:to-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Record"
                            disabled={deleting}
                          >
                            <FaTrash size={18} />
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

      {/* CSV Export Modal */}
      <CSVExportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onExport={handleExportCSV}
        loading={exporting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={handleDeleteRecord}
        record={recordToDelete}
        deleting={deleting}
      />

      {/* Record Details Modal */}
      <RecordDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
      />
    </div>
  );
};

// Wrap with Error Boundary
const HRAttendance = () => (
  <ErrorBoundary>
    <HRAttendanceContent />
  </ErrorBoundary>
);

export default HRAttendance;