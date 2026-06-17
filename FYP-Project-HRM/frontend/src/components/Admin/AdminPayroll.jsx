import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import { 
  Download, Upload, FileSpreadsheet,
  Send, CheckCircle, Clock,
  Filter, RefreshCw, 
  Eye, Edit,
  ChevronLeft, ChevronRight,
  Printer, AlertCircle,
  User, DollarSign, Users, Search,
  Plus
} from 'lucide-react';

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger:  'bg-red-100 text-red-700',
    info:    'bg-blue-100 text-blue-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const KpiCard = ({ title, value, icon, color }) => {
  const colors = {
    blue:   'bg-blue-500',
    green:  'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
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

const AdminPayroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({ totalPayrolls: 0, pendingPayments: 0, paidPayments: 0, totalAmount: 0 });
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [monthsYears, setMonthsYears] = useState({ months: [], years: [] });
  const [filters, setFilters] = useState({ year: new Date().getFullYear().toString(), month: 'all', status: 'all', page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkYear, setBulkYear] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [updateData, setUpdateData] = useState({ salary: '', fuelAllowance: '', medicalAllowance: '', specialAllowance: '', otherAllowance: '', notes: '' });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, currentPage: 1 });
  const [exportLoading, setExportLoading] = useState(false);
  const [bulkPaymentDetails, setBulkPaymentDetails] = useState({ paymentMethod: 'Bank Transfer', transactionId: '', notes: '', selectedPayrolls: [] });
  const [bulkPaymentProcessing, setBulkPaymentProcessing] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  useEffect(() => {
    fetchPayrolls();
    fetchStats();
    fetchEmployees();
    fetchMonthsYears();
  }, [filters]);

  useEffect(() => {
    if (employeeSearch.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const searchTerm = employeeSearch.toLowerCase();
      setFilteredEmployees(employees.filter(emp =>
        (emp.name || '').toLowerCase().includes(searchTerm) ||
        (emp.department || '').toLowerCase().includes(searchTerm)
      ));
    }
  }, [employeeSearch, employees]);

  const calculateTotalSalary = (payroll) =>
    (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
    (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
    (payroll.otherAllowance || 0);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ ...filters, page: filters.page.toString(), limit: filters.limit.toString() }).toString();
      const res = await axiosInstance.get(`/admin/payroll?${params}`);
      if (res.data.success) {
        setPayrolls(res.data.data || []);
        setPagination({ total: res.data.total || 0, totalPages: res.data.totalPages || 1, currentPage: res.data.currentPage || 1 });
      }
    } catch (error) {
      console.error('Payrolls fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ month: filters.month, year: filters.year }).toString();
      const res = await axiosInstance.get(`/admin/payroll/stats?${params}`);
      setStats(res.data.data || {});
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get('/admin/payroll/employees');
      const employeesData = response.data.data || [];
      setEmployees(employeesData);
      setFilteredEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchMonthsYears = async () => {
    try {
      const res = await axiosInstance.get('/admin/payroll/months-years');
      if (res.data.success && res.data.data) {
        setMonthsYears(res.data.data);
      } else {
        const currentYear = new Date().getFullYear();
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
        setMonthsYears({ months, years });
      }
    } catch (error) {
      console.error('Months/Years error:', error);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedMonth || !selectedYear) {
      alert('Please select employee, month and year');
      return;
    }
    try {
      setGenerating(true);
      const response = await axiosInstance.post('/admin/payroll/generate', {
        employeeId: selectedEmployee, month: selectedMonth, year: parseInt(selectedYear)
      });
      if (response.data.success) {
        alert('Payroll generated successfully!');
        setShowGenerateModal(false);
        setSelectedEmployee(''); setSelectedMonth(''); setSelectedYear(''); setEmployeeSearch('');
        fetchPayrolls(); fetchStats();
      }
    } catch (error) {
      alert(error.response?.data?.error || error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    if (!bulkMonth || !bulkYear) { alert('Please select Month and Year'); return; }
    try {
      setGenerating(true);
      const employeeIds = employees.map(emp => emp._id).filter(Boolean);
      if (employeeIds.length === 0) { alert('No active employees found'); return; }
      const res = await axiosInstance.post('/admin/payroll/bulk-generate', { employeeIds, month: bulkMonth, year: parseInt(bulkYear) });
      if (res.data.success) alert(res.data.message || 'Bulk payroll generated successfully!');
      setShowBulkModal(false); setBulkMonth(''); setBulkYear('');
      fetchPayrolls(); fetchStats();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate bulk payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await axiosInstance.delete(`/admin/payroll/${id}`);
      fetchPayrolls(); fetchStats();
      alert('Payroll deleted successfully!');
    } catch (error) {
      alert('Delete failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axiosInstance.patch(`/admin/payroll/${id}/status`, {
        paymentStatus: status,
        paymentDate: status === 'Paid' ? new Date().toISOString() : null,
        transactionId: status === 'Paid' ? `TRX${Date.now()}${Math.floor(Math.random() * 1000)}` : null
      });
      fetchPayrolls(); fetchStats();
      alert('Status updated successfully!');
    } catch (error) {
      alert('Status update failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleOpenUpdateModal = (payroll) => {
    setSelectedPayroll(payroll);
    setUpdateData({
      salary: payroll.salary || '', fuelAllowance: payroll.fuelAllowance || '',
      medicalAllowance: payroll.medicalAllowance || '', specialAllowance: payroll.specialAllowance || '',
      otherAllowance: payroll.otherAllowance || '', notes: payroll.notes || ''
    });
    setShowUpdateModal(true);
  };

  const handleUpdatePayroll = async (e) => {
    e.preventDefault();
    if (!selectedPayroll) return;
    try {
      setGenerating(true);
      await axiosInstance.put(`/admin/payroll/${selectedPayroll._id}`, {
        salary: parseFloat(updateData.salary) || 0,
        fuelAllowance: parseFloat(updateData.fuelAllowance) || 0,
        medicalAllowance: parseFloat(updateData.medicalAllowance) || 0,
        specialAllowance: parseFloat(updateData.specialAllowance) || 0,
        otherAllowance: parseFloat(updateData.otherAllowance) || 0,
        notes: updateData.notes
      });
      setShowUpdateModal(false);
      fetchPayrolls(); fetchStats();
      alert('Payroll updated successfully!');
    } catch (error) {
      alert('Update failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setGenerating(false);
    }
  };

  // FIX: Was using unauthenticated window.open(localhost:5000/...) which hits a
  //      protected route and returns 401. Now uses axiosInstance (which sends the
  //      Bearer token) with responseType 'blob', then creates a temporary object URL.
  const handleDownloadPayslip = async (payrollId) => {
    try {
      const response = await axiosInstance.get(`/admin/payroll/payslip/${payrollId}/download`, {
        responseType: 'blob'
      });
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `payslip-${payrollId}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Download failed: ' + (error.response?.data?.error || error.message));
    }
  };

  // View payslip in a new tab — still generated client-side from fetched data
  const handleViewPayslip = async (payrollId) => {
    try {
      const response = await axiosInstance.get(`/admin/payroll/${payrollId}`);
      if (!response.data.success || !response.data.data) throw new Error('Failed to fetch payroll data');
      const payroll = response.data.data;
      const totalSalary = calculateTotalSalary(payroll);

      const html = `<!DOCTYPE html><html><head><title>Payslip - ${payroll.employeeName || 'Employee'}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:40px}
      .payslip{max-width:900px;margin:0 auto;background:white;border-radius:16px;overflow:hidden}
      .header{background:linear-gradient(135deg,#1e3c72,#2a5298);color:white;padding:30px;text-align:center}
      .company-name{font-size:28px;font-weight:bold}.section{padding:30px;border-bottom:1px solid #e2e8f0}
      .section-title{font-size:18px;font-weight:bold;color:#1e3c72;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:10px}
      .info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
      .info-item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #cbd5e1}
      .label{font-weight:600;color:#475569}table{width:100%;border-collapse:collapse}
      th,td{padding:12px;text-align:left;border-bottom:1px solid #e2e8f0}th{background:#f1f5f9}
      .amount{text-align:right}.total-row{background:#f1f5f9;font-weight:bold}
      .footer{padding:20px;text-align:center;background:#f8fafc;font-size:12px;color:#666}
      .status-paid{color:#10b981;font-weight:bold}.status-pending{color:#f59e0b;font-weight:bold}
      button{margin-top:20px;padding:10px 24px;background:#1e3c72;color:white;border:none;border-radius:8px;cursor:pointer}
      @media print{body{background:white;padding:0}button{display:none}}</style></head><body>
      <div class="payslip"><div class="header"><div class="company-name">HRM SYSTEM</div>
      <div style="margin-top:10px">MONTHLY PAYSLIP - ${payroll.month} ${payroll.year}</div></div>
      <div class="section"><div class="section-title">Employee Information</div><div class="info-grid">
      <div class="info-item"><span class="label">Employee ID:</span><span>${payroll.employeeCode||'N/A'}</span></div>
      <div class="info-item"><span class="label">Name:</span><span>${payroll.employeeName||'N/A'}</span></div>
      <div class="info-item"><span class="label">Department:</span><span>${payroll.employeeDepartment||'N/A'}</span></div>
      <div class="info-item"><span class="label">Position:</span><span>${payroll.employeePosition||'N/A'}</span></div>
      <div class="info-item"><span class="label">Status:</span>
      <span class="${payroll.paymentStatus==='Paid'?'status-paid':'status-pending'}">${payroll.paymentStatus||'Pending'}</span></div>
      </div></div>
      <div class="section"><div class="section-title">Salary Details</div>
      <table><thead><tr><th>Description</th><th class="amount">Amount (PKR)</th></tr></thead><tbody>
      <tr><td>Basic Salary</td><td class="amount">${(payroll.salary||0).toLocaleString()}</td></tr>
      <tr><td>Fuel Allowance</td><td class="amount">${(payroll.fuelAllowance||0).toLocaleString()}</td></tr>
      <tr><td>Medical Allowance</td><td class="amount">${(payroll.medicalAllowance||0).toLocaleString()}</td></tr>
      <tr><td>Special Allowance</td><td class="amount">${(payroll.specialAllowance||0).toLocaleString()}</td></tr>
      <tr><td>Other Allowance</td><td class="amount">${(payroll.otherAllowance||0).toLocaleString()}</td></tr>
      <tr class="total-row"><td><strong>TOTAL SALARY</strong></td><td class="amount"><strong>PKR ${totalSalary.toLocaleString()}</strong></td></tr>
      </tbody></table></div>
      <div class="footer"><div>Generated: ${new Date().toLocaleString()}</div>
      <button onclick="window.print()">Print Payslip</button></div></div></body></html>`;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      alert('Failed to generate payslip: ' + error.message);
    }
  };

  const handleExportSinglePayroll = (payroll) => {
    const totalSalary = calculateTotalSalary(payroll);
    const excelData = [{
      'Employee ID': payroll.employeeCode || 'N/A', 'Employee Name': payroll.employeeName || 'N/A',
      'Department': payroll.employeeDepartment || 'N/A', 'Month': payroll.month, 'Year': payroll.year,
      'Basic Salary': payroll.salary || 0, 'Fuel Allowance': payroll.fuelAllowance || 0,
      'Medical Allowance': payroll.medicalAllowance || 0, 'Special Allowance': payroll.specialAllowance || 0,
      'Other Allowance': payroll.otherAllowance || 0, 'Total Salary': totalSalary,
      'Status': payroll.paymentStatus || 'Pending'
    }];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `Payroll_${payroll.employeeCode}_${payroll.month}_${payroll.year}.xlsx`);
    alert('Exported successfully!');
  };

  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      const response = await axiosInstance.get('/admin/payroll/export/excel', {
        params: { year: filters.year, month: filters.month, status: filters.status }
      });
      const allPayrolls = response.data.data || [];
      if (allPayrolls.length === 0) { alert('No payroll records found'); return; }
      const excelData = allPayrolls.map((p, i) => ({
        'SR #': i + 1, 'Employee ID': p.employeeCode || 'N/A', 'Employee Name': p.employeeName || 'N/A',
        'Department': p.employeeDepartment || 'N/A', 'Month': p.month, 'Year': p.year,
        'Basic Salary': p.salary || 0, 'Fuel Allowance': p.fuelAllowance || 0,
        'Medical Allowance': p.medicalAllowance || 0, 'Special Allowance': p.specialAllowance || 0,
        'Other Allowance': p.otherAllowance || 0, 'Total Salary': calculateTotalSalary(p),
        'Status': p.paymentStatus || 'Pending'
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Records');
      XLSX.writeFile(wb, `Payroll_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      alert(`Exported ${allPayrolls.length} records!`);
    } catch (error) {
      alert('Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenBulkPaymentModal = () => {
    const pendingPayrolls = payrolls.filter(p => p.paymentStatus === 'Pending');
    setBulkPaymentDetails({ paymentMethod: 'Bank Transfer', transactionId: '', notes: '', selectedPayrolls: pendingPayrolls.map(p => p._id) });
    setShowBulkPaymentModal(true);
  };

  const handleTogglePayrollSelection = (payrollId) => {
    setBulkPaymentDetails(prev => ({
      ...prev,
      selectedPayrolls: prev.selectedPayrolls.includes(payrollId)
        ? prev.selectedPayrolls.filter(id => id !== payrollId)
        : [...prev.selectedPayrolls, payrollId]
    }));
  };

  const handleBulkPayment = async () => {
    if (bulkPaymentDetails.selectedPayrolls.length === 0) { alert('Please select at least one payroll'); return; }
    if (!bulkPaymentDetails.transactionId) { alert('Please enter a transaction ID'); return; }
    try {
      setBulkPaymentProcessing(true);
      const response = await axiosInstance.post('/admin/payroll/bulk-payment', {
        payrollIds: bulkPaymentDetails.selectedPayrolls,
        paymentMethod: bulkPaymentDetails.paymentMethod,
        transactionId: bulkPaymentDetails.transactionId,
        notes: bulkPaymentDetails.notes
      });
      if (response.data.success) alert(`Processed ${response.data.data?.success?.length || 0} payrolls`);
      fetchPayrolls(); fetchStats();
      setShowBulkPaymentModal(false);
    } catch (error) {
      alert('Bulk payment failed');
    } finally {
      setBulkPaymentProcessing(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages)
      setFilters({ ...filters, page: newPage });
  };

  const StatusBadge = ({ status }) => {
    if (status === 'Paid')    return <Badge variant="success">Paid</Badge>;
    if (status === 'Pending') return <Badge variant="warning">Pending</Badge>;
    return <Badge variant="default">{status || 'Pending'}</Badge>;
  };

  if (loading && payrolls.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employee salaries, generate payslips, and process payments</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <KpiCard title="Total Payrolls"  value={stats.totalPayrolls || 0}                                      icon={<FileSpreadsheet className="w-6 h-6 text-white" />} color="blue"   />
          <KpiCard title="Paid"            value={stats.paidPayments || 0}                                       icon={<CheckCircle      className="w-6 h-6 text-white" />} color="green"  />
          <KpiCard title="Pending"         value={stats.pendingPayments || 0}                                    icon={<Clock            className="w-6 h-6 text-white" />} color="yellow" />
          <KpiCard title="Total Amount"    value={`PKR ${(stats.totalAmount || 0).toLocaleString()}`}            icon={<DollarSign       className="w-6 h-6 text-white" />} color="purple" />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={handleOpenBulkPaymentModal} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <Send className="w-4 h-4" /> Bulk Payment
          </button>
          <button onClick={() => setShowBulkModal(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <Users className="w-4 h-4" /> Bulk Generate
          </button>
          <button onClick={() => setShowGenerateModal(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Individual
          </button>
          <button onClick={handleExportToExcel} disabled={exportLoading} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value, page: 1 })} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">All Years</option>
              {monthsYears.years?.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value, page: 1 })} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Months</option>
              {monthsYears.months?.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
            <button onClick={() => setFilters({ year: '', month: 'all', status: 'all', page: 1, limit: 10 })} className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Payroll Records</h3>
                <p className="text-xs text-gray-400 mt-0.5">{payrolls.length} of {pagination.total} records</p>
              </div>
              <div className="text-sm text-gray-500">Page {pagination.currentPage} of {pagination.totalPages}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No payroll records found</p>
                      <button onClick={() => setShowGenerateModal(true)} className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">Click to generate payroll</button>
                    </td>
                  </tr>
                ) : (
                  payrolls.map((payroll) => {
                    const totalSalary = calculateTotalSalary(payroll);
                    return (
                      <tr key={payroll._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm text-gray-800">{payroll.employeeName || 'Unknown'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{payroll.employeeDepartment || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{payroll.employeeCode || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm text-gray-800">{payroll.month || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{payroll.year || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-gray-800">PKR {(payroll.salary || 0).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-bold text-green-600">PKR {totalSalary.toLocaleString()}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            +{((payroll.fuelAllowance||0)+(payroll.medicalAllowance||0)+(payroll.specialAllowance||0)+(payroll.otherAllowance||0)).toLocaleString()} allowances
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={payroll.paymentStatus} />
                          {payroll.paymentDate && <div className="text-xs text-gray-400 mt-1">{new Date(payroll.paymentDate).toLocaleDateString()}</div>}
                        </td>
                        <td className="px-6 py-4">
                          {payroll.bankName ? (
                            <div>
                              <div className="font-medium text-xs text-gray-700">{payroll.bankName}</div>
                              {payroll.bankAccountNumber && (
                                <div className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full inline-block mt-1">
                                  ****{payroll.bankAccountNumber.slice(-4)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> No bank details
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => handleViewPayslip(payroll._id)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View
                            </button>
                            {/* FIX: now calls authenticated axiosInstance instead of window.open */}
                            <button onClick={() => handleDownloadPayslip(payroll._id)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1">
                              <Printer className="w-3 h-3" /> PDF
                            </button>
                            <button onClick={() => handleExportSinglePayroll(payroll)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1">
                              <Download className="w-3 h-3" /> Excel
                            </button>
                            <button onClick={() => handleOpenUpdateModal(payroll)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1">
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <select
                              onChange={(e) => handleStatusUpdate(payroll._id, e.target.value)}
                              value={payroll.paymentStatus || 'Pending'}
                              className="px-2 py-1.5 border border-gray-300 rounded text-xs font-medium bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Paid">Paid</option>
                            </select>
                            <button onClick={() => handleDelete(payroll._id)} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded transition-colors flex items-center gap-1">
                              Delete
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

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.currentPage - 1) * filters.limit) + 1} to {Math.min(pagination.currentPage * filters.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                    <ChevronLeft className="w-4 h-4 inline" /> Previous
                  </button>
                  <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                    Next <ChevronRight className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Individual Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Generate Individual Payroll</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleGeneratePayroll} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee *</label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="text" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Search employees..." />
                </div>
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required size="5">
                  <option value="">-- Choose Employee --</option>
                  {filteredEmployees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} - {emp.department}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required>
                    <option value="">Select Month</option>
                    {monthsYears.months?.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required>
                    <option value="">Select Year</option>
                    {monthsYears.years?.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {generating ? 'Generating...' : 'Generate Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Bulk Generate Payroll</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleBulkGenerate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <select value={bulkMonth} onChange={(e) => setBulkMonth(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required>
                    <option value="">Select Month</option>
                    {monthsYears.months?.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required>
                    <option value="">Select Year</option>
                    {monthsYears.years?.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg">
                <p className="text-xs text-amber-700">This will generate payroll for all {employees.length} active employees.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {generating ? 'Generating...' : 'Bulk Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Bulk Salary Payment</h3>
              <button onClick={() => setShowBulkPaymentModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={bulkPaymentDetails.paymentMethod} onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, paymentMethod: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option>Bank Transfer</option><option>Cash</option><option>Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID *</label>
                  <input type="text" value={bulkPaymentDetails.transactionId} onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, transactionId: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="TRX-2024-001" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={bulkPaymentDetails.notes} onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, notes: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows="2" placeholder="Additional notes..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setBulkPaymentDetails({...bulkPaymentDetails, selectedPayrolls: payrolls.filter(p => p.paymentStatus === 'Pending').map(p => p._id)})} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100">
                  Select All Pending
                </button>
                <button onClick={() => setBulkPaymentDetails({...bulkPaymentDetails, selectedPayrolls: []})} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
                  Clear All
                </button>
                <div className="ml-auto text-sm font-medium text-gray-700">Selected: {bulkPaymentDetails.selectedPayrolls.length}</div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 font-medium text-gray-700 border-b border-gray-200 text-sm">Select Payrolls for Payment</div>
                <div className="max-h-64 overflow-y-auto">
                  {payrolls.filter(p => p.paymentStatus === 'Pending').map(payroll => (
                    <div key={payroll._id} className="p-3 border-t border-gray-100 flex items-center gap-3 hover:bg-gray-50">
                      <input type="checkbox" checked={bulkPaymentDetails.selectedPayrolls.includes(payroll._id)} onChange={() => handleTogglePayrollSelection(payroll._id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                      <div>
                        <div className="font-medium text-sm text-gray-800">{payroll.employeeName}</div>
                        <div className="text-xs text-gray-500">{payroll.month} {payroll.year} • PKR {calculateTotalSalary(payroll).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowBulkPaymentModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleBulkPayment} disabled={bulkPaymentProcessing} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {bulkPaymentProcessing ? 'Processing...' : 'Process Bulk Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showUpdateModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Edit Payroll Details</h3>
              <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdatePayroll} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['salary','Basic Salary'],['fuelAllowance','Fuel Allowance'],['medicalAllowance','Medical Allowance'],['specialAllowance','Special Allowance'],['otherAllowance','Other Allowance']].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type="number" value={updateData[field]} onChange={(e) => setUpdateData({...updateData, [field]: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={updateData.notes} onChange={(e) => setUpdateData({...updateData, notes: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows="3" placeholder="Additional notes..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {generating ? 'Updating...' : 'Update Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayroll;