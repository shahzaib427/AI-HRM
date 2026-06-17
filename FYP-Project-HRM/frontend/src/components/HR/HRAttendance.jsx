import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  FaCheckCircle, FaTimesCircle, FaClock, FaCalendarDay,
  FaHistory, FaUserClock, FaExclamationTriangle,
  FaEye, FaDownload, FaFileCsv, FaChartLine, FaTrash,
  FaSpinner, FaChevronDown, FaChevronUp,
  FaBrain, FaMapMarkerAlt, FaCamera
} from 'react-icons/fa';

// ─── Helper functions ─────────────────────────────────────────────────────────

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
    const checkInStatus  = checkInTotalMinutes  < PRESENT_THRESHOLD ? 'Present'    : checkInTotalMinutes  < LATE_THRESHOLD ? 'Late'        : 'Very Late';
    const checkInColor   = checkInTotalMinutes  < PRESENT_THRESHOLD ? 'green'      : checkInTotalMinutes  < LATE_THRESHOLD ? 'orange'      : 'red';
    const checkOutStatus = checkOutTotalMinutes >= ON_TIME_THRESHOLD ? 'On Time'   : checkOutTotalMinutes >= EARLY_THRESHOLD ? 'Early Leave' : 'Very Early';
    const checkOutColor  = checkOutTotalMinutes >= ON_TIME_THRESHOLD ? 'green'     : checkOutTotalMinutes >= EARLY_THRESHOLD ? 'yellow'      : 'red';
    return {
      status: checkInStatus, color: checkInColor, checkOutStatus, checkOutColor,
      message: `${checkInStatus} (${formatTime(checkInTime)}) · ${checkOutStatus} (${formatTime(checkOutTime)})`,
      totalHours: (checkOutTotalMinutes - checkInTotalMinutes) / 60,
    };
  }
  const status = checkInTotalMinutes < PRESENT_THRESHOLD ? 'Present' : checkInTotalMinutes < LATE_THRESHOLD ? 'Late' : 'Very Late';
  const color  = checkInTotalMinutes < PRESENT_THRESHOLD ? 'green'   : checkInTotalMinutes < LATE_THRESHOLD ? 'orange' : 'red';
  return { status, color, message: `${status} (checked in at ${formatTime(checkInTime)})` };
};

const getCurrentTimeStatus = (todayAttendance) => {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const WORK_START     = 9 * 60;
  const LATE_THRESHOLD = 9 * 60 + 30;

  if (!todayAttendance?.approvedCheckIn) {
    if (currentTotalMinutes < WORK_START)     return { message: `Expected check-in at 9:00 AM · in ${WORK_START - currentTotalMinutes} min`, color: 'blue' };
    if (currentTotalMinutes < LATE_THRESHOLD) return { message: `You're late · expected 9:00 AM`, color: 'orange' };
    return { message: `Very late · expected check-in was 9:00 AM`, color: 'red' };
  }
  if (!todayAttendance?.approvedCheckOut) {
    const ci      = new Date(todayAttendance.approvedCheckIn || todayAttendance.requestedCheckIn);
    const ciMins  = ci.getHours() * 60 + ci.getMinutes();
    const status  = ciMins < WORK_START ? 'Present' : ciMins < LATE_THRESHOLD ? 'Late' : 'Very Late';
    const expected  = ciMins + 8 * 60;
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
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger:  'bg-red-50 text-red-700',
    info:    'bg-blue-50 text-blue-700',
    orange:  'bg-orange-50 text-orange-700',
    primary: 'bg-indigo-50 text-indigo-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

const KpiCard = ({ icon: Icon, label, value, sub, iconBg }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="text-white text-sm" />
      </div>
    </div>
  </div>
);

// ─── AI Attendance Modal (Webcam only) ──────────────────────────────────────

const AIAttendanceModal = ({ type, isOpen, onClose, onSuccess }) => {
  const [gpsStatus, setGpsStatus]         = useState('idle');
  const [gpsData, setGpsData]             = useState(null);
  const [gpsError, setGpsError]           = useState('');
  const [camStatus, setCamStatus]         = useState('idle');
  const [capturedImage, setCapturedImage] = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [result, setResult]               = useState(null);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const isCheckIn   = type === 'checkin';
  const activeImage = capturedImage;

  const getGPS = useCallback(() => {
    setGpsStatus('loading'); setGpsError('');
    if (!navigator.geolocation) { setGpsStatus('error'); setGpsError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }); setGpsStatus('ok'); },
      (err)  => { setGpsStatus('error'); setGpsError(err.code === 1 ? 'Location permission denied' : err.code === 2 ? 'Location unavailable' : 'Location timed out'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const startCamera = useCallback(async () => {
    setCamStatus('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamStatus('ready');
    } catch { setCamStatus('error'); }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const { videoWidth: w, videoHeight: h } = videoRef.current;
    canvasRef.current.width = w; canvasRef.current.height = h;
    canvasRef.current.getContext('2d').drawImage(videoRef.current, 0, 0, w, h);
    setCapturedImage(canvasRef.current.toDataURL('image/jpeg', 0.85));
    setCamStatus('captured'); stopCamera();
  }, [stopCamera]);

  const handleSubmit = async () => {
    if (!activeImage) { alert('Please capture a photo first'); return; }
    if (gpsStatus !== 'ok') { alert('Please allow location access first'); return; }
    setSubmitting(true); setResult(null);
    try {
      const endpoint = isCheckIn ? '/attendance/ai/checkin' : '/attendance/ai/checkout';
      const { data } = await axiosInstance.post(endpoint, { image: activeImage, latitude: gpsData.lat, longitude: gpsData.lng });
      setResult({ success: true, message: data.message, confidence: data.ai?.confidence });
      setTimeout(() => { onSuccess?.(); handleClose(); }, 2500);
    } catch (err) {
      const body = err.response?.data || {};
      setResult({ success: false, message: body.message || 'Attendance failed. Please try again.', stage: body.stage });
    } finally { setSubmitting(false); }
  };

  const handleClose = () => { stopCamera(); onClose(); };

  useEffect(() => {
    if (isOpen) {
      setGpsStatus('idle'); setGpsData(null); setGpsError('');
      setCamStatus('idle'); setCapturedImage(null); setResult(null);
      getGPS();
    } else { stopCamera(); }
    return () => stopCamera();
  }, [isOpen, getGPS, stopCamera]);

  useEffect(() => {
    if (isOpen && camStatus === 'idle') startCamera();
    return () => stopCamera();
  }, [isOpen, camStatus, startCamera, stopCamera]);

  if (!isOpen) return null;

  const gpsOk     = gpsStatus === 'ok';
  const canSubmit = gpsOk && !!activeImage && !submitting;
  const gpsLabel  = gpsStatus === 'loading' ? 'Getting location…'
    : gpsStatus === 'ok'    ? `Confirmed (±${gpsData?.accuracy} m)`
    : gpsStatus === 'error' ? gpsError
    : 'Not captured';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${isCheckIn ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <FaBrain className="text-white text-sm" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">AI {isCheckIn ? 'Check In' : 'Check Out'}</h3>
              <p className="text-white/70 text-xs">Face recognition + GPS required</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-3 border-b border-gray-100">
          {[['1', 'Location', gpsOk], ['2', 'Face Photo', !!activeImage], ['3', 'Submit', result?.success]].map(([num, label, done], i) => (
            <React.Fragment key={num}>
              {i > 0 && <div className="flex-1 h-px bg-gray-200" />}
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{done ? '✓' : num}</div>
                <span className={`text-xs font-medium ${done ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="p-6 space-y-4">

          {/* GPS status */}
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${gpsStatus === 'ok' ? 'bg-emerald-50 border-emerald-200' : gpsStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${gpsStatus === 'ok' ? 'bg-emerald-100 text-emerald-600' : gpsStatus === 'error' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
              {gpsStatus === 'loading' ? <FaSpinner className="animate-spin text-xs" /> : <FaMapMarkerAlt className="text-xs" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700">GPS Location</p>
              <p className="text-xs text-gray-500 truncate">{gpsLabel}</p>
            </div>
            {gpsStatus !== 'loading' && gpsStatus !== 'ok' && (
              <button onClick={getGPS} className="text-xs text-indigo-600 font-medium hover:text-indigo-800">Retry</button>
            )}
          </div>

          {/* Webcam panel - only webcam now */}
          <div className="space-y-2">
            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
              {camStatus === 'captured' && capturedImage
                ? <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                : <>
                    <video ref={videoRef} playsInline muted autoPlay className={`w-full h-full object-cover ${camStatus === 'ready' ? 'opacity-100' : 'opacity-0'}`} />
                    {camStatus !== 'ready' && (
                      <div className="absolute inset-0 flex items-center justify-center text-white text-xs opacity-70">
                        {camStatus === 'loading' ? 'Starting camera…' : camStatus === 'error' ? 'Camera unavailable — please check permissions' : ''}
                      </div>
                    )}
                  </>
              }
              {camStatus === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-36 h-44 border-2 border-white/60 rounded-full" />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {camStatus === 'captured'
              ? <button onClick={() => { setCapturedImage(null); setCamStatus('idle'); setResult(null); }}
                  className="w-full py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">Retake Photo</button>
              : <button onClick={capturePhoto} disabled={camStatus !== 'ready'}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                  <FaCamera className="text-xs" /> Capture Photo
                </button>
            }
          </div>

          {/* Result banner */}
          {result && (
            <div className={`rounded-xl p-3 flex items-start gap-3 ${result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <span className={`text-sm mt-0.5 ${result.success ? 'text-emerald-500' : 'text-red-500'}`}>{result.success ? '✓' : '⚠'}</span>
              <div>
                <p className={`text-xs font-medium ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>{result.message}</p>
                {result.confidence && <p className="text-xs text-emerald-600 mt-0.5">Confidence: {(result.confidence * 100).toFixed(1)}%</p>}
                {result.stage && !result.success && <p className="text-xs text-red-500 mt-0.5 capitalize">Failed at: {result.stage} check</p>}
              </div>
            </div>
          )}

          {/* Submit button */}
          {!result?.success && (
            <button onClick={handleSubmit} disabled={!canSubmit}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all
                ${canSubmit
                  ? isCheckIn ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {submitting
                ? <><FaSpinner className="animate-spin text-xs" /> Verifying…</>
                : <><FaBrain className="text-xs" /> {isCheckIn ? 'Confirm Check In' : 'Confirm Check Out'}</>}
            </button>
          )}

          {!gpsOk && !result?.success && (
            <p className="text-center text-xs text-amber-600">⚠ Location access is required to proceed</p>
          )}
        </div>
      </div>
    </div>
  );
};

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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <FaFileCsv className="text-emerald-600 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Export Attendance</h3>
            <p className="text-xs text-gray-500">Download records as CSV</p>
          </div>
        </div>
        <div className="space-y-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeAll} onChange={e => setIncludeAll(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-gray-700 font-medium">Export all records</span>
          </label>
          {!includeAll && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
              {[['startDate', 'Start Date'], ['endDate', 'End Date']].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="date" value={dateRange[field]} onChange={e => setDateRange(p => ({ ...p, [field]: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => onExport(dateRange, includeAll)} disabled={loading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <FaSpinner className="animate-spin text-xs" /> : <FaDownload className="text-xs" />}
              {loading ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Record Details Modal ─────────────────────────────────────────────────────

const RecordDetailsModal = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;
  const times      = getActualTime(record);
  const employee   = record.employee || {};
  const timeStatus = getTimeBasedStatus(times.checkIn, times.checkOut);
  const statusBarColors = {
    green:  'border-emerald-200 bg-emerald-50',
    orange: 'border-orange-200 bg-orange-50',
    red:    'border-red-200 bg-red-50',
    gray:   'border-gray-200 bg-gray-50',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Attendance Details</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><span className="text-xl leading-none">×</span></button>
        </div>
        <div className="p-5 space-y-5">
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusBarColors[timeStatus.color] || statusBarColors.gray}`}>
            <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0">
              <FaClock className={timeStatus.color === 'green' ? 'text-emerald-500' : timeStatus.color === 'orange' ? 'text-orange-500' : 'text-red-500'} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{timeStatus.status}</p>
              <p className="text-xs text-gray-500 mt-0.5">{timeStatus.message}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Employee Info</p>
              <div className="space-y-2">
                {[['Name', employee.name], ['Employee ID', employee.employeeId], ['Department', employee.department], ['Email', employee.email]].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between gap-2"><span className="text-xs text-gray-500">{label}</span><span className="text-xs font-medium text-gray-800 text-right max-w-[180px] truncate">{value}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Attendance Summary</p>
              <div className="space-y-2">
                {[
                  ['Date',         formatDate(record.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                  ['Status',       record.status],
                  ['Total Hours',  `${record.totalHours?.toFixed(2) || '0.00'} hrs`],
                  ['Late Minutes', `${record.lateMinutes || 0} min`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2"><span className="text-xs text-gray-500">{label}</span><span className="text-xs font-medium text-gray-800 text-right max-w-[180px] truncate">{value || 'N/A'}</span></div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-indigo-100 p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Check In</p>
              <div className="space-y-2">
                {[
                  ['Time',   formatTime(record.approvedCheckIn)],
                  ['Method', record.checkInRequest?.remarks?.includes('AI') ? 'AI Verified' : 'Standard'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between"><span className="text-xs text-gray-500">{label}</span><span className="text-xs font-medium text-gray-800">{value || '—'}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-rose-100 p-4">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-3">Check Out</p>
              <div className="space-y-2">
                {[
                  ['Time',   formatTime(record.approvedCheckOut)],
                  ['Method', record.checkOutRequest?.remarks?.includes('AI') ? 'AI Verified' : 'Standard'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between"><span className="text-xs text-gray-500">{label}</span><span className="text-xs font-medium text-gray-800">{value || '—'}</span></div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">System Information</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Record ID</span><p className="font-mono text-gray-700 mt-0.5">{record._id || 'N/A'}</p></div>
              <div><span className="text-gray-400">Created</span><p className="text-gray-700 mt-0.5">{record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}</p></div>
              <div><span className="text-gray-400">Updated</span><p className="text-gray-700 mt-0.5">{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'N/A'}</p></div>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Close</button>
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
          <FaTrash className="text-red-600 text-xl" />
        </div>
        <h3 className="text-gray-900 font-semibold text-lg mb-1">Delete Attendance Record?</h3>
        <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
        {record && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-800">{formatDate(record.date, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div><span className="text-gray-500">Check In:</span> <span className="font-medium">{formatTime(getActualTime(record).checkIn)}</span></div>
              <div><span className="text-gray-500">Check Out:</span> <span className="font-medium">{formatTime(getActualTime(record).checkOut)}</span></div>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting ? <FaSpinner className="animate-spin text-xs" /> : <FaTrash className="text-xs" />}
            {deleting ? 'Deleting…' : 'Delete Record'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, i) { console.error('🚨 HR Attendance Error:', e, i); }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4"><FaExclamationTriangle className="text-red-500 text-lg" /></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-5">Failed to load attendance data.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Reload Page</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ─── Main HR Attendance Component ─────────────────────────────────────────────

const HRAttendanceContent = () => {
  const [todayAttendance, setTodayAttendance]   = useState(null);
  const [history, setHistory]                   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [stats, setStats]                       = useState({ totalDays: 0, presentDays: 0, averageHours: 0 });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord]     = useState(null);
  const [csvModalOpen, setCsvModalOpen]         = useState(false);
  const [exporting, setExporting]               = useState(false);
  const [deleteModalOpen, setDeleteModalOpen]   = useState(false);
  const [recordToDelete, setRecordToDelete]     = useState(null);
  const [deleting, setDeleting]                 = useState(false);
  const [showAllHistory, setShowAllHistory]     = useState(false);
  const [aiModalOpen, setAiModalOpen]           = useState(false);
  const [aiType, setAiType]                     = useState('checkin');

  const loadAttendance = async () => {
    try {
      setLoading(true); setError('');
      const res = await axiosInstance.get('/attendance/my-attendance');
      let data = [];
      if (Array.isArray(res.data)) data = res.data;
      else if (res.data?.data && Array.isArray(res.data.data)) data = res.data.data;

      setHistory(data);

      const today       = new Date().toDateString();
      const todayRecord = data.find(r => r.date && new Date(r.date).toDateString() === today) || null;
      setTodayAttendance(todayRecord);

      const presentDays = data.filter(r => ['present', 'late', 'half-day'].includes(r.status)).length;
      const totalHours  = data.reduce((sum, r) => {
        if (r.approvedCheckIn && r.approvedCheckOut) return sum + (new Date(r.approvedCheckOut) - new Date(r.approvedCheckIn)) / 3600000;
        return sum + (r.totalHours || 0);
      }, 0);
      setStats({ totalDays: data.length, presentDays, averageHours: data.length > 0 ? totalHours / data.length : 0 });
    } catch {
      setError('Failed to load attendance data.'); setHistory([]); setTodayAttendance(null);
    } finally { setLoading(false); }
  };

  const handleExportCSV = async (dateRange, includeAll) => {
    setExporting(true);
    try {
      const params   = new URLSearchParams();
      if (!includeAll) { params.append('startDate', dateRange.startDate); params.append('endDate', dateRange.endDate); }
      const fullUrl  = '/attendance/export/my-csv' + (params.toString() ? `?${params.toString()}` : '');
      const response = await axiosInstance.get(fullUrl, { responseType: 'blob', headers: { Accept: 'text/csv' } });
      const blob     = new Blob([response.data], { type: 'text/csv' });
      const url      = window.URL.createObjectURL(blob);
      const link     = document.createElement('a');
      link.href      = url;
      link.setAttribute('download', includeAll ? `attendance_all_${new Date().toISOString().split('T')[0]}.csv` : `attendance_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      setCsvModalOpen(false);
    } catch (err) {
      if (err.response?.status === 404) alert('No data found for selected period.');
      else alert(`Export failed: ${err.response?.data?.message || err.message}`);
    } finally { setExporting(false); }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/attendance/${recordToDelete._id}`);
      setHistory(prev => prev.filter(r => r._id !== recordToDelete._id));
      if (recordToDelete.date && new Date(recordToDelete.date).toDateString() === new Date().toDateString()) {
        setTodayAttendance(null);
      }
      setDeleteModalOpen(false); setRecordToDelete(null);
      alert('Attendance record deleted successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record');
    } finally { setDeleting(false); }
  };

  const openDetailsModal = (record) => { setSelectedRecord(record); setDetailsModalOpen(true); };
  const openDeleteModal  = (record) => { setRecordToDelete(record); setDeleteModalOpen(true); };

  // ── Today derived state ───────────────────────────────────────────────────

  const getTodayDisplayTimes = () => {
    if (!todayAttendance) return { checkIn: '--:--', checkOut: '--:--' };
    const times = getActualTime(todayAttendance);
    return { checkIn: formatTime(times.checkIn), checkOut: formatTime(times.checkOut) };
  };

  const getTodayStatus = () => {
    if (!todayAttendance) return { label: 'Not checked in', variant: 'default' };
    const { approvedCheckIn, approvedCheckOut, status } = todayAttendance;
    if (approvedCheckIn && approvedCheckOut) return { label: 'Complete',   variant: 'success' };
    if (approvedCheckIn)                     return { label: 'Checked in', variant: 'info' };
    switch (status) {
      case 'present':  return { label: 'Present',  variant: 'success' };
      case 'late':     return { label: 'Late',     variant: 'orange' };
      case 'half-day': return { label: 'Half Day', variant: 'warning' };
      case 'absent':   return { label: 'Absent',   variant: 'danger' };
      default:         return { label: 'Not checked in', variant: 'default' };
    }
  };

  const canCheckIn  = !todayAttendance?.approvedCheckIn;
  const canCheckOut = !!(todayAttendance?.approvedCheckIn) && !todayAttendance?.approvedCheckOut;
  const currentTimeStatus = getCurrentTimeStatus(todayAttendance);

  useEffect(() => { loadAttendance(); }, []);

  const displayedHistory = showAllHistory ? history : history.slice(0, 5);
  const displayTimes     = getTodayDisplayTimes();
  const todayStatus      = getTodayStatus();

  const statusBannerColors = {
    green:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    red:    'bg-red-50 border-red-200 text-red-700',
  };

  if (loading && history.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading attendance…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaUserClock className="text-indigo-600" /> My Attendance
            </h1>
            <p className="text-sm text-gray-500 mt-1">Track your daily attendance and work hours</p>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FaClock className="w-5 h-5" />
            <span className="text-sm">HR Portal</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <FaTimesCircle className="text-red-500 flex-shrink-0 w-5 h-5" />
            <span className="text-red-700 flex-1">{error}</span>
            <button onClick={loadAttendance} className="text-xs text-red-600 underline hover:text-red-800">Retry</button>
          </div>
        )}

        {/* Current Status Banner */}
        <div className={`rounded-lg border px-5 py-4 flex items-center justify-between gap-4 ${statusBannerColors[currentTimeStatus.color] || statusBannerColors.blue}`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-current opacity-60 flex-shrink-0" />
            <p className="text-sm font-medium">{currentTimeStatus.message}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs opacity-70">Standard hours</p>
            <p className="text-sm font-semibold">9:00 AM – 5:00 PM</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <KpiCard icon={FaCalendarDay} label="Total Records"    value={stats.totalDays}               sub="All time"          iconBg="bg-indigo-500" />
          <KpiCard icon={FaUserClock}   label="Present Days"     value={stats.presentDays}              sub={`${stats.totalDays > 0 ? ((stats.presentDays / stats.totalDays) * 100).toFixed(0) : 0}% attendance`} iconBg="bg-emerald-500" />
          <KpiCard icon={FaClock}       label="Avg. Hours / Day" value={`${stats.averageHours.toFixed(1)}h`} sub="Standard: 8h" iconBg="bg-violet-500" />
        </div>

        {/* Today Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Today's Attendance</p>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Check In</p>
                  <p className="text-2xl font-bold text-gray-900">{displayTimes.checkIn}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Check Out</p>
                  <p className="text-2xl font-bold text-gray-900">{displayTimes.checkOut}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <Badge variant={todayStatus.variant}>{todayStatus.label}</Badge>
                </div>
                {todayAttendance?.approvedCheckIn && todayAttendance?.approvedCheckOut && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Hours worked</p>
                    <p className="text-2xl font-bold text-gray-900">{todayAttendance.totalHours?.toFixed(1) || 0}h</p>
                  </div>
                )}
              </div>
              {todayAttendance?.checkInRequest?.remarks?.includes('AI') && (
                <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1">
                  <FaBrain className="text-xs" /> Verified by AI face recognition
                </p>
              )}
            </div>

            {/* Action buttons — AI only */}
            <div className="flex flex-col gap-3 min-w-[220px]">
              {canCheckIn && !loading && (
                <button
                  onClick={() => { setAiType('checkin'); setAiModalOpen(true); }}
                  className="flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                  <FaBrain className="text-xs" /> Check In with AI
                </button>
              )}

              {canCheckOut && !loading && (
                <button
                  onClick={() => { setAiType('checkout'); setAiModalOpen(true); }}
                  className="flex items-center justify-center gap-2 py-3 px-5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                  <FaBrain className="text-xs" /> Check Out with AI
                </button>
              )}

              {todayAttendance?.approvedCheckIn && todayAttendance?.approvedCheckOut && (
                <div className="py-3 px-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-2">
                    <FaCheckCircle className="text-xs" /> Day complete · {todayAttendance.totalHours?.toFixed(1) || 0}h worked
                  </p>
                </div>
              )}

              {!canCheckIn && !canCheckOut && !todayAttendance?.approvedCheckOut && (
                <div className="py-3 px-5 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <p className="text-xs text-gray-500">No action needed right now</p>
                </div>
              )}

              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <FaMapMarkerAlt className="text-xs" /> Requires face + GPS verification
              </p>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FaHistory className="text-indigo-600 text-sm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Attendance History</p>
                <p className="text-xs text-gray-400">{history.length} records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCsvModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                <FaDownload className="text-xs" /> Export CSV
              </button>
              <button onClick={loadAttendance} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                {loading ? <FaSpinner className="animate-spin text-xs" /> : <FaChartLine className="text-xs" />} Refresh
              </button>
            </div>
          </div>

          {history.length === 0 && !loading ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaHistory className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-700 font-medium">No attendance records yet</p>
              <p className="text-gray-400 text-sm mt-1">Check in using AI to get started!</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {['Date', 'Day', 'Check In', 'Check Out', 'Hours', 'Status', 'Time Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayedHistory.map((record, index) => {
                      const times      = getActualTime(record);
                      const timeStatus = getTimeBasedStatus(times.checkIn, times.checkOut);
                      const aiVerified = record.checkInRequest?.remarks?.includes('AI');
                      return (
                        <tr key={record._id || index} className="group hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{formatDate(record.date)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDate(record.date, { weekday: 'short' })}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-800">{times.checkIn ? formatTime(times.checkIn) : '—'}</span>
                            {aiVerified && <span className="ml-1 text-xs text-emerald-600" title="AI Verified">🤖</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-800">{times.checkOut ? formatTime(times.checkOut) : '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={record.totalHours >= 8 ? 'success' : 'default'}>{record.totalHours?.toFixed(1) || '0.0'}h</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={
                              record.status === 'present'  ? 'success' :
                              record.status === 'late'     ? 'orange'  :
                              record.status === 'half-day' ? 'warning' :
                              record.status === 'absent'   ? 'danger'  : 'default'
                            }>
                              {record.status === 'present'  ? 'Present'  :
                               record.status === 'late'     ? 'Late'     :
                               record.status === 'half-day' ? 'Half Day' :
                               record.status === 'absent'   ? 'Absent'   : 'Pending'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {times.checkIn ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant={timeStatus.color === 'green' ? 'success' : timeStatus.color === 'orange' ? 'warning' : 'danger'}>{timeStatus.status}</Badge>
                                {times.checkOut && timeStatus.checkOutStatus && (
                                  <Badge variant={timeStatus.checkOutColor === 'green' ? 'success' : timeStatus.checkOutColor === 'yellow' ? 'warning' : 'danger'}>{timeStatus.checkOutStatus}</Badge>
                                )}
                              </div>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openDetailsModal(record)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Details">
                                <FaEye className="text-sm" />
                              </button>
                              {/* HR can always delete their own records */}
                              <button onClick={() => openDeleteModal(record)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Record">
                                <FaTrash className="text-sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {history.length > 5 && (
                <button onClick={() => setShowAllHistory(!showAllHistory)}
                  className="w-full py-3 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors border-t border-gray-100 bg-gray-50">
                  {showAllHistory ? <>Show Less <FaChevronUp className="text-xs" /></> : <>Show All ({history.length}) <FaChevronDown className="text-xs" /></>}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AIAttendanceModal  type={aiType}       isOpen={aiModalOpen}      onClose={() => setAiModalOpen(false)}      onSuccess={loadAttendance} />
      <CSVExportModal     isOpen={csvModalOpen}    onClose={() => setCsvModalOpen(false)}   onExport={handleExportCSV} loading={exporting} />
      <RecordDetailsModal isOpen={detailsModalOpen} onClose={() => { setDetailsModalOpen(false); setSelectedRecord(null); }} record={selectedRecord} />
      <DeleteConfirmationModal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setRecordToDelete(null); }} onConfirm={handleDeleteRecord} record={recordToDelete} deleting={deleting} />
    </div>
  );
};

const HRAttendance = () => (<ErrorBoundary><HRAttendanceContent /></ErrorBoundary>);
export default HRAttendance;