import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { 
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaCalendarAlt, FaVenusMars, 
  FaTint, FaHeart, FaBriefcase, FaBuilding, FaMapMarkerAlt, FaCity, 
  FaGlobe, FaDollarSign, FaUniversity, FaGraduationCap, FaFileAlt, 
  FaCamera, FaSave, FaTimes, FaPlus, FaTrash, FaCheckCircle,
  FaExclamationTriangle, FaInfoCircle, FaUsers, FaUserTie,
  FaUserShield, FaUserGraduate, FaHandshake, FaBalanceScale,
  FaSpinner, FaUpload
} from 'react-icons/fa';
import { FiShield, FiLock, FiBell } from 'react-icons/fi';

// KPI Card Component
const KpiCard = ({ icon: Icon, label, value, sub, iconBg }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
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
    orange: 'bg-orange-50 text-orange-700'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

// Profile Picture Modal Component for HR
const HRProfilePictureModal = ({ isOpen, onClose, currentPhoto, onSave }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreview(currentPhoto);
      setError('');
    }
  }, [isOpen, currentPhoto]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('profilePicture', selectedFile);

    try {
      const response = await axiosInstance.post('/hr/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const photoUrl = response.data.data.profilePicture;
        onSave(photoUrl);
        onClose();
      } else {
        setError(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;

    setUploading(true);
    try {
      const response = await axiosInstance.delete('/hr/profile-picture');
      if (response.data.success) {
        onSave(null);
        onClose();
      } else {
        setError(response.data.message || 'Failed to remove profile picture');
      }
    } catch (err) {
      console.error('Remove error:', err);
      setError(err.response?.data?.message || 'Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Update Profile Picture</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">×</button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={preview || `https://ui-avatars.com/api/?name=HR&background=4f46e5&color=fff&size=200`}
                alt="Profile Preview"
                className="w-40 h-40 rounded-full object-cover border-4 border-indigo-100"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <FaCamera className="w-4 h-4" />
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <FaInfoCircle className="inline mr-1" />
              Supported formats: JPEG, PNG, GIF, WEBP. Max size: 5MB
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleRemove}
              disabled={uploading || !currentPhoto}
              className="flex-1 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Remove
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <FaSpinner className="animate-spin w-4 h-4" />
                  Uploading...
                </>
              ) : (
                <>
                  <FaUpload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HRProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hrStats, setHrStats] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [profile, setProfile] = useState({
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
    hrSpecialization: 'general',
    hrExperience: '',
    employeeCountManaged: '',
    payrollAccess: true,
    recruitmentAccess: true,
    leaveManagementAccess: true,
    contractManagementAccess: true,
    presentAddress: '',
    permanentAddress: '',
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
    currency: 'PKR',
    salaryFrequency: 'monthly',
    bankName: '',
    bankAccountNumber: '',
    bankAccountTitle: '',
    bankBranchCode: '',
    ibanNumber: '',
    qualifications: '',
    experiences: [{ company: '', position: '', duration: '', description: '' }],
    skills: [{ name: '', level: 'intermediate' }],
    previousExperience: '',
    certifications: [{ name: '', issuer: '', date: '' }],
    isActive: true,
    hasSystemAccess: true,
    profilePicture: '',
    twoFactorEnabled: false,
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

  useEffect(() => {
    fetchHRProfile();
    fetchHRStats();
  }, []);

  const fetchHRProfile = async () => {
    try {
      setLoading(true);
      
      const endpoints = [
        '/hr/profile',
        '/employees/profile/me',
        '/auth/profile',
        '/auth/me'
      ];
      
      let profileData = null;
      
      for (const endpoint of endpoints) {
        try {
          const response = await axiosInstance.get(endpoint);
          if (response.data.success) {
            profileData = response.data.data;
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (profileData) {
        const formatDate = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };
        
        setProfile({
          name: profileData.name || 'HR Manager',
          fatherName: profileData.fatherName || '',
          email: profileData.email || 'hr@company.com',
          phone: profileData.phone || '',
          alternatePhone: profileData.alternatePhone || '',
          idCardNumber: profileData.idCardNumber || '',
          idCardIssueDate: formatDate(profileData.idCardIssueDate),
          idCardExpiryDate: formatDate(profileData.idCardExpiryDate),
          dateOfBirth: formatDate(profileData.dateOfBirth),
          gender: profileData.gender || 'male',
          bloodGroup: profileData.bloodGroup || '',
          maritalStatus: profileData.maritalStatus || 'single',
          employeeId: profileData.employeeId || 'HR001',
          employeeType: profileData.employeeType || 'permanent',
          employmentStatus: profileData.employmentStatus || 'active',
          role: profileData.role || 'hr',
          department: profileData.department || 'Human Resources',
          position: profileData.position || 'HR Manager',
          joiningDate: formatDate(profileData.joiningDate),
          probationPeriod: profileData.probationPeriod || '3',
          reportingManager: profileData.reportingManager || '',
          systemRole: profileData.systemRole || 'hr',
          hrSpecialization: profileData.hrSpecialization || 'general',
          hrExperience: profileData.hrExperience || '5',
          employeeCountManaged: profileData.employeeCountManaged || '50',
          payrollAccess: profileData.payrollAccess !== undefined ? profileData.payrollAccess : true,
          recruitmentAccess: profileData.recruitmentAccess !== undefined ? profileData.recruitmentAccess : true,
          leaveManagementAccess: profileData.leaveManagementAccess !== undefined ? profileData.leaveManagementAccess : true,
          contractManagementAccess: profileData.contractManagementAccess !== undefined ? profileData.contractManagementAccess : true,
          presentAddress: profileData.presentAddress || '',
          permanentAddress: profileData.permanentAddress || '',
          city: profileData.city || '',
          state: profileData.state || '',
          country: profileData.country || 'Pakistan',
          postalCode: profileData.postalCode || '',
          emergencyContacts: profileData.emergencyContacts || [{ name: '', phone: '', relation: 'parent' }],
          salary: profileData.salary || '',
          fuelAllowance: profileData.fuelAllowance || '',
          medicalAllowance: profileData.medicalAllowance || '',
          specialAllowance: profileData.specialAllowance || '',
          otherAllowance: profileData.otherAllowance || '',
          currency: profileData.currency || 'PKR',
          salaryFrequency: profileData.salaryFrequency || 'monthly',
          bankName: profileData.bankName || '',
          bankAccountNumber: profileData.bankAccountNumber || '',
          bankAccountTitle: profileData.bankAccountTitle || '',
          bankBranchCode: profileData.bankBranchCode || '',
          ibanNumber: profileData.ibanNumber || '',
          qualifications: profileData.qualifications || '',
          experiences: profileData.experiences || [{ company: '', position: '', duration: '', description: '' }],
          skills: profileData.skills || [{ name: '', level: 'intermediate' }],
          previousExperience: profileData.previousExperience || '',
          certifications: profileData.certifications || [{ name: '', issuer: '', date: '' }],
          isActive: profileData.isActive !== undefined ? profileData.isActive : true,
          hasSystemAccess: profileData.hasSystemAccess !== undefined ? profileData.hasSystemAccess : true,
          profilePicture: profileData.profilePicture || profileData.avatar || '',
          twoFactorEnabled: profileData.twoFactorEnabled || false,
          notificationPreferences: profileData.notificationPreferences || {
            email: true, push: true, sms: false,
            leaveRequests: true, recruitmentUpdates: true,
            employeeOnboarding: true, contractExpiry: true
          }
        });
      }
    } catch (error) {
      console.error('Error fetching HR profile:', error);
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
      } else {
        setHrStats({
          totalEmployees: 245,
          activeRecruitments: 12,
          pendingLeaves: 8,
          contractsExpiring: 5,
          departmentsCount: 8
        });
      }
    } catch (error) {
      setHrStats({
        totalEmployees: 245,
        activeRecruitments: 12,
        pendingLeaves: 8,
        contractsExpiring: 5,
        departmentsCount: 8
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

  const handleProfilePictureUpdate = (newPhotoUrl) => {
    setProfile(prev => ({ ...prev, profilePicture: newPhotoUrl }));
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
        department: profile.department,
        position: profile.position,
        employeeType: profile.employeeType,
        reportingManager: profile.reportingManager,
        hrSpecialization: profile.hrSpecialization,
        hrExperience: profile.hrExperience,
        employeeCountManaged: profile.employeeCountManaged,
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
        certifications: profile.certifications.filter(cert => cert.name),
        previousExperience: parseFloat(profile.previousExperience) || 0,
        profilePicture: profile.profilePicture,
        payrollAccess: profile.payrollAccess,
        recruitmentAccess: profile.recruitmentAccess,
        leaveManagementAccess: profile.leaveManagementAccess,
        contractManagementAccess: profile.contractManagementAccess,
        twoFactorEnabled: profile.twoFactorEnabled,
        notificationPreferences: profile.notificationPreferences
      };
      
      try {
        const res = await axiosInstance.put('/hr/profile', dataToSave);
        if (res.data.success) {
          alert('✅ HR profile updated successfully!');
          fetchHRProfile();
        } else {
          throw new Error(res.data.error || 'Update failed');
        }
      } catch (updateError) {
        const res = await axiosInstance.put('/employees/profile/me', dataToSave);
        if (res.data.success) {
          alert('✅ Profile updated via alternative endpoint!');
          fetchHRProfile();
        } else {
          throw new Error('Both update endpoints failed');
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to update profile: ' + err.message);
      alert('❌ Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const SectionNav = ({ id, label, icon, active }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const Section = ({ id, title, children }) => (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden ${activeSection === id ? 'block' : 'hidden'}`}>
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const Input = ({ label, name, value, onChange, disabled = false, required = false, type = 'text', placeholder }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}{disabled && <span className="text-xs text-gray-400 ml-2">(Read-only)</span>}</label>
      <input type={type} name={name} value={value || ''} onChange={onChange} disabled={disabled} placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
          disabled ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'
        }`} />
    </div>
  );

  const Select = ({ label, name, value, onChange, options, disabled = false }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <select name={name} value={value || ''} onChange={onChange} disabled={disabled}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
          disabled ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'
        }`}>
        <option value="">Select {label}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  const TextArea = ({ label, name, value, onChange, rows = 3 }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <textarea name={name} value={value || ''} onChange={onChange} rows={rows}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none" />
    </div>
  );

  const Checkbox = ({ label, name, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  if (loading && !profile.name) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading HR profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaUserTie className="text-indigo-500 text-sm" />
                HR Profile
              </h1>
              <p className="text-sm text-gray-500 mt-1">Human Resources management dashboard and profile settings</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</> : <><FaSave className="w-4 h-4" /> Save Profile</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FaUsers} label="Total Employees" value={hrStats?.totalEmployees || 0} sub="Active staff" iconBg="bg-indigo-500" />
          <KpiCard icon={FaUserGraduate} label="Active Recruitments" value={hrStats?.activeRecruitments || 0} sub="Open positions" iconBg="bg-emerald-500" />
          <KpiCard icon={FaHeart} label="Pending Leaves" value={hrStats?.pendingLeaves || 0} sub="Awaiting approval" iconBg="bg-amber-500" />
          <KpiCard icon={FaFileAlt} label="Contracts Expiring" value={hrStats?.contractsExpiring || 0} sub="Within 30 days" iconBg="bg-red-500" />
        </div>

        {/* Profile Header with Picture Upload - NOW AT THE TOP like Employee Profile */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative group">
              <img
                src={profile.profilePicture 
                  ? (profile.profilePicture.startsWith('http') 
                      ? profile.profilePicture 
                      : `http://localhost:5000${profile.profilePicture}`)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'HR')}&background=4f46e5&color=fff&size=200`}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 shadow-lg"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'HR')}&background=4f46e5&color=fff&size=200`;
                }}
              />
              <button
                onClick={() => setShowPictureModal(true)}
                className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg hover:bg-indigo-700"
                title="Change Profile Picture"
              >
                <FaCamera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900">{profile.name || 'HR Manager'}</h1>
              <p className="text-xl text-indigo-600 font-semibold mt-1">
                {profile.position || 'HR Manager'} • {profile.department || 'Human Resources'}
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-sm text-gray-600">HR Since</p>
                  <p className="font-medium text-gray-900">{profile.joiningDate || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            <SectionNav id="overview" label="Overview" icon={<FaUsers className="w-4 h-4" />} active={activeSection === 'overview'} />
            <SectionNav id="personal" label="Personal Info" icon={<FaUser className="w-4 h-4" />} active={activeSection === 'personal'} />
            <SectionNav id="hr-settings" label="HR Settings" icon={<FiShield className="w-4 h-4" />} active={activeSection === 'hr-settings'} />
            <SectionNav id="documents" label="Documents & Skills" icon={<FaGraduationCap className="w-4 h-4" />} active={activeSection === 'documents'} />
          </div>
        </div>

        {/* Overview Section */}
        <Section id="overview" title="HR Dashboard Overview">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-indigo-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <a href="/hr/recruitment" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center"><FaUserGraduate className="text-indigo-600" /></div>
                  <div><p className="text-sm font-medium text-gray-800">Recruitment</p><p className="text-xs text-gray-400">Manage job postings</p></div>
                </a>
                <a href="/hr/leave" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><FaHeart className="text-emerald-600" /></div>
                  <div><p className="text-sm font-medium text-gray-800">Leave Management</p><p className="text-xs text-gray-400">Approve requests</p></div>
                </a>
                <a href="/hr/messages" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><FaEnvelope className="text-purple-600" /></div>
                  <div><p className="text-sm font-medium text-gray-800">Employee Messages</p><p className="text-xs text-gray-400">View communications</p></div>
                </a>
                <a href="/hr/contracts" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><FaFileAlt className="text-amber-600" /></div>
                  <div><p className="text-sm font-medium text-gray-800">Contracts</p><p className="text-xs text-gray-400">Manage agreements</p></div>
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* Personal Information Section */}
        <Section id="personal" title="Personal Information">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input label="Full Name" name="name" value={profile.name} onChange={handleChange} required placeholder="John Doe" />
            <Input label="Father's Name" name="fatherName" value={profile.fatherName} onChange={handleChange} placeholder="Father's Name" />
            <Input label="Email" name="email" type="email" value={profile.email} disabled />
            <Input label="Phone" name="phone" value={profile.phone} onChange={handleChange} required placeholder="+923001234567" />
            <Input label="Alternate Phone" name="alternatePhone" value={profile.alternatePhone} onChange={handleChange} placeholder="+923001234568" />
            <Input label="CNIC Number" name="idCardNumber" value={profile.idCardNumber} onChange={handleChange} placeholder="42101-1234567-1" />
            <Input label="CNIC Issue Date" name="idCardIssueDate" type="date" value={profile.idCardIssueDate} onChange={handleChange} />
            <Input label="CNIC Expiry Date" name="idCardExpiryDate" type="date" value={profile.idCardExpiryDate} onChange={handleChange} />
            <Input label="Date of Birth" name="dateOfBirth" type="date" value={profile.dateOfBirth} onChange={handleChange} />
            <Select label="Gender" name="gender" value={profile.gender} onChange={handleChange} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
            <Select label="Blood Group" name="bloodGroup" value={profile.bloodGroup} onChange={handleChange} options={[{ value: '', label: 'Select' }, { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }, { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }]} />
            <Select label="Marital Status" name="maritalStatus" value={profile.maritalStatus} onChange={handleChange} options={[{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }]} />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <TextArea label="Present Address" name="presentAddress" value={profile.presentAddress} onChange={handleChange} rows={3} />
              <TextArea label="Permanent Address" name="permanentAddress" value={profile.permanentAddress} onChange={handleChange} rows={3} />
              <Input label="City" name="city" value={profile.city} onChange={handleChange} />
              <Input label="State/Province" name="state" value={profile.state} onChange={handleChange} />
              <Input label="Country" name="country" value={profile.country} onChange={handleChange} />
              <Input label="Postal Code" name="postalCode" value={profile.postalCode} onChange={handleChange} />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Emergency Contacts</h3>
            <div className="space-y-4">
              {profile.emergencyContacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Contact Name" value={contact.name} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'name', e.target.value)} />
                    <Input label="Contact Phone" value={contact.phone} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'phone', e.target.value)} />
                    <Select label="Relationship" value={contact.relation} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'relation', e.target.value)} options={[{ value: 'parent', label: 'Parent' }, { value: 'spouse', label: 'Spouse' }, { value: 'sibling', label: 'Sibling' }, { value: 'friend', label: 'Friend' }]} />
                  </div>
                  {index > 0 && (<button type="button" onClick={() => removeEmergencyContact(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><FaTrash className="w-4 h-4" /></button>)}
                </div>
              ))}
              <button type="button" onClick={addEmergencyContact} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"><FaPlus className="w-4 h-4" /> Add Emergency Contact</button>
            </div>
          </div>
        </Section>

        {/* HR Settings Section */}
        <Section id="hr-settings" title="HR Settings & Permissions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiShield className="text-indigo-500" /> System Access Permissions</h3>
              <div className="space-y-3">
                <Checkbox name="payrollAccess" label="Payroll Access" checked={profile.payrollAccess} onChange={handleChange} />
                <Checkbox name="recruitmentAccess" label="Recruitment Access" checked={profile.recruitmentAccess} onChange={handleChange} />
                <Checkbox name="leaveManagementAccess" label="Leave Management Access" checked={profile.leaveManagementAccess} onChange={handleChange} />
                <Checkbox name="contractManagementAccess" label="Contract Management Access" checked={profile.contractManagementAccess} onChange={handleChange} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiBell className="text-indigo-500" /> HR Notification Preferences</h3>
              <div className="space-y-3">
                <Checkbox label="Email Notifications" checked={profile.notificationPreferences.email} onChange={(e) => handleNotificationChange('email', e.target.checked)} />
                <Checkbox label="Push Notifications" checked={profile.notificationPreferences.push} onChange={(e) => handleNotificationChange('push', e.target.checked)} />
                <Checkbox label="SMS Notifications" checked={profile.notificationPreferences.sms} onChange={(e) => handleNotificationChange('sms', e.target.checked)} />
                <div className="border-t border-gray-200 pt-3 mt-2"><p className="text-xs font-medium text-gray-600 mb-2">HR Specific</p></div>
                <Checkbox label="Leave Request Alerts" checked={profile.notificationPreferences.leaveRequests} onChange={(e) => handleNotificationChange('leaveRequests', e.target.checked)} />
                <Checkbox label="Recruitment Updates" checked={profile.notificationPreferences.recruitmentUpdates} onChange={(e) => handleNotificationChange('recruitmentUpdates', e.target.checked)} />
                <Checkbox label="Employee Onboarding" checked={profile.notificationPreferences.employeeOnboarding} onChange={(e) => handleNotificationChange('employeeOnboarding', e.target.checked)} />
                <Checkbox label="Contract Expiry Alerts" checked={profile.notificationPreferences.contractExpiry} onChange={(e) => handleNotificationChange('contractExpiry', e.target.checked)} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiLock className="text-indigo-500" /> Security Settings</h3>
            <div className="space-y-3">
              <Checkbox name="twoFactorEnabled" label="Two-Factor Authentication (2FA)" checked={profile.twoFactorEnabled} onChange={handleChange} />
              <Checkbox name="isActive" label="Profile Active" checked={profile.isActive} onChange={handleChange} />
              <Checkbox name="hasSystemAccess" label="System Access" checked={profile.hasSystemAccess} onChange={handleChange} />
            </div>
          </div>
        </Section>

        {/* Documents & Skills Section */}
        <Section id="documents" title="Documents & Skills">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Qualifications</h3>
              <TextArea name="qualifications" label="Qualifications" value={profile.qualifications} onChange={handleChange} rows={3} />
              <Input label="Previous Experience (Years)" name="previousExperience" type="number" value={profile.previousExperience} onChange={handleChange} placeholder="0" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Certifications</h3>
              {profile.certifications.map((cert, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3 relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Certification Name" value={cert.name} onChange={(e) => handleArrayFieldChange('certifications', index, 'name', e.target.value)} />
                    <Input label="Issuing Organization" value={cert.issuer} onChange={(e) => handleArrayFieldChange('certifications', index, 'issuer', e.target.value)} />
                    <Input type="date" label="Issue Date" value={cert.date} onChange={(e) => handleArrayFieldChange('certifications', index, 'date', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeCertification(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><FaTrash className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={addCertification} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"><FaPlus className="w-4 h-4" /> Add Certification</button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Work Experience</h3>
              {profile.experiences.map((exp, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Company" value={exp.company} onChange={(e) => handleArrayFieldChange('experiences', index, 'company', e.target.value)} />
                    <Input label="Position" value={exp.position} onChange={(e) => handleArrayFieldChange('experiences', index, 'position', e.target.value)} />
                    <Input label="Duration" value={exp.duration} onChange={(e) => handleArrayFieldChange('experiences', index, 'duration', e.target.value)} />
                    <Input label="Description" value={exp.description} onChange={(e) => handleArrayFieldChange('experiences', index, 'description', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><FaTrash className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={addExperience} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"><FaPlus className="w-4 h-4" /> Add Work Experience</button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Skills</h3>
              {profile.skills.map((skill, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Skill Name" value={skill.name} onChange={(e) => handleArrayFieldChange('skills', index, 'name', e.target.value)} />
                    <Select label="Skill Level" value={skill.level} onChange={(e) => handleArrayFieldChange('skills', index, 'level', e.target.value)} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }, { value: 'expert', label: 'Expert' }]} />
                  </div>
                  <button type="button" onClick={() => removeSkill(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><FaTrash className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={addSkill} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"><FaPlus className="w-4 h-4" /> Add Skill</button>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Bank Account Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="Bank Name" name="bankName" value={profile.bankName} onChange={handleChange} />
                <Input label="Account Number" name="bankAccountNumber" value={profile.bankAccountNumber} onChange={handleChange} />
                <Input label="Account Title" name="bankAccountTitle" value={profile.bankAccountTitle} onChange={handleChange} />
                <Input label="IBAN Number" name="ibanNumber" value={profile.ibanNumber} onChange={handleChange} />
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Profile Picture Modal */}
      <HRProfilePictureModal
        isOpen={showPictureModal}
        onClose={() => setShowPictureModal(false)}
        currentPhoto={profile.profilePicture}
        onSave={handleProfilePictureUpdate}
      />
    </div>
  );
};

export default HRProfile;