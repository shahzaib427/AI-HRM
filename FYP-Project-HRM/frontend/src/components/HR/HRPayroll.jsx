import React, { useState, useEffect } from "react";
import { 
  FaSearch, 
  FaMoneyBillWave, 
  FaCalendarAlt, 
  FaDownload, 
  FaFilter,
  FaRupeeSign,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaFileInvoiceDollar,
  FaUsers,
  FaCalculator,
  FaRegCalendarCheck,
  FaPlus,
  FaSync,
  FaEye,
  FaTrash,
  FaEdit,
  FaUserTie
} from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";

const HRPayrollDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeStatus, setActiveStatus] = useState("All");
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalEmployees: 0,
    processed: 0,
    pending: 0,
    cancelled: 0,
    averageSalary: 0
  });
  
  const [newPayroll, setNewPayroll] = useState({
    employeeId: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    basicSalary: '',
    allowances: '0',
    deductions: '0',
    bonus: '0',
    notes: ''
  });

  const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 10000
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
    fetchDepartments();
    fetchPayrollStatistics();
  }, []);

  // Fetch all payroll records
  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeStatus !== "All") params.append('status', activeStatus);
      if (selectedDepartment !== "All") params.append('department', selectedDepartment);
      
      const res = await axiosInstance.get(`/admin/payroll?${params.toString()}`);
      if (res.data.success) {
        setPayrolls(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      alert('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees for dropdown
  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.get('/admin/payroll/employees');
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      // This would come from your backend
      const departmentsList = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'All'];
      setDepartments(departmentsList);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fetch payroll statistics
  const fetchPayrollStatistics = async () => {
    try {
      const res = await axiosInstance.get('/admin/payroll/statistics');
      if (res.data.success) {
        const data = res.data.data;
        setStats({
          totalAmount: data.summary?.totalNetSalary || 0,
          totalEmployees: payrolls.length,
          processed: payrolls.filter(p => p.status === 'Processed').length,
          pending: payrolls.filter(p => p.status === 'Pending').length,
          cancelled: payrolls.filter(p => p.status === 'Cancelled').length,
          averageSalary: data.summary?.recordCount > 0 
            ? Math.round(data.summary.totalNetSalary / data.summary.recordCount) 
            : 0
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Filter payroll data based on search
  const filteredData = payrolls.filter(
    (item) =>
      (item.employee?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.employee?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.employee?.department?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (activeStatus === "All" || item.status === activeStatus) &&
      (selectedDepartment === "All" || item.employee?.department === selectedDepartment)
  );

  // Handle adding new payroll
  const handleAddPayroll = async () => {
    if (!newPayroll.employeeId || !newPayroll.basicSalary) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        employeeId: newPayroll.employeeId,
        month: newPayroll.month,
        year: Number(newPayroll.year),
        basicSalary: parseFloat(newPayroll.basicSalary),
        allowances: parseFloat(newPayroll.allowances || 0),
        deductions: parseFloat(newPayroll.deductions || 0),
        bonus: parseFloat(newPayroll.bonus || 0),
        notes: newPayroll.notes
      };

      const res = await axiosInstance.post('/admin/payroll', payload);
      if (res.data.success) {
        alert('Payroll entry added successfully!');
        setShowAddModal(false);
        setNewPayroll({
          employeeId: '',
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear(),
          basicSalary: '',
          allowances: '0',
          deductions: '0',
          bonus: '0',
          notes: ''
        });
        fetchPayrolls();
        fetchPayrollStatistics();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add payroll');
    } finally {
      setLoading(false);
    }
  };

  // Handle processing payroll for a month
  const handleProcessPayroll = async () => {
    const month = selectedMonth.toLocaleString('default', { month: 'long' });
    const year = selectedMonth.getFullYear();
    
    if (!window.confirm(`Process payroll for ${month} ${year}? This will mark all pending payrolls as processed.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.post('/admin/payroll/process', {
        month,
        year
      });
      
      if (res.data.success) {
        alert(`Successfully processed ${res.data.processedCount} payroll records`);
        setShowProcessModal(false);
        fetchPayrolls();
        fetchPayrollStatistics();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to process payroll');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting payroll
  const handleDeletePayroll = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payroll record?')) {
      return;
    }

    try {
      const res = await axiosInstance.delete(`/admin/payroll/${id}`);
      if (res.data.success) {
        alert('Payroll record deleted successfully');
        fetchPayrolls();
        fetchPayrollStatistics();
      }
    } catch (error) {
      alert('Failed to delete payroll record');
    }
  };

  // Handle updating payroll status
  const handleUpdateStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Processed' ? 'Pending' : 'Processed';
    
    if (!window.confirm(`Change status to ${newStatus}?`)) {
      return;
    }

    try {
      const res = await axiosInstance.patch(`/admin/payroll/${id}/status`, {
        status: newStatus
      });
      
      if (res.data.success) {
        fetchPayrolls();
        fetchPayrollStatistics();
      }
    } catch (error) {
      alert('Failed to update status');
    }
  };

  // Handle downloading payslip
  const handleDownloadPayslip = (id) => {
    window.open(`http://localhost:5000/api/admin/payroll/${id}/payslip?print=true`, '_blank');
  };

  // Handle viewing payroll details
  const handleViewDetails = async (id) => {
    try {
      const res = await axiosInstance.get(`/admin/payroll/${id}`);
      if (res.data.success) {
        // You can show this in a modal or redirect to details page
        console.log('Payroll details:', res.data.data);
        // For now, just open the payslip
        window.open(`http://localhost:5000/api/admin/payroll/${id}/payslip`, '_blank');
      }
    } catch (error) {
      alert('Failed to fetch payroll details');
    }
  };

  // Format currency for PKR
  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-PK', { 
      style: 'currency', 
      currency: 'PKR', 
      minimumFractionDigits: 0 
    }).format(amount || 0);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const config = {
      Processed: { label: "Processed", color: "bg-green-100 text-green-800", icon: FaCheckCircle },
      Pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: FaClock },
      Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: FaTimesCircle },
    };
    
    const { label, color, icon: Icon } = config[status] || { 
      label: status || "Unknown", 
      color: "bg-gray-100 text-gray-800", 
      icon: FaClock 
    };
    
    return (
      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${color} flex items-center gap-1`}>
        <Icon className="text-xs" /> {label}
      </span>
    );
  };

  // Get month name from Date object
  const getMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long' });
  };

  // Handle input changes for new payroll form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPayroll(prev => ({ ...prev, [name]: value }));
  };

  // Calculate net salary
  const calculateNetSalary = () => {
    const basic = parseFloat(newPayroll.basicSalary) || 0;
    const allowances = parseFloat(newPayroll.allowances) || 0;
    const deductions = parseFloat(newPayroll.deductions) || 0;
    const bonus = parseFloat(newPayroll.bonus) || 0;
    return basic + allowances + bonus - deductions;
  };

  // Months array for dropdown
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Years array for dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FaUserTie className="text-blue-600" /> HR Payroll Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Manage and process employee payrolls</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPayrolls}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                title="Refresh Data"
              >
                <FaSync />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg"
              >
                <FaPlus /> Add Payroll
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Payroll Amount</p>
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</h3>
                <p className="text-xs text-gray-500 mt-1">{stats.totalEmployees} employees</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <FaMoneyBillWave className="text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processed</p>
                <h3 className="text-2xl font-bold mt-1 text-green-600">{stats.processed}</h3>
                <p className="text-xs text-gray-500 mt-1">Paid this month</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <FaCheckCircle className="text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <h3 className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</h3>
                <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                <FaClock className="text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Salary</p>
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.averageSalary)}</h3>
                <p className="text-xs text-gray-500 mt-1">Monthly average</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <FaUsers className="text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full md:w-64"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="All">All Status</option>
                  <option value="Processed">Processed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="All">All Departments</option>
                  {departments.filter(dept => dept !== 'All').map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowProcessModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg"
              >
                <FaCalculator /> Process Payroll
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg">
                <FaDownload /> Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Employee</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Department</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Period</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Net Salary</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Status</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Payment Date</th>
                  <th className="py-4 px-4 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading payroll data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((payroll) => (
                    <tr key={payroll._id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">
                          {payroll.employee?.firstName} {payroll.employee?.lastName}
                        </div>
                        <div className="text-sm text-blue-600">{payroll.employee?.employeeId}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {payroll.employee?.department || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          <FaRegCalendarCheck className="text-gray-400" />
                          {payroll.month} {payroll.year}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900">{formatCurrency(payroll.netSalary)}</div>
                        <div className="text-xs text-gray-500">
                          Basic: {formatCurrency(payroll.basicSalary)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={payroll.status} />
                      </td>
                      <td className="py-4 px-4">
                        <div className={`${payroll.paymentDate ? "text-green-600" : "text-gray-500"}`}>
                          {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadPayslip(payroll._id)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                            title="Download Payslip"
                          >
                            <FaDownload />
                          </button>
                          <button
                            onClick={() => handleViewDetails(payroll._id)}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(payroll._id, payroll.status)}
                            className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200"
                            title="Toggle Status"
                          >
                            {payroll.status === 'Processed' ? <FaClock /> : <FaCheckCircle />}
                          </button>
                          <button
                            onClick={() => handleDeletePayroll(payroll._id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <div className="text-gray-400 text-5xl mb-4">💰</div>
                      <h3 className="text-xl font-medium text-gray-700 mb-2">No payroll records found</h3>
                      <p className="text-gray-500">Try a different search or add a new payroll entry</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Payroll Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Employees:</span>
                <span className="font-bold">{stats.totalEmployees}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-green-600">{formatCurrency(stats.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Processed:</span>
                <span className="font-bold text-green-600">{stats.processed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending:</span>
                <span className="font-bold text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cancelled:</span>
                <span className="font-bold text-red-600">{stats.cancelled}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 lg:col-span-2">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => setShowAddModal(true)}
                className="p-4 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors text-center"
              >
                <FaPlus className="text-green-600 text-2xl mx-auto mb-2" />
                <span className="text-sm font-medium">Add Payroll</span>
              </button>
              <button 
                onClick={() => setShowProcessModal(true)}
                className="p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors text-center"
              >
                <FaCalculator className="text-blue-600 text-2xl mx-auto mb-2" />
                <span className="text-sm font-medium">Process Payroll</span>
              </button>
              <button className="p-4 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors text-center">
                <FaFileInvoiceDollar className="text-purple-600 text-2xl mx-auto mb-2" />
                <span className="text-sm font-medium">Generate Payslips</span>
              </button>
              <button className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 hover:bg-yellow-100 transition-colors text-center">
                <FaDownload className="text-yellow-600 text-2xl mx-auto mb-2" />
                <span className="text-sm font-medium">Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Payroll Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Payroll Entry</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                <select
                  name="employeeId"
                  value={newPayroll.employeeId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeId}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  name="month"
                  value={newPayroll.month}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  name="year"
                  value={newPayroll.year}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary *</label>
                <input
                  type="number"
                  name="basicSalary"
                  value={newPayroll.basicSalary}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowances</label>
                <input
                  type="number"
                  name="allowances"
                  value={newPayroll.allowances}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bonus</label>
                <input
                  type="number"
                  name="bonus"
                  value={newPayroll.bonus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deductions</label>
                <input
                  type="number"
                  name="deductions"
                  value={newPayroll.deductions}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Net Salary</label>
                <input
                  type="text"
                  value={formatCurrency(calculateNetSalary())}
                  readOnly
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-green-700"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                name="notes"
                value={newPayroll.notes}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows="3"
                placeholder="Any additional notes..."
              />
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayroll}
                disabled={loading || !newPayroll.employeeId || !newPayroll.basicSalary}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Payroll Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Payroll Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Process Payroll</h3>
              <button 
                onClick={() => setShowProcessModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <DatePicker
                  selected={selectedMonth}
                  onChange={(date) => setSelectedMonth(date)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                />
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  This will process payroll for <strong>{getMonthName(selectedMonth)} {selectedMonth.getFullYear()}</strong> 
                  and mark all pending payrolls as processed. Are you sure you want to proceed?
                </p>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowProcessModal(false)}
                  className="px-5 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessPayroll}
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process Payroll'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRPayrollDashboard;