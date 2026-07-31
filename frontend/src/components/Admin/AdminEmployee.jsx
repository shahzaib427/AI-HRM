import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FaUsers, FaUserCheck, FaUserTimes, FaUserShield, 
  FaBriefcase, FaUserGraduate, FaFileContract, FaUserPlus,
  FaSearch, FaFilter, FaTh, FaTable, FaEye, FaEdit, 
  FaTrash, FaToggleOn, FaToggleOff, FaEnvelope, FaPhone,
  FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaBuilding,
  FaChartLine, FaDownload, FaPrint
} from 'react-icons/fa';

// KPI Card Component - Fixed size
const KpiCard = ({ icon: Icon, label, value, sub, iconBg, valueColor = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all duration-200 min-w-[120px]">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-1 truncate">{label}</p>
        <p className={`text-xl font-semibold ${valueColor}`}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${iconBg}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
  </div>
);

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    pink: 'bg-pink-50 text-pink-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
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
      <a href={`mailto:${value}`} className="text-indigo-600 hover:text-indigo-800">
        {value}
      </a>
    );
  } else if (type === 'phone' && value) {
    displayValue = (
      <a href={`tel:${value}`} className="text-indigo-600 hover:text-indigo-800">
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
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to get image URL
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `http://localhost:5000${path}`;
  };

  // Check if user is authenticated
  const checkAuth = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    return !!token;
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
        setTimeout(() => navigate('/login'), 2000);
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
      (emp.position?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
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
      await axiosInstance.put(`/employees/${id}`, { isActive: !currentStatus });
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
      'PKR': '₨', 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'AED': 'د.إ', 'SAR': 'ر.س'
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
      'A+': 'A Positive', 'A-': 'A Negative', 'B+': 'B Positive',
      'B-': 'B Negative', 'O+': 'O Positive', 'O-': 'O Negative',
      'AB+': 'AB Positive', 'AB-': 'AB Negative'
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
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
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
        <div className="text-center bg-white p-8 rounded-xl shadow-md max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaUsers className="text-indigo-500 text-sm" />
                Employee Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your organization's workforce</p>
              {currentUser && (
                <p className="text-xs text-gray-400 mt-1">
                  Logged in as: <span className="font-medium text-gray-600">{currentUser.name}</span> ({currentUser.role})
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
              <button
                onClick={() => navigate('/admin/employees/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <FaUserPlus className="w-4 h-4" />
                Add Employee
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards - Fixed layout with responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
          <KpiCard icon={FaUsers} label="Total" value={stats.total} sub="All staff" iconBg="bg-indigo-500" />
          <KpiCard icon={FaUserCheck} label="Active" value={stats.active} sub="Working" iconBg="bg-emerald-500" valueColor="text-emerald-600" />
          <KpiCard icon={FaUserTimes} label="Inactive" value={stats.inactive} sub="Not working" iconBg="bg-red-500" valueColor="text-red-600" />
          <KpiCard icon={FaUserShield} label="Admins" value={stats.admins} sub="Administrators" iconBg="bg-purple-500" />
          <KpiCard icon={FaBriefcase} label="HR" value={stats.hr} sub="HR Team" iconBg="bg-orange-500" />
          <KpiCard icon={FaUserGraduate} label="Regular" value={stats.regular} sub="Employees" iconBg="bg-blue-500" />
          <KpiCard icon={FaBuilding} label="Permanent" value={stats.permanent} sub="Full-time" iconBg="bg-indigo-500" />
          <KpiCard icon={FaFileContract} label="Contract" value={stats.contract} sub="Contractual" iconBg="bg-yellow-500" />
          <KpiCard icon={FaUserGraduate} label="Interns" value={stats.intern} sub="Trainees" iconBg="bg-pink-500" />
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, ID, email, or position..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaFilter className="w-4 h-4" />
              Filters
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600'}`}
                title="Card View"
              >
                <FaTh className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600'}`}
                title="Table View"
              >
                <FaTable className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-100 pt-5 mt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {role === 'all' ? 'All Roles' : 
                         role === 'admin' ? 'Administrator' :
                         role === 'hr' ? 'HR Manager' : 
                         role === 'team-lead' ? 'Team Lead' :
                         role === 'manager' ? 'Manager' : 'Employee'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setSelectedDepartment('all');
                    setSelectedStatus('all');
                    setSelectedRole('all');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{filteredEmployees.length}</span> of{' '}
            <span className="font-medium text-gray-700">{employees.length}</span> employees
          </p>
          <button
            onClick={fetchEmployees}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
            </div>
          </div>
        )}

        {/* Cards View */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredEmployees.map((employee) => (
              <div key={employee._id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        {employee.profilePicture ? (
                          <img 
                            src={getImageUrl(employee.profilePicture)}
                            alt={employee.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <span class="text-indigo-600 font-bold text-base">
                                  ${employee.name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              `;
                            }}
                          />
                        ) : (
                          <span className="text-indigo-600 font-bold text-base">
                            {employee.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{employee.name || 'Unnamed'}</h3>
                        <p className="text-xs text-gray-500">{employee.employeeId || 'No ID'}</p>
                      </div>
                    </div>
                    <Badge variant={
                      employee.role === 'admin' ? 'purple' :
                      employee.role === 'hr' ? 'orange' : 'info'
                    }>
                      {employee.role === 'admin' ? 'Admin' : 
                       employee.role === 'hr' ? 'HR' : 'Emp'}
                    </Badge>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center text-xs text-gray-600">
                    <FaEnvelope className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{employee.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <FaBuilding className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{employee.department || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <FaBriefcase className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{employee.position || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <FaPhone className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{employee.phone || 'No phone'}</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <Badge variant={employee.isActive !== false ? 'success' : 'danger'}>
                    {employee.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewEmployee(employee)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FaEye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/employees/edit/${employee._id}`)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(employee._id, employee.isActive)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title={employee.isActive !== false ? 'Deactivate' : 'Activate'}
                    >
                      {employee.isActive !== false ? <FaToggleOn className="w-3.5 h-3.5" /> : <FaToggleOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(employee)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            {employee.profilePicture ? (
                              <img 
                                src={getImageUrl(employee.profilePicture)}
                                alt={employee.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-indigo-600 font-semibold text-sm">
                                {employee.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900">{employee.name}</div>
                            <div className="text-xs text-gray-500">{employee.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800 truncate max-w-[200px]">{employee.email}</div>
                        <div className="text-xs text-gray-500">{employee.phone || 'No phone'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800">{employee.department || '—'}</div>
                        <div className="text-xs text-gray-500">{employee.position || '—'}</div>
                        <div className="text-xs text-gray-400">Joined: {formatDate(employee.joiningDate)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {employee.salary > 0 ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(employee.salary, employee.currency)}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">{employee.salaryFrequency}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge variant={employee.isActive !== false ? 'success' : 'danger'}>
                            {employee.isActive !== false ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant={
                            employee.role === 'admin' ? 'purple' :
                            employee.role === 'hr' ? 'orange' : 'info'
                          }>
                            {employee.role === 'admin' ? 'Admin' : 
                             employee.role === 'hr' ? 'HR' : 'Emp'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleViewEmployee(employee)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <FaEye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/employees/edit/${employee._id}`)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(employee._id, employee.isActive)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={employee.isActive !== false ? 'Deactivate' : 'Activate'}
                          >
                            {employee.isActive !== false ? <FaToggleOn className="w-3.5 h-3.5" /> : <FaToggleOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
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
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaUsers className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No employees found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || selectedDepartment !== 'all' || selectedStatus !== 'all' || selectedRole !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first employee'}
            </p>
            {!searchTerm && selectedDepartment === 'all' && selectedStatus === 'all' && selectedRole === 'all' && (
              <button
                onClick={() => navigate('/admin/employees/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <FaUserPlus className="w-4 h-4" />
                Add Employee
              </button>
            )}
          </div>
        )}
      </div>

      {/* Employee View Modal - Keep existing modal code */}
      {showViewModal && selectedEmployee && (
        // Modal content remains the same
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {selectedEmployee.profilePicture ? (
                      <img 
                        src={getImageUrl(selectedEmployee.profilePicture)}
                        alt={selectedEmployee.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-indigo-600 font-bold text-xl">
                        {selectedEmployee.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{selectedEmployee.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="info">{selectedEmployee.employeeId}</Badge>
                      <Badge variant={selectedEmployee.isActive !== false ? 'success' : 'danger'}>
                        {selectedEmployee.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white/80 hover:text-white text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-100 flex-shrink-0 px-6 pt-4">
              <div className="flex space-x-2 overflow-x-auto">
                {['personal', 'employment', 'address', 'emergency', 'salary', 'additional', 'system'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
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
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Personal Information Tab */}
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
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
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Personal Details</h3>
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
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Employment Details</h3>
                    <InfoRow label="Employee Type" value={getEmployeeTypeLabel(selectedEmployee.employeeType)} />
                    <InfoRow label="Department" value={selectedEmployee.department} />
                    <InfoRow label="Position" value={selectedEmployee.position} />
                    <InfoRow label="Employee ID" value={selectedEmployee.employeeId} />
                    <InfoRow label="Joining Date" value={formatDate(selectedEmployee.joiningDate)} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">System Information</h3>
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
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Present Address</h3>
                    <InfoRow label="Address" value={selectedEmployee.presentAddress} multiline />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow label="City" value={selectedEmployee.city} />
                      <InfoRow label="State" value={selectedEmployee.state} />
                      <InfoRow label="Country" value={selectedEmployee.country} />
                      <InfoRow label="Postal Code" value={selectedEmployee.postalCode} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Permanent Address</h3>
                    <InfoRow label="Address" value={selectedEmployee.permanentAddress} multiline />
                  </div>
                </div>
              )}

              {/* Emergency Contact Tab */}
              {activeTab === 'emergency' && (
                <div className="space-y-6">
                  <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Emergency Contact Information</h3>
                  {selectedEmployee.emergencyContact ? (
                    <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-indigo-700 mb-1">Contact Name</label>
                          <p className="text-base font-semibold text-indigo-900">
                            {selectedEmployee.emergencyContact.name}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-700 mb-1">Relationship</label>
                          <p className="text-base font-semibold text-indigo-900">
                            {selectedEmployee.emergencyContact.relationship}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-700 mb-1">Phone Number</label>
                          <p className="text-base font-semibold text-indigo-900">
                            {selectedEmployee.emergencyContact.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-5xl mb-4 block">📞</span>
                      <p className="text-gray-500">No emergency contact information available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Salary & Bank Information Tab */}
              {activeTab === 'salary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Salary Details</h3>
                    <InfoRow label="Salary Amount" value={formatCurrency(selectedEmployee.salary, selectedEmployee.currency)} />
                    <InfoRow label="Currency" value={selectedEmployee.currency} />
                    <InfoRow label="Payment Frequency" value={selectedEmployee.salaryFrequency} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Bank Account Details</h3>
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
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Qualifications & Skills</h3>
                    <InfoRow label="Qualifications" value={selectedEmployee.qualifications} multiline />
                    {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(selectedEmployee.skills) 
                            ? selectedEmployee.skills.map((skill, index) => (
                                <Badge key={index} variant="info">{skill}</Badge>
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
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Account Status</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">System Access</p>
                        <p className="text-xs text-gray-500">Employee can access the system</p>
                      </div>
                      <Badge variant={selectedEmployee.hasSystemAccess ? 'success' : 'danger'}>
                        {selectedEmployee.hasSystemAccess ? 'Granted' : 'Not Granted'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Account Status</p>
                        <p className="text-xs text-gray-500">Employee account is active</p>
                      </div>
                      <Badge variant={selectedEmployee.isActive !== false ? 'success' : 'danger'}>
                        {selectedEmployee.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Account Information</h3>
                    <InfoRow label="Account Created" value={formatDate(selectedEmployee.createdAt)} />
                    <InfoRow label="Last Updated" value={formatDate(selectedEmployee.updatedAt)} />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-gray-500">
                Employee ID: {selectedEmployee.employeeId}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    navigate(`/admin/employees/edit/${selectedEmployee._id}`);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <FaEdit className="w-4 h-4" />
                  Edit Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FaTrash className="text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-red-100 flex items-center justify-center">
                  {employeeToDelete.profilePicture ? (
                    <img 
                      src={getImageUrl(employeeToDelete.profilePicture)}
                      alt={employeeToDelete.name}
                      className="h-full w-full object-cover"
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
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployee;