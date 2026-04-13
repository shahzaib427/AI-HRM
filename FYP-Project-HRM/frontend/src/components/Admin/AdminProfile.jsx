import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
    role: 'admin',
    department: 'IT & Administration',
    position: 'System Administrator',
    joiningDate: '',
    probationPeriod: '3',
    reportingManager: '',
    systemRole: 'admin',
    
    // ADDRESS INFORMATION
    presentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
    
    // EMERGENCY CONTACTS
    emergencyContacts: [{ name: '', phone: '', relation: 'parent' }],
    
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

  // Fetch admin profile data
  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching admin profile...');
      
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
        const formatDate = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };
        
        let emergencyContacts = [];
        if (profileData.emergencyContacts && Array.isArray(profileData.emergencyContacts)) {
          emergencyContacts = profileData.emergencyContacts;
        }
        
        let experiences = [];
        if (profileData.experiences && Array.isArray(profileData.experiences)) {
          experiences = profileData.experiences;
        }
        
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
          phone: profileData.phone || '',
          alternatePhone: profileData.alternatePhone || '',
          idCardNumber: profileData.idCardNumber || '',
          idCardIssueDate: formatDate(profileData.idCardIssueDate),
          idCardExpiryDate: formatDate(profileData.idCardExpiryDate),
          dateOfBirth: formatDate(profileData.dateOfBirth),
          gender: profileData.gender || 'male',
          bloodGroup: profileData.bloodGroup || '',
          maritalStatus: profileData.maritalStatus || 'single',
          
          // Employment Information
          employeeId: profileData.employeeId || 'ADM001',
          employeeType: profileData.employeeType || 'permanent',
          employmentStatus: profileData.employmentStatus || 'active',
          role: profileData.role || 'admin',
          department: profileData.department || 'IT & Administration',
          position: profileData.position || 'System Administrator',
          joiningDate: formatDate(profileData.joiningDate),
          probationPeriod: profileData.probationPeriod || '3',
          reportingManager: profileData.reportingManager || '',
          systemRole: profileData.systemRole || 'admin',
          
          // Address Information
          presentAddress: profileData.presentAddress || '',
          permanentAddress: profileData.permanentAddress || '',
          city: profileData.city || '',
          state: profileData.state || '',
          country: profileData.country || 'Pakistan',
          postalCode: profileData.postalCode || '',
          
          // Emergency Contacts
          emergencyContacts,
          
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
      }
    } catch (error) {
      console.error('❌ Error fetching admin profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
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
        presentAddress: profile.presentAddress,
        permanentAddress: profile.permanentAddress,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postalCode: profile.postalCode,
        emergencyContacts: profile.emergencyContacts.filter(contact => contact.name || contact.phone),
        bankName: profile.bankName,
        bankAccountNumber: profile.bankAccountNumber,
        bankAccountTitle: profile.bankAccountTitle,
        bankBranchCode: profile.bankBranchCode,
        ibanNumber: profile.ibanNumber,
        qualifications: profile.qualifications,
        experiences: profile.experiences.filter(exp => exp.company || exp.position),
        skills: profile.skills.filter(skill => skill.name),
        previousExperience: parseFloat(profile.previousExperience) || 0,
        profilePicture: profile.profilePicture,
        department: profile.department,
        position: profile.position,
        employeeType: profile.employeeType,
        reportingManager: profile.reportingManager,
        twoFactorEnabled: profile.twoFactorEnabled,
        notificationPreferences: profile.notificationPreferences
      };
      
      try {
        const res = await axiosInstance.put('/admin/profile', dataToSave);
        if (res.data.success) {
          alert('✅ Admin profile updated successfully!');
          fetchAdminProfile();
        } else {
          throw new Error(res.data.error || 'Update failed');
        }
      } catch (updateError) {
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
        setProfile(prev => ({ ...prev, twoFactorEnabled: response.data.twoFactorEnabled }));
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Profile Error</h2>
            <p className="text-red-700 mb-6">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* HEADER */}
      <div className="bg-white shadow-xl rounded-2xl p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative">
            <img
              src={profile.profilePicture 
                ? (profile.profilePicture.startsWith('http') 
                    ? profile.profilePicture 
                    : `http://localhost:5000${profile.profilePicture}`)
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4f46e5&color=fff&size=200`}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 shadow-lg"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4f46e5&color=fff&size=200`;
              }}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900">{profile.name || 'Admin User'}</h1>
            <p className="text-xl text-indigo-600 font-semibold mt-1">
              {profile.position || 'System Administrator'} • {profile.department || 'IT & Administration'}
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="font-medium text-gray-900">{profile.employeeId || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{profile.email || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{profile.phone || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Joining Date</p>
                <p className="font-medium text-gray-900">{profile.joiningDate || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Employee Type</p>
                <p className="font-medium text-gray-900 capitalize">{profile.employeeType || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium text-green-600">{profile.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BASIC INFORMATION SECTION */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Full Name</label>
            <input
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Father's Name</label>
            <input
              name="fatherName"
              value={profile.fatherName}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Email</label>
            <input
              value={profile.email}
              disabled
              className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Phone</label>
            <input
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Alternate Phone</label>
            <input
              name="alternatePhone"
              value={profile.alternatePhone}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">CNIC Number</label>
            <input
              name="idCardNumber"
              value={profile.idCardNumber}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">CNIC Issue Date</label>
            <input
              type="date"
              name="idCardIssueDate"
              value={profile.idCardIssueDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">CNIC Expiry Date</label>
            <input
              type="date"
              name="idCardExpiryDate"
              value={profile.idCardExpiryDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={profile.dateOfBirth}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Gender</label>
            <select
              name="gender"
              value={profile.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Blood Group</label>
            <select
              name="bloodGroup"
              value={profile.bloodGroup}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Marital Status</label>
            <select
              name="maritalStatus"
              value={profile.maritalStatus}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
        </div>
      </div>

      {/* EMPLOYMENT INFORMATION */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Employment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Employee ID</label>
            <input value={profile.employeeId} disabled className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Department</label>
            <input name="department" value={profile.department} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Position</label>
            <input name="position" value={profile.position} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Joining Date</label>
            <input type="date" name="joiningDate" value={profile.joiningDate} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Employee Type</label>
            <select name="employeeType" value={profile.employeeType} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="probation">Probation</option>
              <option value="intern">Intern</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Status</label>
            <select name="employmentStatus" value={profile.employmentStatus} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on-leave">On Leave</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Probation Period (months)</label>
            <input name="probationPeriod" value={profile.probationPeriod} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Reporting Manager</label>
            <input name="reportingManager" value={profile.reportingManager} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">System Role</label>
            <input value={profile.role} disabled className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600" />
          </div>
        </div>
      </div>

      {/* ADDRESS INFORMATION */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-semibold text-gray-700">Present Address</label>
            <textarea name="presentAddress" value={profile.presentAddress} onChange={handleChange} rows={3} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"></textarea>
          </div>
          <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-semibold text-gray-700">Permanent Address</label>
            <textarea name="permanentAddress" value={profile.permanentAddress} onChange={handleChange} rows={3} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"></textarea>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">City</label>
            <input name="city" value={profile.city} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">State/Province</label>
            <input name="state" value={profile.state} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Country</label>
            <input name="country" value={profile.country} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Postal Code</label>
            <input name="postalCode" value={profile.postalCode} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>
      </div>

      {/* EMERGENCY CONTACTS */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Emergency Contacts</h3>
        <div className="space-y-4">
          {profile.emergencyContacts.map((contact, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Contact Name</label>
                  <input value={contact.name} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'name', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Contact Phone</label>
                  <input value={contact.phone} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'phone', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Relationship</label>
                  <select value={contact.relation} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'relation', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                    <option value="parent">Parent</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="child">Child</option>
                    <option value="friend">Friend</option>
                  </select>
                </div>
              </div>
              {profile.emergencyContacts.length > 1 && (
                <button type="button" onClick={() => removeEmergencyContact(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addEmergencyContact} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400">+ Add Emergency Contact</button>
        </div>
      </div>

      {/* BANK INFORMATION */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Bank Account Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Bank Name</label>
            <input name="bankName" value={profile.bankName} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Account Number</label>
            <input name="bankAccountNumber" value={profile.bankAccountNumber} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Account Title</label>
            <input name="bankAccountTitle" value={profile.bankAccountTitle} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Branch Code</label>
            <input name="bankBranchCode" value={profile.bankBranchCode} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">IBAN Number</label>
            <input name="ibanNumber" value={profile.ibanNumber} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>
      </div>

      {/* QUALIFICATIONS & EXPERIENCES */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Qualifications & Experience</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-semibold text-gray-700">Qualifications</label>
            <textarea name="qualifications" value={profile.qualifications} onChange={handleChange} rows={3} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"></textarea>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Previous Experience (Years)</label>
            <input type="number" name="previousExperience" value={profile.previousExperience} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <h4 className="font-medium text-gray-700 mb-3">Work Experiences</h4>
            {profile.experiences.map((exp, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Company</label>
                    <input value={exp.company} onChange={(e) => handleArrayFieldChange('experiences', index, 'company', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Position</label>
                    <input value={exp.position} onChange={(e) => handleArrayFieldChange('experiences', index, 'position', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Duration</label>
                    <input value={exp.duration} onChange={(e) => handleArrayFieldChange('experiences', index, 'duration', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Description</label>
                    <input value={exp.description} onChange={(e) => handleArrayFieldChange('experiences', index, 'description', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>
                <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800">✕</button>
              </div>
            ))}
            <button type="button" onClick={addExperience} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400">+ Add Work Experience</button>
          </div>
        </div>
      </div>

      {/* SKILLS */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Skills</h3>
        <div className="space-y-4">
          {profile.skills.map((skill, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Skill Name</label>
                  <input value={skill.name} onChange={(e) => handleArrayFieldChange('skills', index, 'name', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Skill Level</label>
                  <select value={skill.level} onChange={(e) => handleArrayFieldChange('skills', index, 'level', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => removeSkill(index)} className="absolute top-2 right-2 text-red-600 hover:text-red-800">✕</button>
            </div>
          ))}
          <button type="button" onClick={addSkill} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400">+ Add Skill</button>
        </div>
      </div>

      {/* SECURITY SETTINGS */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Security Settings</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
          <div>
            <p className="font-semibold text-gray-800">Two-Factor Authentication</p>
            <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
          </div>
          <button onClick={handleToggle2FA} className={`px-4 py-2 rounded-lg text-sm font-medium ${profile.twoFactorEnabled ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            {profile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </div>

      {/* NOTIFICATION PREFERENCES */}
      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Notification Preferences</h3>
        <div className="space-y-3">
          {Object.entries(profile.notificationPreferences).map(([type, enabled]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-800">{type.charAt(0).toUpperCase() + type.slice(1)} Notifications</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={enabled} onChange={(e) => setProfile(prev => ({ ...prev, notificationPreferences: { ...prev.notificationPreferences, [type]: e.target.checked } }))} className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 transition-colors">
                  <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-4 w-4 transition-transform ${enabled ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>
          ))}
          <button onClick={handleUpdateNotifications} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm">Save Notification Preferences</button>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="mt-12 pt-8 border-t border-gray-200 flex justify-center">
        <button onClick={handleSaveProfile} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-12 py-4 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-lg flex items-center">
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            '💾 Save Profile'
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminProfile;