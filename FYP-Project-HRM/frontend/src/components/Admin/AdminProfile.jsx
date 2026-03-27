import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiMail, FiPhone, FiCalendar, FiBriefcase,
  FiDollarSign, FiLock, FiSave, FiEdit, FiShield,
  FiGlobe, FiBell, FiSettings, FiDatabase, FiActivity,
  FiBarChart2, FiUsers, FiCheckCircle, FiAlertCircle,
  FiTrendingUp, FiKey, FiRefreshCw, FiShieldOff,
  FiMapPin, FiCreditCard, FiBook, FiStar, FiHome,
  FiDroplet, FiHeart, FiFileText, FiAward
} from 'react-icons/fi';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import axiosInstance from '../../utils/axiosInstance';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    
    // EMPLOYMENT INFORMATION
    employeeId: '',
    employeeType: 'permanent',
    employmentStatus: 'active',
    role: 'administrator',
    department: 'IT & Administration',
    position: 'System Administrator',
    joiningDate: '',
    probationPeriod: '3',
    reportingManager: '',
    systemRole: 'administrator',
    
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
      sms: false
    }
  });

  const [systemStats, setSystemStats] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [error, setError] = useState('');

  // Fetch admin profile data
  useEffect(() => {
    fetchAdminProfile();
    fetchSystemStats();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching admin profile...');
      
      // Try multiple endpoints
      const endpoints = [
        '/admin/profile',
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
        
        setProfile({
          // Basic Information
          name: profileData.name || 'Admin User',
          fatherName: profileData.fatherName || '',
          email: profileData.email || 'admin@company.com',
          phone: profileData.phone || '+1 (555) 123-4567',
          alternatePhone: profileData.alternatePhone || '',
          idCardNumber: profileData.idCardNumber || '',
          idCardIssueDate: formatDate(profileData.idCardIssueDate),
          idCardExpiryDate: formatDate(profileData.idCardExpiryDate),
          dateOfBirth: formatDate(profileData.dateOfBirth),
          gender: profileData.gender || 'male',
          bloodGroup: profileData.bloodGroup || '',
          maritalStatus: profileData.maritalStatus || 'single',
          
          // Employment Information
          employeeId: profileData.employeeId || 'ADM2024001',
          employeeType: profileData.employeeType || 'permanent',
          employmentStatus: profileData.employmentStatus || 'active',
          role: profileData.role || 'administrator',
          department: profileData.department || 'IT & Administration',
          position: profileData.position || 'System Administrator',
          joiningDate: formatDate(profileData.joiningDate),
          probationPeriod: profileData.probationPeriod || '3',
          reportingManager: profileData.reportingManager || '',
          systemRole: profileData.systemRole || 'administrator',
          
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
            sms: false
          }
        });
        
        console.log('📋 Admin profile loaded successfully');
      } else {
        console.log('⚠️ Using fallback admin data');
      }
    } catch (error) {
      console.error('❌ Error fetching admin profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await axiosInstance.get('/admin/system-stats');
      if (response.data.success) {
        setSystemStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
      // Fallback data
      setSystemStats({
        totalUsers: 245,
        activeSessions: 12,
        uptime: '99.8%',
        dbSize: '2.4 GB',
        userChange: '+12%',
        sessionChange: '-3',
        departments: [
          { name: 'Engineering', value: 65, color: '#3B82F6' },
          { name: 'Sales', value: 40, color: '#10B981' },
          { name: 'Marketing', value: 35, color: '#8B5CF6' },
          { name: 'HR', value: 25, color: '#F59E0B' }
        ]
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayFieldChange = (field, index, subField, value) => {
    setProfile(prev => {
      const newArray = [...prev[field]];
      newArray[index] = { ...newArray[index], [subField]: value };
      return { ...prev, [field]: newArray };
    });
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

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    
    try {
      console.log('💾 Saving admin profile...');
      
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
        previousExperience: parseFloat(profile.previousExperience) || 0,
        
        // Profile
        profilePicture: profile.profilePicture,
        
        // Employment Information (admin can update these)
        department: profile.department,
        position: profile.position,
        employeeType: profile.employeeType,
        reportingManager: profile.reportingManager,
        
        // Security
        twoFactorEnabled: profile.twoFactorEnabled,
        
        // Notifications
        notificationPreferences: profile.notificationPreferences
      };
      
      console.log('📤 Data being sent for update:', dataToSave);
      
      // Try admin-specific endpoint first
      try {
        const res = await axiosInstance.put('/admin/profile', dataToSave);
        
        if (res.data.success) {
          alert('✅ Admin profile updated successfully!');
          console.log('✅ Profile update response:', res.data);
          fetchAdminProfile(); // Refresh data
        } else {
          throw new Error(res.data.error || 'Update failed');
        }
      } catch (updateError) {
        console.log('❌ Admin endpoint failed, trying employee endpoint:', updateError);
        
        // Try alternative endpoint
        const res = await axiosInstance.put('/employees/profile/me', dataToSave);
        if (res.data.success) {
          alert('✅ Profile updated via alternative endpoint!');
          fetchAdminProfile();
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

  const handleToggle2FA = async () => {
    try {
      const response = await axiosInstance.post('/admin/toggle-2fa');
      if (response.data.success) {
        setProfile(prev => ({
          ...prev,
          twoFactorEnabled: response.data.twoFactorEnabled
        }));
        alert(response.data.message);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update 2FA settings');
    }
  };

  const handleUpdateNotifications = async () => {
    try {
      const response = await axiosInstance.put('/admin/notifications', {
        preferences: profile.notificationPreferences
      });
      if (response.data.success) {
        alert('Notification preferences updated!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update notifications');
    }
  };

  const handleRunBackup = async () => {
    if (!confirm('Are you sure you want to run a system backup?')) return;

    try {
      const response = await axiosInstance.post('/admin/backup');
      if (response.data.success) {
        alert('Backup started successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Backup failed');
    }
  };

  // Sample chart data
  const userActivityData = [
    { name: 'Mon', active: 210, new: 5 },
    { name: 'Tue', active: 220, new: 8 },
    { name: 'Wed', active: 215, new: 3 },
    { name: 'Thu', active: 230, new: 12 },
    { name: 'Fri', active: 200, new: 7 },
    { name: 'Sat', active: 150, new: 2 },
    { name: 'Sun', active: 120, new: 1 }
  ];

  const departmentDistribution = systemStats?.departments || [
    { name: 'Engineering', value: 65, color: '#3B82F6' },
    { name: 'Sales', value: 40, color: '#10B981' },
    { name: 'Marketing', value: 35, color: '#8B5CF6' },
    { name: 'HR', value: 25, color: '#F59E0B' }
  ];

  const StatCard = ({ title, value, icon, color, change, loading }) => (
    <div className={`rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
        : 'bg-white border border-gray-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} text-white`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            change.startsWith('+') 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div>
        <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {title}
        </p>
        {loading ? (
          <div className="h-6 w-20 bg-gray-700 rounded animate-pulse"></div>
        ) : (
          <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
          ? darkMode 
            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
          : darkMode
            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const Input = ({ label, name, value, onChange, disabled = false, type = 'text', required = false }) => (
    <div className="space-y-2">
      <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
          darkMode
            ? disabled
              ? 'bg-gray-800/50 border-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            : disabled
              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`}
      />
    </div>
  );

  const Select = ({ label, name, value, onChange, options, disabled = false }) => (
    <div className="space-y-2">
      <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg transition-all ${
          darkMode
            ? disabled
              ? 'bg-gray-800/50 border-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            : disabled
              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
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
      <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </label>
      <textarea
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3 py-2 text-sm rounded-lg transition-all ${
          darkMode
            ? disabled
              ? 'bg-gray-800/50 border-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            : disabled
              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`}
      />
    </div>
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
                title="Total Users"
                value={systemStats?.totalUsers || 0}
                icon={<FiUsers />}
                color="bg-gradient-to-br from-blue-500 to-cyan-500"
                change={systemStats?.userChange || "+0%"}
                loading={!systemStats}
              />
              <StatCard
                title="Active Sessions"
                value={systemStats?.activeSessions || 0}
                icon={<FiActivity />}
                color="bg-gradient-to-br from-green-500 to-emerald-500"
                change={systemStats?.sessionChange || "-0"}
                loading={!systemStats}
              />
              <StatCard
                title="System Uptime"
                value={systemStats?.uptime || '0%'}
                icon={<FiCheckCircle />}
                color="bg-gradient-to-br from-purple-500 to-pink-500"
                loading={!systemStats}
              />
              <StatCard
                title="Database Size"
                value={systemStats?.dbSize || '0 MB'}
                icon={<FiDatabase />}
                color="bg-gradient-to-br from-amber-500 to-orange-500"
                loading={!systemStats}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-xl p-4 ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
              }`}>
                <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  User Activity (Last 7 Days)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                      <XAxis 
                        dataKey="name" 
                        stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                        fontSize={12}
                      />
                      <YAxis 
                        stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: darkMode ? '#1F2937' : 'white',
                          border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Bar 
                        dataKey="active" 
                        name="Active Users" 
                        fill="#3B82F6" 
                        radius={[2, 2, 0, 0]}
                      />
                      <Bar 
                        dataKey="new" 
                        name="New Users" 
                        fill="#10B981" 
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`rounded-xl p-4 ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
              }`}>
                <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Department Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: darkMode ? '#1F2937' : 'white',
                          border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                          borderRadius: '0.5rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      case 'personal':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiUser className="inline mr-2" />
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
                <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiBriefcase className="inline mr-2" />
                  Employment Information
                </h3>
                <Input name="employeeId" label="Employee ID" value={profile.employeeId} disabled />
                <Input name="department" label="Department" value={profile.department} onChange={handleChange} />
                <Input name="position" label="Position" value={profile.position} onChange={handleChange} />
                <Input type="date" name="joiningDate" label="Joining Date" value={profile.joiningDate} onChange={handleChange} />
                <Select name="employeeType" label="Employee Type" value={profile.employeeType} onChange={handleChange} options={[
                  { value: 'permanent', label: 'Permanent' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'probation', label: 'Probation' },
                  { value: 'intern', label: 'Intern' }
                ]} />
                <Select name="employmentStatus" label="Status" value={profile.employmentStatus} onChange={handleChange} options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'on-leave', label: 'On Leave' },
                  { value: 'terminated', label: 'Terminated' }
                ]} />
                <Input name="probationPeriod" label="Probation Period" value={profile.probationPeriod} onChange={handleChange} />
                <Input name="reportingManager" label="Reporting Manager" value={profile.reportingManager} onChange={handleChange} />
                <Input name="role" label="System Role" value={profile.role} disabled />
              </div>
            </div>

            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <FiMapPin className="inline mr-2" />
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

            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <FiCreditCard className="inline mr-2" />
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
          </div>
        );

      case 'emergency':
        return (
          <div className="space-y-6">
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <FiUsers className="inline mr-2" />
                Emergency Contacts
              </h3>
              <div className="space-y-4">
                {profile.emergencyContacts.map((contact, index) => (
                  <div key={index} className={`border rounded-lg p-4 relative ${
                    darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input 
                        value={contact.name}
                        onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'name', e.target.value)}
                        label="Contact Name"
                      />
                      <Input 
                        value={contact.phone}
                        onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'phone', e.target.value)}
                        label="Contact Phone"
                      />
                      <Select 
                        value={contact.relation}
                        onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'relation', e.target.value)}
                        label="Relationship"
                        options={[
                          { value: 'parent', label: 'Parent' },
                          { value: 'spouse', label: 'Spouse' },
                          { value: 'sibling', label: 'Sibling' },
                          { value: 'child', label: 'Child' },
                          { value: 'friend', label: 'Friend' }
                        ]}
                      />
                    </div>
                    {profile.emergencyContacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmergencyContact(index)}
                        className={`absolute top-2 right-2 ${
                          darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
                        }`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className={`w-full py-3 border-2 border-dashed rounded-lg transition-all ${
                    darkMode 
                      ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600' 
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
                  }`}
                >
                  + Add Emergency Contact
                </button>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <FiAward className="inline mr-2" />
                Skills
              </h3>
              <div className="space-y-4">
                {profile.skills.map((skill, index) => (
                  <div key={index} className={`border rounded-lg p-4 relative ${
                    darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                  }`}>
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
                      className={`absolute top-2 right-2 ${
                        darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSkill}
                  className={`w-full py-3 border-2 border-dashed rounded-lg transition-all ${
                    darkMode 
                      ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600' 
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
                  }`}
                >
                  + Add Skill
                </button>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <FiBook className="inline mr-2" />
                Qualifications & Experience
              </h3>
              <div className="space-y-4">
                <TextArea name="qualifications" label="Qualifications" value={profile.qualifications} onChange={handleChange} rows={3} />
                <Input name="previousExperience" label="Previous Experience (Years)" value={profile.previousExperience} onChange={handleChange} type="number" />
                
                <h4 className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-6 mb-3`}>
                  Work Experiences
                </h4>
                {profile.experiences.map((exp, index) => (
                  <div key={index} className={`border rounded-lg p-4 relative ${
                    darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                  }`}>
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
                      className={`absolute top-2 right-2 ${
                        darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addExperience}
                  className={`w-full py-3 border-2 border-dashed rounded-lg transition-all ${
                    darkMode 
                      ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600' 
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
                  }`}
                >
                  + Add Work Experience
                </button>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Two-Factor Authentication
                  </h4>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Add an extra layer of security to your account
                  </p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    profile.twoFactorEnabled
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {profile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>
              <div className={`text-xs p-3 rounded-lg mt-3 ${
                profile.twoFactorEnabled
                  ? darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-800'
                  : darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-800'
              }`}>
                {profile.twoFactorEnabled
                  ? '✅ Two-factor authentication is enabled for your account.'
                  : '⚠️ Two-factor authentication is not enabled. Enable it for enhanced security.'}
              </div>
            </div>

            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h4 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Change Password
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current Password</label>
                  <input
                    type="password"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${
                      darkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>New Password</label>
                  <input
                    type="password"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${
                      darkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Confirm New Password</label>
                  <input
                    type="password"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${
                      darkMode 
                        ? 'bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg transition-all duration-300 text-sm"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiGlobe className="inline mr-2" />
                Theme Settings
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDarkMode(false)}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
                    !darkMode
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-white"></div>
                  <span className={`text-xs font-medium ${!darkMode ? 'text-blue-600' : 'text-gray-400'}`}>
                    Light
                  </span>
                </button>
                <button
                  onClick={() => setDarkMode(true)}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
                    darkMode
                      ? 'border-blue-500 bg-gray-800'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black"></div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-blue-400' : 'text-gray-600'}`}>
                    Dark
                  </span>
                </button>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiBell className="inline mr-2" />
                Notification Preferences
              </h3>
              <div className="space-y-2">
                {Object.entries(profile.notificationPreferences).map(([type, enabled]) => (
                  <div key={type} className={`flex items-center justify-between p-3 rounded-lg ${
                    darkMode ? 'bg-gray-800/30' : 'bg-gray-50'
                  }`}>
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {type.charAt(0).toUpperCase() + type.slice(1)} Notifications
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            [type]: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className={`w-10 h-5 rounded-full peer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} peer-checked:bg-green-500 peer-focus:ring-2 peer-focus:ring-green-500/20 transition-colors`}>
                        <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-4 w-4 transition-transform ${enabled ? 'translate-x-full' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpdateNotifications}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white rounded-lg transition-all duration-300 text-sm"
              >
                Save Notification Preferences
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && !profile.name) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
    }`}>
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse ${
          darkMode ? 'bg-blue-500/10' : 'bg-blue-200/20'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 ${
          darkMode ? 'bg-cyan-500/10' : 'bg-cyan-200/20'
        }`}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Admin Profile
              </h1>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                System administrator dashboard and profile management
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 disabled:opacity-50 text-white rounded-lg transition-all duration-300 text-sm flex items-center gap-2"
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
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <div className={`rounded-xl overflow-hidden ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-lg'
            }`}>
              {/* Profile Header */}
              <div className="relative">
                <div className="h-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>
                <div className="absolute -bottom-8 left-4">
                  <div className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {profile.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="pt-10 px-4 pb-4">
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {profile.name}
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {profile.position}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <FiMail className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={14} />
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {profile.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiPhone className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={14} />
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {profile.phone || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiBriefcase className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={14} />
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {profile.employeeId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className={`border-t px-4 py-3 ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {systemStats?.totalUsers || 0}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Users
                    </p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {systemStats?.activeSessions || 0}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className={`rounded-xl p-4 mt-6 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-lg'
            }`}>
              <div className="space-y-1">
                <TabButton 
                  tab="overview" 
                  label="Dashboard" 
                  icon={<FiBarChart2 />} 
                />
                <TabButton 
                  tab="personal" 
                  label="Personal Info" 
                  icon={<FiUser />} 
                />
                <TabButton 
                  tab="emergency" 
                  label="Contacts & Skills" 
                  icon={<FiUsers />} 
                />
                <TabButton 
                  tab="security" 
                  label="Security" 
                  icon={<FiShield />} 
                />
                <TabButton 
                  tab="preferences" 
                  label="Preferences" 
                  icon={<FiSettings />} 
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className={`rounded-xl p-6 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-lg'
            }`}>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;