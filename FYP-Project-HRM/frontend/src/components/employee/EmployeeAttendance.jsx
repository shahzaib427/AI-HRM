import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  FaCheckCircle, FaTimesCircle, FaClock, FaCalendarDay,
  FaHistory, FaUserClock, FaExclamationTriangle,
  FaEye, FaDownload, FaFileCsv, FaChartLine, FaUser, FaTrash
} from 'react-icons/fa';

// ─── Helper logic ────────────────────────────────────────────────────────────

const formatTime = (timeString) => {
  if (!timeString) return '--:--';
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return '--:--'; }
};

const getActualTime = (record) => ({
  checkIn:  record.approvedCheckIn  || record.requestedCheckIn  || record.checkIn,
  checkOut: record.approvedCheckOut || record.requestedCheckOut || record.checkOut,
});

const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...options });
  } catch { return 'N/A'; }
};

const getTimeBasedStatus = (checkInTime, checkOutTime = null) => {
  if (!checkInTime) return { status: 'Not Checked In', color: 'gray', message: 'Not checked in yet' };
  const checkInDate = new Date(checkInTime);
  const checkInTotalMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  const PRESENT_THRESHOLD = 9 * 60;
  const LATE_THRESHOLD    = 9 * 60 + 30;

  if (checkOutTime) {
    const checkOutDate = new Date(checkOutTime);
    const checkOutTotalMinutes = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();
    const ON_TIME_THRESHOLD = 17 * 60;
    const EARLY_THRESHOLD   = 17 * 60 - 30;
    const checkInStatus = checkInTotalMinutes < PRESENT_THRESHOLD ? 'Present' : checkInTotalMinutes < LATE_THRESHOLD ? 'Late' : 'Very Late';
    const checkInColor  = checkInTotalMinutes < PRESENT_THRESHOLD ? 'green'   : checkInTotalMinutes < LATE_THRESHOLD ? 'orange' : 'red';
    const checkOutStatus = checkOutTotalMinutes >= ON_TIME_THRESHOLD ? 'On Time' : checkOutTotalMinutes >= EARLY_THRESHOLD ? 'Early Leave' : 'Very Early';
    const checkOutColor  = checkOutTotalMinutes >= ON_TIME_THRESHOLD ? 'green'   : checkOutTotalMinutes >= EARLY_THRESHOLD ? 'yellow'      : 'red';
    return {
      status: checkInStatus, color: checkInColor, checkOutStatus, checkOutColor,
      message: `${checkInStatus} (${formatTime(checkInTime)}) · ${checkOutStatus} (${formatTime(checkOutTime)})`,
      totalHours: (checkOutTotalMinutes - checkInTotalMinutes) / 60,
    };
  }
  const status  = checkInTotalMinutes < PRESENT_THRESHOLD ? 'Present' : checkInTotalMinutes < LATE_THRESHOLD ? 'Late' : 'Very Late';
  const color   = checkInTotalMinutes < PRESENT_THRESHOLD ? 'green'   : checkInTotalMinutes < LATE_THRESHOLD ? 'orange' : 'red';
  return { status, color, message: `${status} (checked in at ${formatTime(checkInTime)})`, checkInTime: formatTime(checkInTime) };
};

const getCurrentTimeStatus = (todayAttendance) => {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const WORK_START     = 9 * 60;
  const LATE_THRESHOLD = 9 * 60 + 30;

  if (!todayAttendance?.approvedCheckIn) {
    if (currentTotalMinutes < WORK_START) return { message: `Expected check-in at 9:00 AM · in ${WORK_START - currentTotalMinutes} min`, color: 'blue' };
    if (currentTotalMinutes < LATE_THRESHOLD) return { message: `You're late · expected 9:00 AM`, color: 'orange' };
    return { message: `Very late · expected check-in was 9:00 AM`, color: 'red' };
  }
  if (!todayAttendance?.approvedCheckOut) {
    const ci = new Date(todayAttendance.approvedCheckIn || todayAttendance.requestedCheckIn);
    const ciMins = ci.getHours() * 60 + ci.getMinutes();
    const status = ciMins < WORK_START ? 'Present' : ciMins < LATE_THRESHOLD ? 'Late' : 'Very Late';
    const expected = ciMins + 8 * 60;
    const remaining = expected - currentTotalMinutes;
    const hh = String(Math.floor(expected / 60)).padStart(2, '0');
    const mm = String(expected % 60).padStart(2, '0');
    return remaining > 0
      ? { message: `${status} · expected checkout ${hh}:${mm} (${remaining} min remaining)`, color: 'green' }
      : { message: `${status} · overdue checkout by ${Math.abs(remaining)} min`, color: 'yellow' };
  }
  return { ...getTimeBasedStatus(todayAttendance.approvedCheckIn, todayAttendance.approvedCheckOut) };
};

// ─── UI Primitives ────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default:  'bg-slate-100 text-slate-600',
    success:  'bg-emerald-50 text-emerald-700',
    warning:  'bg-amber-50 text-amber-700',
    danger:   'bg-red-50 text-red-700',
    info:     'bg-blue-50 text-blue-700',
    orange:   'bg-orange-50 text-orange-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

const statusVariant = (status) => {
  if (!status) return 'default';
  switch (status.toLowerCase()) {
    case 'present':   return 'success';
    case 'late':      return 'orange';
    case 'half-day':  return 'warning';
    case 'absent':    return 'danger';
    case 'rejected':  return 'danger';
    default:          return 'default';
  }
};

const timeColorVariant = (color) => {
  if (color === 'green')  return 'success';
  if (color === 'orange') return 'orange';
  if (color === 'yellow') return 'warning';
  if (color === 'red')    return 'danger';
  return 'default';
};

const KpiCard = ({ icon: Icon, label, value, sub, iconBg }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="text-white text-sm" />
      </div>
    </div>
  </div>
);

// ─── CSV Export Modal ─────────────────────────────────────────────────────────

const CSVExportModal = ({ isOpen, onClose, onExport, loading }) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  });
  const [includeAll, setIncludeAll] = useState(true);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <FaFileCsv className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Export Attendance</h3>
            <p className="text-xs text-slate-500">Download records as CSV</p>
          </div>
        </div>
        <div className="space-y-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeAll} onChange={e => setIncludeAll(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-slate-700 font-medium">Export all records</span>
          </label>
          {!includeAll && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
              {[['startDate','Start Date',''],[  'endDate','End Date',dateRange.startDate]].map(([field, label, min]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input type="date" value={dateRange[field]} min={min || undefined}
                    onChange={e => setDateRange(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          )}
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700 mb-2">How to download:</p>
            <p>1. Click <em>Export CSV</em> below</p>
            <p>2. Find the file in your downloads folder</p>
            <p>3. Open with Excel or Google Sheets</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => onExport(dateRange, includeAll)} disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaDownload className="text-xs" />}
              {loading ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Record Details Modal ─────────────────────────────────────────────────────

const RecordDetailsModal = ({ isOpen, onClose, record, userRole }) => {
  if (!isOpen || !record) return null;
  const times = getActualTime(record);
  const employee = record.employee || {};
  const timeStatus = getTimeBasedStatus(times.checkIn, times.checkOut);
  const isAdmin = userRole === 'admin' || userRole === 'hr';
  const statusBarColors = {
    green:  'border-emerald-200 bg-emerald-50',
    orange: 'border-orange-200 bg-orange-50',
    yellow: 'border-amber-200 bg-amber-50',
    red:    'border-red-200 bg-red-50',
    gray:   'border-slate-200 bg-slate-50',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Attendance Details</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><span className="text-xl leading-none">×</span></button>
        </div>
        <div className="p-5 space-y-5">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${statusBarColors[timeStatus.color] || statusBarColors.gray}`}>
            <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0">
              <FaClock className={timeStatus.color === 'green' ? 'text-emerald-500' : timeStatus.color === 'orange' ? 'text-orange-500' : 'text-red-500'} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{timeStatus.status}</p>
              <p className="text-xs text-slate-500 mt-0.5">{timeStatus.message}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Employee Info', rows: [['Name', employee.name], ['Employee ID', employee.employeeId], ['Department', employee.department], ['Email', employee.email]] },
              { title: 'Attendance Summary', rows: [['Date', formatDate(record.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })], ['Status', record.status], ['Total Hours', `${record.totalHours?.toFixed(2) || '0.00'} hrs`], ['Late Minutes', `${record.lateMinutes || 0} min`]] }
            ].map(section => (
              <div key={section.title} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{section.title}</p>
                <div className="space-y-2">
                  {section.rows.map(([label, value]) => value && (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-xs font-medium text-slate-800 text-right max-w-[180px] truncate">{value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Check In', accent: 'text-blue-600', border: 'border-blue-100',
                rows: [
                  ['Actual Time', formatTime(record.approvedCheckIn)],
                  ['Requested', formatTime(record.requestedCheckIn)],
                  ['Status', record.checkInRequest?.rejected ? 'Rejected' : record.checkInRequest?.approved === false ? 'Pending' : record.approvedCheckIn ? 'Approved' : '—'],
                  ...(record.checkInRequest?.remarks ? [['Remarks', record.checkInRequest.remarks]] : []),
                ]
              },
              {
                title: 'Check Out', accent: 'text-rose-600', border: 'border-rose-100',
                rows: [
                  ['Actual Time', formatTime(record.approvedCheckOut)],
                  ['Requested', formatTime(record.requestedCheckOut)],
                  ['Status', record.checkOutRequest?.rejected ? 'Rejected' : record.checkOutRequest?.approved === false ? 'Pending' : record.approvedCheckOut ? 'Approved' : '—'],
                  ...(record.checkOutRequest?.remarks ? [['Remarks', record.checkOutRequest.remarks]] : []),
                ]
              }
            ].map(col => (
              <div key={col.title} className={`bg-white rounded-xl border ${col.border} p-4`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${col.accent}`}>{col.title}</p>
                <div className="space-y-2">
                  {col.rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-xs font-medium text-slate-800">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">System Information</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-400">Record ID</span><p className="font-mono text-slate-700 mt-0.5">{record._id || 'N/A'}</p></div>
              <div><span className="text-slate-400">Created</span><p className="text-slate-700 mt-0.5">{record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}</p></div>
              <div><span className="text-slate-400">Updated</span><p className="text-slate-700 mt-0.5">{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'N/A'}</p></div>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-3">
          {isAdmin && (
            <button 
              onClick={() => {
                if (window.confirm('Delete this record?')) {
                  // You'll need to pass delete function as prop
                  onClose();
                }
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
              Delete Record
            </button>
          )}
          <button onClick={onClose} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, record, deleting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
          <FaTrash className="text-red-500" style={{ fontSize: 20 }} />
        </div>
        <h3 className="text-slate-900 font-semibold text-lg mb-1">Delete Attendance Record?</h3>
        <p className="text-slate-500 text-sm mb-6">This action cannot be undone.</p>
        {record && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-slate-800">{formatDate(record.date, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div><span className="text-slate-500">Check In:</span> <span className="font-medium">{formatTime(getActualTime(record).checkIn)}</span></div>
              <div><span className="text-slate-500">Check Out:</span> <span className="font-medium">{formatTime(getActualTime(record).checkOut)}</span></div>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete Record'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, i) { console.error('🚨 Attendance Error:', e, i); }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-500 text-lg" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-500 text-sm mb-5">Failed to load attendance data.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">Reload Page</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ─── Main Content ─────────────────────────────────────────────────────────────

const EmployeeAttendanceContent = () => {
  const [userRole, setUserRole] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory]                 = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [stats, setStats]                     = useState({ totalDays: 0, presentDays: 0, averageHours: 0 });
  const [pendingRequests, setPendingRequests]  = useState({ checkIn: false, checkOut: false });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord]   = useState(null);
  const [csvModalOpen, setCsvModalOpen]       = useState(false);
  const [exporting, setExporting]             = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete]   = useState(null);
  const [deleting, setDeleting]               = useState(false);

  // Get user role on component mount
  useEffect(() => {
    const getUserRole = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role) {
          setUserRole(user.role);
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      }
    };
    getUserRole();
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      setLoading(true); setError('');
      const res = await axiosInstance.get('/attendance/my-attendance');
      let data = [];
      if (Array.isArray(res.data)) data = res.data;
      else if (res.data?.data && Array.isArray(res.data.data)) data = res.data.data;
      else if (res.data?.success && Array.isArray(res.data.data)) data = res.data.data;

      setHistory(data);
      const today = new Date().toDateString();
      const todayRecord = data.find(r => r.date && new Date(r.date).toDateString() === today) || null;
      setTodayAttendance(todayRecord);

      if (todayRecord) {
        const ciPending = todayRecord.checkInRequest?.approved === false && todayRecord.checkInRequest?.rejected !== true;
        const coPending = todayRecord.checkOutRequest?.approved === false && todayRecord.checkOutRequest?.rejected !== true;
        setPendingRequests({ checkIn: ciPending, checkOut: coPending });
      } else {
        setPendingRequests({ checkIn: false, checkOut: false });
      }

      const presentDays = data.filter(r => ['present','late','half-day'].includes(r.status)).length;
      const totalHours = data.reduce((sum, r) => {
        if (r.approvedCheckIn && r.approvedCheckOut) return sum + (new Date(r.approvedCheckOut) - new Date(r.approvedCheckIn)) / 3600000;
        return sum + (r.totalHours || 0);
      }, 0);
      setStats({ totalDays: data.length, presentDays, averageHours: data.length > 0 ? totalHours / data.length : 0 });
    } catch {
      setError('Failed to load attendance data.'); setHistory([]); setTodayAttendance(null);
      setPendingRequests({ checkIn: false, checkOut: false });
    } finally { setLoading(false); }
  };

  const handleCheckIn = async () => {
    const today = new Date().toDateString();
    const rec = history.find(r => r.date && new Date(r.date).toDateString() === today);
    if (rec?.approvedCheckIn) { alert('You have already checked in today!'); return; }
    if (rec?.checkInRequest?.approved === false && rec?.checkInRequest?.rejected !== true) {
      alert('Check-in request is pending approval'); return;
    }
    setLoading(true);
    try {
      await axiosInstance.post('/attendance/checkin');
      setPendingRequests(p => ({ ...p, checkIn: true }));
      await loadAttendance();
      alert('Check-in request sent! Waiting for approval.');
    } catch (err) {
      if (err.response?.status === 409) alert('Check-in request already submitted');
      else alert(err.response?.data?.message || 'Check-in failed');
    } finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    const today = new Date().toDateString();
    const rec = history.find(r => r.date && new Date(r.date).toDateString() === today);
    if (!rec?.approvedCheckIn) {
      alert('Your check-in must be approved first before checking out.'); return;
    }
    if (rec?.approvedCheckOut) {
      alert('You have already checked out today!'); return;
    }
    if (rec?.checkOutRequest?.approved === false && rec?.checkOutRequest?.rejected !== true) {
      alert('Check-out request is already pending approval'); return;
    }
    setLoading(true);
    try {
      await axiosInstance.post('/attendance/checkout');
      setPendingRequests(p => ({ ...p, checkOut: true }));
      await loadAttendance();
      alert('Check-out request sent! Waiting for approval.');
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out failed');
    } finally { setLoading(false); }
  };

  const handleExportCSV = async (dateRange, includeAll) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (!includeAll) { params.append('startDate', dateRange.startDate); params.append('endDate', dateRange.endDate); }
      const fullUrl = '/attendance/export/my-csv' + (params.toString() ? `?${params.toString()}` : '');
      const response = await axiosInstance.get(fullUrl, { responseType: 'blob', headers: { Accept: 'text/csv' } });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', includeAll ? `my_attendance_all_${new Date().toISOString().split('T')[0]}.csv` : `my_attendance_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setCsvModalOpen(false);
    } catch (err) {
      if (err.response?.status === 404) alert('No data found for selected period.');
      else alert(`Export failed: ${err.response?.data?.message || err.message}`);
    } finally { setExporting(false); }
  };

  const handleDeleteRecord = async () => {
    // Only allow if admin/HR
    if (userRole !== 'admin' && userRole !== 'hr') {
      alert('Only administrators can delete attendance records');
      return;
    }
    
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/attendance/${recordToDelete._id}`);
      setHistory(prev => prev.filter(r => r._id !== recordToDelete._id));
      if (recordToDelete.date && new Date(recordToDelete.date).toDateString() === new Date().toDateString()) {
        setTodayAttendance(null);
        setPendingRequests({ checkIn: false, checkOut: false });
      }
      setDeleteModalOpen(false);
      setRecordToDelete(null);
      alert('Attendance record deleted successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete record');
    } finally { setDeleting(false); }
  };

  const openDetailsModal = (record) => { setSelectedRecord(record); setDetailsModalOpen(true); };
  const openDeleteModal = (record) => { 
    // Only allow if admin/HR
    if (userRole !== 'admin' && userRole !== 'hr') {
      alert('Only administrators can delete attendance records');
      return;
    }
    setRecordToDelete(record); 
    setDeleteModalOpen(true); 
  };

  const getTodayDisplayTimes = () => {
    if (!todayAttendance) return { checkIn: '--:--', checkOut: '--:--' };
    const times = getActualTime(todayAttendance);
    return { checkIn: formatTime(times.checkIn), checkOut: formatTime(times.checkOut) };
  };

  const getTodayStatus = () => {
    if (!todayAttendance) return { label: 'Not checked in', variant: 'default' };
    const { approvedCheckIn, approvedCheckOut, status, checkInRequest, checkOutRequest } = todayAttendance;
    if (checkInRequest?.approved === false && checkInRequest?.rejected !== true)  return { label: 'Check-in pending', variant: 'warning' };
    if (checkOutRequest?.approved === false && checkOutRequest?.rejected !== true) return { label: 'Check-out pending', variant: 'warning' };
    if (approvedCheckIn && approvedCheckOut) return { label: 'Complete', variant: 'success' };
    if (approvedCheckIn) return { label: 'Checked in', variant: 'info' };
    switch (status) {
      case 'present':  return { label: 'Present',  variant: 'success' };
      case 'late':     return { label: 'Late',     variant: 'orange' };
      case 'half-day': return { label: 'Half Day', variant: 'warning' };
      case 'absent':   return { label: 'Absent',   variant: 'danger' };
      case 'rejected': return { label: 'Rejected', variant: 'danger' };
      case 'pending':  return { label: 'Pending',  variant: 'warning' };
      default:         return { label: 'Not checked in', variant: 'default' };
    }
  };

  const canCheckIn  = !todayAttendance?.approvedCheckIn && !pendingRequests.checkIn;
  const canCheckOut = !!(todayAttendance?.approvedCheckIn) &&
    !todayAttendance?.approvedCheckOut &&
    !pendingRequests.checkOut;

  const currentTimeStatus = getCurrentTimeStatus(todayAttendance);
  const isAdmin = userRole === 'admin' || userRole === 'hr';

  if (loading && history.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Loading attendance…</p>
      </div>
    </div>
  );

  const displayTimes = getTodayDisplayTimes();
  const todayStatus  = getTodayStatus();

  const statusBannerColors = {
    green:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    red:    'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FaUser className="text-blue-600 text-sm" />
              My Attendance
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">Track your daily attendance and work hours</p>
          </div>
          <div className="text-sm text-slate-500">{formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <FaTimesCircle className="text-red-500 flex-shrink-0" />
            <span className="text-red-700 flex-1">{error}</span>
            <button onClick={loadAttendance} className="text-xs text-red-600 underline hover:text-red-800">Retry</button>
          </div>
        )}

        {/* ── Current Status Banner ── */}
        <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${statusBannerColors[currentTimeStatus.color] || statusBannerColors.blue}`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-current opacity-60 flex-shrink-0" />
            <p className="text-sm font-medium">{currentTimeStatus.message}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs opacity-70">Standard hours</p>
            <p className="text-sm font-semibold">9:00 AM – 5:00 PM</p>
          </div>
        </div>

        {/* ── Pending Requests Alert ── */}
        {(pendingRequests.checkIn || pendingRequests.checkOut) && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <FaExclamationTriangle className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Pending Approval</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {pendingRequests.checkIn && 'Check-in request awaiting admin approval. '}
                {pendingRequests.checkOut && 'Check-out request awaiting admin approval.'}
              </p>
            </div>
          </div>
        )}

        {/* Rejected request alert */}
        {(todayAttendance?.checkInRequest?.rejected === true || todayAttendance?.checkOutRequest?.rejected === true) && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <FaTimesCircle className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Request Rejected</p>
              <p className="text-xs text-red-600 mt-0.5">
                {todayAttendance?.checkInRequest?.rejected && 'Your check-in request was rejected. '}
                {todayAttendance?.checkOutRequest?.rejected && 'Your check-out request was rejected. '}
                You can submit a new request below.
              </p>
            </div>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard icon={FaCalendarDay} label="Total Records"    value={stats.totalDays}                     sub="All time"        iconBg="bg-blue-500" />
          <KpiCard icon={FaUserClock}   label="Present Days"     value={stats.presentDays}                   sub={`${stats.totalDays > 0 ? ((stats.presentDays / stats.totalDays) * 100).toFixed(0) : 0}% attendance`} iconBg="bg-emerald-500" />
          <KpiCard icon={FaClock}       label="Avg. Hours / Day" value={`${stats.averageHours.toFixed(1)}h`} sub="Standard: 8h"    iconBg="bg-violet-500" />
        </div>

        {/* ── Today Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex-1">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Today's Attendance</p>
              <div className="flex flex-wrap items-center gap-6">
                {[['Check In', displayTimes.checkIn, pendingRequests.checkIn], ['Check Out', displayTimes.checkOut, pendingRequests.checkOut]].map(([label, time, pending]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className="text-xl font-semibold text-slate-900">{time}</p>
                    {pending && <p className="text-xs text-amber-500 mt-0.5">Pending approval</p>}
                  </div>
                ))}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <Badge variant={todayStatus.variant}>{todayStatus.label}</Badge>
                </div>
                {todayAttendance?.approvedCheckIn && todayAttendance?.approvedCheckOut && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Hours worked</p>
                    <p className="text-xl font-semibold text-slate-900">{todayAttendance.totalHours?.toFixed(1) || 0}h</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[160px]">
              {canCheckIn && !loading && (
                <button onClick={handleCheckIn} disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  <FaCheckCircle className="text-xs" /> Check In
                </button>
              )}
              {pendingRequests.checkIn && (
                <div className="py-2.5 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-xs font-medium text-amber-700">Check-in pending</p>
                </div>
              )}
              {canCheckOut && !loading && (
                <button onClick={handleCheckOut} disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  <FaTimesCircle className="text-xs" /> Check Out
                </button>
              )}
              {pendingRequests.checkOut && (
                <div className="py-2.5 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-xs font-medium text-amber-700">Check-out pending</p>
                </div>
              )}
              {todayAttendance?.approvedCheckIn && todayAttendance?.approvedCheckOut && (
                <div className="py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-xs font-medium text-emerald-700">Day complete · {todayAttendance.totalHours?.toFixed(1) || 0}h</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Attendance History ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FaHistory className="text-blue-600 text-sm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Attendance History</p>
                <p className="text-xs text-slate-400">{history.length} records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCsvModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <FaDownload className="text-xs" /> Export CSV
              </button>
              <button onClick={loadAttendance} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaChartLine className="text-xs" />}
                Refresh
              </button>
            </div>
          </div>

          {history.length === 0 && !loading ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaHistory className="text-slate-400 text-lg" />
              </div>
              <p className="text-slate-700 font-medium">No attendance records</p>
              <p className="text-slate-400 text-sm mt-1">Start by checking in today!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Date','Day','Check In','Check Out','Hours','Status','Time Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((record, index) => {
                    const times = getActualTime(record);
                    const isPending = (record.checkInRequest?.approved === false && record.checkInRequest?.rejected !== true) ||
                      (record.checkOutRequest?.approved === false && record.checkOutRequest?.rejected !== true);
                    const timeStatus = getTimeBasedStatus(times.checkIn, times.checkOut);
                    return (
                      <tr key={record._id || index} className={`group hover:bg-slate-50 transition-colors ${isPending ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">{formatDate(record.date)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(record.date, { weekday: 'short' })}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-800">{times.checkIn ? formatTime(times.checkIn) : '—'}</span>
                          {record.checkInRequest?.approved === false && record.checkInRequest?.rejected !== true && <span className="ml-1.5"><Badge variant="warning">Pending</Badge></span>}
                          {record.checkInRequest?.rejected === true && <span className="ml-1.5"><Badge variant="danger">Rejected</Badge></span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-800">{times.checkOut ? formatTime(times.checkOut) : '—'}</span>
                          {record.checkOutRequest?.approved === false && record.checkOutRequest?.rejected !== true && <span className="ml-1.5"><Badge variant="warning">Pending</Badge></span>}
                          {record.checkOutRequest?.rejected === true && <span className="ml-1.5"><Badge variant="danger">Rejected</Badge></span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={record.totalHours >= 8 ? 'success' : 'default'}>{record.totalHours?.toFixed(1) || '0.0'}h</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(record.status)}>
                            {record.status === 'present' ? 'Present' : record.status === 'late' ? 'Late' : record.status === 'half-day' ? 'Half Day' : record.status === 'absent' ? 'Absent' : record.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {times.checkIn ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant={timeColorVariant(timeStatus.color)}>{timeStatus.status}</Badge>
                              {times.checkOut && timeStatus.checkOutStatus && (
                                <Badge variant={timeColorVariant(timeStatus.checkOutColor)}>{timeStatus.checkOutStatus}</Badge>
                              )}
                            </div>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        {/* Actions Column - Delete button only for admins */}
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openDetailsModal(record)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details">
                              <FaEye style={{ fontSize: 14 }} />
                            </button>
                            {/* Delete button - ONLY for admin/HR */}
                            {isAdmin && (
                              <button onClick={() => openDeleteModal(record)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Record">
                                <FaTrash style={{ fontSize: 14 }} />
                              </button>
                            )}
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

      {/* Modals */}
      <CSVExportModal isOpen={csvModalOpen} onClose={() => setCsvModalOpen(false)} onExport={handleExportCSV} loading={exporting} />
      <RecordDetailsModal 
        isOpen={detailsModalOpen} 
        onClose={() => { setDetailsModalOpen(false); setSelectedRecord(null); }} 
        record={selectedRecord}
        userRole={userRole}
      />
      {/* Delete modal - only shown when there's a record to delete */}
      {deleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => { setDeleteModalOpen(false); setRecordToDelete(null); }}
          onConfirm={handleDeleteRecord}
          record={recordToDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
};

const EmployeeAttendance = () => (
  <ErrorBoundary><EmployeeAttendanceContent /></ErrorBoundary>
);

export default EmployeeAttendance;