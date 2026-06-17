import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FaDownload, FaFileExcel, FaCheckCircle, FaClock,
  FaFilter, FaSyncAlt, FaEye, FaPrint,
  FaChevronLeft, FaChevronRight, FaDollarSign,
  FaUser, FaCalendarAlt, FaBuilding, FaBriefcase, FaUsers,
  FaTimes, FaExclamationTriangle, FaSpinner, FaChevronDown, FaChevronUp
} from 'react-icons/fa';

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    primary: 'bg-indigo-50 text-indigo-700'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const KpiCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    purple: 'bg-purple-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
    amber: 'bg-amber-500', violet: 'bg-violet-500'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
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

const PayslipModal = ({ isOpen, onClose, payroll, isHR, axiosInstance }) => {
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
      const endpoint = isHR
        ? `/hr/payroll/my-payslip/${payroll._id}`
        : `/hr/payroll/payslip-view/${payroll._id}`;
      const response = await axiosInstance.get(endpoint, { responseType: 'text' });
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
      const endpoint = isHR
        ? `/hr/payroll/my-payslip/${payroll._id}/download`
        : `/hr/payroll/payslip-download/${payroll._id}`;
      const response = await axiosInstance.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payroll.employeeCode || 'HR'}_${payroll.month}_${payroll.year}.html`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download payslip'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payslip — {payroll?.employeeName || 'HR Manager'}</h3>
            <p className="text-sm text-gray-500">{payroll?.month} {payroll?.year}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              <FaDownload className="w-4 h-4" /> Download
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <FaTimes className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5 bg-gray-100">
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
                <FaExclamationTriangle className="w-12 h-12 mx-auto mb-3" />
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

const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
  });
  
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
  return instance;
};

const axiosInstance = createAxiosInstance();

const HRPayrollDashboard = () => {
  const [employeePayrolls, setEmployeePayrolls] = useState([]);
  const [myPayroll, setMyPayroll] = useState(null);
  const [myPayrollHistory, setMyPayrollHistory] = useState([]);
  const [employeeStats, setEmployeeStats] = useState({ totalEmployees: 0, totalPayrollAmount: 0, paidCount: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: new Date().getFullYear().toString(), month: 'all', status: 'all', page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, currentPage: 1 });
  const [monthsYears, setMonthsYears] = useState({ months: [], years: [] });
  const [exportLoading, setExportLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isHRPayroll, setIsHRPayroll] = useState(false);
  const [activeTab, setActiveTab] = useState('my-salary');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const getCurrentUser = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
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

  const calculateTotalSalary = (payroll) =>
    (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
    (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
    (payroll.otherAllowance || 0);

  const fetchMyCurrentPayroll = async () => {
    try {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();

      const res = await axiosInstance.get(
        `/hr/payroll/my-payrolls?year=${currentYear}&month=${currentMonth}`
      );
      const list = res.data?.data || [];

      if (list.length > 0) {
        setMyPayroll(list[0]);
      } else {
        const fallback = await axiosInstance.get(
          `/hr/payroll/my-payrolls?year=${currentYear}`
        );
        const allList = fallback.data?.data || [];
        setMyPayroll(allList.length > 0 ? allList[0] : null);
      }
    } catch (error) {
      console.error('Error fetching my current payroll:', error);
      setMyPayroll(null);
    }
  }

  const fetchMyPayrollHistory = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await axiosInstance.get(`/hr/payroll/my-payrolls?year=${currentYear}`);
      if (response.data?.success && response.data?.data) setMyPayrollHistory(response.data.data);
      else setMyPayrollHistory([]);
    } catch (error) {
      console.error('Error fetching my payroll history:', error);
      setMyPayrollHistory([]);
    }
  };

  const fetchEmployeePayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.year && filters.year !== 'all') params.append('year', filters.year);
      if (filters.month && filters.month !== 'all') params.append('month', filters.month);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      params.append('excludeSelf', 'true');

      const response = await axiosInstance.get(`/hr/payroll/employee-payrolls?${params.toString()}`);
      
      if (response.data?.success) {
        setEmployeePayrolls(response.data.data || []);
        setPagination({
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || 1
        });
      }
    } catch (error) {
      console.error('Error fetching employee payrolls:', error);
      setEmployeePayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.year && filters.year !== 'all') params.append('year', filters.year);
      if (filters.month && filters.month !== 'all') params.append('month', filters.month);
      
      const response = await axiosInstance.get(`/hr/payroll/employee-stats?${params.toString()}`);
      if (response.data?.success) {
        setEmployeeStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    }
  };

  const fetchMonthsYears = async () => {
    try {
      const response = await axiosInstance.get('/hr/payroll/months-years');
      if (response.data?.success && response.data?.data) {
        setMonthsYears(response.data.data);
      } else {
        const y = new Date().getFullYear();
        setMonthsYears({
          months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
          years: [y - 2, y - 1, y, y + 1]
        });
      }
    } catch {
      const y = new Date().getFullYear();
      setMonthsYears({
        months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        years: [y - 2, y - 1, y, y + 1]
      });
    }
  };

  const handleViewPayslip = (payroll, isHR = false) => {
    setSelectedPayroll(payroll);
    setIsHRPayroll(isHR);
    setModalOpen(true);
  };

  const handleDownloadPayslip = async (payroll, isHR = false) => {
    try {
      const endpoint = isHR
        ? `/hr/payroll/my-payslip/${payroll._id}/download`
        : `/hr/payroll/payslip-download/${payroll._id}`;
      const response = await axiosInstance.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payroll.employeeCode || 'HR'}_${payroll.month}_${payroll.year}.html`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download payslip'); }
  };

  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      if (filters.year && filters.year !== 'all') params.append('year', filters.year);
      if (filters.month && filters.month !== 'all') params.append('month', filters.month);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);

      const response = await axiosInstance.get(`/hr/payroll/employee-payrolls?${params.toString()}&limit=10000&excludeSelf=true`);
      if (response.data?.success && response.data?.data) {
        const XLSX = await import('xlsx');
        const excelData = response.data.data.map((p, i) => ({
          'SR #': i + 1, 'Employee ID': p.employeeCode || 'N/A', 'Employee Name': p.employeeName || 'N/A',
          'Email': p.employeeEmail || 'N/A', 'Department': p.employeeDepartment || 'N/A',
          'Position': p.employeePosition || 'N/A', 'Month': p.month, 'Year': p.year,
          'Basic Salary': p.salary || 0, 'Fuel Allowance': p.fuelAllowance || 0,
          'Medical Allowance': p.medicalAllowance || 0, 'Special Allowance': p.specialAllowance || 0,
          'Other Allowance': p.otherAllowance || 0, 'Total Salary': calculateTotalSalary(p),
          'Status': p.paymentStatus || 'Pending',
          'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, 'Employee Payroll Records');
        XLSX.writeFile(wb, `Payroll_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
        alert(`Exported ${excelData.length} records!`);
      } else {
        alert('No data to export');
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages)
      setFilters({ ...filters, page: newPage });
  };

  const handleFilterChange = (key, value) => setFilters({ ...filters, [key]: value, page: 1 });

  const handleResetFilters = () => setFilters({ year: new Date().getFullYear().toString(), month: 'all', status: 'all', page: 1, limit: 10 });

  const StatusBadge = ({ status }) => {
    if (status === 'Paid') return <Badge variant="success">Paid</Badge>;
    if (status === 'Pending') return <Badge variant="warning">Pending</Badge>;
    return <Badge variant="default">{status || 'Pending'}</Badge>;
  };

  useEffect(() => { getCurrentUser(); }, [getCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMyCurrentPayroll();
      fetchMyPayrollHistory();
      fetchMonthsYears();
      fetchEmployeePayrolls();
      fetchEmployeeStats();
    }
  }, [currentUser, filters]);

  // Display helpers
  const displayedHistory = showAllHistory ? myPayrollHistory : myPayrollHistory.slice(0, 4);

  if (loading && employeePayrolls.length === 0 && !myPayroll) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  const myCurrentTotal = myPayroll ? calculateTotalSalary(myPayroll) : 0;
  const myPaidTotal = myPayrollHistory
    .filter(p => p.paymentStatus === 'Paid')
    .reduce((sum, p) => sum + calculateTotalSalary(p), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PayslipModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedPayroll(null); }}
        payroll={selectedPayroll}
        isHR={isHRPayroll}
        axiosInstance={axiosInstance}
      />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaDollarSign className="text-indigo-600" /> Payroll Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage employee salaries and view your own payroll</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaDollarSign className="w-5 h-5" />
              <span className="text-sm">Payroll Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white rounded-t-xl">
          <nav className="flex gap-1 px-4">
            <button
              onClick={() => setActiveTab('my-salary')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'my-salary'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaUser className="w-4 h-4 inline mr-2" />
              My Salary
            </button>
            <button
              onClick={() => setActiveTab('employee-payroll')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'employee-payroll'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaUsers className="w-4 h-4 inline mr-2" />
              Employee Payroll Management
            </button>
          </nav>
        </div>

        {/* My Salary Tab */}
        {activeTab === 'my-salary' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <KpiCard title="My Current Salary" value={`PKR ${myCurrentTotal.toLocaleString()}`} icon={<FaDollarSign className="w-6 h-6 text-white" />} color="blue" />
              <KpiCard title="Total Paid (History)" value={`PKR ${myPaidTotal.toLocaleString()}`} icon={<FaCheckCircle className="w-6 h-6 text-white" />} color="green" />
              <KpiCard title="Total Records" value={myPayrollHistory.length} icon={<FaFileExcel className="w-6 h-6 text-white" />} color="purple" />
              <KpiCard title="Current Status" value={myPayroll?.paymentStatus || 'N/A'} icon={<FaClock className="w-6 h-6 text-white" />} color={myPayroll?.paymentStatus === 'Paid' ? 'emerald' : 'amber'} />
            </div>

            {/* My Current Payroll - Simplified */}
            {myPayroll && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Month Payroll</p>
                    <h2 className="text-xl font-bold text-gray-900">{myPayroll.month} {myPayroll.year}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewPayslip(myPayroll, true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                      <FaEye className="w-4 h-4" /> View Payslip
                    </button>
                    <button onClick={() => handleDownloadPayslip(myPayroll, true)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
                      <FaDownload className="w-4 h-4" /> Download
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Net Salary</p>
                    <p className="text-xl font-bold text-emerald-600">PKR {myCurrentTotal.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Basic Salary</p>
                    <p className="text-base font-semibold text-gray-800">PKR {(myPayroll.salary||0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Total Allowances</p>
                    <p className="text-base font-semibold text-indigo-600">+PKR {((myPayroll.fuelAllowance||0)+(myPayroll.medicalAllowance||0)+(myPayroll.specialAllowance||0)+(myPayroll.otherAllowance||0)).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Status</p>
                    <StatusBadge status={myPayroll.paymentStatus} />
                  </div>
                </div>
              </div>
            )}

            {/* My Payroll History */}
            {myPayrollHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FaCalendarAlt className="w-4 h-4 text-indigo-500" /> My Payroll History
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Basic Salary</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Allowances</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedHistory.map((payroll, idx) => {
                        const total = calculateTotalSalary(payroll);
                        const allowances = (payroll.fuelAllowance||0)+(payroll.medicalAllowance||0)+(payroll.specialAllowance||0)+(payroll.otherAllowance||0);
                        return (
                          <tr key={payroll._id || idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{payroll.month} {payroll.year}</td>
                            <td className="px-4 py-3 text-right text-sm">PKR {(payroll.salary||0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-sm text-emerald-600">+PKR {allowances.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-semibold text-indigo-600">PKR {total.toLocaleString()}</td>
                            <td className="px-4 py-3"><StatusBadge status={payroll.paymentStatus} /></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => handleViewPayslip(payroll, true)} className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg">
                                  <FaEye className="w-3 h-3" /> View
                                </button>
                                <button onClick={() => handleDownloadPayslip(payroll, true)} className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg">
                                  <FaDownload className="w-3 h-3" /> Download
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {myPayrollHistory.length > 4 && (
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="w-full py-3 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors border-t border-gray-100 bg-gray-50"
                  >
                    {showAllHistory ? (
                      <>Show Less <FaChevronUp className="text-xs" /></>
                    ) : (
                      <>Show All ({myPayrollHistory.length}) <FaChevronDown className="text-xs" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Employee Payroll Management Tab */}
        {activeTab === 'employee-payroll' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <KpiCard title="Total Employees" value={employeeStats.totalEmployees || 0} icon={<FaUsers className="w-6 h-6 text-white" />} color="indigo" />
              <KpiCard title="Total Payroll" value={`PKR ${((employeeStats.totalPayrollAmount || 0) / 1000000).toFixed(1)}M`} icon={<FaDollarSign className="w-6 h-6 text-white" />} color="purple" />
              <KpiCard title="Paid This Month" value={employeeStats.paidCount || 0} icon={<FaCheckCircle className="w-6 h-6 text-white" />} color="emerald" />
              <KpiCard title="Pending Payments" value={employeeStats.pendingCount || 0} icon={<FaClock className="w-6 h-6 text-white" />} color="amber" />
            </div>

            {/* Employee Payroll Records Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <FaUsers className="text-indigo-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Employee Payroll Records</p>
                    <p className="text-xs text-gray-400">{pagination.total} records found</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportToExcel} disabled={exportLoading} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                    <FaDownload className="w-3.5 h-3.5" /> Export Excel
                  </button>
                  <button onClick={() => { fetchEmployeePayrolls(); fetchEmployeeStats(); }} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
                    <FaSyncAlt className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="p-4 border-b border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <select value={filters.year} onChange={(e) => handleFilterChange('year', e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Years</option>
                    {monthsYears.years?.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={filters.month} onChange={(e) => handleFilterChange('month', e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Months</option>
                    {monthsYears.months?.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                  <button onClick={handleResetFilters} className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <FaFilter className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employeePayrolls.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          <FaFileExcel className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No payroll records found</p>
                        </td>
                      </tr>
                    ) : (
                      employeePayrolls.map((payroll) => {
                        const totalSalary = calculateTotalSalary(payroll);
                        return (
                          <tr key={payroll._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm text-gray-800">{payroll.employeeName || 'Unknown'}</div>
                              <div className="text-xs text-gray-400">{payroll.employeeCode || ''}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600">{payroll.employeeDepartment || 'N/A'}</span>
                              <div className="text-xs text-gray-400">{payroll.employeePosition || ''}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-800">{payroll.month || 'N/A'}</div>
                              <div className="text-xs text-gray-400">{payroll.year || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="text-sm text-gray-800">PKR {(payroll.salary || 0).toLocaleString()}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="text-sm font-bold text-emerald-600">PKR {totalSalary.toLocaleString()}</div>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={payroll.paymentStatus} /></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => handleViewPayslip(payroll, false)} className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors">
                                  <FaEye className="w-3 h-3" /> View
                                </button>
                                <button onClick={() => handleDownloadPayslip(payroll, false)} className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors">
                                  <FaDownload className="w-3 h-3" /> Download
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <span className="text-sm text-gray-500">
                    Showing {((pagination.currentPage - 1) * filters.limit) + 1} to {Math.min(pagination.currentPage * filters.limit, pagination.total)} of {pagination.total}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      <FaChevronLeft className="w-4 h-4 inline" /> Previous
                    </button>
                    <span className="px-3 py-1.5 text-sm text-gray-600">Page {pagination.currentPage} of {pagination.totalPages}</span>
                    <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      Next <FaChevronRight className="w-4 h-4 inline" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HRPayrollDashboard;