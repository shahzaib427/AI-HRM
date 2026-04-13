import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import { 
  Download, Upload, FileSpreadsheet, FileDown,
  Send, CheckCircle, Clock, XCircle,
  Filter, RefreshCw, Plus, 
  Eye, Edit, Calendar,
  ChevronLeft, ChevronRight,
  Printer, Mail, AlertCircle, Loader2,
  CreditCard, Wallet, Banknote, Building,
  User, DollarSign, Users, Search
} from 'lucide-react';

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-indigo-50 text-indigo-700'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

// KPI Card Component with colored icons and subtitles
const KpiCard = ({ label, value, sub, icon, iconBg }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
    </div>
  </div>
);

const AdminPayroll = () => {
  // State Variables
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({
    totalPayrolls: 0,
    pendingPayments: 0,
    paidPayments: 0,
    failedPayments: 0,
    totalAmount: 0,
    averageSalary: 0
  });
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [monthsYears, setMonthsYears] = useState({ 
    months: [], 
    years: [] 
  });
  const [filters, setFilters] = useState({ 
    year: new Date().getFullYear().toString(), 
    month: 'all', 
    status: 'all',
    page: 1, 
    limit: 10 
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkYear, setBulkYear] = useState('');
  const [bulkDepartment, setBulkDepartment] = useState('all');
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentDetails, setPaymentDetails] = useState({
    accountNumber: '',
    bankName: '',
    transactionId: '',
    notes: ''
  });
  const [updateData, setUpdateData] = useState({
    basicSalary: '',
    netSalary: '',
    hra: '',
    da: '',
    conveyance: '',
    medicalAllowance: '',
    specialAllowance: '',
    tds: '',
    pf: '',
    professionalTax: '',
    notes: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1
  });

  // Excel functionality states
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({
    success: 0,
    failed: 0,
    errors: []
  });

  // Bulk Payment Modal state
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentDetails, setBulkPaymentDetails] = useState({
    paymentMethod: 'Bank Transfer',
    transactionId: '',
    notes: '',
    selectedPayrolls: []
  });
  const [bulkPaymentProcessing, setBulkPaymentProcessing] = useState(false);

  // Employee search state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [refreshingEmployees, setRefreshingEmployees] = useState(false);

  // Load Data
  useEffect(() => {
    fetchPayrolls();
    fetchStats();
    fetchEmployees();
    fetchMonthsYears();
  }, [filters]);

  // Filter employees based on search
  useEffect(() => {
    if (employeeSearch.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const searchTerm = employeeSearch.toLowerCase();
      const filtered = employees.filter(emp => {
        const name = getEmployeeName(emp).toLowerCase();
        const department = getEmployeeDepartment(emp).toLowerCase();
        const email = (emp.email || emp.userEmail || '').toLowerCase();
        const employeeId = (emp.employeeId || emp._id || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               department.includes(searchTerm) || 
               email.includes(searchTerm) ||
               employeeId.includes(searchTerm);
      });
      setFilteredEmployees(filtered);
    }
  }, [employeeSearch, employees]);

  // Fetch Payrolls
  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...filters,
        page: filters.page.toString(),
        limit: filters.limit.toString()
      }).toString();
      
      const res = await axiosInstance.get(`/admin/payroll?${params}`);
      
      setPayrolls(res.data.data || []);
      setPagination({
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1,
        currentPage: res.data.currentPage || 1
      });
    } catch (error) {
      console.error('Payrolls fetch error:', error.response?.data || error.message);
      alert('Failed to load payrolls: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        month: filters.month,
        year: filters.year
      }).toString();
      
      const res = await axiosInstance.get(`/admin/payroll/stats?${params}`);
      setStats(res.data.data || {});
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  // Fetch Employees
  const fetchEmployees = async () => {
    try {
      setRefreshingEmployees(true);
      
      const endpoints = [
        '/employees',
        '/admin/employees',
        '/users/employees'
      ];
      
      let employeesData = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axiosInstance.get(endpoint);
          
          if (response.data) {
            if (Array.isArray(response.data)) {
              employeesData = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              employeesData = response.data.data;
            } else if (response.data.employees && Array.isArray(response.data.employees)) {
              employeesData = response.data.employees;
            } else if (response.data.users && Array.isArray(response.data.users)) {
              employeesData = response.data.users;
            }
            
            if (employeesData.length > 0) break;
          }
        } catch (endpointError) {
          continue;
        }
      }
      
      // Filter active employees
      const activeEmployees = employeesData.filter(emp => {
        const status = emp.employmentStatus || emp.status || emp.employeeStatus || '';
        const isActive = !['Terminated', 'Inactive', 'Resigned', 'Suspended', 'Left', 'Deactivated'].includes(status);
        return status === 'Active' || status === 'active' || isActive;
      });
      
      setEmployees(activeEmployees);
      setFilteredEmployees(activeEmployees);
      
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setRefreshingEmployees(false);
    }
  };

  const refreshEmployees = async () => {
    await fetchEmployees();
    alert('✅ Employees list refreshed!');
  };

  const fetchMonthsYears = async () => {
    try {
      const res = await axiosInstance.get('/admin/payroll/months-years');
      
      const data = res.data.data || [];
      let months = [];
      let years = [];
      
      if (Array.isArray(data) && data.length > 0) {
        months = [...new Set(data.map(item => item.month))].sort((a, b) => {
          const monthOrder = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
          };
          return monthOrder[a] - monthOrder[b];
        });
        
        years = [...new Set(data.map(item => item.year))].sort((a, b) => b - a);
      } else {
        const currentYear = new Date().getFullYear();
        months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        years = [currentYear - 1, currentYear, currentYear + 1].map(year => year.toString());
      }
      
      setMonthsYears({ months, years });
    } catch (error) {
      console.error('Months/Years error:', error);
      const currentYear = new Date().getFullYear();
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const years = [currentYear - 1, currentYear, currentYear + 1].map(year => year.toString());
      setMonthsYears({ months, years });
    }
  };

  // Helper Functions
  const getEmployeeName = (emp) => {
    if (!emp) return 'Unknown Employee';
    return emp.fullName || 
           `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 
           emp.name || 
           emp.username || 
           emp.email || 
           'Unknown Employee';
  };

  const getEmployeeDepartment = (emp) => {
    if (!emp) return 'General';
    return emp.department || 
           emp.dept || 
           emp.employeeDepartment || 
           emp.departmentName || 
           'General';
  };

  const getEmployeeBankDetails = (emp) => {
    if (!emp) return null;
    if (emp.bankAccountNumber && emp.bankName) {
      return {
        accountNumber: emp.bankAccountNumber,
        bankName: emp.bankName,
        ifscCode: emp.ifscCode || emp.ifsc || emp.branchCode || ''
      };
    }
    return null;
  };

  const getEmployeeEmail = (emp) => {
    if (!emp) return '';
    return emp.email || emp.userEmail || emp.workEmail || emp.personalEmail || '';
  };

  const getEmployeeStatus = (emp) => {
    if (!emp) return 'Unknown';
    return emp.employmentStatus || emp.status || emp.employeeStatus || 'Active';
  };

  // Bulk Payment Functions
  const handleOpenBulkPaymentModal = () => {
    const pendingPayrolls = payrolls.filter(p => p.paymentStatus === 'Pending');
    setBulkPaymentDetails({
      ...bulkPaymentDetails,
      selectedPayrolls: pendingPayrolls.map(p => p._id)
    });
    setShowBulkPaymentModal(true);
  };

  const handleTogglePayrollSelection = (payrollId) => {
    setBulkPaymentDetails(prev => {
      const isSelected = prev.selectedPayrolls.includes(payrollId);
      if (isSelected) {
        return {
          ...prev,
          selectedPayrolls: prev.selectedPayrolls.filter(id => id !== payrollId)
        };
      } else {
        return {
          ...prev,
          selectedPayrolls: [...prev.selectedPayrolls, payrollId]
        };
      }
    });
  };

  const handleSelectAllPending = () => {
    const pendingPayrolls = payrolls.filter(p => p.paymentStatus === 'Pending');
    setBulkPaymentDetails({
      ...bulkPaymentDetails,
      selectedPayrolls: pendingPayrolls.map(p => p._id)
    });
  };

  const handleClearSelections = () => {
    setBulkPaymentDetails({
      ...bulkPaymentDetails,
      selectedPayrolls: []
    });
  };

  const handleBulkPayment = async () => {
    if (bulkPaymentDetails.selectedPayrolls.length === 0) {
      alert('❌ Please select at least one payroll to process payment');
      return;
    }

    if (!bulkPaymentDetails.transactionId) {
      alert('❌ Please enter a transaction ID for the bulk payment');
      return;
    }

    try {
      setBulkPaymentProcessing(true);
      
      const selectedPayrollsData = payrolls.filter(p => 
        bulkPaymentDetails.selectedPayrolls.includes(p._id)
      );

      const totalAmount = selectedPayrollsData.reduce((sum, p) => sum + (p.netSalary || 0), 0);
      
      if (!confirm(`💰 Process Bulk Payment?\n\nSelected: ${selectedPayrollsData.length} payrolls\nTotal Amount: PKR ${totalAmount.toLocaleString()}\nTransaction ID: ${bulkPaymentDetails.transactionId}`)) {
        setBulkPaymentProcessing(false);
        return;
      }

      let successCount = 0;
      const errors = [];

      for (const payroll of selectedPayrollsData) {
        try {
          const employee = employees.find(emp => emp._id === payroll.employeeId);
          
          if (!employee) {
            errors.push(`Employee not found for ${payroll.employeeName}`);
            continue;
          }

          const bankDetails = getEmployeeBankDetails(employee);
          if (!bankDetails) {
            errors.push(`${payroll.employeeName}: Bank details missing`);
            continue;
          }

          await axiosInstance.patch(`/admin/payroll/${payroll._id}/bulk-payment`, {
            paymentStatus: 'Paid',
            paymentDate: new Date().toISOString(),
            paymentMethod: bulkPaymentDetails.paymentMethod,
            transactionId: bulkPaymentDetails.transactionId,
            paymentNotes: `Bulk payment via ${bulkPaymentDetails.paymentMethod}. ${bulkPaymentDetails.notes}`,
            bankDetails: bankDetails
          });

          successCount++;
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          errors.push(`${payroll.employeeName}: ${error.response?.data?.error || error.message}`);
        }
      }

      if (errors.length > 0) {
        alert(`⚠️ Bulk payment partially completed\n\nSuccess: ${successCount}\nFailed: ${errors.length}\n\nFirst 5 errors:\n${errors.slice(0, 5).join('\n')}`);
      } else {
        alert(`✅ Bulk payment completed successfully!\n\nProcessed: ${selectedPayrollsData.length} payrolls\nTotal Amount: PKR ${totalAmount.toLocaleString()}\nTransaction ID: ${bulkPaymentDetails.transactionId}`);
      }

      fetchPayrolls();
      fetchStats();

      setShowBulkPaymentModal(false);
      setBulkPaymentDetails({
        paymentMethod: 'Bank Transfer',
        transactionId: '',
        notes: '',
        selectedPayrolls: []
      });

    } catch (error) {
      console.error('Bulk payment error:', error);
      alert('❌ Bulk payment failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setBulkPaymentProcessing(false);
    }
  };

  // Excel Export Functions
  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      
      if (!confirm('📊 Export all payroll records to Excel?')) {
        setExportLoading(false);
        return;
      }
      
      const response = await axiosInstance.get('/admin/payroll/export', {
        params: {
          year: filters.year,
          month: filters.month,
          status: filters.status,
          limit: 10000
        }
      });
      
      const allPayrolls = response.data.data || [];
      
      if (allPayrolls.length === 0) {
        alert('📭 No payroll records found to export');
        setExportLoading(false);
        return;
      }
      
      const excelData = allPayrolls.map((payroll, index) => ({
        'SR #': index + 1,
        'Employee ID': payroll.employeeId || '',
        'Employee Name': payroll.employeeName || '',
        'Department': payroll.employeeDepartment || '',
        'Month': payroll.month || '',
        'Year': payroll.year || '',
        'Basic Salary': payroll.basicSalary || 0,
        'Net Salary': payroll.netSalary || 0,
        'Status': payroll.paymentStatus || 'Pending',
        'Payment Date': payroll.paymentDate || '',
        'Payment Method': payroll.paymentMethod || '',
        'Bank Name': payroll.bankDetails?.bankName || '',
        'Account Number': payroll.bankDetails?.accountNumber || '',
        'Transaction ID': payroll.transactionId || ''
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Records');
      
      const date = new Date();
      const timestamp = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const filename = `Payroll_Export_${timestamp}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      
      alert(`✅ Excel file exported successfully!\n\nRecords: ${allPayrolls.length}`);
      
    } catch (error) {
      console.error('Export to Excel error:', error);
      alert('❌ Export failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportSinglePayroll = async (payroll) => {
    try {
      if (!payroll) return;
      
      const excelData = [{
        'Employee ID': payroll.employeeId || '',
        'Employee Name': payroll.employeeName || '',
        'Department': payroll.employeeDepartment || '',
        'Month': payroll.month || '',
        'Year': payroll.year || '',
        'Basic Salary': payroll.basicSalary || 0,
        'Net Salary': payroll.netSalary || 0,
        'Status': payroll.paymentStatus || 'Pending',
        'Payment Date': payroll.paymentDate || '',
        'Payment Method': payroll.paymentMethod || '',
        'Bank Name': payroll.bankDetails?.bankName || '',
        'Account Number': payroll.bankDetails?.accountNumber || '',
        'Transaction ID': payroll.transactionId || ''
      }];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Details');
      
      const filename = `Payroll_${payroll.employeeId}_${payroll.month}_${payroll.year}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      alert(`✅ Payroll exported to Excel!`);
      
    } catch (error) {
      console.error('Export single payroll error:', error);
      alert('❌ Export failed: ' + error.message);
    }
  };

  // Import Functions
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert('❌ Please select an Excel file (.xlsx, .xls) or CSV file');
      e.target.value = '';
      return;
    }
    
    setImportFile(file);
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      alert('❌ Please select an Excel file to import');
      return;
    }
    
    try {
      setImportLoading(true);
      setImportProgress(0);
      setImportResults({ success: 0, failed: 0, errors: [] });
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            alert('❌ No data found in the Excel file');
            return;
          }
          
          if (!confirm(`📋 Found ${jsonData.length} records to import.\n\nDo you want to proceed?`)) {
            return;
          }
          
          const errors = [];
          let successCount = 0;
          let failedCount = 0;
          
          for (let i = 0; i < jsonData.length; i++) {
            try {
              const row = jsonData[i];
              setImportProgress(Math.round((i + 1) / jsonData.length * 100));
              
              const payrollData = {
                employeeId: row['Employee ID'],
                employeeName: row['Employee Name'],
                employeeDepartment: row['Department'] || 'General',
                month: row['Month'],
                year: parseInt(row['Year']),
                basicSalary: parseFloat(row['Basic Salary']) || 0,
                netSalary: parseFloat(row['Net Salary']) || 0,
                paymentStatus: row['Status'] || 'Pending',
                paymentDate: row['Payment Date'] || '',
                paymentMethod: row['Payment Method'] || 'Bank Transfer',
                hra: parseFloat(row['HRA']) || 0,
                da: parseFloat(row['DA']) || 0,
                conveyance: parseFloat(row['Conveyance']) || 0,
                medicalAllowance: parseFloat(row['Medical Allowance']) || 0,
                specialAllowance: parseFloat(row['Special Allowance']) || 0,
                tds: parseFloat(row['TDS']) || 0,
                pf: parseFloat(row['PF']) || 0,
                professionalTax: parseFloat(row['Professional Tax']) || 0,
                notes: row['Remarks'] || '',
                transactionId: row['Transaction ID'] || '',
                bankDetails: {
                  bankName: row['Bank Name'] || '',
                  accountNumber: row['Account Number'] || '',
                  ifscCode: row['IFSC Code'] || ''
                }
              };
              
              await axiosInstance.post('/admin/payroll/import', payrollData);
              successCount++;
              
            } catch (rowError) {
              failedCount++;
              errors.push(`Row ${i + 1}: ${rowError.response?.data?.error || rowError.message}`);
            }
          }
          
          setImportResults({
            success: successCount,
            failed: failedCount,
            errors: errors.slice(0, 10)
          });
          
          fetchPayrolls();
          fetchStats();
          
          alert(`✅ Import completed!\n\nSuccess: ${successCount}\nFailed: ${failedCount}`);
          
          setShowImportModal(false);
          setImportFile(null);
          
        } catch (parseError) {
          console.error('Parse error:', parseError);
          alert('❌ Error parsing Excel file. Please check the format.');
        }
      };
      
      reader.onerror = () => {
        alert('❌ Error reading file');
      };
      
      reader.readAsBinaryString(importFile);
      
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Import failed: ' + error.message);
    } finally {
      setImportLoading(false);
      setImportProgress(0);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      'Employee ID': 'EMP001',
      'Employee Name': 'John Doe',
      'Department': 'IT',
      'Month': 'January',
      'Year': '2024',
      'Basic Salary': 50000,
      'Net Salary': 55000,
      'Status': 'Pending',
      'Payment Date': '',
      'Payment Method': 'Bank Transfer',
      'Bank Name': '',
      'Account Number': '',
      'Transaction ID': '',
      'HRA': 5000,
      'DA': 3000,
      'Conveyance': 2000,
      'Medical Allowance': 1500,
      'Special Allowance': 0,
      'TDS': 2500,
      'PF': 4000,
      'Professional Tax': 200,
      'Remarks': ''
    }];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Payroll_Import_Template.xlsx');
    
    alert('📋 Template downloaded!');
  };

  // Payroll Functions
  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    
    try {
      setGenerating(true);
      
      if (!selectedEmployee || !selectedMonth || !selectedYear) {
        alert('❌ Please select employee, month and year');
        setGenerating(false);
        return;
      }
      
      const employee = employees.find(emp => emp._id === selectedEmployee);
      if (!employee) {
        alert('❌ Employee not found');
        setGenerating(false);
        return;
      }
      
      const payload = {
        employeeId: employee._id,
        month: selectedMonth,
        year: parseInt(selectedYear)
      };
      
      const response = await axiosInstance.post('/admin/payroll/generate', payload);
      
      if (response.data.success) {
        alert('✅ Payroll generated successfully!');
        setShowGenerateModal(false);
        setSelectedEmployee('');
        setSelectedMonth('');
        setSelectedYear('');
        setEmployeeSearch('');
        fetchPayrolls();
        fetchStats();
      } else {
        alert(`❌ ${response.data.error || 'Failed to generate payroll'}`);
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert(`❌ ${error.response?.data?.error || error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    
    if (!bulkMonth || !bulkYear) {
      alert('❌ Please select Month and Year');
      return;
    }
    
    try {
      setGenerating(true);
      
      const employeeIds = employees
        .filter(emp => {
          const status = getEmployeeStatus(emp);
          return !['Terminated', 'Inactive', 'Resigned', 'Suspended', 'Left'].includes(status);
        })
        .map(emp => emp._id || emp.id)
        .filter(Boolean);
      
      if (employeeIds.length === 0) {
        alert('❌ No active employees found');
        return;
      }
      
      const payload = {
        employeeIds,
        month: bulkMonth,
        year: parseInt(bulkYear)
      };
      
      const res = await axiosInstance.post('/admin/payroll/bulk-generate', payload);
      
      if (res.data.success) {
        alert(`✅ ${res.data.message}`);
      } else {
        alert(`❌ ${res.data.error}`);
      }
      
      setShowBulkModal(false);
      setBulkMonth('');
      setBulkYear('');
      fetchPayrolls();
      fetchStats();
      
    } catch (error) {
      console.error('Bulk error:', error);
      alert(error.response?.data?.error || 'Failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('🗑️ Are you sure you want to delete this payroll record?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/admin/payroll/${id}`);
      fetchPayrolls();
      fetchStats();
      alert('✅ Payroll deleted successfully!');
    } catch (error) {
      alert('❌ Delete failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axiosInstance.patch(`/admin/payroll/${id}/status`, { 
        paymentStatus: status,
        paymentDate: status === 'Paid' ? new Date().toISOString() : null,
        transactionId: status === 'Paid' ? `TRX${Date.now()}${Math.floor(Math.random() * 1000)}` : null
      });
      fetchPayrolls();
      fetchStats();
      alert('✅ Status updated successfully!');
    } catch (error) {
      alert('❌ Status update failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleOpenUpdateModal = (payroll) => {
    setSelectedPayroll(payroll);
    setUpdateData({
      basicSalary: payroll.basicSalary || '',
      netSalary: payroll.netSalary || '',
      hra: payroll.hra || '',
      da: payroll.da || '',
      conveyance: payroll.conveyance || '',
      medicalAllowance: payroll.medicalAllowance || '',
      specialAllowance: payroll.specialAllowance || '',
      tds: payroll.tds || '',
      pf: payroll.pf || '',
      professionalTax: payroll.professionalTax || '',
      notes: payroll.notes || ''
    });
    setShowUpdateModal(true);
  };

  const handleUpdatePayroll = async (e) => {
    e.preventDefault();
    
    if (!selectedPayroll) return;
    
    try {
      setGenerating(true);
      
      const updatedData = { ...updateData };
      
      Object.keys(updatedData).forEach(key => {
        if (key !== 'notes' && updatedData[key] !== '') {
          updatedData[key] = parseFloat(updatedData[key]);
        }
      });
      
      await axiosInstance.put(`/admin/payroll/${selectedPayroll._id}`, updatedData);
      
      setShowUpdateModal(false);
      setSelectedPayroll(null);
      setUpdateData({
        basicSalary: '',
        netSalary: '',
        hra: '',
        da: '',
        conveyance: '',
        medicalAllowance: '',
        specialAllowance: '',
        tds: '',
        pf: '',
        professionalTax: '',
        notes: ''
      });
      
      fetchPayrolls();
      fetchStats();
      alert('✅ Payroll updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      alert('❌ Update failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPayslip = async (payrollId) => {
    try {
      window.open(`/admin/payroll/${payrollId}/payslip-pdf`, '_blank');
    } catch (error) {
      alert('❌ Failed to download payslip');
    }
  };

  const handleDownloadPayslipWithTranscript = async (payrollId) => {
    try {
      const response = await axiosInstance.get(`/admin/payroll/${payrollId}/payslip-transcript`);
      const payroll = response.data.data;
      
      const transcriptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payslip Transcript - ${payroll.employeeName}</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 40px; line-height: 1.6; background: #f8fafc; }
            .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; }
            .company-name { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
            .document-title { font-size: 20px; opacity: 0.9; }
            .content { padding: 30px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: 600; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .label { font-weight: 500; color: #64748b; }
            .value { color: #1e293b; font-weight: 500; }
            .amount { font-weight: 700; color: #10b981; }
            .status-paid { color: #10b981; font-weight: 700; }
            .status-pending { color: #f59e0b; font-weight: 700; }
            .footer { background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
            @media print {
              body { background: white; margin: 0; }
              .container { box-shadow: none; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company-name">COMPANY NAME</div>
              <div class="document-title">PAYSLIP TRANSCRIPT</div>
            </div>
            
            <div class="content">
              <div class="section">
                <div class="section-title">Employee Information</div>
                <div class="info-grid">
                  <div class="info-item"><span class="label">Employee Name:</span><span class="value">${payroll.employeeName || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Employee ID:</span><span class="value">${payroll.employeeId || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Department:</span><span class="value">${payroll.employeeDepartment || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Period:</span><span class="value">${payroll.month || 'N/A'} ${payroll.year || 'N/A'}</span></div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Salary Breakdown</div>
                <div class="info-grid">
                  <div class="info-item"><span class="label">Basic Salary:</span><span class="value amount">PKR ${(payroll.basicSalary || 0).toLocaleString()}</span></div>
                  <div class="info-item"><span class="label">Net Salary:</span><span class="value amount">PKR ${(payroll.netSalary || 0).toLocaleString()}</span></div>
                  <div class="info-item"><span class="label">HRA:</span><span class="value">PKR ${(payroll.hra || 0).toLocaleString()}</span></div>
                  <div class="info-item"><span class="label">DA:</span><span class="value">PKR ${(payroll.da || 0).toLocaleString()}</span></div>
                  <div class="info-item"><span class="label">Conveyance:</span><span class="value">PKR ${(payroll.conveyance || 0).toLocaleString()}</span></div>
                  <div class="info-item"><span class="label">Medical Allowance:</span><span class="value">PKR ${(payroll.medicalAllowance || 0).toLocaleString()}</span></div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Payment Information</div>
                <div class="info-grid">
                  <div class="info-item"><span class="label">Payment Status:</span><span class="${payroll.paymentStatus === 'Paid' ? 'status-paid' : 'status-pending'}">${payroll.paymentStatus || 'Pending'}</span></div>
                  <div class="info-item"><span class="label">Payment Method:</span><span class="value">${payroll.paymentMethod || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Payment Date:</span><span class="value">${payroll.paymentDate || 'N/A'}</span></div>
                  ${payroll.transactionId ? `<div class="info-item"><span class="label">Transaction ID:</span><span class="value">${payroll.transactionId}</span></div>` : ''}
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div>Generated on: ${new Date().toLocaleDateString()}</div>
              <div>This is an official document</div>
              <button onclick="window.print()" style="margin-top: 16px; padding: 10px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">🖨️ Print Transcript</button>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(transcriptHTML);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Payslip transcript error:', error);
      alert('❌ Failed to generate payslip transcript');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters({ ...filters, page: newPage });
    }
  };

  const getActiveEmployeesCount = () => {
    return employees.filter(emp => {
      const status = getEmployeeStatus(emp);
      return !['Terminated', 'Inactive', 'Resigned', 'Suspended', 'Left'].includes(status);
    }).length;
  };

  const getEmployeesWithoutBankDetails = () => {
    return employees.filter(emp => {
      const isActive = !['Terminated', 'Inactive', 'Resigned', 'Suspended'].includes(
        getEmployeeStatus(emp)
      );
      return isActive && !getEmployeeBankDetails(emp);
    }).length;
  };

  const getUniqueDepartments = () => {
    const departments = employees
      .filter(emp => {
        const isActive = !['Terminated', 'Inactive', 'Resigned', 'Suspended'].includes(
          getEmployeeStatus(emp)
        );
        return isActive;
      })
      .map(emp => getEmployeeDepartment(emp))
      .filter(dept => dept && dept.trim() !== '');
    
    return [...new Set(departments)];
  };

  if (loading && payrolls.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Payroll Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign className="text-indigo-500 text-sm" />
                Payroll Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Complete payroll management with bulk payments & bank transfers
              </p>
            </div>
            <button
              onClick={fetchPayrolls}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Employee Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{getActiveEmployeesCount()}</div>
              <div className="text-xs text-slate-500 font-medium">Active Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {getActiveEmployeesCount() - getEmployeesWithoutBankDetails()}
              </div>
              <div className="text-xs text-slate-500 font-medium">With Bank Details</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {getEmployeesWithoutBankDetails()}
              </div>
              <div className="text-xs text-slate-500 font-medium">Without Bank Details</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {getUniqueDepartments().length}
              </div>
              <div className="text-xs text-slate-500 font-medium">Departments</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={refreshEmployees}
              disabled={refreshingEmployees}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors flex items-center gap-1 mx-auto"
            >
              {refreshingEmployees ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-indigo-600"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Refresh Employees List
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleOpenBulkPaymentModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            Bulk Payment
          </button>
          
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Users className="w-4 h-4" />
            Bulk Generate
          </button>
          
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <User className="w-4 h-4" />
            Individual
          </button>
          
          <button
            onClick={handleExportToExcel}
            disabled={exportLoading || payrolls.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {exportLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Excel
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Template
          </button>
        </div>

        {/* Stats Cards with Colored Icons */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            label="Total Payrolls" 
            value={stats.totalPayrolls || 0} 
            sub="All time records"
            icon={<FileSpreadsheet className="w-5 h-5 text-white" />}
            iconBg="bg-indigo-500"
          />
          <KpiCard 
            label="Paid" 
            value={stats.paidPayments || 0} 
            sub="Completed payments"
            icon={<CheckCircle className="w-5 h-5 text-white" />}
            iconBg="bg-emerald-500"
          />
          <KpiCard 
            label="Pending" 
            value={stats.pendingPayments || 0} 
            sub="Awaiting approval"
            icon={<Clock className="w-5 h-5 text-white" />}
            iconBg="bg-amber-500"
          />
          <KpiCard 
            label="Total Amount" 
            value={`PKR ${(stats.totalAmount || 0).toLocaleString()}`} 
            sub="Overall payroll"
            icon={<DollarSign className="w-5 h-5 text-white" />}
            iconBg="bg-purple-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            Filters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value, page: 1 })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              >
                <option value="">All Years</option>
                {monthsYears.years?.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value, page: 1 })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              >
                <option value="all">All Months</option>
                {monthsYears.months?.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ year: '', month: 'all', status: 'all', page: 1, limit: 10 })}
                className="w-full px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="text-indigo-500 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Payroll Records</p>
                  <p className="text-xs text-slate-500">{payrolls.length} of {pagination.total} records</p>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Basic</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Net</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bank</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="mb-2">No payroll records found</p>
                        <button 
                          onClick={() => setShowGenerateModal(true)}
                          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                        >
                          Click to generate payroll
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payrolls.map((payroll) => (
                    <tr key={payroll._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-sm text-slate-800">{payroll.employeeName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{payroll.employeeDepartment || 'N/A'}</div>
                        <div className="text-xs text-slate-400">{payroll.employeeId || ''}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-sm text-slate-800">{payroll.month || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{payroll.year || 'N/A'}</div>
                       </td>
                      <td className="px-5 py-4 text-right">
                        <div className="text-sm font-semibold text-slate-800">
                          PKR {(payroll.basicSalary || 0).toLocaleString()}
                        </div>
                       </td>
                      <td className="px-5 py-4 text-right">
                        <div className="text-sm font-bold text-emerald-600">
                          PKR {(payroll.netSalary || 0).toLocaleString()}
                        </div>
                       </td>
                      <td className="px-5 py-4">
                        <Badge variant={
                          payroll.paymentStatus === 'Paid' ? 'success' : 
                          payroll.paymentStatus === 'Pending' ? 'warning' : 'danger'
                        }>
                          {payroll.paymentStatus === 'Paid' ? 'Paid' : 
                           payroll.paymentStatus === 'Pending' ? 'Pending' : 'Failed'}
                        </Badge>
                        {payroll.paymentDate && (
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(payroll.paymentDate).toLocaleDateString()}
                          </div>
                        )}
                       </td>
                      <td className="px-5 py-4">
                        {payroll.bankDetails?.bankName ? (
                          <div className="space-y-1">
                            <div className="font-medium text-slate-800 text-xs">{payroll.bankDetails.bankName}</div>
                            {payroll.bankDetails.accountNumber && (
                              <div className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full inline-block">
                                ****{payroll.bankDetails.accountNumber.slice(-4)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            No bank details
                          </span>
                        )}
                       </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => handleDownloadPayslipWithTranscript(payroll._id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                            title="View transcript"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          
                          <button
                            onClick={() => handleDownloadPayslip(payroll._id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                            title="Download PDF"
                          >
                            <Printer className="w-3 h-3" />
                            PDF
                          </button>
                          
                          <button
                            onClick={() => handleExportSinglePayroll(payroll)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                            title="Export to Excel"
                          >
                            <Download className="w-3 h-3" />
                            Excel
                          </button>
                          
                          <button
                            onClick={() => handleOpenUpdateModal(payroll)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          
                          <select
                            onChange={(e) => handleStatusUpdate(payroll._id, e.target.value)}
                            value={payroll.paymentStatus || 'Pending'}
                            className="px-2 py-1 border border-slate-200 rounded text-xs font-medium bg-white text-slate-700"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Failed">Failed</option>
                          </select>
                          
                          <button
                            onClick={() => handleDelete(payroll._id)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded transition-colors flex items-center gap-1"
                          >
                            Delete
                          </button>
                        </div>
                       </td>
                     </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
                  {Math.min(pagination.currentPage * filters.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Individual Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-500" />
                  Generate Individual Payroll
                </h3>
                <button onClick={() => { setShowGenerateModal(false); setEmployeeSearch(''); }} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
              </div>
            </div>
            
            <form onSubmit={handleGeneratePayroll} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Employee *</label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="Search employees..."
                  />
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                </div>
                
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  required
                  size="5"
                >
                  <option value="">-- Choose Employee --</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {getEmployeeName(emp)} - {getEmployeeDepartment(emp)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month *</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    required
                  >
                    <option value="">-- Select Month --</option>
                    {monthsYears.months?.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    required
                  >
                    <option value="">-- Select Year --</option>
                    {monthsYears.years?.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate Payroll'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Bulk Generate Payroll
                </h3>
                <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
              </div>
            </div>
            
            <form onSubmit={handleBulkGenerate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month *</label>
                  <select
                    value={bulkMonth}
                    onChange={(e) => setBulkMonth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    required
                  >
                    <option value="">-- Select Month --</option>
                    {monthsYears.months?.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                  <select
                    value={bulkYear}
                    onChange={(e) => setBulkYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    required
                  >
                    <option value="">-- Select Year --</option>
                    {monthsYears.years?.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    'Bulk Generate'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-500" />
                  Bulk Salary Payment
                </h3>
                <button onClick={() => setShowBulkPaymentModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={bulkPaymentDetails.paymentMethod}
                    onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID *</label>
                  <input
                    type="text"
                    value={bulkPaymentDetails.transactionId}
                    onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, transactionId: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="TRX-2024-001"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={bulkPaymentDetails.notes}
                  onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, notes: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  rows="2"
                  placeholder="Additional notes about this bulk payment..."
                />
              </div>
              
              <div className="flex gap-3">
                <button onClick={handleSelectAllPending} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors">
                  Select All Pending
                </button>
                <button onClick={handleClearSelections} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                  Clear All
                </button>
                <div className="ml-auto text-sm font-medium text-slate-700">
                  Selected: {bulkPaymentDetails.selectedPayrolls.length} payrolls
                </div>
              </div>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 p-3 font-medium text-slate-700 border-b border-slate-200">
                  Select Payrolls for Payment
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {payrolls
                    .filter(p => p.paymentStatus === 'Pending')
                    .map((payroll) => (
                      <div key={payroll._id} className="p-3 border-t border-slate-100 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={bulkPaymentDetails.selectedPayrolls.includes(payroll._id)}
                            onChange={() => handleTogglePayrollSelection(payroll._id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-medium text-sm text-slate-800">{payroll.employeeName}</div>
                            <div className="text-xs text-slate-500">{payroll.month} {payroll.year} • PKR {payroll.netSalary?.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowBulkPaymentModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleBulkPayment} disabled={bulkPaymentProcessing || bulkPaymentDetails.selectedPayrolls.length === 0} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                  {bulkPaymentProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    'Process Bulk Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payroll Modal */}
      {showUpdateModal && selectedPayroll && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-indigo-500" />
                  Update Payroll Details
                </h3>
                <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
              </div>
            </div>
            
            <form onSubmit={handleUpdatePayroll} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary</label>
                  <input type="number" value={updateData.basicSalary} onChange={(e) => setUpdateData({...updateData, basicSalary: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Net Salary</label>
                  <input type="number" value={updateData.netSalary} onChange={(e) => setUpdateData({...updateData, netSalary: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HRA</label>
                  <input type="number" value={updateData.hra} onChange={(e) => setUpdateData({...updateData, hra: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">DA</label>
                  <input type="number" value={updateData.da} onChange={(e) => setUpdateData({...updateData, da: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={updateData.notes} onChange={(e) => setUpdateData({...updateData, notes: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" rows="3" placeholder="Additional notes..." />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Payroll'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-500" />
                  Import Payroll from Excel
                </h3>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-3">
                  {importFile ? importFile.name : 'Click to select Excel file'}
                </p>
                <input type="file" id="excel-import" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                <label htmlFor="excel-import" className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm">
                  {importFile ? 'Change File' : 'Select File'}
                </label>
              </div>
              
              <div className="flex gap-3">
                <button onClick={handleDownloadTemplate} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Template
                </button>
                <button onClick={handleImportExcel} disabled={!importFile || importLoading} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    'Import Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayroll;