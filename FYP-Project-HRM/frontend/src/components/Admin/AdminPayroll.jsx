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
// In AdminPayroll.js - UPDATE fetchPayrolls function
const fetchPayrolls = async () => {
  try {
    setLoading(true);
    const params = new URLSearchParams({
      ...filters,
      page: filters.page.toString(),
      limit: filters.limit.toString()
    }).toString();
    
    const res = await axiosInstance.get(`/admin/payroll?${params}`);
    
    // 🔍 DEBUG: Log the first payroll to see its structure
    if (res.data.data && res.data.data.length > 0) {
      console.log('📋 First payroll data:', res.data.data[0]);
      console.log('📋 Bank details:', res.data.data[0].bankDetails);
      console.log('📋 All fields in first payroll:', Object.keys(res.data.data[0]));
    }
    
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

  // ==================== EMPLOYEE FETCH FUNCTIONS ====================
  const fetchEmployees = async () => {
    try {
      setRefreshingEmployees(true);
      console.log('🔄 Fetching employees...');
      
      const endpoints = [
        '/employees',
        '/admin/employees',
        '/users/employees'
      ];
      
      let employeesData = [];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔗 Trying endpoint: ${endpoint}`);
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
            
            if (employeesData.length > 0) {
              console.log(`🎯 Found ${employeesData.length} employees from ${endpoint}`);
              break;
            }
          }
        } catch (endpointError) {
          console.log(`❌ Failed for ${endpoint}:`, endpointError.message);
          continue;
        }
      }
      
      // Filter active employees
      const activeEmployees = employeesData.filter(emp => {
        const status = emp.employmentStatus || emp.status || emp.employeeStatus || '';
        const isActive = !['Terminated', 'Inactive', 'Resigned', 'Suspended', 'Left', 'Deactivated'].includes(status);
        return status === 'Active' || status === 'active' || isActive;
      });
      
      console.log(`👥 Active employees: ${activeEmployees.length}`);
      
      setEmployees(activeEmployees);
      setFilteredEmployees(activeEmployees);
      
      return activeEmployees;
      
    } catch (error) {
      console.error('❌ Critical error in fetchEmployees:', error);
      setEmployees([]);
      setFilteredEmployees([]);
      return [];
    } finally {
      setRefreshingEmployees(false);
    }
  };

  // Manually refresh employees
  const refreshEmployees = async () => {
    await fetchEmployees();
    alert('✅ Employees list refreshed!');
  };

  // Fetch Months/Years
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

  // ==================== HELPER FUNCTIONS ====================
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

  // ==================== BULK PAYMENT FUNCTIONS ====================
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
      
      if (!confirm(`💰 Process Bulk Payment?\n\nSelected: ${selectedPayrollsData.length} payrolls\nTotal Amount: PKR ${totalAmount.toLocaleString()}\nTransaction ID: ${bulkPaymentDetails.transactionId}\n\nThis will update status to "Paid" and send salaries to employees' bank accounts.`)) {
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

          const response = await axiosInstance.patch(`/admin/payroll/${payroll._id}/bulk-payment`, {
            paymentStatus: 'Paid',
            paymentDate: new Date().toISOString(),
            paymentMethod: bulkPaymentDetails.paymentMethod,
            transactionId: bulkPaymentDetails.transactionId,
            paymentNotes: `Bulk payment via ${bulkPaymentDetails.paymentMethod}. ${bulkPaymentDetails.notes}`,
            bankDetails: bankDetails
          });

          if (response.data.success) {
            successCount++;
            
            try {
              await axiosInstance.post('/admin/payroll/send-payslip', {
                payrollId: payroll._id,
                employeeEmail: getEmployeeEmail(employee)
              });
            } catch (emailError) {
              console.error('Email sending error:', emailError);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          errors.push(`${payroll.employeeName}: ${error.response?.data?.error || error.message}`);
        }
      }

      if (errors.length > 0) {
        alert(`⚠️ Bulk payment partially completed\n\nSuccess: ${successCount}\nFailed: ${errors.length}\n\nFirst 5 errors:\n${errors.slice(0, 5).join('\n')}`);
      } else {
        alert(`✅ Bulk payment completed successfully!\n\nProcessed: ${selectedPayrollsData.length} payrolls\nTotal Amount: PKR ${totalAmount.toLocaleString()}\nTransaction ID: ${bulkPaymentDetails.transactionId}\n\nSalaries have been transferred to employees' bank accounts and email notifications sent.`);
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

  // ==================== EXCEL EXPORT FUNCTIONS ====================
  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      
      if (!confirm('📊 Export all payroll records to Excel?\n\nThis may take a moment...')) {
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
        'Transaction ID': payroll.transactionId || '',
        'HRA': payroll.hra || 0,
        'DA': payroll.da || 0,
        'Conveyance': payroll.conveyance || 0,
        'Medical Allowance': payroll.medicalAllowance || 0,
        'Special Allowance': payroll.specialAllowance || 0,
        'TDS': payroll.tds || 0,
        'PF': payroll.pf || 0,
        'Professional Tax': payroll.professionalTax || 0,
        'Remarks': payroll.notes || '',
        'Generated At': payroll.createdAt || '',
        'Updated At': payroll.updatedAt || ''
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      const wscols = [
        { wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 8 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
        { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 25 }, { wch: 20 },
        { wch: 20 }
      ];
      ws['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Records');
      
      const date = new Date();
      const timestamp = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
      const filename = `Payroll_Export_${timestamp}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      
      alert(`✅ Excel file exported successfully!\n\nFile: ${filename}\nRecords: ${allPayrolls.length}`);
      
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
        'IFSC Code': payroll.bankDetails?.ifscCode || '',
        'Transaction ID': payroll.transactionId || '',
        'HRA': payroll.hra || 0,
        'DA': payroll.da || 0,
        'Conveyance': payroll.conveyance || 0,
        'Medical Allowance': payroll.medicalAllowance || 0,
        'Special Allowance': payroll.specialAllowance || 0,
        'TDS': payroll.tds || 0,
        'PF': payroll.pf || 0,
        'Professional Tax': payroll.professionalTax || 0,
        'Remarks': payroll.notes || '',
        'Email': payroll.employeeEmail || '',
        'Phone': payroll.employeePhone || '',
        'Payment Notes': payroll.paymentNotes || ''
      }];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Details');
      
      const filename = `Payroll_${payroll.employeeId}_${payroll.month}_${payroll.year}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      
      alert(`✅ Payroll exported to Excel!\nFile: ${filename}`);
      
    } catch (error) {
      console.error('Export single payroll error:', error);
      alert('❌ Export failed: ' + error.message);
    }
  };

  // ==================== EXCEL IMPORT FUNCTIONS ====================
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
          
          const requiredColumns = ['Employee ID', 'Employee Name', 'Month', 'Year', 'Basic Salary', 'Net Salary'];
          const firstRow = jsonData[0];
          const missingColumns = requiredColumns.filter(col => !Object.keys(firstRow).includes(col));
          
          if (missingColumns.length > 0) {
            alert(`❌ Missing required columns in Excel file:\n\n${missingColumns.join(', ')}\n\nPlease check the file format.`);
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
              
              const response = await axiosInstance.post('/admin/payroll/import', payrollData);
              
              if (response.data.success) {
                successCount++;
              } else {
                failedCount++;
                errors.push(`Row ${i + 1}: ${response.data.error}`);
              }
              
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
          
          alert(`✅ Import completed!\n\nSuccess: ${successCount}\nFailed: ${failedCount}\n\n${errors.length > 0 ? 'First few errors:\n' + errors.slice(0, 5).join('\n') : ''}`);
          
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
      'Status': 'Paid',
      'Payment Date': '2024-01-31',
      'Payment Method': 'Bank Transfer',
      'Bank Name': 'HBL',
      'Account Number': '1234567890123',
      'IFSC Code': 'HBL1234567',
      'Transaction ID': 'TRX20240131001',
      'HRA': 5000,
      'DA': 3000,
      'Conveyance': 2000,
      'Medical Allowance': 1500,
      'Special Allowance': 0,
      'TDS': 2500,
      'PF': 4000,
      'Professional Tax': 200,
      'Remarks': 'Regular payroll'
    }];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    const instructions = [
      ['Payroll Import Template Instructions'],
      [''],
      ['1. Fill in the data according to the template'],
      ['2. Required fields: Employee ID, Employee Name, Month, Year, Basic Salary, Net Salary'],
      ['3. Status can be: Pending, Paid, Failed'],
      ['4. Month should be full name: January, February, etc.'],
      ['5. Year should be 4 digits: 2024'],
      ['6. Salary fields should be numbers only'],
      ['7. Remove this instructions sheet before importing'],
      [''],
      ['Note: Existing records with same Employee ID, Month, Year will be updated']
    ];
    
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    XLSX.writeFile(wb, 'Payroll_Import_Template.xlsx');
    
    alert('📋 Template downloaded!\n\nPlease follow the instructions in the "Instructions" sheet.');
  };

  // ==================== PAYSLIP TRANSCRIPT ====================
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
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 28px; font-weight: bold; color: #1e40af; }
            .document-title { font-size: 22px; margin: 10px 0; color: #333; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 18px; font-weight: bold; color: #1e40af; border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .info-item { margin-bottom: 8px; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .amount { font-weight: bold; color: #059669; }
            .status-paid { color: #059669; font-weight: bold; }
            .status-pending { color: #d97706; font-weight: bold; }
            .transaction-details { background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .timestamp { font-style: italic; color: #666; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 14px; }
            .signature { margin-top: 40px; }
            .signature-line { width: 300px; border-top: 1px solid #333; margin-top: 40px; }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">COMPANY NAME</div>
            <div class="document-title">PAYSLIP TRANSCRIPT</div>
            <div>Official Salary Payment Record</div>
          </div>
          
          <div class="section">
            <div class="section-title">Employee Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Employee Name:</span>
                <span class="value">${payroll.employeeName || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Employee ID:</span>
                <span class="value">${payroll.employeeId || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Department:</span>
                <span class="value">${payroll.employeeDepartment || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Period:</span>
                <span class="value">${payroll.month || 'N/A'} ${payroll.year || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Salary Breakdown</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Basic Salary:</span>
                <span class="value amount">PKR ${(payroll.basicSalary || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Net Salary:</span>
                <span class="value amount">PKR ${(payroll.netSalary || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">House Rent Allowance (HRA):</span>
                <span class="value">PKR ${(payroll.hra || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Dearness Allowance (DA):</span>
                <span class="value">PKR ${(payroll.da || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Conveyance Allowance:</span>
                <span class="value">PKR ${(payroll.conveyance || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Medical Allowance:</span>
                <span class="value">PKR ${(payroll.medicalAllowance || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Special Allowance:</span>
                <span class="value">PKR ${(payroll.specialAllowance || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Deductions</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Tax Deducted at Source (TDS):</span>
                <span class="value">PKR ${(payroll.tds || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Provident Fund (PF):</span>
                <span class="value">PKR ${(payroll.pf || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Professional Tax:</span>
                <span class="value">PKR ${(payroll.professionalTax || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Payment Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Payment Status:</span>
                <span class="value ${payroll.paymentStatus === 'Paid' ? 'status-paid' : 'status-pending'}">
                  ${payroll.paymentStatus || 'Pending'}
                </span>
              </div>
              <div class="info-item">
                <span class="label">Payment Method:</span>
                <span class="value">${payroll.paymentMethod || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Payment Date:</span>
                <span class="value">${payroll.paymentDate || 'N/A'}</span>
              </div>
              ${payroll.transactionId ? `
              <div class="info-item">
                <span class="label">Transaction ID:</span>
                <span class="value">${payroll.transactionId}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${payroll.bankDetails ? `
          <div class="section">
            <div class="section-title">Bank Transfer Details</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Bank Name:</span>
                <span class="value">${payroll.bankDetails.bankName || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Account Number:</span>
                <span class="value">${payroll.bankDetails.accountNumber || 'N/A'}</span>
              </div>
              ${payroll.bankDetails.ifscCode ? `
              <div class="info-item">
                <span class="label">IFSC Code:</span>
                <span class="value">${payroll.bankDetails.ifscCode}</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">Transaction Transcript</div>
            <div class="transaction-details">
              <div class="info-item">
                <span class="label">Salary Processing Time:</span>
                <span class="value timestamp">${new Date().toLocaleString()}</span>
              </div>
              
              ${payroll.paymentStatus === 'Paid' ? `
              <div class="info-item">
                <span class="label">Transaction Confirmation:</span>
                <span class="value amount">✅ SALARY TRANSFER CONFIRMED</span>
              </div>
              <div class="info-item">
                <span class="label">Amount Transferred:</span>
                <span class="value amount">PKR ${(payroll.netSalary || 0).toLocaleString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Transferred to:</span>
                <span class="value">${payroll.employeeName}</span>
              </div>
              ${payroll.bankDetails ? `
              <div class="info-item">
                <span class="label">Bank Account:</span>
                <span class="value">${payroll.bankDetails.bankName || 'N/A'} - Account ending with ${payroll.bankDetails.accountNumber ? payroll.bankDetails.accountNumber.slice(-4) : 'N/A'}</span>
              </div>
              ` : ''}
              ${payroll.transactionId ? `
              <div class="info-item">
                <span class="label">Reference Number:</span>
                <span class="value">${payroll.transactionId}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="label">Transfer Completion:</span>
                <span class="value">Salary successfully transferred to employee's bank account at ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}</span>
              </div>
              ` : `
              <div class="info-item">
                <span class="label">Payment Status:</span>
                <span class="value status-pending">⏳ PENDING: Salary transfer not yet processed</span>
              </div>
              <div class="info-item">
                <span class="label">Next Steps:</span>
                <span class="value">Salary will be transferred once payment is processed by the finance department.</span>
              </div>
              `}
            </div>
          </div>
          
          <div class="section">
            <div class="info-item">
              <span class="label">Remarks:</span>
              <span class="value">${payroll.notes || 'No remarks'}</span>
            </div>
          </div>
          
          <div class="signature">
            <div class="info-item">
              <span class="label">Authorized Signatory:</span>
            </div>
            <div class="signature-line"></div>
            <div class="info-item timestamp">
              Finance Department
            </div>
          </div>
          
          <div class="footer">
            <div>Generated on: ${new Date().toLocaleDateString()}</div>
            <div>Generated by: Admin Payroll System</div>
            <div>This is an official document - For official use only</div>
            <div class="no-print">
              <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">
                🖨️ Print Transcript
              </button>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(transcriptHTML);
      printWindow.document.close();
      
      printWindow.onload = function() {
        printWindow.focus();
      };
      
    } catch (error) {
      console.error('Payslip transcript error:', error);
      alert('❌ Failed to generate payslip transcript: ' + (error.response?.data?.error || error.message));
    }
  };

  // ==================== GENERATE PAYROLL FUNCTIONS ====================
  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    console.log('🚀 handleGeneratePayroll called');
    
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
      
      console.log('📦 Sending payload:', payload);
      
      const response = await axiosInstance.post('/admin/payroll/generate', payload);
      
      console.log('✅ Response:', response.data);
      
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
      console.error('❌ Error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      if (error.response?.data?.error) {
        alert(`❌ ${error.response.data.error}`);
      } else {
        alert(`❌ Error: ${error.message}`);
      }
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
      
      console.log('📤 Bulk generating', employeeIds.length, 'payroll IDs');
      
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
      console.error('❌ Bulk error:', error);
      alert(error.response?.data?.error || 'Failed');
    } finally {
      setGenerating(false);
    }
  };

  // ==================== OTHER FUNCTIONS ====================
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
      
      const res = await axiosInstance.put(`/admin/payroll/${selectedPayroll._id}`, updatedData);
      
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

  const handleOpenBankTransferModal = (payrollId) => {
    setSelectedForPayment(payrollId);
    setPaymentMethod('Bank Transfer');
    setPaymentDetails({
      accountNumber: '',
      bankName: '',
      transactionId: '',
      notes: ''
    });
    setShowBankTransferModal(true);
  };

  const handleOpenCashModal = (payrollId) => {
    setSelectedForPayment(payrollId);
    setShowCashModal(true);
  };

  const handleBankTransfer = async (e) => {
    e.preventDefault();
    
    if (!selectedForPayment) return;
    
    if (!paymentDetails.accountNumber) {
      alert('❌ Please enter account number');
      return;
    }
    
    if (!paymentDetails.bankName) {
      alert('❌ Please enter bank name');
      return;
    }
    
    try {
      setPaymentProcessing(true);
      
      const payroll = payrolls.find(p => p._id === selectedForPayment);
      
      if (!payroll) {
        alert('❌ Payroll not found');
        setPaymentProcessing(false);
        return;
      }
      
      const transactionId = paymentDetails.transactionId || `TRX${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const response = await axiosInstance.patch(`/admin/payroll/${selectedForPayment}/bank-transfer`, {
        paymentStatus: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Bank Transfer',
        transactionId: transactionId,
        paymentNotes: `Bank transfer to ${paymentDetails.bankName}. ${paymentDetails.notes}`,
        bankDetails: {
          accountNumber: paymentDetails.accountNumber,
          bankName: paymentDetails.bankName,
          ifscCode: paymentDetails.ifscCode || ''
        }
      });
      
      alert(`✅ Bank Transfer Successful!\n\nTransaction ID: ${transactionId}\nAmount: PKR ${payroll.netSalary.toLocaleString()}\nAccount: ${paymentDetails.accountNumber}\nBank: ${paymentDetails.bankName}\n\nEmail receipt has been sent to employee.`);
      
      setShowBankTransferModal(false);
      setSelectedForPayment(null);
      setPaymentDetails({
        accountNumber: '',
        bankName: '',
        transactionId: '',
        notes: ''
      });
      
      fetchPayrolls();
      fetchStats();
      
    } catch (error) {
      console.error('Bank transfer error:', error);
      alert('❌ Bank transfer failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleCashPayment = async () => {
    if (!selectedForPayment) return;
    
    try {
      const payroll = payrolls.find(p => p._id === selectedForPayment);
      
      if (!payroll) {
        alert('❌ Payroll not found');
        return;
      }
      
      await axiosInstance.patch(`/admin/payroll/${selectedForPayment}/status`, {
        paymentStatus: 'Paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Cash',
        transactionId: `CASH${Date.now()}`,
        paymentNotes: 'Cash payment received manually'
      });
      
      setShowCashModal(false);
      setSelectedForPayment(null);
      
      fetchPayrolls();
      fetchStats();
      
      alert('✅ Status updated to Paid (Cash Payment)');
    } catch (error) {
      alert('❌ Update failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDownloadPayslip = async (payrollId) => {
    try {
      window.open(`/admin/payroll/${payrollId}/payslip-pdf`, '_blank');
    } catch (error) {
      alert('❌ Failed to download payslip');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters({ ...filters, page: newPage });
    }
  };

  // ==================== EMPLOYEE STATS ====================
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

  // Loading State
  if (loading && payrolls.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-bold text-gray-700">Loading Payroll Dashboard...</p>
          <p className="text-gray-500 text-sm">Your enterprise payroll system is ready</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center md:text-left mb-6">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
            💰 Payroll Dashboard
          </h1>
          <p className="text-gray-600 font-medium max-w-2xl mx-auto md:mx-0 text-sm">
            Complete payroll management with bulk payments & bank transfers
          </p>
        </div>

        {/* Employee Summary */}
        <div className="mb-6 p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getActiveEmployeesCount()}</div>
              <div className="text-xs font-medium text-gray-500">Active Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {getActiveEmployeesCount() - getEmployeesWithoutBankDetails()}
              </div>
              <div className="text-xs font-medium text-gray-500">With Bank Details</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {getEmployeesWithoutBankDetails()}
              </div>
              <div className="text-xs font-medium text-gray-500">Without Bank Details</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {getUniqueDepartments().length}
              </div>
              <div className="text-xs font-medium text-gray-500">Departments</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={refreshEmployees}
              disabled={refreshingEmployees}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors flex items-center gap-1 mx-auto"
            >
              {refreshingEmployees ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-blue-600"></div>
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
        <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
          <button
            onClick={handleOpenBulkPaymentModal}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            Bulk Payment
          </button>
          
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 text-sm"
          >
            <Users className="w-4 h-4" />
            Bulk Generate
          </button>
          
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 text-sm"
          >
            <User className="w-4 h-4" />
            Individual
          </button>
          
          <button
            onClick={handleExportToExcel}
            disabled={exportLoading || payrolls.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          
          <button
            onClick={handleDownloadTemplate}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Template
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 px-2">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 group">
          <div className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
            {stats.totalPayrolls || 0}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payrolls</div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 group">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{stats.paidPayments || 0}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            <CheckCircle className="w-3 h-3 inline mr-1" />
            Paid
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 group">
          <div className="text-2xl font-bold text-amber-600 mb-1">{stats.pendingPayments || 0}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            <Clock className="w-3 h-3 inline mr-1" />
            Pending
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 group">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            PKR {(stats.totalAmount || 0).toLocaleString()}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            <DollarSign className="w-3 h-3 inline mr-1" />
            Total Amount
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="max-w-7xl mx-auto space-y-6 px-2">
        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/50">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value, page: 1 })}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Years</option>
                {monthsYears.years?.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value, page: 1 })}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Months</option>
                {monthsYears.months?.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <button
                onClick={() => setFilters({ year: '', month: 'all', status: 'all', page: 1, limit: 10 })}
                className="w-full px-3 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Payroll Records
              </h2>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium">
                  {payrolls.length} of {pagination.total}
                </span>
                <span className="px-2 py-1 bg-white/10 rounded-lg text-xs">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <User className="w-3 h-3 inline mr-1" />
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Period
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💵 Basic
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <DollarSign className="w-3 h-3 inline mr-1" />
                    Net
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📊 Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Building className="w-3 h-3 inline mr-1" />
                    Bank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ⚙️ Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="mb-2">No payroll records found</p>
                        <button 
                          onClick={() => setShowGenerateModal(true)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Click to generate payroll
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payrolls.map((payroll) => (
                    <tr key={payroll._id} className="hover:bg-blue-50 transition-all duration-200">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-gray-900">{payroll.employeeName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{payroll.employeeDepartment || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{payroll.employeeId || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm">{payroll.month || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{payroll.year || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-blue-600">
                          PKR {(payroll.basicSalary || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-emerald-600">
                          PKR {(payroll.netSalary || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          payroll.paymentStatus === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : payroll.paymentStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {payroll.paymentStatus === 'Paid' ? '✅ Paid' : 
                           payroll.paymentStatus === 'Pending' ? '⏳ Pending' : 
                           '❌ Failed'}
                        </span>
                        {payroll.paymentDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(payroll.paymentDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      
                      {/* ✅ FIXED: Bank Details Column */}
                      <td className="px-4 py-3 max-w-xs">
                        {payroll.bankDetails?.bankName ? (
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900 flex items-center gap-1">
                              <Building className="w-3 h-3 text-blue-600" />
                              {payroll.bankDetails.bankName}
                            </div>
                            {payroll.bankDetails.accountNumber && (
                              <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full inline-block">
                                ****{payroll.bankDetails.accountNumber.slice(-4)}
                              </div>
                            )}
                            {payroll.transactionId && (
                              <div className="text-gray-500 text-xs truncate max-w-[150px]" title={payroll.transactionId}>
                                ID: {payroll.transactionId}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-orange-500 text-xs font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            No bank details
                          </span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleDownloadPayslipWithTranscript(payroll._id)}
                            className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded hover:shadow transition-all text-xs flex items-center justify-center gap-1"
                            title="View detailed transcript"
                          >
                            <Eye className="w-3 h-3" />
                            Transcript
                          </button>
                          
                          <button
                            onClick={() => handleDownloadPayslip(payroll._id)}
                            className="px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded hover:shadow transition-all text-xs flex items-center justify-center gap-1"
                            title="Download PDF payslip"
                          >
                            <Printer className="w-3 h-3" />
                            PDF
                          </button>
                          
                          <button
                            onClick={() => handleExportSinglePayroll(payroll)}
                            className="px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded hover:shadow transition-all text-xs flex items-center justify-center gap-1"
                            title="Export to Excel"
                          >
                            <Download className="w-3 h-3" />
                            Excel
                          </button>
                          
                          <button
                            onClick={() => handleOpenUpdateModal(payroll)}
                            className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium rounded hover:shadow transition-all text-xs flex items-center justify-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          
                          <select
                            onChange={(e) => handleStatusUpdate(payroll._id, e.target.value)}
                            value={payroll.paymentStatus || 'Pending'}
                            className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white text-xs"
                          >
                            <option value="Pending">⏳ Pending</option>
                            <option value="Paid">✅ Paid</option>
                            <option value="Failed">❌ Failed</option>
                          </select>
                          
                          <button
                            onClick={() => handleDelete(payroll._id)}
                            className="px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded hover:shadow transition-all text-xs flex items-center justify-center gap-1"
                          >
                            🗑️ Delete
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
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-700">
                Showing <span className="font-medium">{((pagination.currentPage - 1) * filters.limit) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * filters.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> records
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Previous
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded text-xs ${
                        pagination.currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== BULK PAYMENT MODAL ==================== */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Bulk Salary Payment
              </h3>
              <button
                onClick={() => {
                  setShowBulkPaymentModal(false);
                  setBulkPaymentDetails({
                    paymentMethod: 'Bank Transfer',
                    transactionId: '',
                    notes: '',
                    selectedPayrolls: []
                  });
                }}
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={bulkPaymentDetails.paymentMethod}
                    onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, paymentMethod: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Bank Transfer">🏦 Bank Transfer</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Cheque">📄 Cheque</option>
                    <option value="Online Payment">🌐 Online Payment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID *</label>
                  <input
                    type="text"
                    value={bulkPaymentDetails.transactionId}
                    onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, transactionId: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="TRX-2024-001"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={bulkPaymentDetails.notes}
                  onChange={(e) => setBulkPaymentDetails({...bulkPaymentDetails, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Additional notes about this bulk payment..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSelectAllPending}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-3 h-3" />
                  Select All Pending
                </button>
                <button
                  onClick={handleClearSelections}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <XCircle className="w-3 h-3" />
                  Clear All
                </button>
                <div className="ml-auto text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Selected: {bulkPaymentDetails.selectedPayrolls.length} payrolls
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 font-medium text-gray-700 flex items-center justify-between">
                  <span>Select Payrolls for Payment</span>
                  <span className="text-sm font-normal">
                    {payrolls.filter(p => p.paymentStatus === 'Pending').length} pending payrolls
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {payrolls
                    .filter(p => p.paymentStatus === 'Pending')
                    .map((payroll) => {
                      const employee = employees.find(emp => emp._id === payroll.employeeId);
                      return (
                        <div 
                          key={payroll._id}
                          className={`p-3 border-t flex items-center justify-between hover:bg-gray-50 ${
                            bulkPaymentDetails.selectedPayrolls.includes(payroll._id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={bulkPaymentDetails.selectedPayrolls.includes(payroll._id)}
                              onChange={() => handleTogglePayrollSelection(payroll._id)}
                              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {payroll.employeeName}
                                {getEmployeeBankDetails(employee) ? (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">🏦</span>
                                ) : (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">⚠️</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {payroll.month} {payroll.year} • PKR {payroll.netSalary?.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm">
                            {getEmployeeBankDetails(employee) ? (
                              <div className="text-green-600 text-right">
                                <div>{getEmployeeBankDetails(employee)?.bankName}</div>
                                <div className="text-xs">****{getEmployeeBankDetails(employee)?.accountNumber?.slice(-4)}</div>
                              </div>
                            ) : (
                              <span className="text-red-500">No bank details</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              {bulkPaymentDetails.selectedPayrolls.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Payment Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Selected Payrolls</div>
                      <div className="font-bold text-lg">{bulkPaymentDetails.selectedPayrolls.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Amount</div>
                      <div className="font-bold text-lg text-emerald-600">
                        PKR {payrolls
                          .filter(p => bulkPaymentDetails.selectedPayrolls.includes(p._id))
                          .reduce((sum, p) => sum + (p.netSalary || 0), 0)
                          .toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Payment Method</div>
                      <div className="font-bold">{bulkPaymentDetails.paymentMethod}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowBulkPaymentModal(false);
                    setBulkPaymentDetails({
                      paymentMethod: 'Bank Transfer',
                      transactionId: '',
                      notes: '',
                      selectedPayrolls: []
                    });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
                
                <button
                  onClick={handleBulkPayment}
                  disabled={bulkPaymentProcessing || bulkPaymentDetails.selectedPayrolls.length === 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-sm font-bold text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bulkPaymentProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Processing Payments...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Process Bulk Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== INDIVIDUAL PAYROLL MODAL ==================== */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-white/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Generate Individual Payroll
              </h3>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setEmployeeSearch('');
                }}
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee *</label>
                
                {/* Employee Search */}
                <div className="mb-2 relative">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full p-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Search employees..."
                  />
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                </div>
                
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  size="5"
                >
                  <option value="">-- Choose Employee --</option>
                  {filteredEmployees.length === 0 ? (
                    <option value="" disabled>No employees found. {employeeSearch ? 'Try different search.' : 'Please add employees first.'}</option>
                  ) : (
                    filteredEmployees
                      .filter(emp => {
                        const status = getEmployeeStatus(emp);
                        return !['Terminated', 'Inactive', 'Resigned', 'Suspended', 'Left'].includes(status);
                      })
                      .map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {getEmployeeName(emp)} - {getEmployeeDepartment(emp)}
                          {getEmployeeBankDetails(emp) ? ' ✅' : ' ⚠️'}
                        </option>
                      ))
                  )}
                </select>
                
                <div className="mt-2 text-xs text-gray-600">
                  {employees.length === 0 ? (
                    <p className="text-red-500">⚠️ No employees found in database</p>
                  ) : (
                    <>
                      <p>Showing: {filteredEmployees.length} of {employees.length} employees</p>
                      <p>With Bank Details: {employees.filter(emp => getEmployeeBankDetails(emp)).length}</p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Month --</option>
                    {monthsYears.months?.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Year --</option>
                    {monthsYears.years?.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {selectedEmployee && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                  <p className="font-medium text-blue-800 mb-1">Selected Employee Info:</p>
                  {(() => {
                    const emp = employees.find(e => e._id === selectedEmployee);
                    if (emp) {
                      const bankDetails = getEmployeeBankDetails(emp);
                      return (
                        <>
                          <p>Name: {getEmployeeName(emp)}</p>
                          <p>Department: {getEmployeeDepartment(emp)}</p>
                          <p>Email: {getEmployeeEmail(emp) || 'N/A'}</p>
                          <p>Status: {getEmployeeStatus(emp)}</p>
                          <p className={bankDetails ? 'text-green-600' : 'text-red-600'}>
                            Bank: {bankDetails ? `${bankDetails.bankName} (****${bankDetails.accountNumber?.slice(-4)})` : 'Not set'}
                          </p>
                        </>
                      );
                    }
                    return 'Employee not found';
                  })()}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setEmployeeSearch('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || employees.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Generate Payroll
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== BULK GENERATE MODAL ==================== */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-white/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Bulk Generate Payroll
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleBulkGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <select
                    value={bulkMonth}
                    onChange={(e) => setBulkMonth(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Month --</option>
                    {monthsYears.months?.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    value={bulkYear}
                    onChange={(e) => setBulkYear(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Year --</option>
                    {monthsYears.years?.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department (Optional)</label>
                <select
                  value={bulkDepartment}
                  onChange={(e) => setBulkDepartment(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  {getUniqueDepartments().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {employees
                    .filter(emp => {
                      const deptMatch = bulkDepartment === 'all' || getEmployeeDepartment(emp) === bulkDepartment;
                      const isActive = !['Terminated', 'Inactive', 'Resigned', 'Suspended'].includes(
                        getEmployeeStatus(emp)
                      );
                      return deptMatch && isActive;
                    })
                    .length} active employees selected
                </p>
              </div>
              
              {employees.length > 0 && (
                <div className="text-xs text-gray-500 bg-emerald-50 p-2 rounded">
                  <p>📊 Bulk Generate Summary:</p>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Department: {bulkDepartment === 'all' ? 'All Departments' : bulkDepartment}</li>
                    <li>Selected Employees: {
                      employees
                        .filter(emp => {
                          const deptMatch = bulkDepartment === 'all' || getEmployeeDepartment(emp) === bulkDepartment;
                          const isActive = !['Terminated', 'Inactive', 'Resigned', 'Suspended'].includes(
                            getEmployeeStatus(emp)
                          );
                          return deptMatch && isActive;
                        })
                        .length
                    }</li>
                    <li>With Bank Details: {
                      employees
                        .filter(emp => {
                          const deptMatch = bulkDepartment === 'all' || getEmployeeDepartment(emp) === bulkDepartment;
                          const isActive = !['Terminated', 'Inactive', 'Resigned', 'Suspended'].includes(
                            getEmployeeStatus(emp)
                          );
                          return deptMatch && isActive;
                        })
                        .filter(emp => getEmployeeBankDetails(emp))
                        .length
                    }</li>
                  </ul>
                </div>
              )}
              
              {employees.length === 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-600 text-sm font-medium">⚠️ No employees found!</p>
                  <p className="text-red-500 text-xs mt-1">
                    Please add employees first before generating payroll.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || employees.length === 0}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
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

      {/* ==================== UPDATE PAYROLL MODAL ==================== */}
      {showUpdateModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-white/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Update Payroll Details
              </h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            {(() => {
              const employee = employees.find(emp => emp._id === selectedPayroll.employeeId);
              return employee ? (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Employee Bank Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Bank Name:</span>
                      <span className="font-medium ml-2">{getEmployeeBankDetails(employee)?.bankName || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Account Number:</span>
                      <span className="font-medium ml-2">{getEmployeeBankDetails(employee)?.accountNumber ? `****${getEmployeeBankDetails(employee)?.accountNumber?.slice(-4)}` : 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">IFSC Code:</span>
                      <span className="font-medium ml-2">{getEmployeeBankDetails(employee)?.ifscCode || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Account Holder:</span>
                      <span className="font-medium ml-2">{getEmployeeName(employee)}</span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
            
            <form onSubmit={handleUpdatePayroll} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                  <input
                    type="number"
                    value={updateData.basicSalary}
                    onChange={(e) => setUpdateData({...updateData, basicSalary: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Salary</label>
                  <input
                    type="number"
                    value={updateData.netSalary}
                    onChange={(e) => setUpdateData({...updateData, netSalary: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HRA</label>
                  <input
                    type="number"
                    value={updateData.hra}
                    onChange={(e) => setUpdateData({...updateData, hra: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DA</label>
                  <input
                    type="number"
                    value={updateData.da}
                    onChange={(e) => setUpdateData({...updateData, da: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conveyance</label>
                  <input
                    type="number"
                    value={updateData.conveyance}
                    onChange={(e) => setUpdateData({...updateData, conveyance: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Allowance</label>
                  <input
                    type="number"
                    value={updateData.medicalAllowance}
                    onChange={(e) => setUpdateData({...updateData, medicalAllowance: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Allowance</label>
                  <input
                    type="number"
                    value={updateData.specialAllowance}
                    onChange={(e) => setUpdateData({...updateData, specialAllowance: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TDS</label>
                  <input
                    type="number"
                    value={updateData.tds}
                    onChange={(e) => setUpdateData({...updateData, tds: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PF</label>
                  <input
                    type="number"
                    value={updateData.pf}
                    onChange={(e) => setUpdateData({...updateData, pf: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Tax</label>
                  <input
                    type="number"
                    value={updateData.professionalTax}
                    onChange={(e) => setUpdateData({...updateData, professionalTax: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Additional notes about payroll updates..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
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

      {/* ==================== BANK TRANSFER MODAL ==================== */}
      {showBankTransferModal && selectedForPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-white/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Transfer Payment
              </h3>
              <button
                onClick={() => setShowBankTransferModal(false)}
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleBankTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={paymentDetails.accountNumber}
                  onChange={(e) => setPaymentDetails({...paymentDetails, accountNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234567890123"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={paymentDetails.bankName}
                  onChange={(e) => setPaymentDetails({...paymentDetails, bankName: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="HBL, UBL, MCB, etc."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (Optional)</label>
                <input
                  type="text"
                  value={paymentDetails.transactionId}
                  onChange={(e) => setPaymentDetails({...paymentDetails, transactionId: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="TRX123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={paymentDetails.notes}
                  onChange={(e) => setPaymentDetails({...paymentDetails, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Additional payment details..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBankTransferModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentProcessing}
                  className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    'Process Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CASH PAYMENT MODAL ==================== */}
      {showCashModal && selectedForPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-white/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Cash Payment Confirmation
              </h3>
              <button
                onClick={() => setShowCashModal(false)}
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to mark this payroll as <span className="font-bold text-green-600">Paid (Cash)</span>?
              </p>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Important
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  This action will update the payment status to "Paid" and record the payment as cash transaction.
                  Make sure you have collected the cash payment before confirming.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCashPayment}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-lg hover:bg-yellow-600 transition-all flex items-center justify-center gap-2"
                >
                  <Banknote className="w-4 h-4" />
                  Confirm Cash Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== IMPORT EXCEL MODAL ==================== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Payroll from Excel
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportProgress(0);
                }}
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Import Instructions
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Download template first for correct format</li>
                  <li>• Required columns: Employee ID, Name, Month, Year, Basic Salary, Net Salary</li>
                  <li>• Existing records will be updated</li>
                  <li>• New records will be created</li>
                  <li>• File types: .xlsx, .xls, .csv</li>
                </ul>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-3">
                  {importFile ? importFile.name : 'Drag & drop or click to select Excel file'}
                </p>
                <input
                  type="file"
                  id="excel-import"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="excel-import"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {importFile ? 'Change File' : 'Select File'}
                </label>
                
                {importFile && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      ✅ File selected: {importFile.name}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Size: {(importFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
              </div>
              
              {importLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Importing...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportProgress(0);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
                
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-3 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Template
                </button>
                
                <button
                  onClick={handleImportExcel}
                  disabled={!importFile || importLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-sm font-bold text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Now
                    </>
                  )}
                </button>
              </div>
              
              {importResults.success > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 mt-4">
                  <p className="text-green-700 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Import Completed Successfully!
                  </p>
                  <div className="text-sm text-green-600 mt-2">
                    <p>Successfully processed: {importResults.success} records</p>
                    {importResults.failed > 0 && (
                      <p>Failed: {importResults.failed} records</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayroll;