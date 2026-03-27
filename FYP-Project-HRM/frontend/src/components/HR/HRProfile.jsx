// components/HR/HRProfile.jsx - UPDATED WITH WHITE THEME
import React, { useState, useEffect } from 'react';
import {
  FiUser, FiMail, FiPhone, FiCalendar, FiBriefcase,
  FiDollarSign, FiLock, FiSave, FiEdit, FiShield,
  FiGlobe, FiBell, FiSettings, FiDatabase, FiActivity,
  FiBarChart2, FiUsers, FiCheckCircle, FiAlertCircle,
  FiTrendingUp, FiKey, FiRefreshCw, FiShieldOff,
  FiMapPin, FiCreditCard, FiBook, FiHome,
  FiFileText, FiAward, FiHeart, FiStar, FiClipboard,
  FiUsers as FiTeam, FiDollarSign as FiSalary, FiClock,
  FiFile, FiArchive, FiMessageSquare, FiBell as FiNotification,
  FiGift, FiEye
} from 'react-icons/fi';
import { 
  FaUserTie, FaFileContract, FaUserFriends, 
  FaHandshake, FaBalanceScale, FaBullhorn, FaGraduationCap
} from 'react-icons/fa';
import { MdOutlineDashboard } from 'react-icons/md';
import { HiOutlineDocumentDuplicate } from 'react-icons/hi';
import axiosInstance from '../../utils/axiosInstance';

const HRProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Changed to light mode default
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [hrStats, setHrStats] = useState(null);
  const [profile, setProfile] = useState({
    // BASIC INFORMATION
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
    
    // EMPLOYMENT INFORMATION (HR SPECIFIC)
    employeeId: '',
    employeeType: 'permanent',
    employmentStatus: 'active',
    role: 'hr',
    department: 'Human Resources',
    position: 'HR Manager',
    joiningDate: '',
    probationPeriod: '3',
    reportingManager: '',
    systemRole: 'hr',
    
    // HR SPECIFIC FIELDS
    hrSpecialization: 'general',
    hrExperience: '',
    employeeCountManaged: '',
    payrollAccess: true,
    recruitmentAccess: true,
    leaveManagementAccess: true,
    contractManagementAccess: true,
    
    // ADDRESS INFORMATION
    presentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
    
    // EMERGENCY CONTACTS
    emergencyContacts: [{ name: '', phone: '', relation: 'parent' }],
    
    // SALARY INFORMATION
    salary: '',
    fuelAllowance: '',
    medicalAllowance: '',
    specialAllowance: '',
    otherAllowance: '',
    hrAllowance: '',
    currency: 'PKR',
    salaryFrequency: 'monthly',
    
    // BANK INFORMATION
    bankName: '',
    bankAccountNumber: '',
    bankAccountTitle: '',
    bankBranchCode: '',
    ibanNumber: '',
    
    // ADDITIONAL INFORMATION
    qualifications: '',
    experiences: [{ company: '', position: '', duration: '', description: '' }],
    skills: [{ name: '', level: 'intermediate' }],
    previousExperience: '',
    certifications: [{ name: '', issuer: '', date: '' }],
    
    // SYSTEM INFORMATION
    isActive: true,
    hasSystemAccess: true,
    
    // PROFILE
    profilePicture: '',
    
    // SECURITY SETTINGS
    twoFactorEnabled: false,
    
    // NOTIFICATION PREFERENCES
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
      leaveRequests: true,
      recruitmentUpdates: true,
      employeeOnboarding: true,
      contractExpiry: true
    }
  });

  // Fetch HR profile data
  useEffect(() => {
    fetchHRProfile();
    fetchHRStats();
  }, []);

  const fetchHRProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching HR profile...');
      
      // Try HR specific endpoint first, then fallback to employee
      const endpoints = [
        '/hr/profile',
        '/employees/profile/me',
        '/auth/profile',
        '/auth/me'
      ];
      
      let profileData = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          const response = await axiosInstance.get(endpoint);
          if (response.data.success) {
            profileData = response.data.data;
            console.log(`✅ Profile loaded from: ${endpoint}`);
            break;
          }
        } catch (err) {
          console.log(`❌ ${endpoint} failed:`, err.response?.status);
        }
      }
      
      if (profileData) {
        // Format date fields
        const formatDate = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };
        
        // Handle emergency contacts
        let emergencyContacts = [];
        if (profileData.emergencyContacts && Array.isArray(profileData.emergencyContacts)) {
          emergencyContacts = profileData.emergencyContacts;
        }
        
        // Handle experiences
        let experiences = [];
        if (profileData.experiences && Array.isArray(profileData.experiences)) {
          experiences = profileData.experiences;
        }
        
        // Handle skills
        let skills = [];
        if (profileData.skills && Array.isArray(profileData.skills)) {
          if (typeof profileData.skills[0] === 'string') {
            skills = profileData.skills.map(skill => ({ name: skill, level: 'intermediate' }));
          } else {
            skills = profileData.skills;
          }
        }
        
        // Handle certifications
        let certifications = [];
        if (profileData.certifications && Array.isArray(profileData.certifications)) {
          certifications = profileData.certifications;
        }
        
        setProfile({
          // Basic Information
          name: profileData.name || 'HR Manager',
          fatherName: profileData.fatherName || '',
          email: profileData.email || 'hr@company.com',
          phone: profileData.phone || '+92 300 1234567',
          alternatePhone: profileData.alternatePhone || '',
          idCardNumber: profileData.idCardNumber || '',
          idCardIssueDate: formatDate(profileData.idCardIssueDate),
          idCardExpiryDate: formatDate(profileData.idCardExpiryDate),
          dateOfBirth: formatDate(profileData.dateOfBirth),
          gender: profileData.gender || 'male',
          bloodGroup: profileData.bloodGroup || '',
          maritalStatus: profileData.maritalStatus || 'single',
          
          // Employment Information
          employeeId: profileData.employeeId || 'HR2024001',
          employeeType: profileData.employeeType || 'permanent',
          employmentStatus: profileData.employmentStatus || 'active',
          role: profileData.role || 'hr',
          department: profileData.department || 'Human Resources',
          position: profileData.position || 'HR Manager',
          joiningDate: formatDate(profileData.joiningDate),
          probationPeriod: profileData.probationPeriod || '3',
          reportingManager: profileData.reportingManager || '',
          systemRole: profileData.systemRole || 'hr',
          
          // HR Specific Fields
          hrSpecialization: profileData.hrSpecialization || 'general',
          hrExperience: profileData.hrExperience || '5',
          employeeCountManaged: profileData.employeeCountManaged || '50',
          payrollAccess: profileData.payrollAccess !== undefined ? profileData.payrollAccess : true,
          recruitmentAccess: profileData.recruitmentAccess !== undefined ? profileData.recruitmentAccess : true,
          leaveManagementAccess: profileData.leaveManagementAccess !== undefined ? profileData.leaveManagementAccess : true,
          contractManagementAccess: profileData.contractManagementAccess !== undefined ? profileData.contractManagementAccess : true,
          
          // Address Information
          presentAddress: profileData.presentAddress || '',
          permanentAddress: profileData.permanentAddress || '',
          city: profileData.city || '',
          state: profileData.state || '',
          country: profileData.country || 'Pakistan',
          postalCode: profileData.postalCode || '',
          
          // Emergency Contacts
          emergencyContacts,
          
          // Salary Information
          salary: profileData.salary || '',
          fuelAllowance: profileData.fuelAllowance || '',
          medicalAllowance: profileData.medicalAllowance || '',
          specialAllowance: profileData.specialAllowance || '',
          otherAllowance: profileData.otherAllowance || '',
          hrAllowance: profileData.hrAllowance || '',
          currency: profileData.currency || 'PKR',
          salaryFrequency: profileData.salaryFrequency || 'monthly',
          
          // Bank Information
          bankName: profileData.bankName || '',
          bankAccountNumber: profileData.bankAccountNumber || '',
          bankAccountTitle: profileData.bankAccountTitle || '',
          bankBranchCode: profileData.bankBranchCode || '',
          ibanNumber: profileData.ibanNumber || '',
          
          // Additional Information
          qualifications: profileData.qualifications || '',
          experiences,
          skills,
          previousExperience: profileData.previousExperience || '',
          certifications,
          
          // System Information
          isActive: profileData.isActive !== undefined ? profileData.isActive : true,
          hasSystemAccess: profileData.hasSystemAccess !== undefined ? profileData.hasSystemAccess : true,
          
          // Profile
          profilePicture: profileData.profilePicture || profileData.avatar || '',
          
          // Security Settings
          twoFactorEnabled: profileData.twoFactorEnabled || false,
          
          // Notification Preferences
          notificationPreferences: profileData.notificationPreferences || {
            email: true,
            push: true,
            sms: false,
            leaveRequests: true,
            recruitmentUpdates: true,
            employeeOnboarding: true,
            contractExpiry: true
          }
        });
        
        console.log('📋 HR profile loaded successfully');
      } else {
        console.log('⚠️ Using fallback HR data');
      }
    } catch (error) {
      console.error('❌ Error fetching HR profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchHRStats = async () => {
    try {
      const response = await axiosInstance.get('/hr/stats');
      if (response.data.success) {
        setHrStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching HR stats:', error);
      // Fallback data
      setHrStats({
        totalEmployees: 245,
        activeRecruitments: 12,
        pendingLeaves: 8,
        contractsExpiring: 5,
        totalDepartments: 8,
        employeeChange: '+12%',
        leaveChange: '+3',
        recruitmentChange: '-2',
        departmentDistribution: [
          { name: 'Engineering', value: 65, color: '#3B82F6' },
          { name: 'Sales', value: 40, color: '#10B981' },
          { name: 'Marketing', value: 35, color: '#8B5CF6' },
          { name: 'HR', value: 25, color: '#F59E0B' }
        ]
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleArrayFieldChange = (field, index, subField, value) => {
    setProfile(prev => {
      const newArray = [...prev[field]];
      newArray[index] = { ...newArray[index], [subField]: value };
      return { ...prev, [field]: newArray };
    });
  };

  const handleNotificationChange = (type, value) => {
    setProfile(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [type]: value
      }
    }));
  };

  const addEmergencyContact = () => {
    setProfile(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: '', phone: '', relation: 'parent' }]
    }));
  };

  const removeEmergencyContact = (index) => {
    setProfile(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    setProfile(prev => ({
      ...prev,
      experiences: [...prev.experiences, { company: '', position: '', duration: '', description: '' }]
    }));
  };

  const removeExperience = (index) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    setProfile(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '', level: 'intermediate' }]
    }));
  };

  const removeSkill = (index) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    setProfile(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', date: '' }]
    }));
  };

  const removeCertification = (index) => {
    setProfile(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    
    try {
      console.log('💾 Saving HR profile...');
      
      const dataToSave = {
        // Basic Information
        name: profile.name,
        fatherName: profile.fatherName,
        phone: profile.phone,
        alternatePhone: profile.alternatePhone,
        idCardNumber: profile.idCardNumber,
        idCardIssueDate: profile.idCardIssueDate || null,
        idCardExpiryDate: profile.idCardExpiryDate || null,
        dateOfBirth: profile.dateOfBirth || null,
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
        maritalStatus: profile.maritalStatus,
        
        // Employment Information
        department: profile.department,
        position: profile.position,
        employeeType: profile.employeeType,
        reportingManager: profile.reportingManager,
        hrSpecialization: profile.hrSpecialization,
        hrExperience: profile.hrExperience,
        employeeCountManaged: profile.employeeCountManaged,
        
        // Address Information
        presentAddress: profile.presentAddress,
        permanentAddress: profile.permanentAddress,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postalCode: profile.postalCode,
        
        // Emergency Contacts
        emergencyContacts: profile.emergencyContacts.filter(contact => 
          contact.name || contact.phone
        ),
        
        // Bank Information
        bankName: profile.bankName,
        bankAccountNumber: profile.bankAccountNumber,
        bankAccountTitle: profile.bankAccountTitle,
        bankBranchCode: profile.bankBranchCode,
        ibanNumber: profile.ibanNumber,
        
        // Additional Information
        qualifications: profile.qualifications,
        experiences: profile.experiences.filter(exp => 
          exp.company || exp.position
        ),
        skills: profile.skills.filter(skill => skill.name),
        certifications: profile.certifications.filter(cert => cert.name),
        previousExperience: parseFloat(profile.previousExperience) || 0,
        
        // Profile
        profilePicture: profile.profilePicture,
        
        // HR Access Controls
        payrollAccess: profile.payrollAccess,
        recruitmentAccess: profile.recruitmentAccess,
        leaveManagementAccess: profile.leaveManagementAccess,
        contractManagementAccess: profile.contractManagementAccess,
        
        // Security
        twoFactorEnabled: profile.twoFactorEnabled,
        
        // Notifications
        notificationPreferences: profile.notificationPreferences
      };
      
      console.log('📤 HR Data being sent for update:', dataToSave);
      
      // Try HR-specific endpoint first
      try {
        const res = await axiosInstance.put('/hr/profile', dataToSave);
        
        if (res.data.success) {
          alert('✅ HR profile updated successfully!');
          console.log('✅ Profile update response:', res.data);
          fetchHRProfile(); // Refresh data
        } else {
          throw new Error(res.data.error || 'Update failed');
        }
      } catch (updateError) {
        console.log('❌ HR endpoint failed, trying employee endpoint:', updateError);
        
        // Try alternative endpoint
        const res = await axiosInstance.put('/employees/profile/me', dataToSave);
        if (res.data.success) {
          alert('✅ Profile updated via alternative endpoint!');
          fetchHRProfile();
        } else {
          throw new Error('Both update endpoints failed');
        }
      }
      
    } catch (err) {
      console.error('❌ Save error:', err);
      setError('Failed to update profile: ' + err.message);
      alert('❌ Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const StatCard = ({ title, value, icon, color, change, loading }) => (
    <div className="rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} text-white`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            change.startsWith('+') 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium mb-1 text-gray-600">
          {title}
        </p>
        {loading ? (
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        ) : (
          <p className="text-lg font-bold text-gray-900">
            {value}
          </p>
        )}
      </div>
    </div>
  );

  const TabButton = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 text-sm font-medium ${
        activeTab === tab
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const Input = ({ label, name, value, onChange, disabled = false, type = 'text', required = false }) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
        {disabled && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg transition-all ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
        }`}
      />
    </div>
  );

  const Select = ({ label, name, value, onChange, options, disabled = false }) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        {label}
      </label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg transition-all ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
        }`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const TextArea = ({ label, name, value, onChange, disabled = false, rows = 3 }) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        {label}
      </label>
      <textarea
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3 py-2 text-sm rounded-lg transition-all ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
        }`}
      />
    </div>
  );

  const Checkbox = ({ label, name, checked, onChange, disabled = false }) => (
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`w-4 h-4 rounded transition-colors ${
          disabled
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'bg-white border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0'
        }`}
      />
      <span className={`text-sm text-gray-700 ${disabled ? 'opacity-50' : ''}`}>
        {label}
      </span>
    </label>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch(activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Employees"
                value={hrStats?.totalEmployees || 0}
                icon={<FiTeam />}
                color="bg-gradient-to-br from-blue-500 to-cyan-500"
                change={hrStats?.employeeChange || "+0%"}
                loading={!hrStats}
              />
              <StatCard
                title="Active Recruitments"
                value={hrStats?.activeRecruitments || 0}
                icon={<FaUserFriends />}
                color="bg-gradient-to-br from-purple-500 to-pink-500"
                change={hrStats?.recruitmentChange || "-0"}
                loading={!hrStats}
              />
              <StatCard
                title="Pending Leaves"
                value={hrStats?.pendingLeaves || 0}
                icon={<FiClipboard />}
                color="bg-gradient-to-br from-green-500 to-emerald-500"
                change={hrStats?.leaveChange || "+0"}
                loading={!hrStats}
              />
              <StatCard
                title="Contracts Expiring"
                value={hrStats?.contractsExpiring || 0}
                icon={<FaFileContract />}
                color="bg-gradient-to-br from-amber-500 to-orange-500"
                loading={!hrStats}
              />
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-900">
                <FiBriefcase className="inline mr-2 text-blue-500" />
                HR Dashboard Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="/hr/recruitment" className="p-4 rounded-lg text-center transition-all bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md">
                  <FaUserFriends className="mx-auto text-xl text-purple-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    Recruitment
                  </p>
                </a>
                <a href="/hr/leave" className="p-4 rounded-lg text-center transition-all bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md">
                  <FiClipboard className="mx-auto text-xl text-blue-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    Leave Management
                  </p>
                </a>
                <a href="/hr/messages" className="p-4 rounded-lg text-center transition-all bg-white border border-gray-200 hover:border-green-300 hover:shadow-md">
                  <FiMessageSquare className="mx-auto text-xl text-green-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    Employee Messages
                  </p>
                </a>
                <a href="/hr/contracts" className="p-4 rounded-lg text-center transition-all bg-white border border-gray-200 hover:border-amber-300 hover:shadow-md">
                  <FaFileContract className="mx-auto text-xl text-amber-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    Contracts
                  </p>
                </a>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-900">
                <MdOutlineDashboard className="inline mr-2 text-blue-500" />
                Department Distribution
              </h3>
              <div className="space-y-3">
                {hrStats?.departmentDistribution?.map((dept, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{dept.name}</span>
                      <span className="text-gray-600">{dept.value} employees</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${dept.value}%`,
                          backgroundColor: dept.color 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'personal':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
                  <FiUser className="inline mr-2 text-blue-500" />
                  Basic Information
                </h3>
                <Input name="name" label="Full Name" value={profile.name} onChange={handleChange} required />
                <Input name="fatherName" label="Father's Name" value={profile.fatherName} onChange={handleChange} />
                <Input name="email" label="Email" value={profile.email} disabled />
                <Input name="phone" label="Phone" value={profile.phone} onChange={handleChange} />
                <Input name="alternatePhone" label="Alternate Phone" value={profile.alternatePhone} onChange={handleChange} />
                <Input name="idCardNumber" label="CNIC Number" value={profile.idCardNumber} onChange={handleChange} />
                <Input type="date" name="idCardIssueDate" label="CNIC Issue Date" value={profile.idCardIssueDate} onChange={handleChange} />
                <Input type="date" name="idCardExpiryDate" label="CNIC Expiry Date" value={profile.idCardExpiryDate} onChange={handleChange} />
                <Input type="date" name="dateOfBirth" label="Date of Birth" value={profile.dateOfBirth} onChange={handleChange} />
                <Select name="gender" label="Gender" value={profile.gender} onChange={handleChange} options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ]} />
                <Select name="bloodGroup" label="Blood Group" value={profile.bloodGroup} onChange={handleChange} options={[
                  { value: '', label: 'Select' },
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' }
                ]} />
                <Select name="maritalStatus" label="Marital Status" value={profile.maritalStatus} onChange={handleChange} options={[
                  { value: 'single', label: 'Single' },
                  { value: 'married', label: 'Married' },
                  { value: 'divorced', label: 'Divorced' },
                  { value: 'widowed', label: 'Widowed' }
                ]} />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
                  <FaUserTie className="inline mr-2 text-blue-500" />
                  HR Employment Information
                </h3>
                <Input name="employeeId" label="Employee ID" value={profile.employeeId} disabled />
                <Input name="department" label="Department" value={profile.department} onChange={handleChange} disabled />
                <Input name="position" label="Position" value={profile.position} onChange={handleChange} />
                <Input type="date" name="joiningDate" label="Joining Date" value={profile.joiningDate} onChange={handleChange} />
                <Select name="employeeType" label="Employee Type" value={profile.employeeType} onChange={handleChange} options={[
                  { value: 'permanent', label: 'Permanent' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'probation', label: 'Probation' }
                ]} />
                <Select name="hrSpecialization" label="HR Specialization" value={profile.hrSpecialization} onChange={handleChange} options={[
                  { value: 'general', label: 'General HR' },
                  { value: 'recruitment', label: 'Recruitment' },
                  { value: 'payroll', label: 'Payroll' },
                  { value: 'training', label: 'Training & Development' },
                  { value: 'employee-relations', label: 'Employee Relations' },
                  { value: 'compensation', label: 'Compensation & Benefits' }
                ]} />
                <Input name="hrExperience" label="HR Experience (Years)" value={profile.hrExperience} onChange={handleChange} type="number" />
                <Input name="employeeCountManaged" label="Employees Managed" value={profile.employeeCountManaged} onChange={handleChange} type="number" />
                <Input name="reportingManager" label="Reporting Manager" value={profile.reportingManager} onChange={handleChange} />
                <Input name="role" label="System Role" value={profile.role} disabled />
              </div>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiMapPin className="inline mr-2 text-blue-500" />
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextArea name="presentAddress" label="Present Address" value={profile.presentAddress} onChange={handleChange} rows={3} />
                <TextArea name="permanentAddress" label="Permanent Address" value={profile.permanentAddress} onChange={handleChange} rows={3} />
                <Input name="city" label="City" value={profile.city} onChange={handleChange} />
                <Input name="state" label="State/Province" value={profile.state} onChange={handleChange} />
                <Input name="country" label="Country" value={profile.country} onChange={handleChange} />
                <Input name="postalCode" label="Postal Code" value={profile.postalCode} onChange={handleChange} />
              </div>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiUsers className="inline mr-2 text-blue-500" />
                Emergency Contacts
              </h3>
              {profile.emergencyContacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                      value={contact.name}
                      onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'name', e.target.value)}
                      label="Contact Name"
                    />
                    <Input 
                      value={contact.phone}
                      onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'phone', e.target.value)}
                      label="Phone Number"
                    />
                    <Select 
                      value={contact.relation}
                      onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'relation', e.target.value)}
                      label="Relationship"
                      options={[
                        { value: 'parent', label: 'Parent' },
                        { value: 'spouse', label: 'Spouse' },
                        { value: 'sibling', label: 'Sibling' },
                        { value: 'friend', label: 'Friend' },
                        { value: 'other', label: 'Other' }
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEmergencyContact(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEmergencyContact}
                className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded-lg transition-all"
              >
                + Add Emergency Contact
              </button>
            </div>
          </div>
        );

      case 'hr-settings':
        return (
          <div className="space-y-6">
            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiShield className="inline mr-2 text-purple-500" />
                HR System Access Permissions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Checkbox 
                  name="payrollAccess" 
                  label="Payroll Access" 
                  checked={profile.payrollAccess} 
                  onChange={handleChange} 
                />
                <Checkbox 
                  name="recruitmentAccess" 
                  label="Recruitment Access" 
                  checked={profile.recruitmentAccess} 
                  onChange={handleChange} 
                />
                <Checkbox 
                  name="leaveManagementAccess" 
                  label="Leave Management Access" 
                  checked={profile.leaveManagementAccess} 
                  onChange={handleChange} 
                />
                <Checkbox 
                  name="contractManagementAccess" 
                  label="Contract Management Access" 
                  checked={profile.contractManagementAccess} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiNotification className="inline mr-2 text-blue-500" />
                HR Notification Preferences
              </h3>
              <div className="space-y-3">
                <Checkbox 
                  label="Email Notifications" 
                  checked={profile.notificationPreferences.email} 
                  onChange={(e) => handleNotificationChange('email', e.target.checked)} 
                />
                <Checkbox 
                  label="Push Notifications" 
                  checked={profile.notificationPreferences.push} 
                  onChange={(e) => handleNotificationChange('push', e.target.checked)} 
                />
                <Checkbox 
                  label="SMS Notifications" 
                  checked={profile.notificationPreferences.sms} 
                  onChange={(e) => handleNotificationChange('sms', e.target.checked)} 
                />
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <p className="text-xs font-medium mb-2 text-gray-700">
                    HR Specific Notifications
                  </p>
                  <Checkbox 
                    label="Leave Request Alerts" 
                    checked={profile.notificationPreferences.leaveRequests} 
                    onChange={(e) => handleNotificationChange('leaveRequests', e.target.checked)} 
                  />
                  <Checkbox 
                    label="Recruitment Updates" 
                    checked={profile.notificationPreferences.recruitmentUpdates} 
                    onChange={(e) => handleNotificationChange('recruitmentUpdates', e.target.checked)} 
                  />
                  <Checkbox 
                    label="Employee Onboarding" 
                    checked={profile.notificationPreferences.employeeOnboarding} 
                    onChange={(e) => handleNotificationChange('employeeOnboarding', e.target.checked)} 
                  />
                  <Checkbox 
                    label="Contract Expiry Alerts" 
                    checked={profile.notificationPreferences.contractExpiry} 
                    onChange={(e) => handleNotificationChange('contractExpiry', e.target.checked)} 
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-green-50 border border-green-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiCreditCard className="inline mr-2 text-green-500" />
                Bank Account Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="bankName" label="Bank Name" value={profile.bankName} onChange={handleChange} />
                <Input name="bankAccountNumber" label="Account Number" value={profile.bankAccountNumber} onChange={handleChange} />
                <Input name="bankAccountTitle" label="Account Title" value={profile.bankAccountTitle} onChange={handleChange} />
                <Input name="bankBranchCode" label="Branch Code" value={profile.bankBranchCode} onChange={handleChange} />
                <Input name="ibanNumber" label="IBAN Number" value={profile.ibanNumber} onChange={handleChange} />
              </div>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-amber-50 border border-amber-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiDollarSign className="inline mr-2 text-amber-500" />
                Compensation Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="salary" label="Basic Salary" value={profile.salary} onChange={handleChange} type="number" />
                <Input name="fuelAllowance" label="Fuel Allowance" value={profile.fuelAllowance} onChange={handleChange} type="number" />
                <Input name="medicalAllowance" label="Medical Allowance" value={profile.medicalAllowance} onChange={handleChange} type="number" />
                <Input name="specialAllowance" label="Special Allowance" value={profile.specialAllowance} onChange={handleChange} type="number" />
                <Select name="currency" label="Currency" value={profile.currency} onChange={handleChange} options={[
                  { value: 'PKR', label: 'PKR' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' }
                ]} />
                <Select name="salaryFrequency" label="Salary Frequency" value={profile.salaryFrequency} onChange={handleChange} options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'biweekly', label: 'Bi-Weekly' },
                  { value: 'weekly', label: 'Weekly' }
                ]} />
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6">
            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FaGraduationCap className="inline mr-2 text-purple-500" />
                Qualifications & Certifications
              </h3>
              <TextArea name="qualifications" label="Qualifications" value={profile.qualifications} onChange={handleChange} rows={3} />
              <Input name="previousExperience" label="Previous Experience (Years)" value={profile.previousExperience} onChange={handleChange} type="number" />
              
              <div className="mt-6">
                <h4 className="text-xs font-medium mb-3 text-gray-700">
                  HR Certifications
                </h4>
                {profile.certifications.map((cert, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3 relative bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input 
                        value={cert.name}
                        onChange={(e) => handleArrayFieldChange('certifications', index, 'name', e.target.value)}
                        label="Certification Name"
                      />
                      <Input 
                        value={cert.issuer}
                        onChange={(e) => handleArrayFieldChange('certifications', index, 'issuer', e.target.value)}
                        label="Issuing Organization"
                      />
                      <Input 
                        type="date"
                        value={cert.date}
                        onChange={(e) => handleArrayFieldChange('certifications', index, 'date', e.target.value)}
                        label="Issue Date"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCertification}
                  className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded-lg transition-all"
                >
                  + Add Certification
                </button>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiBook className="inline mr-2 text-blue-500" />
                Work Experience
              </h3>
              {profile.experiences.map((exp, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      value={exp.company}
                      onChange={(e) => handleArrayFieldChange('experiences', index, 'company', e.target.value)}
                      label="Company"
                    />
                    <Input 
                      value={exp.position}
                      onChange={(e) => handleArrayFieldChange('experiences', index, 'position', e.target.value)}
                      label="Position"
                    />
                    <Input 
                      value={exp.duration}
                      onChange={(e) => handleArrayFieldChange('experiences', index, 'duration', e.target.value)}
                      label="Duration"
                    />
                    <Input 
                      value={exp.description}
                      onChange={(e) => handleArrayFieldChange('experiences', index, 'description', e.target.value)}
                      label="Description"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExperience(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addExperience}
                className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded-lg transition-all"
              >
                + Add Work Experience
              </button>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-green-50 border border-green-100 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiAward className="inline mr-2 text-green-500" />
                Skills
              </h3>
              {profile.skills.map((skill, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      value={skill.name}
                      onChange={(e) => handleArrayFieldChange('skills', index, 'name', e.target.value)}
                      label="Skill Name"
                    />
                    <Select 
                      value={skill.level}
                      onChange={(e) => handleArrayFieldChange('skills', index, 'level', e.target.value)}
                      label="Skill Level"
                      options={[
                        { value: 'beginner', label: 'Beginner' },
                        { value: 'intermediate', label: 'Intermediate' },
                        { value: 'advanced', label: 'Advanced' },
                        { value: 'expert', label: 'Expert' }
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSkill}
                className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded-lg transition-all"
              >
                + Add Skill
              </button>
            </div>

            <div className="rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">
                <FiEye className="inline mr-2 text-gray-500" />
                Visibility Settings
              </h3>
              <div className="space-y-3">
                <Checkbox 
                  name="isActive" 
                  label="Profile Active" 
                  checked={profile.isActive} 
                  onChange={handleChange} 
                />
                <Checkbox 
                  name="hasSystemAccess" 
                  label="System Access" 
                  checked={profile.hasSystemAccess} 
                  onChange={handleChange} 
                />
                <Checkbox 
                  name="twoFactorEnabled" 
                  label="Two-Factor Authentication" 
                  checked={profile.twoFactorEnabled} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && !profile.name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-all duration-500 bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse bg-blue-100/20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 bg-purple-100/20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                <FaUserTie className="inline mr-3 text-blue-600" />
                HR Profile
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Human Resources management dashboard and profile settings
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-700 hover:to-purple-600 disabled:opacity-50 text-white rounded-lg transition-all duration-300 text-sm flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Save HR Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <div className="rounded-xl overflow-hidden bg-white shadow-lg border border-gray-200">
              {/* Profile Header */}
              <div className="relative">
                <div className="h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <div className="absolute -bottom-8 left-4">
                  <div className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                    {profile.name?.charAt(0)?.toUpperCase() || 'H'}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="pt-10 px-4 pb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {profile.name}
                </h2>
                <p className="text-sm text-gray-600">
                  {profile.position} • {profile.department}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <FiMail className="text-gray-500" size={14} />
                    <span className="text-xs text-gray-600">
                      {profile.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiPhone className="text-gray-500" size={14} />
                    <span className="text-xs text-gray-600">
                      {profile.phone || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaUserTie className="text-gray-500" size={14} />
                    <span className="text-xs text-gray-600">
                      {profile.employeeId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {hrStats?.totalEmployees || 0}
                    </p>
                    <p className="text-xs text-gray-600">
                      Employees
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {hrStats?.pendingLeaves || 0}
                    </p>
                    <p className="text-xs text-gray-600">
                      Pending
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="rounded-xl p-4 mt-6 bg-white shadow-lg border border-gray-200">
              <div className="space-y-1">
                <TabButton 
                  tab="overview" 
                  label="HR Dashboard" 
                  icon={<MdOutlineDashboard />} 
                />
                <TabButton 
                  tab="personal" 
                  label="Personal Info" 
                  icon={<FiUser />} 
                />
                <TabButton 
                  tab="hr-settings" 
                  label="HR Settings" 
                  icon={<FiSettings />} 
                />
                <TabButton 
                  tab="documents" 
                  label="Documents & Skills" 
                  icon={<HiOutlineDocumentDuplicate />} 
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="rounded-xl p-6 bg-white shadow-lg border border-gray-200">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRProfile;