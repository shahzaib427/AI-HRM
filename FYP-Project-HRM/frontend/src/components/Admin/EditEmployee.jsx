import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    department: 'General',
    position: 'Employee',
    phone: '',
    idCardNumber: '',
    salary: '',
    currency: 'PKR',
    salaryFrequency: 'monthly',
    isActive: true
  });
  
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [currentProfileImage, setCurrentProfileImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Departments list
  const departments = [
    'General',
    'IT',
    'Human Resources',
    'Finance',
    'Marketing',
    'Sales',
    'Operations',
    'Customer Service',
    'Research & Development',
    'Administration',
    'Engineering',
    'Product',
    'Quality Assurance',
    'Legal',
    'Procurement'
  ];

  // Salary frequencies
  const salaryFrequencies = ['hourly', 'daily', 'weekly', 'monthly', 'annually'];
  
  // Currencies
  const currencies = [
    { code: 'PKR', name: 'Pakistani Rupee (₨)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'INR', name: 'Indian Rupee (₹)' }
  ];

  // Common positions based on department
  const getPositionsByDepartment = (dept) => {
    const positions = {
      'General': ['Employee', 'Assistant', 'Coordinator', 'Trainee'],
      'IT': ['Software Developer', 'System Administrator', 'Network Engineer', 'Database Administrator', 'IT Support', 'DevOps Engineer', 'QA Engineer'],
      'Human Resources': ['HR Manager', 'Recruiter', 'HR Generalist', 'Compensation Analyst', 'Training Coordinator'],
      'Finance': ['Accountant', 'Financial Analyst', 'Controller', 'Accounts Payable Specialist', 'Accounts Receivable Specialist'],
      'Marketing': ['Marketing Manager', 'Content Writer', 'SEO Specialist', 'Social Media Manager', 'Brand Manager'],
      'Sales': ['Sales Manager', 'Sales Representative', 'Account Executive', 'Business Development Manager'],
      'Engineering': ['Mechanical Engineer', 'Electrical Engineer', 'Civil Engineer', 'Project Engineer'],
      'Administration': ['Administrative Assistant', 'Office Manager', 'Executive Assistant'],
      'default': ['Manager', 'Supervisor', 'Team Lead', 'Specialist', 'Analyst', 'Coordinator']
    };
    
    return positions[dept] || positions.default;
  };

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await axios.get(`http://localhost:5000/api/employees/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          const employee = response.data.data;
          
          setFormData({
            name: employee.name || '',
            email: employee.email || '',
            role: employee.role || 'employee',
            department: employee.department || 'General',
            position: employee.position || 'Employee',
            phone: employee.phone || '',
            idCardNumber: employee.idCardNumber || '',
            salary: employee.salary ? employee.salary.toString() : '',
            currency: employee.currency || 'PKR',
            salaryFrequency: employee.salaryFrequency || 'monthly',
            isActive: employee.isActive !== false
          });
          
          if (employee.profilePicture) {
            setCurrentProfileImage(`http://localhost:5000${employee.profilePicture}`);
            setProfilePreview(`http://localhost:5000${employee.profilePicture}`);
          }
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
        setServerError('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      
      setProfilePicture(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Upload profile picture to server
  const uploadProfilePicture = async () => {
    if (!profilePicture) return null;
    
    try {
      setUploading(true);
      const token = localStorage.getItem('authToken');
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profilePicture', profilePicture);
      
      const response = await axios.post('http://localhost:5000/api/upload/profile', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        return response.data.filePath;
      }
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (optional)
    if (formData.phone) {
      const digitsOnly = formData.phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        newErrors.phone = 'Phone number must be at least 10 digits';
      } else if (digitsOnly.length > 15) {
        newErrors.phone = 'Phone number too long';
      }
    }
    
    // Salary validation (optional but validate if provided)
    if (formData.salary && formData.salary !== '') {
      if (isNaN(formData.salary) || parseFloat(formData.salary) < 0) {
        newErrors.salary = 'Please enter a valid salary amount';
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSaving(true);
    setServerError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Upload profile picture if new one was selected
      let profilePictureUrl = currentProfileImage ? currentProfileImage.replace('http://localhost:5000', '') : null;
      if (profilePicture) {
        const newProfilePictureUrl = await uploadProfilePicture();
        if (newProfilePictureUrl) {
          profilePictureUrl = newProfilePictureUrl;
        }
      }
      
      // Prepare employee data
      const employeeData = {
        ...formData,
        profilePicture: profilePictureUrl,
        salary: formData.salary ? parseFloat(formData.salary) : 0
      };
      
      console.log('📤 Updating employee data:', employeeData);
      
      const response = await axios.put(`http://localhost:5000/api/employees/${id}`, employeeData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Update response:', response.data);
      
      if (response.data.success) {
        setSuccessMessage('✅ Employee updated successfully!');
        
        // Navigate back to employee list after 2 seconds
        setTimeout(() => {
          navigate('/admin/employees');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Update employee error:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.error || error.response.data?.message || 'Failed to update employee';
        setServerError(errorMessage);
      } else if (error.request) {
        setServerError('Network error. Please check your connection.');
      } else {
        setServerError('An error occurred. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/admin/employees');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  // Get positions for selected department
  const availablePositions = getPositionsByDepartment(formData.department);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
              <p className="mt-2 text-gray-600">
                Update employee details for {formData.name}
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/employees')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Employees
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-600">✅</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success!</h3>
                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Server Error */}
        {serverError && !successMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-600">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Section 1: Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2">1</span>
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@company.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="03134750548 or +923134750548"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone ? (
                    <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Optional - Enter with or without country code
                    </p>
                  )}
                </div>

                {/* ID Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Card Number
                  </label>
                  <input
                    type="text"
                    name="idCardNumber"
                    value={formData.idCardNumber}
                    onChange={handleChange}
                    placeholder="42101-1234567-1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Optional - Employee's official ID card number
                  </p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    {formData.role === 'admin' && 'Full system access'}
                    {formData.role === 'hr' && 'HR and employee management access'}
                    {formData.role === 'employee' && 'Basic employee access'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Employment Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2">2</span>
                Employment Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    Select the department for this employee
                  </p>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position *
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Position</option>
                    {availablePositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                  {!formData.position && (
                    <p className="mt-2 text-sm text-yellow-600">Please select a position</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Employee Photo */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2">3</span>
                Employee Photo
              </h2>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                {/* Picture Preview */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-40 h-40 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                      {profilePreview ? (
                        <img 
                          src={profilePreview} 
                          alt="Profile preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <div className="mx-auto h-12 w-12 text-gray-400">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            No photo selected
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Remove button if new picture exists */}
                    {profilePreview && profilePicture && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePicture(null);
                          setProfilePreview(currentProfileImage || '');
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Upload Controls */}
                <div className="flex-1">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Update Employee Photo
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,image/gif,image/jpg"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Select new photo to update. Recommended: Square image, JPG/PNG format, max 5MB
                      </p>
                      {currentProfileImage && !profilePicture && (
                        <p className="mt-2 text-sm text-green-600">
                          Current profile photo is being used
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Salary Package */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2">4</span>
                Salary Package
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Salary Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Amount
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      {formData.currency === 'PKR' ? '₨' : 
                       formData.currency === 'USD' ? '$' :
                       formData.currency === 'EUR' ? '€' :
                       formData.currency === 'GBP' ? '£' : '₹'}
                    </span>
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      placeholder="50000"
                      step="0.01"
                      min="0"
                      className={`flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.salary ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.salary && (
                    <p className="mt-2 text-sm text-red-600">{errors.salary}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Gross salary amount
                  </p>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salary Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Frequency
                  </label>
                  <select
                    name="salaryFrequency"
                    value={formData.salaryFrequency}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {salaryFrequencies.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    How often salary is paid
                  </p>
                </div>
              </div>
              
              {/* Salary Summary */}
              {formData.salary && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800">Salary Summary:</p>
                  <p className="text-lg font-semibold text-green-900 mt-1">
                    {formData.currency === 'PKR' ? '₨' : 
                     formData.currency === 'USD' ? '$' :
                     formData.currency === 'EUR' ? '€' :
                     formData.currency === 'GBP' ? '£' : '₹'}
                    {parseFloat(formData.salary).toLocaleString()} 
                    <span className="text-sm font-normal text-green-700 ml-2">
                      per {formData.salaryFrequency}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Section 5: Account Status */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2">5</span>
                Account Status
              </h2>
              
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-900">
                    Active Account
                  </label>
                  <p className="text-sm text-gray-500">
                    {formData.isActive 
                      ? 'Employee will have immediate access to the system.'
                      : 'Employee account will be created but marked as inactive.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-6 border-t">
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={saving || uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {(saving || uploading) ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      {uploading ? 'Uploading...' : 'Saving Changes...'}
                    </>
                  ) : (
                    <>
                      <span className="mr-2">💾</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Form Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">💡 Employee Update Information</h3>
          <ul className="text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Email Change:</strong> Employee will need to use new email for login</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Role Change:</strong> System permissions will be updated immediately</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Profile Photo:</strong> New photo will replace the existing one</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Account Status:</strong> Inactive accounts cannot login to the system</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Salary Updates:</strong> Will affect next payroll cycle</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EditEmployee;