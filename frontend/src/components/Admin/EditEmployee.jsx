import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// ─── Pakistani Banks List ────────────────────────────────────────────────────
const PAKISTANI_BANKS = [
  { value: '', label: 'Select Bank' },
  { value: 'HBL', label: 'HBL – Habib Bank Limited' },
  { value: 'MCB', label: 'MCB – Muslim Commercial Bank' },
  { value: 'UBL', label: 'UBL – United Bank Limited' },
  { value: 'ABL', label: 'ABL – Allied Bank Limited' },
  { value: 'NBP', label: 'NBP – National Bank of Pakistan' },
  { value: 'Meezan', label: 'Meezan Bank' },
  { value: 'Bank Alfalah', label: 'Bank Alfalah' },
  { value: 'Standard Chartered', label: 'Standard Chartered Pakistan' },
  { value: 'Faysal Bank', label: 'Faysal Bank' },
  { value: 'Bank Al-Habib', label: 'Bank Al-Habib' },
  { value: 'Askari Bank', label: 'Askari Bank' },
  { value: 'Silk Bank', label: 'Silk Bank' },
  { value: 'Soneri Bank', label: 'Soneri Bank' },
  { value: 'JS Bank', label: 'JS Bank' },
  { value: 'Summit Bank', label: 'Summit Bank' },
  { value: 'Dubai Islamic Bank', label: 'Dubai Islamic Bank Pakistan' },
  { value: 'Al Baraka Bank', label: 'Al Baraka Bank Pakistan' },
  { value: 'BankIslami', label: 'BankIslami Pakistan' },
  { value: 'MCB Islamic', label: 'MCB Islamic Bank' },
  { value: 'First Women Bank', label: 'First Women Bank' },
  { value: 'Bank of Punjab', label: 'Bank of Punjab' },
  { value: 'Bank of Khyber', label: 'Bank of Khyber' },
  { value: 'Zarai Taraqiati Bank', label: 'Zarai Taraqiati Bank (ZTBL)' },
  { value: 'Industrial Dev Bank', label: 'Industrial Development Bank' },
  { value: 'Citi Bank', label: 'Citi Bank Pakistan' },
  { value: 'Deutsche Bank', label: 'Deutsche Bank Pakistan' },
  { value: 'Other', label: 'Other (Enter manually)' },
];

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
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
    customEmployeeType: '',
    showEmployeeTypeCustom: false,
    employmentStatus: 'active',
    customEmploymentStatus: '',
    showEmploymentStatusCustom: false,
    department: 'General',
    customDepartment: '',
    showDepartmentCustom: false,
    position: 'Employee',
    customPosition: '',
    showPositionCustom: false,
    joiningDate: '',
    probationPeriod: '3',
    customProbationPeriod: '',
    showProbationPeriodCustom: false,
    reportingManager: '',
    systemRole: 'employee',
    customSystemRole: '',
    showSystemRoleCustom: false,
    presentAddress: '',
    permanentAddress: '',
    sameAddress: false,
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
    emergencyContacts: [{ name: '', phone: '', relation: 'parent' }],
    salary: '',
    fuelAllowance: '',
    medicalAllowance: '',
    specialAllowance: '',
    otherAllowance: '',
    totalSalary: '0',
    currency: 'PKR',
    salaryFrequency: 'monthly',
    bankName: '',
    bankNameCustom: '',
    showBankNameCustom: false,
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

  // Static data arrays
  const departments = [
    'General','IT','Human Resources','Finance','Marketing','Sales',
    'Operations','Customer Service','Research & Development','Administration',
    'Engineering','Product','Quality Assurance','Legal','Procurement',
    'Logistics','Healthcare','Education',
  ];
  
  const employeeTypes = [
    { value: 'permanent', label: 'Permanent Employee' },
    { value: 'contract', label: 'Contractual Employee' },
    { value: 'intern', label: 'Intern/Trainee' },
    { value: 'probation', label: 'Probationary' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'visitor', label: 'Visitor/Special Access' },
    { value: 'part-time', label: 'Part-time Employee' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'other', label: 'Other (Add Custom)' },
  ];
  
  const employmentStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'on-leave', label: 'On Leave' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'resigned', label: 'Resigned' },
    { value: 'other', label: 'Other (Add Custom)' },
  ];
  
  const genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ];
  
  const maritalStatuses = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'separated', label: 'Separated' },
  ];
  
  const bloodGroups = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A Positive (A+)' },
    { value: 'A-', label: 'A Negative (A-)' },
    { value: 'B+', label: 'B Positive (B+)' },
    { value: 'B-', label: 'B Negative (B-)' },
    { value: 'O+', label: 'O Positive (O+)' },
    { value: 'O-', label: 'O Negative (O-)' },
    { value: 'AB+', label: 'AB Positive (AB+)' },
    { value: 'AB-', label: 'AB Negative (AB-)' },
  ];
  
  const emergencyRelations = [
    { value: 'parent', label: 'Parent' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'child', label: 'Child' },
    { value: 'friend', label: 'Friend' },
    { value: 'relative', label: 'Relative' },
    { value: 'colleague', label: 'Colleague' },
    { value: 'other', label: 'Other' },
  ];
  
  const probationPeriods = [
    { value: '1', label: '1 Month' },
    { value: '2', label: '2 Months' },
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
    { value: 'none', label: 'No Probation' },
    { value: 'other', label: 'Other (Add Custom)' },
  ];
  
  const pakistaniCities = [
    'Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan',
    'Peshawar','Quetta','Gujranwala','Sialkot','Sargodha','Bahawalpur',
    'Sukkur','Jhang','Sheikhupura','Mardan','Gujrat','Kasur',
    'Rahim Yar Khan','Other',
  ];
  
  const salaryFrequencies = ['hourly','daily','weekly','bi-weekly','monthly','annually'];
  
  const currencies = [
    { code: 'PKR', name: 'Pakistani Rupee (₨)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'AED', name: 'UAE Dirham (د.إ)' },
    { code: 'SAR', name: 'Saudi Riyal (ر.س)' },
  ];
  
  const systemRoles = [
    { value: 'employee', label: 'Employee (Basic Access)' },
    { value: 'hr', label: 'HR Personnel' },
    { value: 'admin', label: 'Administrator' },
    { value: 'other', label: 'Other (Add Custom)' },
  ];
  
  const skillLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' },
  ];

  const showFieldMap = {
    employeeType: 'showEmployeeTypeCustom',
    employmentStatus: 'showEmploymentStatusCustom',
    department: 'showDepartmentCustom',
    position: 'showPositionCustom',
    probationPeriod: 'showProbationPeriodCustom',
    systemRole: 'showSystemRoleCustom',
  };

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await axios.get(`http://localhost:5000/api/employees/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const employee = response.data.data;
          
          setFormData({
            name: employee.name || '',
            fatherName: employee.fatherName || '',
            email: employee.email || '',
            phone: employee.phone || '',
            alternatePhone: employee.alternatePhone || '',
            idCardNumber: employee.idCardNumber || '',
            idCardIssueDate: employee.idCardIssueDate ? employee.idCardIssueDate.split('T')[0] : '',
            idCardExpiryDate: employee.idCardExpiryDate ? employee.idCardExpiryDate.split('T')[0] : '',
            dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
            gender: employee.gender || 'male',
            bloodGroup: employee.bloodGroup || '',
            maritalStatus: employee.maritalStatus || 'single',
            employeeType: employee.employeeType || 'permanent',
            customEmployeeType: '',
            showEmployeeTypeCustom: false,
            employmentStatus: employee.employmentStatus || 'active',
            customEmploymentStatus: '',
            showEmploymentStatusCustom: false,
            department: employee.department || 'General',
            customDepartment: '',
            showDepartmentCustom: false,
            position: employee.position || 'Employee',
            customPosition: '',
            showPositionCustom: false,
            joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
            probationPeriod: employee.probationPeriod || '3',
            customProbationPeriod: '',
            showProbationPeriodCustom: false,
            reportingManager: employee.reportingManager || '',
            systemRole: employee.role || 'employee',
            customSystemRole: '',
            showSystemRoleCustom: false,
            presentAddress: employee.presentAddress || '',
            permanentAddress: employee.permanentAddress || '',
            sameAddress: !employee.permanentAddress || employee.permanentAddress === employee.presentAddress,
            city: employee.city || '',
            state: employee.state || '',
            country: employee.country || 'Pakistan',
            postalCode: employee.postalCode || '',
            emergencyContacts: employee.emergencyContacts && employee.emergencyContacts.length > 0 
              ? employee.emergencyContacts 
              : [{ name: '', phone: '', relation: 'parent' }],
            salary: employee.salary ? employee.salary.toString() : '',
            fuelAllowance: employee.fuelAllowance ? employee.fuelAllowance.toString() : '',
            medicalAllowance: employee.medicalAllowance ? employee.medicalAllowance.toString() : '',
            specialAllowance: employee.specialAllowance ? employee.specialAllowance.toString() : '',
            otherAllowance: employee.otherAllowance ? employee.otherAllowance.toString() : '',
            totalSalary: employee.totalSalary ? employee.totalSalary.toString() : '0',
            currency: employee.currency || 'PKR',
            salaryFrequency: employee.salaryFrequency || 'monthly',
            bankName: employee.bankName || '',
            bankNameCustom: '',
            showBankNameCustom: employee.bankName && !PAKISTANI_BANKS.some(b => b.value === employee.bankName),
            bankAccountNumber: employee.bankAccountNumber || '',
            bankAccountTitle: employee.bankAccountTitle || '',
            bankBranchCode: employee.bankBranchCode || '',
            ibanNumber: employee.ibanNumber || '',
            qualifications: employee.qualifications || '',
            experiences: employee.experiences && employee.experiences.length > 0 
              ? employee.experiences 
              : [{ company: '', position: '', duration: '', description: '' }],
            previousExperience: employee.previousExperience ? employee.previousExperience.toString() : '',
            skills: employee.skills && employee.skills.length > 0 
              ? employee.skills 
              : [{ name: '', level: 'intermediate' }],
            isActive: employee.isActive !== false,
            hasSystemAccess: employee.hasSystemAccess !== false
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
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'sameAddress') {
      setFormData(prev => ({
        ...prev,
        sameAddress: checked,
        permanentAddress: checked ? prev.presentAddress : prev.permanentAddress,
      }));
      return;
    }
    
    if (name === 'presentAddress') {
      setFormData(prev => ({
        ...prev,
        presentAddress: value,
        permanentAddress: prev.sameAddress ? value : prev.permanentAddress,
      }));
      if (errors.presentAddress) setErrors(prev => ({ ...prev, presentAddress: '' }));
      return;
    }

    if (name.includes('Allowance') || name === 'salary') {
      setFormData(prev => {
        const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
        const s = parseFloat(updated.salary) || 0;
        const f = parseFloat(updated.fuelAllowance) || 0;
        const m = parseFloat(updated.medicalAllowance) || 0;
        const sp = parseFloat(updated.specialAllowance) || 0;
        const o = parseFloat(updated.otherAllowance) || 0;
        updated.totalSalary = (s + f + m + sp + o).toString();
        return updated;
      });
      return;
    }

    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleDropdownChange = (e) => {
    const { name, value } = e.target;

    if (name === 'bankName') {
      setFormData(prev => ({
        ...prev,
        bankName: value,
        showBankNameCustom: value === 'Other',
        bankNameCustom: value === 'Other' ? prev.bankNameCustom : '',
      }));
      return;
    }

    const showField = showFieldMap[name];
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(showField ? { [showField]: value === 'other' } : {}),
    }));
  };

  const handleArrayFieldChange = (field, index, subField, value) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = { ...newArray[index], [subField]: value };
      return { ...prev, [field]: newArray };
    });
  };

  const addEmergencyContact = () => setFormData(prev => ({
    ...prev, emergencyContacts: [...prev.emergencyContacts, { name: '', phone: '', relation: 'parent' }]
  }));
  
  const removeEmergencyContact = (index) => setFormData(prev => ({
    ...prev, emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
  }));
  
  const addExperience = () => setFormData(prev => ({
    ...prev, experiences: [...prev.experiences, { company: '', position: '', duration: '', description: '' }]
  }));
  
  const removeExperience = (index) => setFormData(prev => ({
    ...prev, experiences: prev.experiences.filter((_, i) => i !== index)
  }));
  
  const addSkill = () => setFormData(prev => ({
    ...prev, skills: [...prev.skills, { name: '', level: 'intermediate' }]
  }));
  
  const removeSkill = (index) => setFormData(prev => ({
    ...prev, skills: prev.skills.filter((_, i) => i !== index)
  }));

  const uploadProfilePicture = async () => {
    if (!profilePicture) return currentProfileImage.replace('http://localhost:5000', '') || null;
    
    try {
      setUploading(true);
      const token = localStorage.getItem('authToken');
      const uploadFormData = new FormData();
      uploadFormData.append('profilePicture', profilePicture);
      
      const response = await axios.post('http://localhost:5000/api/upload/profile', uploadFormData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) return response.data.filePath;
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const addCustomOption = (field) => {
    const customField = `custom${field.charAt(0).toUpperCase() + field.slice(1)}`;
    const customValue = formData[customField];
    const showField = showFieldMap[field];
    if (customValue && customValue.trim()) {
      setFormData(prev => ({ ...prev, [field]: customValue, ...(showField ? { [showField]: false } : {}) }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['name', 'fatherName', 'email', 'phone', 'idCardNumber', 'employeeType', 'department', 'position', 'joiningDate'];
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '')
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1')} is required`;
    });
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Please enter a valid email address';
    
    if (formData.idCardNumber && !/^\d{5}-\d{7}-\d{1}$/.test(formData.idCardNumber))
      newErrors.idCardNumber = 'CNIC must be in format: 12345-1234567-1';
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
      const profilePictureUrl = await uploadProfilePicture();
      
      const resolvedSystemRole = formData.customSystemRole || formData.systemRole;
      const resolvedEmploymentStatus = formData.customEmploymentStatus || formData.employmentStatus;
      const resolvedBankName = formData.bankName === 'Other' ? formData.bankNameCustom : formData.bankName;
      
      const employeeData = {
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
        employeeType: formData.customEmployeeType || formData.employeeType,
        employmentStatus: resolvedEmploymentStatus,
        department: formData.customDepartment || formData.department,
        position: formData.customPosition || formData.position,
        joiningDate: formData.joiningDate,
        probationPeriod: formData.customProbationPeriod || formData.probationPeriod,
        reportingManager: formData.reportingManager,
        role: resolvedSystemRole,
        presentAddress: formData.presentAddress,
        permanentAddress: formData.permanentAddress || formData.presentAddress,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode,
        emergencyContacts: formData.emergencyContacts.filter(c => c.name && c.phone),
        salary: parseFloat(formData.salary) || 0,
        fuelAllowance: parseFloat(formData.fuelAllowance) || 0,
        medicalAllowance: parseFloat(formData.medicalAllowance) || 0,
        specialAllowance: parseFloat(formData.specialAllowance) || 0,
        otherAllowance: parseFloat(formData.otherAllowance) || 0,
        currency: formData.currency,
        salaryFrequency: formData.salaryFrequency,
        bankName: resolvedBankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountTitle: formData.bankAccountTitle,
        bankBranchCode: formData.bankBranchCode,
        ibanNumber: formData.ibanNumber,
        qualifications: formData.qualifications,
        experiences: formData.experiences.filter(exp => exp.company || exp.position),
        previousExperience: parseFloat(formData.previousExperience) || 0,
        skills: formData.skills.filter(s => s.name),
        isActive: formData.isActive,
        hasSystemAccess: formData.hasSystemAccess,
        ...(profilePictureUrl && { profilePicture: profilePictureUrl })
      };
      
      const response = await axios.put(`http://localhost:5000/api/employees/${id}`, employeeData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (response.data.success) {
        setSuccessMessage('✅ Employee updated successfully!');
        setTimeout(() => navigate('/admin/employees'), 2000);
      }
    } catch (error) {
      console.error('Update employee error:', error);
      if (error.response) {
        setServerError(error.response.data?.error || 'Failed to update employee');
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

  const getPositionsByDepartment = (dept) => {
    const positions = {
      'General': ['Employee','Assistant','Coordinator','Trainee','Associate'],
      'IT': ['Software Developer','Senior Developer','Team Lead','Project Manager','System Administrator','Network Engineer','Database Administrator','IT Support Specialist','DevOps Engineer','QA Engineer','UI/UX Designer','Data Analyst','Security Analyst','IT Manager'],
      'Human Resources': ['HR Manager','HR Generalist','Recruitment Specialist','Talent Acquisition','Compensation & Benefits Analyst','Training & Development Manager','Employee Relations Specialist','HR Business Partner','Payroll Administrator'],
      'Finance': ['Finance Manager','Senior Accountant','Financial Analyst','Controller','Accounts Officer','Audit Associate','Tax Specialist','Cost Accountant','Finance Director'],
      'default': ['Manager','Senior Manager','Director','Executive','Specialist','Analyst','Coordinator','Supervisor','Team Lead','Consultant'],
    };
    return positions[dept] || positions.default;
  };

  const availablePositions = getPositionsByDepartment(formData.department);
  const currencySymbol = { PKR: '₨', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: 'ر.س' }[formData.currency] || '₨';

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
              <p className="mt-2 text-gray-600">Update complete employee profile for {formData.name}</p>
            </div>
            <button onClick={() => navigate('/admin/employees')} className="text-gray-600 hover:text-gray-900">← Back to Employees</button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-green-600 mr-3">✅</span>
              <div><h3 className="text-sm font-medium text-green-800">Success!</h3><p className="text-sm text-green-700">{successMessage}</p></div>
            </div>
          </div>
        )}

        {serverError && !successMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-red-600 mr-3">❌</span>
              <div><h3 className="text-sm font-medium text-red-800">Error</h3><p className="text-sm text-red-700">{serverError}</p></div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
            
            {/* Section 1: Personal Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">1</span>
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Father Name *</label>
                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg ${errors.fatherName ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.fatherName && <p className="mt-2 text-sm text-red-600">{errors.fatherName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Phone</label>
                  <input type="tel" name="alternatePhone" value={formData.alternatePhone} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CNIC/NICOP Number *</label>
                  <input type="text" name="idCardNumber" value={formData.idCardNumber} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg ${errors.idCardNumber ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.idCardNumber && <p className="mt-2 text-sm text-red-600">{errors.idCardNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Issue Date</label>
                  <input type="date" name="idCardIssueDate" value={formData.idCardIssueDate} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Expiry Date</label>
                  <input type="date" name="idCardExpiryDate" value={formData.idCardExpiryDate} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    {genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    {bloodGroups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                  <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    {maritalStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Employment Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">2</span>
                Employment Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee Type *</label>
                  <select name="employeeType" value={formData.employeeType} onChange={handleDropdownChange} className={`w-full px-4 py-3 border rounded-lg ${errors.employeeType ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="">Select Type</option>
                    {employeeTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {formData.showEmployeeTypeCustom && (
                    <div className="mt-2">
                      <input type="text" name="customEmployeeType" value={formData.customEmployeeType} onChange={handleChange} placeholder="Enter custom employee type" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      <button type="button" onClick={() => addCustomOption('employeeType')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Custom Type</button>
                    </div>
                  )}
                  {errors.employeeType && <p className="mt-2 text-sm text-red-600">{errors.employeeType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                  <select name="employmentStatus" value={formData.employmentStatus} onChange={handleDropdownChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    {employmentStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {formData.showEmploymentStatusCustom && (
                    <div className="mt-2">
                      <input type="text" name="customEmploymentStatus" value={formData.customEmploymentStatus} onChange={handleChange} placeholder="Enter custom employment status" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      <button type="button" onClick={() => addCustomOption('employmentStatus')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Custom Status</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                  <select name="department" value={formData.department} onChange={handleDropdownChange} className={`w-full px-4 py-3 border rounded-lg ${errors.department ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="other">Other (Add Custom)</option>
                  </select>
                  {formData.showDepartmentCustom && (
                    <div className="mt-2">
                      <input type="text" name="customDepartment" value={formData.customDepartment} onChange={handleChange} placeholder="Enter custom department" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      <button type="button" onClick={() => addCustomOption('department')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Custom Department</button>
                    </div>
                  )}
                  {errors.department && <p className="mt-2 text-sm text-red-600">{errors.department}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position *</label>
                  <select name="position" value={formData.position} onChange={handleDropdownChange} className={`w-full px-4 py-3 border rounded-lg ${errors.position ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="">Select Position</option>
                    {availablePositions.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="other">Other (Add Custom)</option>
                  </select>
                  {formData.showPositionCustom && (
                    <div className="mt-2">
                      <input type="text" name="customPosition" value={formData.customPosition} onChange={handleChange} placeholder="Enter custom position" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      <button type="button" onClick={() => addCustomOption('position')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Custom Position</button>
                    </div>
                  )}
                  {errors.position && <p className="mt-2 text-sm text-red-600">{errors.position}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date *</label>
                  <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg ${errors.joiningDate ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.joiningDate && <p className="mt-2 text-sm text-red-600">{errors.joiningDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Probation Period</label>
                  <select name="probationPeriod" value={formData.probationPeriod} onChange={handleDropdownChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    {probationPeriods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {formData.showProbationPeriodCustom && (
                    <div className="mt-2">
                      <input type="text" name="customProbationPeriod" value={formData.customProbationPeriod} onChange={handleChange} placeholder="Enter custom probation period" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      <button type="button" onClick={() => addCustomOption('probationPeriod')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Custom Period</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reporting Manager</label>
                  <input type="text" name="reportingManager" value={formData.reportingManager} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">System Role</label>
                  <select name="systemRole" value={formData.systemRole} onChange={handleDropdownChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    {systemRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {formData.showSystemRoleCustom && (
                    <div className="mt-2">
                      <input type="text" name="customSystemRole" value={formData.customSystemRole} onChange={handleChange} placeholder="Enter custom system role" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      <button type="button" onClick={() => addCustomOption('systemRole')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Custom Role</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Address Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">3</span>
                Address Information
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Present Address *</label>
                  <textarea name="presentAddress" value={formData.presentAddress} onChange={handleChange} rows="3" className={`w-full px-4 py-3 border rounded-lg ${errors.presentAddress ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.presentAddress && <p className="mt-2 text-sm text-red-600">{errors.presentAddress}</p>}
                </div>
                <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <input type="checkbox" id="sameAddress" name="sameAddress" checked={formData.sameAddress} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded" />
                  <label htmlFor="sameAddress" className="ml-2 text-sm font-medium text-blue-800">Permanent address is same as present address</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permanent Address</label>
                  <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} rows="3" disabled={formData.sameAddress} className={`w-full px-4 py-3 border rounded-lg ${formData.sameAddress ? 'bg-gray-100' : 'border-gray-300'}`} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <select name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                      <option value="">Select City</option>
                      {pakistaniCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                    <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Emergency Contacts */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">4</span>
                Emergency Contacts
              </h2>
              <div className="space-y-4">
                {formData.emergencyContacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                        <input type="text" value={contact.name} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                        <input type="tel" value={contact.phone} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'phone', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                        <select value={contact.relation} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'relation', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                          {emergencyRelations.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {index > 0 && (
                      <button type="button" onClick={() => removeEmergencyContact(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addEmergencyContact} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add Another Emergency Contact
                </button>
              </div>
            </div>

            {/* Section 5: Salary Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">5</span>
                Salary Information
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { name: 'salary', label: 'Basic Salary', placeholder: '50000' },
                    { name: 'fuelAllowance', label: 'Fuel Allowance', placeholder: '5000' },
                    { name: 'medicalAllowance', label: 'Medical Allowance', placeholder: '3000' },
                    { name: 'specialAllowance', label: 'Special Allowance', placeholder: '2000' },
                    { name: 'otherAllowance', label: 'Other Allowance', placeholder: '1000' },
                  ].map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">{currencySymbol}</span>
                        <input type="number" name={field.name} value={formData[field.name]} onChange={handleChange} placeholder={field.placeholder} step="0.01" min="0" className="flex-1 w-full px-3 py-3 rounded-none rounded-r-md border border-gray-300" />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Salary Frequency</label>
                    <select name="salaryFrequency" value={formData.salaryFrequency} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                      {salaryFrequencies.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total Monthly Salary:</p>
                      <p className="text-2xl font-bold text-blue-900">{currencySymbol}{parseFloat(formData.totalSalary || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Bank Account Details */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Account Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <select name="bankName" value={formData.bankName} onChange={handleDropdownChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                        {PAKISTANI_BANKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                      {formData.showBankNameCustom && (
                        <input type="text" name="bankNameCustom" value={formData.bankNameCustom} onChange={handleChange} placeholder="Enter bank name" className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Title</label>
                      <input type="text" name="bankAccountTitle" value={formData.bankAccountTitle} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch Code</label>
                      <input type="text" name="bankBranchCode" value={formData.bankBranchCode} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IBAN Number</label>
                      <input type="text" name="ibanNumber" value={formData.ibanNumber} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Additional Information */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b flex items-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">6</span>
                Additional Information
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
                  <textarea name="qualifications" value={formData.qualifications} onChange={handleChange} rows="2" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Work Experience</h3>
                  {formData.experiences.map((exp, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><input type="text" value={exp.company} onChange={(e) => handleArrayFieldChange('experiences', index, 'company', e.target.value)} placeholder="Company" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                        <div><input type="text" value={exp.position} onChange={(e) => handleArrayFieldChange('experiences', index, 'position', e.target.value)} placeholder="Position" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><input type="text" value={exp.duration} onChange={(e) => handleArrayFieldChange('experiences', index, 'duration', e.target.value)} placeholder="Duration" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                        <div><input type="text" value={exp.description} onChange={(e) => handleArrayFieldChange('experiences', index, 'description', e.target.value)} placeholder="Description" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                      </div>
                      {index > 0 && (
                        <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 text-red-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addExperience} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg">+ Add Work Experience</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previous Experience (Years)</label>
                  <input type="number" name="previousExperience" value={formData.previousExperience} onChange={handleChange} step="0.5" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Skills</h3>
                  {formData.skills.map((skill, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><input type="text" value={skill.name} onChange={(e) => handleArrayFieldChange('skills', index, 'name', e.target.value)} placeholder="Skill Name" className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                        <div><select value={skill.level} onChange={(e) => handleArrayFieldChange('skills', index, 'level', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                          {skillLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select></div>
                      </div>
                      {index > 0 && (
                        <button type="button" onClick={() => removeSkill(index)} className="absolute top-2 right-2 text-red-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addSkill} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg">+ Add Skill</button>
                </div>

                {/* Profile Picture */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {profilePreview ? (
                      <div className="relative inline-block">
                        <img src={profilePreview} alt="Profile preview" className="mx-auto h-48 w-48 rounded-full object-cover" />
                        <button type="button" onClick={() => { setProfilePicture(null); setProfilePreview(currentProfileImage); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="py-8"><svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/jpg" className="mt-4 block w-full text-sm text-gray-500" />
                    <p className="mt-2 text-xs text-gray-500">JPEG, PNG, max 2MB. Recommended: 400x400px</p>
                  </div>
                </div>

                {/* Account Status */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded" />
                        <div className="ml-3"><label className="text-sm font-medium text-gray-900">Active Account</label><p className="text-sm text-gray-500">Employee will have access to the system</p></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input type="checkbox" name="hasSystemAccess" checked={formData.hasSystemAccess} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded" />
                        <div className="ml-3"><label className="text-sm font-medium text-gray-900">Grant System Access</label><p className="text-sm text-gray-500">Employee can login to the system</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">All fields marked with * are required</div>
                <div className="flex space-x-4">
                  <button type="button" onClick={handleCancel} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving || uploading} className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
                    {saving || uploading ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{uploading ? 'Uploading...' : 'Saving...'}</>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEmployee;