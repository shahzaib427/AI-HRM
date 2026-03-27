import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import {
  FiUser, FiMail, FiPhone, FiBriefcase, FiDollarSign,
  FiCalendar, FiGlobe, FiEdit, FiArrowLeft, FiCheckCircle,
  FiXCircle, FiMapPin, FiCreditCard, FiClock, FiShield,
  FiEye, FiDownload, FiPrinter
} from 'react-icons/fi';

const ViewEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/employees/${id}`);
        if (res.data.success) {
          setEmployee(res.data.data);
        } else {
          setError('Employee not found');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch employee');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const getRoleBadgeStyle = (role) => {
    switch(role) {
      case 'admin': return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
      case 'hr': return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
      case 'manager': return 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white';
      default: return 'bg-gradient-to-r from-green-600 to-emerald-600 text-white';
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return 'Administrator';
      case 'hr': return 'HR Manager';
      case 'manager': return 'Department Manager';
      default: return 'Employee';
    }
  };

  const formatCurrency = (amount, currency) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    });
    return formatter.format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrintProfile = () => {
    window.print();
  };

  const handleExportProfile = () => {
    // In a real app, this would export to PDF/Excel
    alert('Export feature coming soon!');
  };

  const renderLoading = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0">
                <div className="h-48 w-48 rounded-xl bg-gray-200"></div>
              </div>
              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiXCircle className="text-red-600 text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Employee</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/admin/employees')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Employees
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return renderLoading();
  if (error) return renderError();
  if (!employee) return renderError();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <button
              onClick={() => navigate('/admin/employees')}
              className="hover:text-blue-600 transition-colors flex items-center"
            >
              <FiArrowLeft className="mr-1" />
              Employees
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">View Employee</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Details</h1>
              <p className="text-gray-600 mt-1">View and manage employee information</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrintProfile}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiPrinter />
                <span>Print</span>
              </button>
              <button
                onClick={handleExportProfile}
                className="flex items-center space-x-2 px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FiDownload />
                <span>Export</span>
              </button>
              <button
                onClick={() => navigate('/admin/employees')}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiArrowLeft />
                <span>Back to List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden bg-white">
                    {employee.profilePicture ? (
                      <img 
                        src={`http://localhost:5000${employee.profilePicture}`}
                        alt={employee.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `data:image/svg+xml;base64,${btoa(`
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                              <rect width="100" height="100" fill="#3B82F6"/>
                              <text x="50" y="55" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial, sans-serif">
                                ${employee.name?.charAt(0)?.toUpperCase() || '?'}
                              </text>
                            </svg>
                          `)}`;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {employee.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${
                    employee.isActive !== false ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {employee.isActive !== false ? (
                      <FiCheckCircle className="text-white text-sm" />
                    ) : (
                      <FiXCircle className="text-white text-sm" />
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{employee.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeStyle(employee.role)}`}>
                      {getRoleLabel(employee.role)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      employee.isActive !== false 
                        ? 'bg-green-500/20 text-green-700 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-700 border border-red-500/30'
                    }`}>
                      {employee.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                    {employee.department && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-700 border border-blue-500/30">
                        {employee.department}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate(`/admin/employees/edit/${employee._id}`)}
                  className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  <FiEdit />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => navigate(`/admin/employees/view/${employee._id}/attendance`)}
                  className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-transparent border border-white text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
                >
                  <FiEye />
                  <span>View Attendance</span>
                </button>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Personal & Employment Info */}
              <div className="lg:col-span-2 space-y-8">
                {/* Personal Information Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <FiUser className="mr-2 text-blue-600" />
                      Personal Information
                    </h3>
                    <span className="text-xs text-gray-500">ID: {employee.employeeId}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Full Name</label>
                        <div className="flex items-center space-x-2">
                          <FiUser className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate">{employee.name}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Email Address</label>
                        <div className="flex items-center space-x-2">
                          <FiMail className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate">{employee.email}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Phone Number</label>
                        <div className="flex items-center space-x-2">
                          <FiPhone className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900">
                            {employee.phone || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Date of Birth</label>
                        <div className="flex items-center space-x-2">
                          <FiCalendar className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900">
                            {formatDate(employee.dateOfBirth)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">ID Card Number</label>
                        <div className="flex items-center space-x-2">
                          <FiCreditCard className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900">
                            {employee.idCardNumber || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Nationality</label>
                        <div className="flex items-center space-x-2">
                          <FiGlobe className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900">
                            {employee.nationality || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Marital Status</label>
                        <div className="font-medium text-gray-900">
                          {employee.maritalStatus || <span className="text-gray-400 italic">Not provided</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Address</label>
                        <div className="flex items-center space-x-2">
                          <FiMapPin className="text-gray-400 flex-shrink-0 mt-1" />
                          <span className="font-medium text-gray-900">
                            {employee.address || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employment Details Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <FiBriefcase className="mr-2 text-blue-600" />
                    Employment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Employee ID</label>
                        <div className="font-medium text-gray-900 text-lg">{employee.employeeId}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Department</label>
                        <div className="font-medium text-gray-900">{employee.department}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Position</label>
                        <div className="font-medium text-gray-900">{employee.position}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Employment Type</label>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          employee.employmentType === 'full-time' 
                            ? 'bg-blue-500/20 text-blue-700 border border-blue-500/30'
                            : employee.employmentType === 'part-time'
                            ? 'bg-green-500/20 text-green-700 border border-green-500/30'
                            : employee.employmentType === 'contract'
                            ? 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/30'
                            : 'bg-gray-500/20 text-gray-700 border border-gray-500/30'
                        }`}>
                          {employee.employmentType ? employee.employmentType.replace('-', ' ').toUpperCase() : 'Not specified'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Join Date</label>
                        <div className="flex items-center space-x-2">
                          <FiCalendar className="text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {formatDate(employee.joinDate)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Reports To</label>
                        <div className="font-medium text-gray-900">
                          {employee.reportsTo || <span className="text-gray-400 italic">Not specified</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Work Location</label>
                        <div className="font-medium text-gray-900">
                          {employee.workLocation || <span className="text-gray-400 italic">Not specified</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Probation Period</label>
                        <div className="font-medium text-gray-900">
                          {employee.probationPeriod || <span className="text-gray-400 italic">Not specified</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information Card (if available) */}
                {(employee.education || employee.skills || employee.certifications) && (
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                      <FiShield className="mr-2 text-blue-600" />
                      Additional Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {employee.education && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Education</h4>
                          <p className="text-sm text-gray-600">{employee.education}</p>
                        </div>
                      )}
                      {employee.skills && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(employee.skills) 
                              ? employee.skills.map((skill, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {skill}
                                  </span>
                                ))
                              : <span className="text-sm text-gray-600">{employee.skills}</span>
                            }
                          </div>
                        </div>
                      )}
                      {employee.certifications && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Certifications</h4>
                          <p className="text-sm text-gray-600">{employee.certifications}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Salary & Account Info */}
              <div className="space-y-8">
                {/* Salary Information Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <FiDollarSign className="mr-2 text-blue-600" />
                      Salary Information
                    </h3>
                    {employee.salaryReviewed && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        Reviewed
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-900 mb-1">
                        {formatCurrency(employee.salary, employee.currency)}
                      </div>
                      <div className="text-sm text-blue-700">
                        {employee.salaryFrequency === 'monthly' ? 'Per Month' : 
                         employee.salaryFrequency === 'weekly' ? 'Per Week' : 
                         employee.salaryFrequency === 'bi-weekly' ? 'Bi-Weekly' : 
                         employee.salaryFrequency === 'annual' ? 'Per Year' : 'Not specified'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-200">
                      <div className="text-center">
                        <div className="text-xs text-blue-600 mb-1">Currency</div>
                        <div className="font-medium text-blue-900">{employee.currency || 'USD'}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-blue-600 mb-1">Frequency</div>
                        <div className="font-medium text-blue-900 capitalize">
                          {employee.salaryFrequency || 'Not specified'}
                        </div>
                      </div>
                    </div>
                    {employee.bankDetails && (
                      <div className="pt-4 border-t border-blue-200">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Bank Details</h4>
                        <div className="text-xs text-blue-700 space-y-1">
                          <div>Bank: {employee.bankDetails.bankName}</div>
                          <div>Account: {employee.bankDetails.accountNumber}</div>
                          <div>IBAN: {employee.bankDetails.iban}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Information Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <FiShield className="mr-2 text-blue-600" />
                    Account Information
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Account Created</div>
                      <div className="flex items-center space-x-2">
                        <FiCalendar className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {formatDate(employee.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Last Updated</div>
                      <div className="flex items-center space-x-2">
                        <FiClock className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {formatDate(employee.updatedAt)}
                        </span>
                      </div>
                    </div>
                    {employee.lastLogin && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Last Login</div>
                        <div className="font-medium text-gray-900">
                          {formatDate(employee.lastLogin)}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Login Count</div>
                      <div className="font-medium text-gray-900">
                        {employee.loginCount || '0'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Two-Factor Auth</div>
                      <div className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                        employee.twoFactorEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Card */}
                {employee.emergencyContact && (
                  <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                      <FiPhone className="mr-2 text-red-600" />
                      Emergency Contact
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-red-600 mb-1">Contact Name</div>
                        <div className="font-medium text-red-900">{employee.emergencyContact.name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-red-600 mb-1">Phone Number</div>
                        <div className="font-medium text-red-900">{employee.emergencyContact.phone}</div>
                      </div>
                      <div>
                        <div className="text-xs text-red-600 mb-1">Relationship</div>
                        <div className="font-medium text-red-900">{employee.emergencyContact.relationship}</div>
                      </div>
                      {employee.emergencyContact.address && (
                        <div>
                          <div className="text-xs text-red-600 mb-1">Address</div>
                          <div className="font-medium text-red-900">{employee.emergencyContact.address}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate(`/admin/employees/view/${employee._id}/attendance`)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <span className="text-gray-900">View Attendance</span>
                      <FiCalendar className="text-green-600" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/employees/view/${employee._id}/payroll`)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <span className="text-gray-900">View Payroll</span>
                      <FiDollarSign className="text-green-600" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/employees/view/${employee._id}/performance`)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <span className="text-gray-900">Performance Reviews</span>
                      <FiShield className="text-green-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/admin/employees`)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Back to Employees
              </button>
              <button
                onClick={() => navigate(`/admin/employees/view/${employee._id}/attendance`)}
                className="px-5 py-2.5 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                View Attendance
              </button>
              <button
                onClick={() => navigate(`/admin/employees/view/${employee._id}/payroll`)}
                className="px-5 py-2.5 border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                View Payroll
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/admin/employees/archive/${employee._id}`)}
                className="px-5 py-2.5 border border-yellow-300 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                {employee.isActive !== false ? 'Archive' : 'Restore'}
              </button>
              <button
                onClick={() => navigate(`/admin/employees/edit/${employee._id}`)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Notes Section (if available) */}
        {employee.notes && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">Admin Notes</h3>
            <p className="text-yellow-800">{employee.notes}</p>
          </div>
        )}
      </div>

      {/* Print Styles (hidden for screen) */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .bg-gradient-to-br {
            background: white !important;
          }
          .rounded-2xl, .rounded-xl {
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .shadow-xl {
            box-shadow: none !important;
          }
          .border {
            border: 1px solid #ddd !important;
          }
          button, .flex-wrap {
            display: none !important;
          }
          .grid {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewEmployee;