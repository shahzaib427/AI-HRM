import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Download, FileSpreadsheet, CheckCircle, Clock,
  Filter, RefreshCw, Eye,
  ChevronLeft, ChevronRight, DollarSign,
  X, AlertCircle, Home, TrendingUp, Award, CreditCard
} from 'lucide-react';

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

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const KpiCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    purple: 'bg-purple-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const PayslipModal = ({ isOpen, onClose, payroll, axiosInstance }) => {
  const [payslipHtml, setPayslipHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && payroll) fetchPayslip();
  }, [isOpen, payroll]);

  const fetchPayslip = async () => {
    if (!payroll) return;
    setLoading(true); setError(null);
    try {
      const response = await axiosInstance.get(`/employee/payroll/${payroll._id}/payslip`, { responseType: 'text' });
      if (response.data) setPayslipHtml(response.data);
      else setError('No data received');
    } catch (err) {
      setError(err.response?.data || 'Failed to load payslip');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!payroll) return;
    try {
      const response = await axiosInstance.get(`/employee/payroll/${payroll._id}/payslip/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payroll.month}_${payroll.year}.html`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download payslip'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payslip — {payroll?.month} {payroll?.year}</h3>
            <p className="text-sm text-gray-500">Employee Payroll Record</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payslip...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-red-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                <p>{typeof error === 'string' ? error : 'Failed to load payslip'}</p>
                <button onClick={fetchPayslip} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
              </div>
            </div>
          ) : payslipHtml ? (
            <iframe
              srcDoc={payslipHtml}
              title="Payslip"
              className="w-full h-[calc(90vh-120px)] border-0 bg-white rounded-lg"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">No payslip data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Axios instance setup
const getToken = () =>
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('accessToken') ||
  sessionStorage.getItem('token');

const createAxiosInstance = () => {
  const token = getToken();
  const instance = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    withCredentials: true
  });
  
  instance.interceptors.request.use((config) => {
    const t = getToken();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });
  
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
  return instance;
};

const axiosInstance = createAxiosInstance();

const EmployeePayroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: new Date().getFullYear().toString(), status: 'all', page: 1 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, currentPage: 1 });
  const [years, setYears] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ totalNetSalary: 0, count: 0, paidCount: 0 });

  const getCurrentUser = useCallback(() => {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
        return payload;
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
    return null;
  }, []);

  const calculateTotalSalary = (payroll) => {
    if (!payroll) return 0;
    return (payroll.basicSalary || 0) + (payroll.allowances || 0);
  };

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.year && filters.year !== 'all') params.append('year', filters.year);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      params.append('page', filters.page || 1);
      params.append('limit', 10);

      const response = await axiosInstance.get(`/employee/payroll?${params.toString()}`);
      
      if (response.data?.success) {
        const data = response.data.data || [];
        setPayrolls(data);
        setPagination({
          total: response.data.total || data.length,
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || 1
        });

        const totalNet = data.reduce((sum, p) => sum + calculateTotalSalary(p), 0);
        const paid = data.filter(p => p.status === 'Processed' || p.status === 'Paid').length;
        setSummary({
          totalNetSalary: totalNet,
          count: data.length,
          paidCount: paid
        });
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  }, [filters.year, filters.status, filters.page]);

  const fetchYears = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/employee/payroll/years');
      if (response.data?.success) {
        setYears(response.data.data || []);
      } else {
        const cur = new Date().getFullYear();
        setYears([cur, cur - 1, cur - 2, cur - 3]);
      }
    } catch {
      const cur = new Date().getFullYear();
      setYears([cur, cur - 1, cur - 2]);
    }
  }, []);

  const handleViewPayslip = (payroll) => {
    setSelectedPayroll(payroll);
    setModalOpen(true);
  };

  const handleDownloadPayslip = async (payroll) => {
    try {
      const response = await axiosInstance.get(`/employee/payroll/${payroll._id}/payslip/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payroll.month}_${payroll.year}.html`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { 
      alert('Failed to download payslip'); 
    }
  };

  const handleFilterChange = (key, value) => setFilters({ ...filters, [key]: value, page: 1 });

  const handleResetFilters = () => setFilters({ year: new Date().getFullYear().toString(), status: 'all', page: 1 });

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages)
      setFilters({ ...filters, page: newPage });
  };

  const StatusBadge = ({ status }) => {
    if (status === 'Paid' || status === 'paid' || status === 'Processed') 
      return <Badge variant="success">Paid</Badge>;
    if (status === 'Pending' || status === 'pending') 
      return <Badge variant="warning">Pending</Badge>;
    return <Badge variant="default">{status || 'Pending'}</Badge>;
  };

  useEffect(() => { 
    getCurrentUser(); 
  }, [getCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchPayrolls();
      fetchYears();
    }
  }, [currentUser, fetchPayrolls, fetchYears]);

  const currentPayroll = payrolls.find(p => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear().toString();
    return p.month === currentMonth && p.year?.toString() === currentYear;
  });

  if (loading && payrolls.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PayslipModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedPayroll(null); }}
        payroll={selectedPayroll}
        axiosInstance={axiosInstance}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="text-indigo-600" /> My Payroll
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {currentUser?.name || currentUser?.firstName || 'Employee'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <CreditCard className="w-5 h-5" />
              <span className="text-sm">Payroll Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="text-red-500 flex-shrink-0 w-5 h-5" />
            <span className="text-red-700 flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard 
            title="Current Month Salary" 
            value={formatCurrency(currentPayroll ? calculateTotalSalary(currentPayroll) : 0)} 
            icon={<DollarSign className="w-6 h-6 text-white" />} 
            color="blue" 
          />
          <KpiCard 
            title="Total Earned (YTD)" 
            value={formatCurrency(summary.totalNetSalary)} 
            icon={<TrendingUp className="w-6 h-6 text-white" />} 
            color="green" 
          />
          <KpiCard 
            title="Total Payslips" 
            value={pagination.total} 
            icon={<FileSpreadsheet className="w-6 h-6 text-white" />} 
            color="purple" 
          />
          <KpiCard 
            title="Current Status" 
            value={currentPayroll?.status || 'N/A'} 
            icon={<CheckCircle className="w-6 h-6 text-white" />} 
            color={currentPayroll?.status === 'Processed' ? 'emerald' : 'yellow'} 
          />
        </div>

        {/* Payroll History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> My Payroll History
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">View and download all your payslips</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { fetchPayrolls(); }} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <select 
                value={filters.year} 
                onChange={(e) => handleFilterChange('year', e.target.value)} 
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)} 
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processed">Processed</option>
                <option value="Paid">Paid</option>
              </select>
              <button onClick={handleResetFilters} className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                <Filter className="w-3 h-3" /> Reset Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Basic Salary</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Allowances</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No payroll records found</p>
                    </td>
                  </tr>
                ) : (
                  payrolls.map((payroll) => {
                    const totalSalary = calculateTotalSalary(payroll);
                    return (
                      <tr key={payroll._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm text-gray-800">{payroll.month || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{payroll.year || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-gray-800">{formatCurrency(payroll.basicSalary || 0)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-emerald-600">+{formatCurrency(payroll.allowances || 0)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-bold text-indigo-600">{formatCurrency(totalSalary)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={payroll.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">{formatDate(payroll.paymentDate)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleViewPayslip(payroll)} className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors">
                              <Eye className="w-3 h-3" /> View
                            </button>
                            <button onClick={() => handleDownloadPayslip(payroll)} className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors">
                              <Download className="w-3 h-3" /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.total)} of {pagination.total} records
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage - 1)} 
                    disabled={pagination.currentPage === 1} 
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 inline" /> Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">Page {pagination.currentPage} of {pagination.totalPages}</span>
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage + 1)} 
                    disabled={pagination.currentPage === pagination.totalPages} 
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Year-to-Date Summary</h3>
                <p className="text-xs text-gray-400">Total earnings for {filters.year !== 'all' ? filters.year : 'current year'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Total Net Salary</span>
                <span className="text-lg font-bold text-indigo-600">{formatCurrency(summary.totalNetSalary)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Total Records</span>
                <span className="text-sm font-medium text-gray-800">{summary.count}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Paid Records</span>
                <span className="text-sm font-medium text-emerald-600">{summary.paidCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Quick Stats</h3>
                <p className="text-xs text-gray-400">Payroll insights</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Payslips</span>
                <span className="text-xl font-bold text-gray-800">{pagination.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Pending Records</span>
                <span className="text-xl font-bold text-amber-600">
                  {payrolls.filter(p => p.status === 'Pending').length}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  Last updated: {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">Need Help with Your Payroll?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              For payroll queries, discrepancies, or tax information, contact our HR team at <span className="text-indigo-600 font-medium">hr@company.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayroll;