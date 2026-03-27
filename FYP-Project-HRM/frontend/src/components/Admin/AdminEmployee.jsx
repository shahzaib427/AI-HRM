import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminEmployee = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');

  // Helper function to get image URL
  const getImageUrl = (path) => {
    if (!path) return null;
    
    // If it's already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // If it starts with /uploads, prepend the server URL
    return `http://localhost:5000${path}`;
  };

  // Check if user is authenticated
  const checkAuth = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token) {
      return false;
    }
    
    return true;
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!checkAuth()) {
        setError('Please login to access this page');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      
      const res = await axiosInstance.get('/employees');
      
      if (res.data.success && res.data.data) {
        const employeeData = Array.isArray(res.data.data) ? res.data.data : [];
        setEmployees(employeeData);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        const errorMsg = err.response.data?.error || 'Session expired';
        setError(`${errorMsg}. Please login again.`);
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to fetch employees');
      }
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (logout) logout();
    navigate('/login');
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    if (!emp) return false;
    
    const matchesSearch = 
      (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (emp.employeeId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (emp.position?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (emp.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && emp.isActive !== false) ||
      (selectedStatus === 'inactive' && emp.isActive === false);
    
    const matchesRole = selectedRole === 'all' || emp.role === selectedRole;
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
  });

  // Get unique values for filters
  const departments = ['all', ...new Set(employees
    .map(emp => emp?.department)
    .filter(dept => dept && dept.trim() !== ''))];

  const roles = ['all', ...new Set(employees
    .map(emp => emp?.role)
    .filter(role => role))];

  // Stats calculation
  const stats = {
    total: employees.length,
    active: employees.filter(emp => emp?.isActive !== false).length,
    inactive: employees.filter(emp => emp?.isActive === false).length,
    admins: employees.filter(emp => emp?.role === 'admin').length,
    hr: employees.filter(emp => emp?.role === 'hr').length,
    regular: employees.filter(emp => emp?.role === 'employee').length,
    permanent: employees.filter(emp => emp?.employeeType === 'permanent').length,
    contract: employees.filter(emp => emp?.employeeType === 'contract').length,
    intern: employees.filter(emp => emp?.employeeType === 'intern').length
  };

  // Delete employee
  const handleDelete = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axiosInstance.delete(`/employees/${employeeToDelete._id}`);
      
      setEmployees(employees.filter(emp => emp._id !== employeeToDelete._id));
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      
      alert('✅ Employee deleted successfully');
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  // Toggle employee status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axiosInstance.put(`/employees/${id}`, 
        { isActive: !currentStatus }
      );
      
      fetchEmployees();
      alert('✅ Status updated successfully');
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  // View employee details
  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
    setActiveTab('personal');
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format currency
  const formatCurrency = (amount, currency) => {
    if (!amount || amount === 0 || amount === '') return 'N/A';
    
    const currencySymbols = {
      'PKR': '₨',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'AED': 'د.إ',
      'SAR': 'ر.س'
    };
    
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${parseFloat(amount).toLocaleString()}`;
  };

  // Get employee type label
  const getEmployeeTypeLabel = (type) => {
    const types = {
      'permanent': 'Permanent Employee',
      'contract': 'Contractual Employee',
      'intern': 'Intern/Trainee',
      'probation': 'Probationary',
      'consultant': 'Consultant',
      'visitor': 'Visitor/Special Access',
      'part-time': 'Part-time Employee',
      'freelance': 'Freelance'
    };
    return types[type] || type;
  };

  // Get blood group label
  const getBloodGroupLabel = (group) => {
    if (!group || group === '') return 'N/A';
    
    const groups = {
      'A+': 'A Positive',
      'A-': 'A Negative',
      'B+': 'B Positive',
      'B-': 'B Negative',
      'O+': 'O Positive',
      'O-': 'O Negative',
      'AB+': 'AB Positive',
      'AB-': 'AB Negative'
    };
    return groups[group] || group;
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();
      
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
      return age;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    if (!checkAuth()) {
      navigate('/login');
      return;
    }
    
    fetchEmployees();
  }, [navigate]);

  // Show authentication error
  if (error && (error.includes('Session expired') || error.includes('Unauthorized') || error.includes('Please login'))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
          <button
            onClick={fetchEmployees}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-gray-600 mt-1">Manage your organization's workforce</p>
              {currentUser && (
                <p className="text-sm text-gray-500 mt-1">
                  Logged in as: <span className="font-medium">{currentUser.name}</span> ({currentUser.role})
                </p>
              )}
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1 border border-transparent rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
              <button
                onClick={() => navigate('/admin/employees/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <span className="mr-2">➕</span>
                Add Employee
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Total Employees</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Active</p>
              <p className="text-xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Inactive</p>
              <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Admins</p>
              <p className="text-xl font-bold text-purple-600">{stats.admins}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">HR Staff</p>
              <p className="text-xl font-bold text-orange-600">{stats.hr}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Regular</p>
              <p className="text-xl font-bold text-blue-600">{stats.regular}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Permanent</p>
              <p className="text-xl font-bold text-indigo-600">{stats.permanent}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Contract</p>
              <p className="text-xl font-bold text-yellow-600">{stats.contract}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Interns</p>
              <p className="text-xl font-bold text-pink-600">{stats.intern}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role === 'all' ? 'All Roles' : 
                     role === 'admin' ? 'Administrator' :
                     role === 'hr' ? 'HR Manager' : 'Employee'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-end">
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded ${viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  title="Card View"
                >
                  <span className="text-lg">📇</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  title="Table View"
                >
                  <span className="text-lg">📊</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4">
        {/* Results Count */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredEmployees.length}</span> of{' '}
            <span className="font-semibold">{employees.length}</span> employees
          </p>
          <button
            onClick={fetchEmployees}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">❌</span>
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Cards View */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((employee) => (
              <div key={employee._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Card Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                        {employee.profilePicture ? (
                          <img 
                            src={getImageUrl(employee.profilePicture)}
                            alt={employee.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <span class="text-blue-600 font-bold text-lg">
                                  ${employee.name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              `;
                            }}
                          />
                        ) : (
                          <span className="text-blue-600 font-bold text-lg">
                            {employee.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">{employee.name || 'Unnamed'}</h3>
                        <div className="flex items-center mt-1">
                          <p className="text-sm text-gray-500 mr-2">{employee.employeeId || 'No ID'}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            employee.employeeType === 'permanent' ? 'bg-green-100 text-green-800' :
                            employee.employeeType === 'contract' ? 'bg-yellow-100 text-yellow-800' :
                            employee.employeeType === 'intern' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {employee.employeeType?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      employee.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      employee.role === 'hr' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {employee.role === 'admin' ? 'Admin' : 
                       employee.role === 'hr' ? 'HR' : 'Employee'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2 w-5">📧</span>
                      <span className="truncate">{employee.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2 w-5">🏢</span>
                      <span>{employee.department || 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2 w-5">💼</span>
                      <span>{employee.position || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2 w-5">📱</span>
                      <span>{employee.phone || 'No phone'}</span>
                    </div>
                    {employee.salary > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2 w-5">💰</span>
                        <span>{formatCurrency(employee.salary, employee.currency)}/{employee.salaryFrequency}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.isActive !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.isActive !== false ? '✓ Active' : '✗ Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Joined: {formatDate(employee.joiningDate)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleViewEmployee(employee)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title="View Details"
                    >
                      <span className="text-lg">👁️</span>
                    </button>
                    <button
                      onClick={() => navigate(`/admin/employees/edit/${employee._id}`)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit"
                    >
                      <span className="text-lg">✏️</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(employee._id, employee.isActive)}
                      className={`p-1 ${employee.isActive !== false ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                      title={employee.isActive !== false ? 'Deactivate' : 'Activate'}
                    >
                      {employee.isActive !== false ? (
                        <span className="text-lg">⭕</span>
                      ) : (
                        <span className="text-lg">✅</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(employee)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete"
                    >
                      <span className="text-lg">🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                            {employee.profilePicture ? (
                              <img 
                                src={getImageUrl(employee.profilePicture)}
                                alt={employee.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `
                                    <span class="text-blue-600 font-semibold">
                                      ${employee.name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  `;
                                }}
                              />
                            ) : (
                              <span className="text-blue-600 font-semibold">
                                {employee.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.employeeId}</div>
                            <div className="text-xs text-gray-400">{employee.employeeType && getEmployeeTypeLabel(employee.employeeType)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{employee.email}</div>
                        <div className="text-sm text-gray-500">{employee.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{employee.department || '—'}</div>
                        <div className="text-sm text-gray-500">{employee.position || '—'}</div>
                        <div className="text-xs text-gray-400">Joined: {formatDate(employee.joiningDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {employee.salary > 0 ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(employee.salary, employee.currency)}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">{employee.salaryFrequency}</div>
                        </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            employee.isActive !== false
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            employee.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            employee.role === 'hr' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {employee.role === 'admin' ? 'Admin' : 
                             employee.role === 'hr' ? 'HR' : 'Employee'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewEmployee(employee)}
                            className="text-green-600 hover:text-green-900 px-2 py-1 rounded bg-green-50"
                            title="View Details"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => navigate(`/admin/employees/edit/${employee._id}`)}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded bg-blue-50"
                            title="Edit"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(employee._id, employee.isActive)}
                            className={`px-2 py-1 text-xs rounded ${
                              employee.isActive !== false
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {employee.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <span className="text-6xl">👥</span>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No employees found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || selectedDepartment !== 'all' || selectedStatus !== 'all' || selectedRole !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first employee'}
            </p>
            {!searchTerm && selectedDepartment === 'all' && selectedStatus === 'all' && selectedRole === 'all' && (
              <button
                onClick={() => navigate('/admin/employees/new')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <span className="mr-2">➕</span>
                Add Employee
              </button>
            )}
          </div>
        )}
      </div>

      {/* Employee View Modal - WITH SCROLL BARS */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-white flex items-center justify-center mr-4">
                    {selectedEmployee.profilePicture ? (
                      <img 
                        src={getImageUrl(selectedEmployee.profilePicture)}
                        alt={selectedEmployee.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <span class="text-blue-600 font-bold text-2xl">
                              ${selectedEmployee.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          `;
                        }}
                      />
                    ) : (
                      <span className="text-blue-600 font-bold text-2xl">
                        {selectedEmployee.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedEmployee.name}</h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
                        {selectedEmployee.employeeId}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        selectedEmployee.isActive !== false
                          ? 'bg-green-500 bg-opacity-20'
                          : 'bg-red-500 bg-opacity-20'
                      }`}>
                        {selectedEmployee.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 flex-shrink-0">
              <nav className="flex space-x-4 px-6 pt-4 overflow-x-auto">
                {['personal', 'employment', 'address', 'emergency', 'salary', 'additional', 'system'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab === 'personal' && 'Personal'}
                    {tab === 'employment' && 'Employment'}
                    {tab === 'address' && 'Address'}
                    {tab === 'emergency' && 'Emergency'}
                    {tab === 'salary' && 'Salary'}
                    {tab === 'additional' && 'Additional'}
                    {tab === 'system' && 'System'}
                  </button>
                ))}
              </nav>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Personal Information Tab */}
                {activeTab === 'personal' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                      <InfoRow label="Full Name" value={selectedEmployee.name} />
                      <InfoRow label="Email" value={selectedEmployee.email} type="email" />
                      <InfoRow label="Primary Phone" value={selectedEmployee.phone} type="phone" />
                      <InfoRow label="Alternate Phone" value={selectedEmployee.alternatePhone} type="phone" />
                      <InfoRow label="CNIC/NICOP" value={selectedEmployee.idCardNumber} />
                      <InfoRow label="Date of Birth" value={formatDate(selectedEmployee.dateOfBirth)} />
                      {selectedEmployee.dateOfBirth && (
                        <InfoRow label="Age" value={`${calculateAge(selectedEmployee.dateOfBirth)} years`} />
                      )}
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Details</h3>
                      <InfoRow label="Gender" value={selectedEmployee.gender} />
                      <InfoRow label="Blood Group" value={getBloodGroupLabel(selectedEmployee.bloodGroup)} />
                      <InfoRow label="Marital Status" value={selectedEmployee.maritalStatus} />
                    </div>
                  </div>
                )}

                {/* Employment Information Tab */}
                {activeTab === 'employment' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Employment Details</h3>
                      <InfoRow label="Employee Type" value={getEmployeeTypeLabel(selectedEmployee.employeeType)} />
                      <InfoRow label="Department" value={selectedEmployee.department} />
                      <InfoRow label="Position" value={selectedEmployee.position} />
                      <InfoRow label="Employee ID" value={selectedEmployee.employeeId} />
                      <InfoRow label="Joining Date" value={formatDate(selectedEmployee.joiningDate)} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">System Information</h3>
                      <InfoRow label="System Role" value={
                        selectedEmployee.role === 'admin' ? 'Administrator' :
                        selectedEmployee.role === 'hr' ? 'HR Manager' : 
                        selectedEmployee.role === 'team-lead' ? 'Team Lead' :
                        selectedEmployee.role === 'manager' ? 'Manager' : 'Employee'
                      } />
                      <InfoRow label="Reporting Manager" value={selectedEmployee.reportingManager} />
                    </div>
                  </div>
                )}

                {/* Address Information Tab */}
                {activeTab === 'address' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Present Address</h3>
                      <InfoRow label="Address" value={selectedEmployee.presentAddress} multiline />
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="City" value={selectedEmployee.city} />
                        <InfoRow label="State" value={selectedEmployee.state} />
                        <InfoRow label="Country" value={selectedEmployee.country} />
                        <InfoRow label="Postal Code" value={selectedEmployee.postalCode} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Permanent Address</h3>
                      <InfoRow label="Address" value={selectedEmployee.permanentAddress} multiline />
                    </div>
                  </div>
                )}

                {/* Emergency Contact Tab */}
                {activeTab === 'emergency' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Emergency Contact Information</h3>
                      {selectedEmployee.emergencyContact ? (
                        <div className="bg-blue-50 rounded-lg p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-blue-800 mb-1">Contact Name</label>
                              <p className="text-lg font-semibold text-blue-900">
                                {selectedEmployee.emergencyContact.name}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-blue-800 mb-1">Relationship</label>
                              <p className="text-lg font-semibold text-blue-900">
                                {selectedEmployee.emergencyContact.relationship}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-blue-800 mb-1">Phone Number</label>
                              <p className="text-lg font-semibold text-blue-900">
                                {selectedEmployee.emergencyContact.phone}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <span className="text-4xl mb-4 block">📞</span>
                          <p className="text-gray-500">No emergency contact information available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Salary & Bank Information Tab */}
                {activeTab === 'salary' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Salary Details</h3>
                      <InfoRow label="Salary Amount" value={formatCurrency(selectedEmployee.salary, selectedEmployee.currency)} />
                      <InfoRow label="Currency" value={selectedEmployee.currency} />
                      <InfoRow label="Payment Frequency" value={selectedEmployee.salaryFrequency} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Bank Account Details</h3>
                      <InfoRow label="Bank Name" value={selectedEmployee.bankName} />
                      <InfoRow label="Account Number" value={selectedEmployee.bankAccountNumber} />
                      <InfoRow label="Account Title" value={selectedEmployee.bankAccountTitle} />
                    </div>
                  </div>
                )}

                {/* Additional Information Tab */}
                {activeTab === 'additional' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Qualifications & Skills</h3>
                      <InfoRow label="Qualifications" value={selectedEmployee.qualifications} multiline />
                      {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(selectedEmployee.skills) 
                              ? selectedEmployee.skills.map((skill, index) => (
                                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {skill}
                                  </span>
                                ))
                              : <span className="text-gray-600">{selectedEmployee.skills}</span>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* System Information Tab */}
                {activeTab === 'system' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Account Status</h3>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">System Access</p>
                          <p className="text-sm text-gray-600">Employee can access the system</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedEmployee.hasSystemAccess
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedEmployee.hasSystemAccess ? 'Granted' : 'Not Granted'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Account Status</p>
                          <p className="text-sm text-gray-600">Employee account is active</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedEmployee.isActive !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedEmployee.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Account Information</h3>
                      <InfoRow label="Account Created" value={formatDate(selectedEmployee.createdAt)} />
                      <InfoRow label="Last Updated" value={formatDate(selectedEmployee.updatedAt)} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-gray-500">
                Employee ID: {selectedEmployee.employeeId}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    navigate(`/admin/employees/edit/${selectedEmployee._id}`);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  ✏️ Edit Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-red-100 flex items-center justify-center mr-3">
                {employeeToDelete.profilePicture ? (
                  <img 
                    src={getImageUrl(employeeToDelete.profilePicture)}
                    alt={employeeToDelete.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `
                        <span class="text-red-600 font-bold text-lg">
                          ${employeeToDelete.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      `;
                    }}
                  />
                ) : (
                  <span className="text-red-600 font-bold text-lg">
                    {employeeToDelete.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{employeeToDelete.name}</p>
                <p className="text-sm text-gray-500">{employeeToDelete.employeeId} • {employeeToDelete.department}</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this employee? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for info rows
const InfoRow = ({ label, value, type = 'text', multiline = false }) => {
  if (value === undefined || value === null || value === '' || value === 0) {
    return (
      <div className="flex justify-between items-start border-b border-gray-100 pb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-sm text-gray-400 text-right max-w-xs">Not Provided</span>
      </div>
    );
  }
  
  let displayValue = value;
  
  if (type === 'email' && value) {
    displayValue = (
      <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800">
        {value}
      </a>
    );
  } else if (type === 'phone' && value) {
    displayValue = (
      <a href={`tel:${value}`} className="text-blue-600 hover:text-blue-800">
        {value}
      </a>
    );
  }
  
  if (multiline) {
    return (
      <div className="border-b border-gray-100 pb-2">
        <span className="text-sm font-medium text-gray-500 block mb-1">{label}</span>
        <p className="text-sm text-gray-900 whitespace-pre-line">{value}</p>
      </div>
    );
  }
  
  return (
    <div className="flex justify-between items-start border-b border-gray-100 pb-2">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-xs">{displayValue}</span>
    </div>
  );
};

export default AdminEmployee;