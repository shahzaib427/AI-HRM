import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AddEmployee = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    // Basic Information - UPDATED
    name: '',
    fatherName: '', // ADDED from first file
    email: '',
    phone: '',
    alternatePhone: '',
    idCardNumber: '',
    idCardIssueDate: '', // ADDED from first file
    idCardExpiryDate: '', // ADDED from first file
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    maritalStatus: 'single',
    
    // Employment Information - UPDATED
    employeeType: 'permanent',
    showEmployeeTypeCustom: false, // ADDED from first file
    customEmployeeType: '', // ADDED from first file
    employmentStatus: 'active',
    showEmploymentStatusCustom: false, // ADDED from first file
    customEmploymentStatus: '', // ADDED from first file
    role: 'employee',
    department: 'General',
    showDepartmentCustom: false, // ADDED from first file
    customDepartment: '', // ADDED from first file
    position: 'Employee',
    showPositionCustom: false, // ADDED from first file
    customPosition: '', // ADDED from first file
    joiningDate: '',
    probationPeriod: '3',
    showProbationPeriodCustom: false, // ADDED from first file
    customProbationPeriod: '', // ADDED from first file
    reportingManager: '',
    systemRole: 'employee', // ADDED from first file
    showSystemRoleCustom: false, // ADDED from first file
    customSystemRole: '', // ADDED from first file
    
    // Address Information
    presentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
    
    // Emergency Contact (Multiple) - UPDATED from first file
    emergencyContacts: [
      { name: '', phone: '', relation: 'parent' }
    ],
    
    // Salary Information - UPDATED
    salary: '', // Renamed from salaryAmount
    fuelAllowance: '', // ADDED from first file
    medicalAllowance: '', // ADDED from first file
    specialAllowance: '', // ADDED from first file
    otherAllowance: '', // ADDED from first file
    totalSalary: '0', // ADDED from first file
    currency: 'PKR',
    salaryFrequency: 'monthly',
    bankName: '',
    bankAccountNumber: '',
    bankAccountTitle: '',
    bankBranchCode: '', // ADDED from first file
    ibanNumber: '', // ADDED from first file
    
    // Additional Information - UPDATED
    qualifications: '',
    experiences: [{ company: '', position: '', duration: '', description: '' }], // ADDED from first file
    previousExperience: '',
    skills: [{ name: '', level: 'intermediate' }], // UPDATED from first file
    
    // System Information
    isActive: true,
    hasSystemAccess: true
  });
  
  const [documents, setDocuments] = useState({
    profilePicture: null,
    cv: null, // ADDED from first file
    cnicFront: null, // ADDED from first file
    cnicBack: null, // ADDED from first file
    degree: null, // ADDED from first file
    experienceLetters: [], // ADDED from first file
    otherDocuments: [] // ADDED from first file
  });
  
  const [documentPreviews, setDocumentPreviews] = useState({});
  const [profilePreview, setProfilePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState('');
  
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
    'Procurement',
    'Logistics',
    'Healthcare',
    'Education'
  ];

  // Employee Types - UPDATED
  const employeeTypes = [
    { value: 'permanent', label: 'Permanent Employee' },
    { value: 'contract', label: 'Contractual Employee' },
    { value: 'intern', label: 'Intern/Trainee' },
    { value: 'probation', label: 'Probationary' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'visitor', label: 'Visitor/Special Access' },
    { value: 'part-time', label: 'Part-time Employee' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'other', label: 'Other (Add Custom)' } // ADDED from first file
  ];

  // Employment Status - UPDATED
  const employmentStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'on-leave', label: 'On Leave' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'resigned', label: 'Resigned' },
    { value: 'other', label: 'Other (Add Custom)' } // ADDED from first file
  ];

  // Genders
  const genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ];

  // Marital Status
  const maritalStatuses = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'separated', label: 'Separated' }
  ];

  // Blood Groups
  const bloodGroups = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A Positive (A+)' },
    { value: 'A-', label: 'A Negative (A-)' },
    { value: 'B+', label: 'B Positive (B+)' },
    { value: 'B-', label: 'B Negative (B-)' },
    { value: 'O+', label: 'O Positive (O+)' },
    { value: 'O-', label: 'O Negative (O-)' },
    { value: 'AB+', label: 'AB Positive (AB+)' },
    { value: 'AB-', label: 'AB Negative (AB-)' }
  ];

  // Emergency Contact Relations - UPDATED
  const emergencyRelations = [
    { value: 'parent', label: 'Parent' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'child', label: 'Child' },
    { value: 'friend', label: 'Friend' },
    { value: 'relative', label: 'Relative' },
    { value: 'colleague', label: 'Colleague' },
    { value: 'other', label: 'Other' }
  ];

  // Probation Periods (months) - UPDATED
  const probationPeriods = [
    { value: '1', label: '1 Month' },
    { value: '2', label: '2 Months' },
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
    { value: 'none', label: 'No Probation' },
    { value: 'other', label: 'Other (Add Custom)' } // ADDED from first file
  ];

  // Pakistani Cities
  const pakistaniCities = [
    'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
    'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot', 'Sargodha', 'Bahawalpur',
    'Sukkur', 'Jhang', 'Sheikhupura', 'Mardan', 'Gujrat', 'Kasur', 'Rahim Yar Khan',
    'Other'
  ];

  // Salary frequencies
  const salaryFrequencies = ['hourly', 'daily', 'weekly', 'bi-weekly', 'monthly', 'annually'];
  
  // Currencies
  const currencies = [
    { code: 'PKR', name: 'Pakistani Rupee (₨)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'AED', name: 'UAE Dirham (د.إ)' },
    { code: 'SAR', name: 'Saudi Riyal (ر.س)' }
  ];

  // System Roles - ADDED from first file
  const systemRoles = [
    { value: 'employee', label: 'Employee (Basic Access)' },
    { value: 'team-lead', label: 'Team Lead' },
    { value: 'manager', label: 'Manager' },
    { value: 'hr', label: 'HR Personnel' },
    { value: 'admin', label: 'Administrator' },
    { value: 'super-admin', label: 'Super Admin' },
    { value: 'other', label: 'Other (Add Custom)' }
  ];

  // Skill Levels - ADDED from first file
  const skillLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  // Calculate total salary - ADDED from first file
// Calculate total salary - ADDED from first file
const calculateTotalSalary = (formValues) => {
  const salary = parseFloat(formValues.salary) || 0;
  const fuel = parseFloat(formValues.fuelAllowance) || 0;
  const medical = parseFloat(formValues.medicalAllowance) || 0;
  const special = parseFloat(formValues.specialAllowance) || 0;
  const other = parseFloat(formValues.otherAllowance) || 0;
  
  return salary + fuel + medical + special + other;
};

  // Handle form field changes - UPDATED
// Handle form field changes - UPDATED
const handleChange = (e) => {
  const { name, value, type, checked } = e.target;
  
  // Calculate total salary if salary components change
  if (name.includes('Allowance') || name === 'salary') {
    // Get current values and update the changed field
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Calculate total with updated values
      const salary = parseFloat(updated.salary) || 0;
      const fuel = parseFloat(updated.fuelAllowance) || 0;
      const medical = parseFloat(updated.medicalAllowance) || 0;
      const special = parseFloat(updated.specialAllowance) || 0;
      const other = parseFloat(updated.otherAllowance) || 0;
      
      updated.totalSalary = (salary + fuel + medical + special + other).toString();
      
      return updated;
    });
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }
  
  // Clear error for this field
  if (errors[name]) {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }
};

  // Handle dropdown changes with "Other" option - ADDED from first file
  const handleDropdownChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Show custom input field when "other" is selected
    if (value === 'other') {
      const fieldName = `show${name.charAt(0).toUpperCase() + name.slice(1)}Custom`;
      setFormData(prev => ({
        ...prev,
        [fieldName]: true
      }));
    } else {
      // Hide custom input field for other selections
      const fieldName = `show${name.charAt(0).toUpperCase() + name.slice(1)}Custom`;
      setFormData(prev => ({
        ...prev,
        [fieldName]: false
      }));
    }
  };

  // Handle dynamic array fields - ADDED from first file
  const handleArrayFieldChange = (field, index, subField, value) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = {
        ...newArray[index],
        [subField]: value
      };
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  // Add new emergency contact - ADDED from first file
  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        { name: '', phone: '', relation: 'parent' }
      ]
    }));
  };

  // Remove emergency contact - ADDED from first file
  const removeEmergencyContact = (index) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }));
  };

  // Add new experience - ADDED from first file
  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { company: '', position: '', duration: '', description: '' }
      ]
    }));
  };

  // Remove experience - ADDED from first file
  const removeExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  // Add new skill - ADDED from first file
  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skills: [
        ...prev.skills,
        { name: '', level: 'intermediate' }
      ]
    }));
  };

  // Remove skill - ADDED from first file
  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  // Handle file upload for documents - ADDED from first file
  const handleDocumentUpload = async (docType, e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    try {
      setUploading(true);
      
      // For image previews
      if (docType === 'profilePicture' || docType === 'cnicFront' || docType === 'cnicBack') {
        const file = files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
          if (docType === 'profilePicture') {
            setProfilePreview(e.target.result);
          } else {
            setDocumentPreviews(prev => ({
              ...prev,
              [docType]: e.target.result
            }));
          }
        };
        
        reader.readAsDataURL(file);
      }
      
      // Single file upload
      if (docType !== 'experienceLetters' && docType !== 'otherDocuments') {
        const file = files[0];
        setDocuments(prev => ({
          ...prev,
          [docType]: file
        }));
      } 
      // Multiple files upload
      else {
        const uploadFormData = new FormData();
        files.forEach(file => {
          uploadFormData.append('files', file);
        });
        
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/api/upload/documents/multiple', uploadFormData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data.success) {
          setDocuments(prev => ({
            ...prev,
            [docType]: [...prev[docType], ...response.data.filePaths]
          }));
        }
      }
      
    } catch (error) {
      console.error('Upload documents error:', error);
      alert('Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Remove document - ADDED from first file
  const removeDocument = (docType, index = null) => {
    if (index !== null) {
      // Remove from array
      setDocuments(prev => ({
        ...prev,
        [docType]: prev[docType].filter((_, i) => i !== index)
      }));
    } else {
      // Remove single document
      setDocuments(prev => ({
        ...prev,
        [docType]: null
      }));
      
      // Clear preview for image documents
      if (docType === 'profilePicture') {
        setProfilePreview('');
      } else if (docType === 'cnicFront' || docType === 'cnicBack') {
        setDocumentPreviews(prev => ({
          ...prev,
          [docType]: null
        }));
      }
    }
  };

  // Add custom option from "Other" selection - ADDED from first file
  const addCustomOption = (field) => {
    const customField = `custom${field.charAt(0).toUpperCase() + field.slice(1)}`;
    const customValue = formData[customField];
    
    if (customValue.trim()) {
      const showField = `show${field.charAt(0).toUpperCase() + field.slice(1)}Custom`;
      setFormData(prev => ({
        ...prev,
        [field]: customValue,
        [showField]: false
      }));
    }
  };

  // Upload files to server
  const uploadFile = async (file, endpoint) => {
    if (!file) return null;
    
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`http://localhost:5000/api/upload/${endpoint}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('📤 Upload response:', response.data);
      
      if (response.data.success) {
        return response.data.filePath;
      }
      return null;
    } catch (error) {
      console.error(`❌ Upload ${endpoint} error:`, error.response?.data || error.message);
      return null;
    }
  };

  // Validate form - UPDATED
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields validation - UPDATED
    const requiredFields = {
      name: 'Full name is required',
      fatherName: 'Father name is required', // ADDED
      email: 'Email address is required',
      phone: 'Phone number is required',
      idCardNumber: 'CNIC number is required',
      idCardIssueDate: 'CNIC issue date is required', // ADDED
      idCardExpiryDate: 'CNIC expiry date is required', // ADDED
      employeeType: 'Employee type is required',
      department: 'Department is required',
      position: 'Position is required',
      joiningDate: 'Joining date is required',
      presentAddress: 'Present address is required'
    };
    
    Object.keys(requiredFields).forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = requiredFields[field];
      }
    });
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // CNIC validation
    if (formData.idCardNumber) {
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
      if (!cnicRegex.test(formData.idCardNumber)) {
        newErrors.idCardNumber = 'CNIC must be in format: 12345-1234567-1';
      }
    }
    
    // Date validations - UPDATED
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();
      
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dateOfBirth = 'Employee must be at least 18 years old';
      }
    }
    
    // Check if CNIC issue date is before expiry date - ADDED from first file
    if (formData.idCardIssueDate && formData.idCardExpiryDate) {
      const issueDate = new Date(formData.idCardIssueDate);
      const expiryDate = new Date(formData.idCardExpiryDate);
      if (issueDate > expiryDate) {
        newErrors.idCardIssueDate = 'Issue date cannot be after expiry date';
      }
    }
    
    // Check if CNIC is expired - ADDED from first file
    if (formData.idCardExpiryDate) {
      const expiryDate = new Date(formData.idCardExpiryDate);
      const today = new Date();
      if (expiryDate < today) {
        newErrors.idCardExpiryDate = 'CNIC has expired';
      }
    }
    
    // Emergency contacts validation - ADDED from first file
    formData.emergencyContacts.forEach((contact, index) => {
      if (contact.name && !contact.phone) {
        newErrors[`emergencyContactPhone_${index}`] = 'Emergency contact phone is required';
      }
      if (contact.phone && !contact.name) {
        newErrors[`emergencyContactName_${index}`] = 'Emergency contact name is required';
      }
    });
    
    return newErrors;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form
  const validationErrors = validateForm();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    const firstError = Object.keys(validationErrors)[0];
    document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    return;
  }
  
  setLoading(true);
  setServerError('');
  setSuccessMessage('');
  
  try {
    const token = localStorage.getItem('authToken');
    
    console.log('🚀 Starting employee creation process...');
    
    // Upload profile picture if exists
    let profilePictureUrl = null;
    if (documents.profilePicture) {
      try {
        profilePictureUrl = await uploadFile(documents.profilePicture, 'profile');
        console.log('✅ Upload result:', profilePictureUrl);
      } catch (uploadError) {
        console.warn('⚠️ Profile picture upload failed, continuing without it:', uploadError.message);
      }
    }
    
    // Generate strong temporary password
    const generateTemporaryPassword = (name, email) => {
      const firstName = name.split(' ')[0].toLowerCase();
      const namePart = firstName.slice(0, Math.min(4, firstName.length));
      const emailPart = email.split('@')[0].slice(0, 3).toLowerCase();
      const randomNumbers = Math.floor(1000 + Math.random() * 9000);
      const specialChars = '!@#$%&*';
      const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
      return `${namePart.charAt(0).toUpperCase()}${namePart.slice(1)}${emailPart}${randomNumbers}${specialChar}`;
    };
    
    const temporaryPassword = generateTemporaryPassword(formData.name, formData.email);
    console.log('🔑 Generated password:', temporaryPassword);
    
    // STEP 1: Create ONE unified employee object with all data
    const employeeData = {
      // User Account Data
      userAccount: {
        name: formData.name,
        username: formData.email.split('@')[0],
        email: formData.email,
        password: temporaryPassword,
        role: 'employee'
      },
      
      // Employee Profile Data
      employeeProfile: {
        // Basic Information
        name: formData.name,
        fatherName: formData.fatherName,
        email: formData.email,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone,
        idCardNumber: formData.idCardNumber,
        idCardIssueDate: formData.idCardIssueDate,
        idCardExpiryDate: formData.idCardExpiryDate,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        maritalStatus: formData.maritalStatus,
        
        // Employment Information
        employeeType: formData.customEmployeeType || formData.employeeType,
        department: formData.customDepartment || formData.department,
        position: formData.customPosition || formData.position,
        joiningDate: formData.joiningDate,
        probationPeriod: formData.customProbationPeriod || formData.probationPeriod,
        reportingManager: formData.reportingManager,
        role: formData.customSystemRole || formData.systemRole,
        isActive: formData.isActive,
        hasSystemAccess: formData.hasSystemAccess,
        
        // Address Information
        presentAddress: formData.presentAddress,
        permanentAddress: formData.permanentAddress || formData.presentAddress,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode,
        
        // Emergency Contacts
        emergencyContacts: formData.emergencyContacts.filter(contact => 
          contact.name && contact.phone
        ).map(contact => ({
          name: contact.name,
          phone: contact.phone,
          relation: contact.relation
        })),
        
        // Salary Information
        salary: parseFloat(formData.salary) || 0,
        fuelAllowance: parseFloat(formData.fuelAllowance) || 0,
        medicalAllowance: parseFloat(formData.medicalAllowance) || 0,
        specialAllowance: parseFloat(formData.specialAllowance) || 0,
        otherAllowance: parseFloat(formData.otherAllowance) || 0,
        currency: formData.currency,
        salaryFrequency: formData.salaryFrequency,
        
        // Bank Information
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountTitle: formData.bankAccountTitle,
        bankBranchCode: formData.bankBranchCode,
        ibanNumber: formData.ibanNumber,
        
        // Qualifications & Skills
        qualifications: formData.qualifications,
        previousExperience: formData.previousExperience ? parseFloat(formData.previousExperience) : 0,
        experiences: formData.experiences.filter(exp => exp.company || exp.position).map(exp => ({
          company: exp.company,
          position: exp.position,
          duration: exp.duration,
          description: exp.description
        })),
        skills: formData.skills.filter(skill => skill.name).map(skill => ({
          name: skill.name,
          level: skill.level
        })),
        
        // Profile Picture
        ...(profilePictureUrl && { profilePicture: profilePictureUrl })
      }
    };
    
    console.log('📤 Sending employee data to server...');
    
    // STEP 2: Call ONE endpoint that handles everything
    const response = await axios.post('http://localhost:5000/api/employees/create-with-account', 
      employeeData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Server response:', response.data);
    
    if (response.data.success) {
      // Store generated credentials for display
      setGeneratedPassword(temporaryPassword);
      setGeneratedEmployeeId(response.data.data?.employeeId || response.data.employeeId || 'EMP-XXX');
      
      // Show success message
      let successMsg = '✅ Employee added successfully!';
      
      if (response.data.emailSent) {
        successMsg += ' Login credentials have been sent to their email.';
      } else {
        successMsg += ' Please provide the login credentials manually.';
      }
      
      setSuccessMessage(successMsg);
      
      // Show generated password info modal
      setShowPasswordModal(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          // Reset all fields
          name: '',
          fatherName: '',
          email: '',
          phone: '',
          alternatePhone: '',
          idCardNumber: '',
          idCardIssueDate: '',
          idCardExpiryDate: '',
          dateOfBirth: '',
          gender: 'male',
          bloodGroup: '',
          maritalStatus: 'single',
          employeeType: 'permanent',
          showEmployeeTypeCustom: false,
          customEmployeeType: '',
          employmentStatus: 'active',
          showEmploymentStatusCustom: false,
          customEmploymentStatus: '',
          role: 'employee',
          department: 'General',
          showDepartmentCustom: false,
          customDepartment: '',
          position: 'Employee',
          showPositionCustom: false,
          customPosition: '',
          joiningDate: '',
          probationPeriod: '3',
          showProbationPeriodCustom: false,
          customProbationPeriod: '',
          reportingManager: '',
          systemRole: 'employee',
          showSystemRoleCustom: false,
          customSystemRole: '',
          presentAddress: '',
          permanentAddress: '',
          city: '',
          state: '',
          country: 'Pakistan',
          postalCode: '',
          emergencyContacts: [
            { name: '', phone: '', relation: 'parent' }
          ],
          salary: '',
          fuelAllowance: '',
          medicalAllowance: '',
          specialAllowance: '',
          otherAllowance: '',
          totalSalary: '0',
          currency: 'PKR',
          salaryFrequency: 'monthly',
          bankName: '',
          bankAccountNumber: '',
          bankAccountTitle: '',
          bankBranchCode: '',
          ibanNumber: '',
          qualifications: '',
          experiences: [{ company: '', position: '', duration: '', description: '' }],
          previousExperience: '',
          skills: [{ name: '', level: 'intermediate' }],
          isActive: true,
          hasSystemAccess: true
        });
        
        // Reset documents
        setDocuments({
          profilePicture: null,
          cv: null,
          cnicFront: null,
          cnicBack: null,
          degree: null,
          experienceLetters: [],
          otherDocuments: []
        });
        setProfilePreview('');
        setDocumentPreviews({});
        setErrors({});
      }, 2000);
    } else {
      throw new Error(response.data.error || 'Failed to create employee');
    }
    
  } catch (error) {
    console.error('❌ Add employee error:', error);
    
    if (error.response) {
      console.error('❌ Response error data:', error.response.data);
      const errorMessage = error.response.data?.error || error.response.data?.message || 'Failed to add employee';
      
      // Handle specific errors
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        setServerError(`Error: Email ${formData.email} already exists. Please use a different email.`);
      } else {
        setServerError(`Error: ${errorMessage}`);
      }
    } else if (error.request) {
      setServerError('Network error. Please check your connection.');
    } else {
      setServerError('An error occurred. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/admin/employees');
    }
  };

  // Add Password Info Modal component
  const PasswordInfoModal = () => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <span className="text-green-600">🔑</span>
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
            Employee Account Created Successfully
          </h3>
          <div className="mt-2 px-7 py-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-800">Login Credentials:</p>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Employee ID:</span>
                  <p className="font-mono text-lg font-bold text-gray-900">{generatedEmployeeId || 'Generating...'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium text-gray-900">{formData.email}</p>
                </div>
                {generatedPassword && (
                  <div>
                    <span className="text-sm text-gray-600">Temporary Password:</span>
                    <div className="flex items-center justify-between bg-yellow-50 p-2 rounded">
                      <code className="font-mono text-lg font-bold">{generatedPassword}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedPassword)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800">
                ⚠️ Important Instructions:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>Credentials have been sent to employee's email</li>
                <li>Employee must change password on first login</li>
                <li>Keep this password secure until employee confirms receipt</li>
                <li>Contact IT if email is not received within 15 minutes</li>
              </ul>
            </div>
          </div>
          <div className="items-center px-4 py-3">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                navigate('/admin/employees');
              }}
              className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              OK, Return to Employees
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Get positions for selected department
  const getPositionsByDepartment = (dept) => {
    const positions = {
      'General': ['Employee', 'Assistant', 'Coordinator', 'Trainee', 'Associate'],
      'IT': [
        'Software Developer', 'Senior Developer', 'Team Lead', 'Project Manager',
        'System Administrator', 'Network Engineer', 'Database Administrator',
        'IT Support Specialist', 'DevOps Engineer', 'QA Engineer', 'UI/UX Designer',
        'Data Analyst', 'Security Analyst', 'IT Manager'
      ],
      'Human Resources': [
        'HR Manager', 'HR Generalist', 'Recruitment Specialist', 'Talent Acquisition',
        'Compensation & Benefits Analyst', 'Training & Development Manager',
        'Employee Relations Specialist', 'HR Business Partner', 'Payroll Administrator'
      ],
      'Finance': [
        'Finance Manager', 'Senior Accountant', 'Financial Analyst', 'Controller',
        'Accounts Officer', 'Audit Associate', 'Tax Specialist', 'Cost Accountant',
        'Finance Director'
      ],
      'default': [
        'Manager', 'Senior Manager', 'Director', 'Executive', 'Specialist',
        'Analyst', 'Coordinator', 'Supervisor', 'Team Lead', 'Consultant'
      ]
    };
    
    return positions[dept] || positions.default;
  };

  // Handle file selection for profile picture
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG)');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Profile picture should be less than 2MB');
        return;
      }
      
      setDocuments(prev => ({
        ...prev,
        profilePicture: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const availablePositions = getPositionsByDepartment(formData.department);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {showPasswordModal && <PasswordInfoModal />}
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
              <p className="mt-2 text-gray-600">
                Complete employee profile for HRM system. All fields with * are required.
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/employees')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Employees
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between max-w-3xl">
              {['Basic Info', 'Employment', 'Address', 'Emergency', 'Salary', 'Documents'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < 5 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium">{step}</span>
                  {index < 5 && (
                    <div className="ml-4 w-16 h-0.5 bg-blue-600"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
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
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
            
            {/* Section 1: Personal Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">1</span>
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name */}
                <div className="col-span-1 md:col-span-2">
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

                {/* Father Name - ADDED from first file */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Father Name *
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    placeholder="Father's Name"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.fatherName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.fatherName && (
                    <p className="mt-2 text-sm text-red-600">{errors.fatherName}</p>
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

                {/* Primary Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+923134750548"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                {/* Alternate Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleChange}
                    placeholder="+923001234567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* ID Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC/NICOP Number *
                  </label>
                  <input
                    type="text"
                    name="idCardNumber"
                    value={formData.idCardNumber}
                    onChange={handleChange}
                    placeholder="42101-1234567-1"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.idCardNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.idCardNumber && (
                    <p className="mt-2 text-sm text-red-600">{errors.idCardNumber}</p>
                  )}
                </div>

                {/* CNIC Issue Date - ADDED from first file */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC Issue Date *
                  </label>
                  <input
                    type="date"
                    name="idCardIssueDate"
                    value={formData.idCardIssueDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.idCardIssueDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.idCardIssueDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.idCardIssueDate}</p>
                  )}
                </div>

                {/* CNIC Expiry Date - ADDED from first file */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC Expiry Date *
                  </label>
                  <input
                    type="date"
                    name="idCardExpiryDate"
                    value={formData.idCardExpiryDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.idCardExpiryDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.idCardExpiryDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.idCardExpiryDate}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-2 text-sm text-red-600">{errors.dateOfBirth}</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {genders.map((gender) => (
                      <option key={gender.value} value={gender.value}>
                        {gender.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {bloodGroups.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status
                  </label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {maritalStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Employment Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">2</span>
                Employment Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Employee Type with "Other" option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee Type *
                  </label>
                  <select
                    name="employeeType"
                    value={formData.employeeType}
                    onChange={handleDropdownChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.employeeType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Type</option>
                    {employeeTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  
                  {/* Custom Employee Type Input */}
                  {formData.showEmployeeTypeCustom && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="customEmployeeType"
                        value={formData.customEmployeeType}
                        onChange={handleChange}
                        placeholder="Enter custom employee type"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomOption('employeeType')}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Custom Type
                      </button>
                    </div>
                  )}
                  
                  {errors.employeeType && (
                    <p className="mt-2 text-sm text-red-600">{errors.employeeType}</p>
                  )}
                </div>

                {/* Department with "Other" option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleDropdownChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="other">Other (Add Custom)</option>
                  </select>
                  
                  {/* Custom Department Input */}
                  {formData.showDepartmentCustom && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="customDepartment"
                        value={formData.customDepartment}
                        onChange={handleChange}
                        placeholder="Enter custom department"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomOption('department')}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Custom Department
                      </button>
                    </div>
                  )}
                  
                  {errors.department && (
                    <p className="mt-2 text-sm text-red-600">{errors.department}</p>
                  )}
                </div>

                {/* Position with "Other" option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position *
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleDropdownChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.position ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Position</option>
                    {availablePositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                    <option value="other">Other (Add Custom)</option>
                  </select>
                  
                  {/* Custom Position Input */}
                  {formData.showPositionCustom && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="customPosition"
                        value={formData.customPosition}
                        onChange={handleChange}
                        placeholder="Enter custom position"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomOption('position')}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Custom Position
                      </button>
                    </div>
                  )}
                  
                  {errors.position && (
                    <p className="mt-2 text-sm text-red-600">{errors.position}</p>
                  )}
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.joiningDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.joiningDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.joiningDate}</p>
                  )}
                </div>

                {/* Probation Period with "Other" option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Probation Period
                  </label>
                  <select
                    name="probationPeriod"
                    value={formData.probationPeriod}
                    onChange={handleDropdownChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {probationPeriods.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  
                  {/* Custom Probation Period Input */}
                  {formData.showProbationPeriodCustom && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="customProbationPeriod"
                        value={formData.customProbationPeriod}
                        onChange={handleChange}
                        placeholder="Enter custom probation period"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomOption('probationPeriod')}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Custom Period
                      </button>
                    </div>
                  )}
                </div>

                {/* Reporting Manager */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reporting Manager
                  </label>
                  <input
                    type="text"
                    name="reportingManager"
                    value={formData.reportingManager}
                    onChange={handleChange}
                    placeholder="Manager's name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* System Role with "Other" option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Role
                  </label>
                  <select
                    name="systemRole"
                    value={formData.systemRole}
                    onChange={handleDropdownChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {systemRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  
                  {/* Custom System Role Input */}
                  {formData.showSystemRoleCustom && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="customSystemRole"
                        value={formData.customSystemRole}
                        onChange={handleChange}
                        placeholder="Enter custom system role"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomOption('systemRole')}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Custom Role
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Address Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">3</span>
                Address Information
              </h2>
              
              <div className="space-y-6">
                {/* Present Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Present Address *
                  </label>
                  <textarea
                    name="presentAddress"
                    value={formData.presentAddress}
                    onChange={handleChange}
                    placeholder="House #, Street, Area"
                    rows="3"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.presentAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.presentAddress && (
                    <p className="mt-2 text-sm text-red-600">{errors.presentAddress}</p>
                  )}
                </div>

                {/* Permanent Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permanent Address
                  </label>
                  <textarea
                    name="permanentAddress"
                    value={formData.permanentAddress}
                    onChange={handleChange}
                    placeholder="Permanent residential address"
                    rows="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      id="sameAsPresent"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            permanentAddress: prev.presentAddress
                          }));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="sameAsPresent" className="ml-2 text-sm text-gray-600">
                      Same as present address
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select City</option>
                      {pakistaniCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* State/Province */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Sindh, Punjab, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="75000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Emergency Contacts - UPDATED from first file */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">4</span>
                Emergency Contacts
              </h2>
              
              <div className="space-y-4">
                {formData.emergencyContacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Name {index === 0 && '*'}
                        </label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'name', e.target.value)}
                          placeholder="Full name"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`emergencyContactName_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`emergencyContactName_${index}`] && (
                          <p className="mt-2 text-sm text-red-600">{errors[`emergencyContactName_${index}`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Phone {index === 0 && '*'}
                        </label>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'phone', e.target.value)}
                          placeholder="+923001234567"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`emergencyContactPhone_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`emergencyContactPhone_${index}`] && (
                          <p className="mt-2 text-sm text-red-600">{errors[`emergencyContactPhone_${index}`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Relationship
                        </label>
                        <select
                          value={contact.relation}
                          onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'relation', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {emergencyRelations.map((relation) => (
                            <option key={relation.value} value={relation.value}>
                              {relation.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeEmergencyContact(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Another Emergency Contact
                </button>
              </div>
            </div>

            {/* Section 5: Salary Information - UPDATED from first file */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">5</span>
                Salary Information
              </h2>
              
              <div className="space-y-6">
                {/* Salary Components */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Basic Salary
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {formData.currency === 'PKR' ? '₨' : 
                         formData.currency === 'USD' ? '$' :
                         formData.currency === 'EUR' ? '€' :
                         formData.currency === 'GBP' ? '£' : 'ر.س'}
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Allowance
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {formData.currency === 'PKR' ? '₨' : 
                         formData.currency === 'USD' ? '$' :
                         formData.currency === 'EUR' ? '€' :
                         formData.currency === 'GBP' ? '£' : 'ر.س'}
                      </span>
                      <input
                        type="number"
                        name="fuelAllowance"
                        value={formData.fuelAllowance}
                        onChange={handleChange}
                        placeholder="5000"
                        step="0.01"
                        min="0"
                        className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Allowance
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {formData.currency === 'PKR' ? '₨' : 
                         formData.currency === 'USD' ? '$' :
                         formData.currency === 'EUR' ? '€' :
                         formData.currency === 'GBP' ? '£' : 'ر.س'}
                      </span>
                      <input
                        type="number"
                        name="medicalAllowance"
                        value={formData.medicalAllowance}
                        onChange={handleChange}
                        placeholder="3000"
                        step="0.01"
                        min="0"
                        className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Allowance
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {formData.currency === 'PKR' ? '₨' : 
                         formData.currency === 'USD' ? '$' :
                         formData.currency === 'EUR' ? '€' :
                         formData.currency === 'GBP' ? '£' : 'ر.س'}
                      </span>
                      <input
                        type="number"
                        name="specialAllowance"
                        value={formData.specialAllowance}
                        onChange={handleChange}
                        placeholder="2000"
                        step="0.01"
                        min="0"
                        className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other Allowance
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {formData.currency === 'PKR' ? '₨' : 
                         formData.currency === 'USD' ? '$' :
                         formData.currency === 'EUR' ? '€' :
                         formData.currency === 'GBP' ? '£' : 'ر.س'}
                      </span>
                      <input
                        type="number"
                        name="otherAllowance"
                        value={formData.otherAllowance}
                        onChange={handleChange}
                        placeholder="1000"
                        step="0.01"
                        min="0"
                        className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Salary Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total Monthly Salary:</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {formData.currency === 'PKR' ? '₨' : 
                         formData.currency === 'USD' ? '$' :
                         formData.currency === 'EUR' ? '€' :
                         formData.currency === 'GBP' ? '£' : 'ر.س'}
                        {parseFloat(formData.totalSalary || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-700">Frequency: {formData.salaryFrequency}</p>
                      <p className="text-sm text-blue-700">Currency: {formData.currency}</p>
                    </div>
                  </div>
                </div>

                {/* Bank Information */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Account Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        placeholder="e.g., HBL, MCB, UBL"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        name="bankAccountNumber"
                        value={formData.bankAccountNumber}
                        onChange={handleChange}
                        placeholder="1234567890123"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.bankAccountNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.bankAccountNumber && (
                        <p className="mt-2 text-sm text-red-600">{errors.bankAccountNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Title
                      </label>
                      <input
                        type="text"
                        name="bankAccountTitle"
                        value={formData.bankAccountTitle}
                        onChange={handleChange}
                        placeholder="As per bank records"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IBAN Number
                      </label>
                      <input
                        type="text"
                        name="ibanNumber"
                        value={formData.ibanNumber}
                        onChange={handleChange}
                        placeholder="PK00XXXX0000000000000000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Additional Information & Documents - UPDATED from first file */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">6</span>
                Additional Information & Documents
              </h2>
              
              <div className="space-y-8">
                {/* Qualifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualifications
                  </label>
                  <textarea
                    name="qualifications"
                    value={formData.qualifications}
                    onChange={handleChange}
                    placeholder="e.g., BS Computer Science, MBA, Certifications"
                    rows="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Experiences - ADDED from first file */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Work Experience</h3>
                  <div className="space-y-4">
                    {formData.experiences.map((exp, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Company
                            </label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => handleArrayFieldChange('experiences', index, 'company', e.target.value)}
                              placeholder="Company name"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Position
                            </label>
                            <input
                              type="text"
                              value={exp.position}
                              onChange={(e) => handleArrayFieldChange('experiences', index, 'position', e.target.value)}
                              placeholder="Job title"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Duration
                            </label>
                            <input
                              type="text"
                              value={exp.duration}
                              onChange={(e) => handleArrayFieldChange('experiences', index, 'duration', e.target.value)}
                              placeholder="e.g., 2 years"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <input
                              type="text"
                              value={exp.description}
                              onChange={(e) => handleArrayFieldChange('experiences', index, 'description', e.target.value)}
                              placeholder="Brief description"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeExperience(index)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addExperience}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Work Experience
                    </button>
                  </div>
                </div>

                {/* Previous Experience (Years) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Previous Experience (Years)
                    </label>
                    <input
                      type="number"
                      name="previousExperience"
                      value={formData.previousExperience}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      max="50"
                      step="0.5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Skills - UPDATED from first file */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Skills</h3>
                  <div className="space-y-4">
                    {formData.skills.map((skill, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Skill Name
                            </label>
                            <input
                              type="text"
                              value={skill.name}
                              onChange={(e) => handleArrayFieldChange('skills', index, 'name', e.target.value)}
                              placeholder="e.g., JavaScript, React, Project Management"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Skill Level
                            </label>
                            <select
                              value={skill.level}
                              onChange={(e) => handleArrayFieldChange('skills', index, 'level', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {skillLevels.map((level) => (
                                <option key={level.value} value={level.value}>
                                  {level.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addSkill}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Skill
                    </button>
                  </div>
                </div>

                {/* Documents Upload - ADDED from first file */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Documents Upload</h3>
                  
                  <div className="space-y-6">
                    {/* CV Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CV/Resume (PDF)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        {documents.cv ? (
                          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center">
                              <svg className="h-8 w-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{documents.cv.name}</p>
                                <p className="text-xs text-gray-500">{(documents.cv.size / 1024).toFixed(2)} KB</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument('cv')}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">Upload CV/Resume</p>
                          </>
                        )}
                        <input
                          type="file"
                          onChange={(e) => handleDocumentUpload('cv', e)}
                          accept=".pdf,.doc,.docx"
                          className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-2 text-xs text-gray-500">PDF, DOC, DOCX (Max 5MB)</p>
                      </div>
                    </div>

                    {/* CNIC Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CNIC Front Side
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          {documents.cnicFront ? (
                            <div className="relative">
                              <img 
                                src={documentPreviews.cnicFront} 
                                alt="CNIC Front" 
                                className="mx-auto h-32 object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => removeDocument('cnicFront')}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <>
                              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="mt-2 text-sm text-gray-500">Upload CNIC Front</p>
                            </>
                          )}
                          <input
                            type="file"
                            onChange={(e) => handleDocumentUpload('cnicFront', e)}
                            accept="image/*"
                            className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CNIC Back Side
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          {documents.cnicBack ? (
                            <div className="relative">
                              <img 
                                src={documentPreviews.cnicBack} 
                                alt="CNIC Back" 
                                className="mx-auto h-32 object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => removeDocument('cnicBack')}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <>
                              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="mt-2 text-sm text-gray-500">Upload CNIC Back</p>
                            </>
                          )}
                          <input
                            type="file"
                            onChange={(e) => handleDocumentUpload('cnicBack', e)}
                            accept="image/*"
                            className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Other Documents */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Documents (Certificates, Experience Letters, etc.)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        {documents.otherDocuments.length > 0 ? (
                          <div className="space-y-3">
                            {documents.otherDocuments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center">
                                  <svg className="h-6 w-6 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeDocument('otherDocuments', index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">Upload Other Documents</p>
                          </div>
                        )}
                        <input
                          type="file"
                          onChange={(e) => handleDocumentUpload('otherDocuments', e)}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          multiple
                          className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Picture Section */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
                  
                  <div className="flex flex-col md:flex-row items-start gap-8">
                    {/* Profile Picture */}
                    <div className="w-full">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Employee Profile Picture
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            {profilePreview ? (
                              <div className="relative inline-block">
                                <img 
                                  src={profilePreview} 
                                  alt="Profile preview" 
                                  className="mx-auto h-48 w-48 rounded-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDocuments(prev => ({
                                      ...prev,
                                      profilePicture: null
                                    }));
                                    setProfilePreview('');
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = '';
                                    }
                                  }}
                                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="py-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="mt-2 text-sm text-gray-500">Upload profile photo</p>
                              </div>
                            )}
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={(e) => handleFileChange(e)}
                              accept="image/jpeg,image/png,image/jpg"
                              className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="mt-2 text-xs text-gray-500">JPEG, PNG, max 2MB. Recommended: 400x400px</p>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">Note:</span> Employee ID will be automatically generated by the system in format EMP001, EMP002, etc.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-900">
                            Active Account
                          </label>
                          <p className="text-sm text-gray-500">
                            Employee will have immediate access to the system
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="hasSystemAccess"
                          checked={formData.hasSystemAccess}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-900">
                            Grant System Access
                          </label>
                          <p className="text-sm text-gray-500">
                            Employee will receive login credentials
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">All fields marked with * are required</p>
                  <p className="mt-1">Employee ID will be automatically generated by the system</p>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    disabled={loading || uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center min-w-[160px] justify-center"
                  >
                    {(loading || uploading) ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {uploading ? 'Uploading...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Employee
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">📋 HRM Employee Creation Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-blue-800 mb-2">Required Documents</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Profile Picture (Required)</li>
                <li>• CNIC (Front & Back)</li>
                <li>• CV/Resume</li>
                <li>• Educational Certificates</li>
                <li>• Experience Letters</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-blue-800 mb-2">Salary Components</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Basic Salary</li>
                <li>• Fuel Allowance</li>
                <li>• Medical Allowance</li>
                <li>• Special Allowance</li>
                <li>• Other Allowances</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-blue-800 mb-2">System Access</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Login credentials auto-generated</li>
                <li>• Email notification sent automatically</li>
                <li>• Password reset required on first login</li>
                <li>• Role-based access control</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> All employee data is encrypted and stored securely. 
                  HR personnel are responsible for verifying all documents before submission. 
                  Employee access will be granted only after HR approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;