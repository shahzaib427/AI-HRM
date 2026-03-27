import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmployeePayroll = () => {
  const [dashboard, setDashboard] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState(false);
  const [user, setUser] = useState(null);
  const [years, setYears] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced token retrieval with multiple possible locations
  const getToken = () => {
    // Check all possible token storage locations
    const token = 
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwtToken') ||
      localStorage.getItem('userToken') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('authToken');
    
    console.log('Retrieved token:', token ? 'Found' : 'Not found');
    return token;
  };

  // Clear all stored tokens
  const clearStoredTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    console.log('Cleared all stored tokens');
  };

  // Helper function to decode JWT
  const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(window.atob(base64));
      console.log('Decoded token payload:', decoded);
      return decoded;
    } catch (err) {
      console.error('Failed to decode JWT:', err);
      return null;
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = getToken();
      
      if (!token) {
        console.log('No token found, setting auth error');
        setAuthError(true);
        setError('Please login to access payroll information');
        setLoading(false);
        return false;
      }
      
      // Try to decode token
      try {
        const payload = decodeJWT(token);
        if (!payload) {
          throw new Error('Invalid token format');
        }
        
        // Check token expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.log('Token expired');
          clearStoredTokens();
          setAuthError(true);
          setError('Your session has expired. Please login again.');
          setLoading(false);
          return false;
        }
        
        // Set user info from token
        setUser({
          _id: payload.id || payload._id || payload.userId,
          employeeId: payload.employeeId || payload.empId || payload.employeeNumber,
          name: payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || 'Employee',
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
          department: payload.department,
          position: payload.position,
          email: payload.email
        });
        
        console.log('User set from token:', {
          _id: payload.id || payload._id,
          name: payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim()
        });
        
        return true;
      } catch (err) {
        console.error('Token decode error:', err);
        clearStoredTokens();
        setAuthError(true);
        setError('Invalid authentication token. Please login again.');
        setLoading(false);
        return false;
      }
    };

    checkAuth();
  }, []);

  // Enhanced axios instance with better error handling
  const createAxiosInstance = () => {
    const token = getToken();
    
    const instance = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      timeout: 15000,
      withCredentials: true
    });

    // Request interceptor
    instance.interceptors.request.use(
      (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
        
        // Add cache-busting parameter for GET requests
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now()
          };
        }
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => {
        console.log(`Response from ${response.config.url}:`, response.status);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response) {
          console.error('API Error:', {
            status: error.response.status,
            url: error.config.url,
            data: error.response.data
          });
          
          // Handle 401 Unauthorized
          if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            clearStoredTokens();
            setAuthError(true);
            setError('Your session has expired. Please login again.');
            
            // Redirect to login after a delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            
            return Promise.reject(error);
          }
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Request setup error:', error.message);
        }
        
        return Promise.reject(error);
      }
    );

    return instance;
  };

  // Fetch all data when user is authenticated
  useEffect(() => {
    if (user && !authError) {
      console.log('Fetching data for user:', user.employeeId);
      fetchAllData();
    }
  }, [user, selectedYear, authError, retryCount]);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const results = await Promise.allSettled([
        fetchDashboard(),
        fetchPayrolls(),
        fetchPayrollYears()
      ]);
      
      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`${failures.length} requests failed:`, failures);
      }
    } catch (err) {
      console.error('Error in fetchAllData:', err);
    } finally {
      setLoading(false);
    }
  };

const fetchDashboard = async () => {
  try {
    const axiosInstance = createAxiosInstance();
    console.log('🔵 Fetching dashboard...');
    const res = await axiosInstance.get('/employee/payroll/dashboard');
    
    console.log('🟢 Dashboard response:', res.data);
    
    if (res.data.success) {
      setDashboard(res.data.data);
    } else {
      setError(res.data.message || 'Failed to load dashboard');
    }
  } catch (err) {
    console.error('🔴 Dashboard fetch error:', err);
    if (err.response?.status === 401) {
      setError('Please login to access payroll information');
    } else {
      setError('Failed to load dashboard data. Please try again.');
    }
  }
};

const fetchPayrolls = async () => {
  try {
    const axiosInstance = createAxiosInstance();
    console.log('🔵 Fetching payrolls for year:', selectedYear);
    const res = await axiosInstance.get(`/employee/payroll?year=${selectedYear}`);
    
    console.log('🟢 Payrolls response:', res.data);
    
    if (res.data.success) {
      setPayrolls(res.data.data || []);
    } else {
      setPayrolls([]);
      setError(res.data.message || 'No payroll data found');
    }
  } catch (err) {
    console.error('🔴 Payrolls fetch error:', err);
    if (err.response?.status !== 401) {
      setPayrolls([]);
    }
  }
};

const fetchPayrollYears = async () => {
  try {
    const axiosInstance = createAxiosInstance();
    console.log('🔵 Fetching available years...');
    const res = await axiosInstance.get('/employee/payroll/years');
    
    console.log('🟢 Years response:', res.data);
    
    if (res.data.success) {
      setYears(res.data.data || []);
    } else {
      // Generate last 5 years as fallback
      const currentYear = new Date().getFullYear();
      const yearList = [];
      for (let i = 0; i < 5; i++) {
        yearList.push(currentYear - i);
      }
      setYears(yearList);
    }
  } catch (err) {
    console.error('🔴 Years fetch error:', err);
    if (err.response?.status !== 401) {
      const currentYear = new Date().getFullYear();
      setYears([currentYear, currentYear - 1, currentYear - 2]);
    }
  }
};

  // Improved error handling
  const handleApiError = (error, context = '') => {
    console.error(`API Error for ${context}:`, error);
    
    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 401:
          setAuthError(true);
          setError('Authentication failed. Please login again.');
          break;
        case 403:
          setError('You do not have permission to access payroll data.');
          break;
        case 404:
          setError(`Payroll ${context} not found.`);
          break;
        case 500:
          setError('Server error. Please try again later.');
          break;
        case 502:
        case 503:
        case 504:
          setError('Service temporarily unavailable. Please try again.');
          break;
        default:
          setError(error.response.data?.message || `Failed to load ${context}`);
      }
    } else if (error.request) {
      // Request made but no response
      setError('Cannot connect to server. Please check your internet connection.');
    } else {
      // Request setup error
      setError('Failed to make request. Please try again.');
    }
  };

  // Navigation to login
  const goToLogin = () => {
    clearStoredTokens();
    window.location.href = '/login';
  };

  // Download payslip
  const downloadPayslip = async (id) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Please login to download payslip');
        goToLogin();
        return;
      }
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = `http://localhost:5000/api/employee/payroll/payslip/${id}/download`;
      link.setAttribute('download', `payslip-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      alert('Failed to download payslip. Please try again.');
      console.error('Download error:', err);
    }
  };

  // View payslip in new window
  const viewPayslip = async (id) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Please login to view payslip');
        goToLogin();
        return;
      }
      
      const url = `http://localhost:5000/api/employee/payroll/payslip/${id}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      
    } catch (err) {
      alert('Failed to view payslip. Please try again.');
      console.error('View payslip error:', err);
    }
  };

  // Request correction
  const requestCorrection = async (id) => {
    const reason = prompt('Please enter reason for correction request:');
    if (reason && reason.trim()) {
      try {
        const axiosInstance = createAxiosInstance();
        const res = await axiosInstance.post(`/employee/payroll/${id}/request-correction`, { 
          issue: 'Discrepancy',
          details: reason.trim(),
          date: new Date().toISOString()
        });
        
        if (res.data.success) {
          alert('Correction request submitted successfully!');
          // Refresh data
          fetchAllData();
        } else {
          alert(res.data.message || 'Failed to submit request');
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to submit request. Please try again.');
        console.error('Correction request error:', err);
      }
    } else if (reason !== null) {
      alert('Please provide a reason for the correction request.');
    }
  };

  // Format currency
  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-PK', { 
      style: 'currency', 
      currency: 'PKR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  };

  // Retry loading data
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError('');
    setLoading(true);
  };

  // Show authentication error page
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-6 text-red-500">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">{error || 'Please login to access payroll information'}</p>
          
          <div className="space-y-4">
            <button
              onClick={goToLogin}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Go to Login
            </button>
            <button
              onClick={() => {
                clearStoredTokens();
                window.location.reload();
              }}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Clear Cache & Retry
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Having trouble logging in?</p>
            <p className="text-sm text-gray-500">Contact HR at hr@company.com or call (123) 456-7890</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && !dashboard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Loading Payroll Information</h2>
          <p className="text-gray-600 mb-1">Fetching your payroll data...</p>
          <p className="text-sm text-gray-400 animate-pulse">This may take a few moments</p>
          
          <div className="mt-8 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Error Alert */}
        {error && !authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 font-medium">Error Loading Data</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button 
                  onClick={handleRetry}
                  className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                >
                  Retry
                </button>
                <button 
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">My Payroll Dashboard</h1>
                <button 
                  onClick={handleRetry}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Refresh data"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-1">
                Welcome back, <span className="font-semibold text-blue-700">{user?.name || 'Employee'}</span>! Here's your payroll overview
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium">
                  ID: {user?.employeeId || 'N/A'}
                </span>
                {user?.department && (
                  <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full">
                    {user.department}
                  </span>
                )}
                {user?.position && (
                  <span className="text-sm bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                    {user.position}
                  </span>
                )}
                {user?.role && (
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full">
                    {user.role}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 min-w-[200px]">
              <p className="text-sm text-gray-500 mb-1">Current Balance</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">
                {formatCurrency(dashboard?.currentPayroll?.netSalary || 0)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {dashboard?.currentPayroll?.month || 'Month'} {dashboard?.currentPayroll?.year || 'Year'}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  dashboard?.currentPayroll?.status === 'Processed' || dashboard?.currentPayroll?.status === 'Paid'
                    ? 'bg-green-100 text-green-800' 
                    : dashboard?.currentPayroll?.status === 'Pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {dashboard?.currentPayroll?.status || 'Processing'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Month Summary */}
        {dashboard?.currentPayroll && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Current Month</h2>
                <p className="text-gray-600 text-sm">
                  Payroll details for {dashboard.currentPayroll.month} {dashboard.currentPayroll.year}
                </p>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-gray-500 text-sm">Payment Date: </span>
                  <span className="font-medium">{formatDate(dashboard.currentPayroll.paymentDate)}</span>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  dashboard.currentPayroll.status === 'Processed' || dashboard.currentPayroll.status === 'Paid'
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : dashboard.currentPayroll.status === 'Pending'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {dashboard.currentPayroll.status || 'Processing'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Net Salary</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboard.currentPayroll.netSalary || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Amount to be paid</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Basic Salary</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboard.currentPayroll.basicSalary || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Base compensation</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Allowances</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboard.currentPayroll.allowances || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">HRA, DA, etc.</p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border border-yellow-200 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Bonus</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboard.currentPayroll.bonus || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Performance bonus</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Deductions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboard.currentPayroll.deductions || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Tax, PF, etc.</p>
              </div>
            </div>
          </div>
        )}

        {/* Year Selector & Stats */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Payslip History</h2>
              <p className="text-gray-600 text-sm">View and download your past payslips</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="bg-white px-4 py-3 rounded-lg shadow border border-gray-200">
                <span className="text-sm text-gray-500 mr-3">Filter by Year:</span>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent border-none focus:outline-none focus:ring-0 font-medium cursor-pointer"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div className="bg-white px-4 py-3 rounded-lg shadow border border-gray-200">
                <span className="text-sm text-gray-500 mr-2">Total Records:</span>
                <span className="font-bold text-blue-600">{payrolls.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payslips Grid */}
        {payrolls.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center mb-8">
            <div className="text-6xl mb-4 opacity-50">📄</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Payslips Found</h3>
            <p className="text-gray-600 mb-6">No payroll records available for {selectedYear}</p>
            {years.length > 1 && selectedYear > Math.min(...years) && (
              <button
                onClick={() => setSelectedYear(selectedYear - 1)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                View {selectedYear - 1} Records
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {payrolls.map((payslip) => (
              <div key={payslip._id} className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow duration-300 border border-gray-100 hover:border-blue-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {payslip.month} {payslip.year}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Paid: {formatDate(payslip.paymentDate || payslip.createdAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payslip.status === 'Processed' || payslip.status === 'Paid'
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : payslip.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {payslip.status}
                  </span>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-gray-600">Basic:</span>
                    <span className="font-medium">{formatCurrency(payslip.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-gray-600">Allowances:</span>
                    <span className="font-medium text-green-600">+{formatCurrency(payslip.allowances)}</span>
                  </div>
                  {payslip.bonus > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-gray-600">Bonus:</span>
                      <span className="font-medium text-green-600">+{formatCurrency(payslip.bonus || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-gray-600">Deductions:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(payslip.deductions)}</span>
                  </div>
                  <div className="pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">Net Salary:</span>
                      <span className="font-bold text-green-700 text-lg">{formatCurrency(payslip.netSalary)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => viewPayslip(payslip._id)}
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                  <button
                    onClick={() => downloadPayslip(payslip._id)}
                    className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
                
                {payslip.status === 'Pending' && (
                  <button
                    onClick={() => requestCorrection(payslip._id)}
                    className="w-full mt-3 text-center text-sm text-blue-600 hover:text-blue-800 hover:underline pt-2 border-t border-gray-100"
                  >
                    Request Correction
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Year-to-Date Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Total Earned:</span>
                <span className="font-bold text-xl text-green-700">
                  {formatCurrency(dashboard?.ytdSummary?.totalNetSalary || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Months Paid:</span>
                <span className="font-bold text-blue-700">{dashboard?.ytdSummary?.count || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Total Allowances:</span>
                <span className="font-medium">{formatCurrency(dashboard?.ytdSummary?.totalAllowances || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Monthly:</span>
                <span className="font-medium">
                  {formatCurrency(
                    (dashboard?.ytdSummary?.totalNetSalary || 0) / 
                    Math.max(1, dashboard?.ytdSummary?.count || 1)
                  )}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Payments
            </h3>
            <div className="space-y-3">
              {(dashboard?.recentPayrolls || []).slice(0, 4).map((payment, index) => (
                <div key={payment._id || index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-800">{payment.month}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block text-green-700">{formatCurrency(payment.netSalary)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                      payment.status === 'Processed' || payment.status === 'Paid'
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!dashboard?.recentPayrolls || dashboard.recentPayrolls.length === 0) && (
                <p className="text-gray-500 text-center py-4">No recent payments</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button 
                onClick={handleRetry}
                className="w-full text-left p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-3 border border-blue-100"
              >
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Refresh Data</p>
                  <p className="text-sm text-gray-500">Update all information</p>
                </div>
              </button>
              <button 
                onClick={() => {
                  if (payrolls.length > 0) {
                    const confirmed = window.confirm(`Download all ${payrolls.length} payslips for ${selectedYear} as a ZIP file?`);
                    if (confirmed) {
                      // Implement bulk download
                      alert('Bulk download feature coming soon!');
                    }
                  } else {
                    alert('No payslips available to download');
                  }
                }}
                className="w-full text-left p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-3 border border-green-100"
              >
                <div className="bg-green-100 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Download All</p>
                  <p className="text-sm text-gray-500">Download all payslips for {selectedYear}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-200 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 mb-1">Need Help?</h4>
              <p className="text-gray-600 text-sm mb-3">
                For any payroll-related queries, discrepancies, or correction requests, 
                please contact your HR department or use the correction request feature.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">
                    <span className="font-medium">HR Department:</span> hr@company.com
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium">Phone:</span> (123) 456-7890
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">
                    <span className="font-medium">Last updated:</span> {new Date().toLocaleString()}
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium">Data source:</span> Employee Payroll System
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-700">Debug Information</summary>
              <div className="mt-2 text-xs space-y-1">
                <p><strong>Token:</strong> {getToken() ? 'Present' : 'Missing'}</p>
                <p><strong>User:</strong> {JSON.stringify(user, null, 2)}</p>
                <p><strong>Dashboard:</strong> {dashboard ? 'Loaded' : 'Not loaded'}</p>
                <p><strong>Payrolls:</strong> {payrolls.length} records</p>
                <p><strong>Years:</strong> {years.join(', ')}</p>
                <p><strong>Selected Year:</strong> {selectedYear}</p>
                <p><strong>Error:</strong> {error || 'None'}</p>
                <p><strong>Auth Error:</strong> {authError ? 'Yes' : 'No'}</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePayroll;