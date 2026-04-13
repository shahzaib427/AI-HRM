import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaWallet, FaFileInvoiceDollar, FaCalendarAlt, FaDownload, FaEye, FaSync, FaExclamationTriangle, FaUser, FaBuilding, FaChartLine, FaMoneyBillWave, FaPercent, FaQuestionCircle } from 'react-icons/fa';

// ─── Helpers (unchanged logic) ────────────────────────────────────────────────

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return 'Invalid Date'; }
};

// ─── Reusable UI ──────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    info:    'bg-blue-50 text-blue-700',
    danger:  'bg-red-50 text-red-700',
    purple:  'bg-violet-50 text-violet-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

const statusBadge = (status) => {
  if (!status) return <Badge>Processing</Badge>;
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'processed') return <Badge variant="success">{status}</Badge>;
  if (s === 'pending') return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="info">{status}</Badge>;
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

// ─── Auth Error Screen ────────────────────────────────────────────────────────

const AuthErrorScreen = ({ error, onLogin, onClearRetry }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-sm p-8 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <FaExclamationTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Authentication Required</h2>
      <p className="text-slate-500 text-sm mb-6">{error || 'Please login to access payroll information.'}</p>
      <div className="space-y-3">
        <button onClick={onLogin} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          Go to Login
        </button>
        <button onClick={onClearRetry} className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
          Clear Cache & Retry
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-6">Need help? Contact hr@company.com</p>
    </div>
  </div>
);

// ─── Loading Screen ───────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-600 font-medium">Loading Payroll…</p>
      <p className="text-slate-400 text-sm mt-1">Fetching your records</p>
    </div>
  </div>
);

// ─── Payslip Card ─────────────────────────────────────────────────────────────

const PayslipCard = ({ payslip, onView, onDownload, onRequestCorrection }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FaFileInvoiceDollar className="text-slate-400 text-xs" />
          <p className="font-semibold text-slate-900">{payslip.month} {payslip.year}</p>
        </div>
        <p className="text-xs text-slate-400">Paid {formatDate(payslip.paymentDate || payslip.createdAt)}</p>
      </div>
      {statusBadge(payslip.status)}
    </div>

    <div className="space-y-2 mb-4 text-sm">
      <div className="flex justify-between text-slate-500">
        <span>Basic</span><span className="text-slate-800">{formatCurrency(payslip.basicSalary)}</span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>Allowances</span><span className="text-emerald-600">+{formatCurrency(payslip.allowances)}</span>
      </div>
      {payslip.bonus > 0 && (
        <div className="flex justify-between text-slate-500">
          <span>Bonus</span><span className="text-emerald-600">+{formatCurrency(payslip.bonus)}</span>
        </div>
      )}
      <div className="flex justify-between text-slate-500">
        <span>Deductions</span><span className="text-red-500">−{formatCurrency(payslip.deductions)}</span>
      </div>
      <div className="h-px bg-slate-100 my-1" />
      <div className="flex justify-between font-semibold text-slate-900">
        <span>Net Salary</span><span className="text-emerald-600">{formatCurrency(payslip.netSalary)}</span>
      </div>
    </div>

    <div className="flex gap-2">
      <button onClick={() => onView(payslip._id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
        <FaEye className="text-xs" /> View
      </button>
      <button onClick={() => onDownload(payslip._id)} className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors">
        <FaDownload className="text-xs" /> Download
      </button>
    </div>

    {payslip.status === 'Pending' && (
      <button onClick={() => onRequestCorrection(payslip._id)} className="w-full mt-2.5 text-xs text-blue-600 hover:text-blue-700 hover:underline pt-2 border-t border-slate-100 transition-colors">
        Request Correction
      </button>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const EmployeePayroll = () => {
  const [dashboard, setDashboard]         = useState(null);
  const [payrolls, setPayrolls]           = useState([]);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [authError, setAuthError]         = useState(false);
  const [user, setUser]                   = useState(null);
  const [years, setYears]                 = useState([]);
  const [retryCount, setRetryCount]       = useState(0);

  // ── same token logic ────────────────────────────────────────────────────────
  const getToken = () =>
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('jwtToken') ||
    localStorage.getItem('userToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('authToken');

  const clearStoredTokens = () => {
    ['token','authToken','accessToken','jwtToken','userToken'].forEach(k => localStorage.removeItem(k));
    ['token','authToken'].forEach(k => sessionStorage.removeItem(k));
  };

  const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch { return null; }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthError(true); setError('Please login to access payroll information'); setLoading(false); return; }
    try {
      const payload = decodeJWT(token);
      if (!payload) throw new Error('Invalid token');
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        clearStoredTokens(); setAuthError(true);
        setError('Your session has expired. Please login again.'); setLoading(false); return;
      }
      setUser({
        _id: payload.id || payload._id || payload.userId,
        employeeId: payload.employeeId || payload.empId || payload.employeeNumber,
        name: payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || 'Employee',
        firstName: payload.firstName, lastName: payload.lastName,
        role: payload.role, department: payload.department,
        position: payload.position, email: payload.email,
      });
    } catch {
      clearStoredTokens(); setAuthError(true);
      setError('Invalid authentication token.'); setLoading(false);
    }
  }, []);

  const createAxiosInstance = () => {
    const token = getToken();
    const instance = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      timeout: 15000, withCredentials: true,
    });
    instance.interceptors.request.use(cfg => {
      if (cfg.method === 'get') cfg.params = { ...cfg.params, _t: Date.now() };
      return cfg;
    }, err => Promise.reject(err));
    instance.interceptors.response.use(res => res, async err => {
      if (err.response?.status === 401 && !err.config._retry) {
        err.config._retry = true;
        clearStoredTokens(); setAuthError(true);
        setError('Your session has expired. Please login again.');
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      }
      return Promise.reject(err);
    });
    return instance;
  };

  useEffect(() => { if (user && !authError) fetchAllData(); }, [user, selectedYear, authError, retryCount]);

  const fetchAllData = async () => {
    setLoading(true); setError('');
    await Promise.allSettled([fetchDashboard(), fetchPayrolls(), fetchPayrollYears()]);
    setLoading(false);
  };

  const fetchDashboard = async () => {
    try {
      const res = await createAxiosInstance().get('/employee/payroll/dashboard');
      if (res.data.success) setDashboard(res.data.data);
      else setError(res.data.message || 'Failed to load dashboard');
    } catch (err) {
      if (err.response?.status !== 401) setError('Failed to load dashboard data.');
    }
  };

  const fetchPayrolls = async () => {
    try {
      const res = await createAxiosInstance().get(`/employee/payroll?year=${selectedYear}`);
      if (res.data.success) setPayrolls(res.data.data || []);
      else setPayrolls([]);
    } catch { setPayrolls([]); }
  };

  const fetchPayrollYears = async () => {
    try {
      const res = await createAxiosInstance().get('/employee/payroll/years');
      if (res.data.success) setYears(res.data.data || []);
      else {
        const cur = new Date().getFullYear();
        setYears([cur, cur - 1, cur - 2, cur - 3, cur - 4]);
      }
    } catch {
      const cur = new Date().getFullYear();
      setYears([cur, cur - 1, cur - 2]);
    }
  };

  const goToLogin = () => { clearStoredTokens(); window.location.href = '/login'; };

  const viewPayslip = (id) => {
    const token = getToken();
    if (!token) { goToLogin(); return; }
    window.open(`http://localhost:5000/api/employee/payroll/payslip/${id}`, '_blank', 'noopener,noreferrer');
  };

  const downloadPayslip = (id) => {
    const token = getToken();
    if (!token) { goToLogin(); return; }
    const link = document.createElement('a');
    link.href = `http://localhost:5000/api/employee/payroll/payslip/${id}/download`;
    link.setAttribute('download', `payslip-${id}.pdf`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const requestCorrection = async (id) => {
    const reason = prompt('Enter reason for correction request:');
    if (!reason?.trim()) { if (reason !== null) alert('Please provide a reason.'); return; }
    try {
      const res = await createAxiosInstance().post(`/employee/payroll/${id}/request-correction`, {
        issue: 'Discrepancy', details: reason.trim(), date: new Date().toISOString(),
      });
      if (res.data.success) { alert('Correction request submitted!'); fetchAllData(); }
      else alert(res.data.message || 'Failed to submit request');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  const handleRetry = () => { setRetryCount(p => p + 1); setError(''); setLoading(true); };

  // ── Render guards ────────────────────────────────────────────────────────────
  if (authError) return <AuthErrorScreen error={error} onLogin={goToLogin} onClearRetry={() => { clearStoredTokens(); window.location.reload(); }} />;
  if (loading && !dashboard) return <LoadingScreen />;

  const cp = dashboard?.currentPayroll;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <FaWallet className="text-blue-600 text-sm" />
                Payroll Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm text-slate-500">
                  Welcome, <span className="font-medium text-slate-700">{user?.name || 'Employee'}</span>
                </span>
                {user?.employeeId && <Badge variant="info">ID: {user.employeeId}</Badge>}
                {user?.department && <Badge variant="purple">{user.department}</Badge>}
                {user?.position && <Badge>{user.position}</Badge>}
              </div>
            </div>
            <button onClick={handleRetry} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Error Banner ── */}
        {error && !authError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
            <span className="text-red-700 flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* ── Current Month Section (Simple neutral design) ── */}
        {cp && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">Current Month</p>
                <p className="text-3xl font-semibold text-slate-900 tracking-tight">{formatCurrency(cp.netSalary)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-500">{cp.month} {cp.year}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="text-sm text-slate-500">Pay Period</span>
                </div>
              </div>
              <div>
                {statusBadge(cp.status)}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Net Salary</p>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(cp.netSalary)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Basic</p>
                <p className="text-sm font-medium text-slate-700">{formatCurrency(cp.basicSalary)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Allowances</p>
                <p className="text-sm font-medium text-emerald-600">+{formatCurrency(cp.allowances)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Bonus</p>
                <p className="text-sm font-medium text-amber-600">+{formatCurrency(cp.bonus)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Deductions</p>
                <p className="text-sm font-medium text-red-500">-{formatCurrency(cp.deductions)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard icon={FaMoneyBillWave} label="Total Earned (YTD)" value={formatCurrency(dashboard?.ytdSummary?.totalNetSalary)} sub="Year to date" iconBg="bg-emerald-500" />
          <KpiCard icon={FaCalendarAlt} label="Months Paid" value={dashboard?.ytdSummary?.count || 0} sub={`out of ${selectedYear}`} iconBg="bg-blue-500" />
          <KpiCard icon={FaChartLine} label="Average Monthly" value={formatCurrency((dashboard?.ytdSummary?.totalNetSalary || 0) / Math.max(1, dashboard?.ytdSummary?.count || 1))} sub="Net salary" iconBg="bg-violet-500" />
        </div>

        {/* ── Payslip History ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FaFileInvoiceDollar className="text-blue-600 text-sm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Payslip History</p>
                <p className="text-xs text-slate-400">{payrolls.length} records for {selectedYear}</p>
              </div>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {payrolls.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaFileInvoiceDollar className="text-slate-400 text-lg" />
              </div>
              <p className="text-slate-700 font-medium">No payslips for {selectedYear}</p>
              <p className="text-slate-400 text-sm mt-1">Try selecting a different year</p>
              {years.length > 1 && selectedYear > Math.min(...years) && (
                <button onClick={() => setSelectedYear(selectedYear - 1)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
                  View {selectedYear - 1} Records
                </button>
              )}
            </div>
          ) : (
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {payrolls.map(payslip => (
                  <PayslipCard
                    key={payslip._id}
                    payslip={payslip}
                    onView={viewPayslip}
                    onDownload={downloadPayslip}
                    onRequestCorrection={requestCorrection}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Recent Payments & Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Recent payments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="text-emerald-600 text-sm" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Recent Payments</h3>
                <p className="text-xs text-slate-400">Last 4 transactions</p>
              </div>
            </div>
            {(!dashboard?.recentPayrolls || dashboard.recentPayrolls.length === 0) ? (
              <p className="text-slate-400 text-sm text-center py-6">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {dashboard.recentPayrolls.slice(0, 4).map((p, i) => (
                  <div key={p._id || i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.month} {p.year}</p>
                      <p className="text-xs text-slate-400">{formatDate(p.paymentDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.netSalary)}</p>
                      <div className="mt-1">{statusBadge(p.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FaQuestionCircle className="text-blue-600 text-sm" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Quick Actions</h3>
                <p className="text-xs text-slate-400">Manage your payroll</p>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={handleRetry} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors text-left">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaSync className="text-blue-600 text-xs" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Refresh Data</p>
                  <p className="text-xs text-slate-400">Sync latest records</p>
                </div>
              </button>
              <button
                onClick={() => {
                  if (payrolls.length > 0) { 
                    if (window.confirm(`Download all ${payrolls.length} payslips for ${selectedYear}?`)) {
                      alert('Bulk download feature coming soon!');
                    }
                  } else alert('No payslips available');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaDownload className="text-emerald-600 text-xs" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Download All</p>
                  <p className="text-xs text-slate-400">All payslips for {selectedYear}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ── Help Footer ── */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <FaQuestionCircle className="text-white text-sm" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 mb-1">Need Help with Payroll?</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              For payroll queries, discrepancies, or tax information, contact our HR team at <span className="text-blue-600 font-medium">hr@company.com</span> or call <span className="text-blue-600 font-medium">(123) 456-7890</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">Last updated: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Dev debug */}
        {process.env.NODE_ENV === 'development' && (
          <details className="bg-slate-100 rounded-xl p-4 text-xs">
            <summary className="cursor-pointer font-medium text-slate-600">Debug Info</summary>
            <pre className="mt-2 text-slate-500 overflow-auto">{JSON.stringify({ token: !!getToken(), user, payrolls: payrolls.length, years, selectedYear, error, authError }, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default EmployeePayroll;