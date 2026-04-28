import React, { useEffect, useState, useRef } from 'react';
import axiosInstance from "@/utils/axiosInstance.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { 
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaCalendarAlt, FaVenusMars, 
  FaTint, FaHeart, FaBriefcase, FaBuilding, FaMapMarkerAlt, FaCity, 
  FaGlobe, FaDollarSign, FaUniversity, FaGraduationCap, FaFileAlt, 
  FaCamera, FaSave, FaTimes, FaPlus, FaTrash, FaCheckCircle,
  FaExclamationTriangle, FaInfoCircle, FaUsers, FaUserTie,
  FaUserShield, FaUserGraduate, FaUpload, FaSpinner
} from 'react-icons/fa';

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

// Profile Picture Modal Component
const ProfilePictureModal = ({ isOpen, onClose, currentPhoto, onSave }) => {
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    
    // Create preview
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
      const response = await axiosInstance.post('/employees/upload-profile-picture', formData, {
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
      const response = await axiosInstance.delete('/employees/profile-picture');
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
          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={preview || `https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff&size=200`}
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

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Info Text */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <FaInfoCircle className="inline mr-1" />
              Supported formats: JPEG, PNG, GIF, WEBP. Max size: 5MB
            </p>
          </div>

          {/* Buttons */}
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

const EmployeeProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [stats, setStats] = useState({
    attendanceRate: 0,
    leavesUsed: 0,
    totalLeaves: 12,
    yearsOfService: 0
  });

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
    role: 'employee',
    department: 'General',
    position: 'Employee',
    joiningDate: '',
    probationPeriod: '3',
    reportingManager: '',
    systemRole: 'employee',
    
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
  });

  // Calculate years of service
  const calculateYearsOfService = (joiningDate) => {
    if (!joiningDate) return 0;
    const join = new Date(joiningDate);
    const today = new Date();
    const years = today.getFullYear() - join.getFullYear();
    return years;
  };

  // Fetch complete profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('🔄 Fetching complete profile...');
        
        const endpoints = [
          '/employees/profile/me',
          '/auth/profile',
          '/auth/me',
          '/employees/profile'
        ];
        
        let profileData = null;
        
        for (const endpoint of endpoints) {
          try {
            const res = await axiosInstance.get(endpoint);
            if (res.data.success) {
              profileData = res.data.data;
              break;
            }
          } catch (err) {
            continue;
          }
        }
        
        if (!profileData && user?._id) {
          try {
            const res = await axiosInstance.get(`/employees/${user._id}`);
            if (res.data.success) {
              profileData = res.data.data;
            }
          } catch (err) {
            console.log('Fetch by ID failed');
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
          } else if (profileData.emergencyContact) {
            emergencyContacts = [{
              name: profileData.emergencyContact.name || '',
              phone: profileData.emergencyContact.phone || '',
              relation: profileData.emergencyContact.relationship || 'parent'
            }];
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
            name: profileData.name || '',
            fatherName: profileData.fatherName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            alternatePhone: profileData.alternatePhone || '',
            idCardNumber: profileData.idCardNumber || '',
            idCardIssueDate: formatDate(profileData.idCardIssueDate),
            idCardExpiryDate: formatDate(profileData.idCardExpiryDate),
            dateOfBirth: formatDate(profileData.dateOfBirth),
            gender: profileData.gender || 'male',
            bloodGroup: profileData.bloodGroup || '',
            maritalStatus: profileData.maritalStatus || 'single',
            employeeId: profileData.employeeId || '',
            employeeType: profileData.employeeType || 'permanent',
            employmentStatus: profileData.employmentStatus || 'active',
            role: profileData.role || 'employee',
            department: profileData.department || 'General',
            position: profileData.position || 'Employee',
            joiningDate: formatDate(profileData.joiningDate),
            probationPeriod: profileData.probationPeriod || '3',
            reportingManager: profileData.reportingManager || '',
            systemRole: profileData.systemRole || 'employee',
            presentAddress: profileData.presentAddress || '',
            permanentAddress: profileData.permanentAddress || '',
            city: profileData.city || '',
            state: profileData.state || '',
            country: profileData.country || 'Pakistan',
            postalCode: profileData.postalCode || '',
            emergencyContacts,
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
            experiences,
            skills,
            previousExperience: profileData.previousExperience || '',
            isActive: profileData.isActive !== undefined ? profileData.isActive : true,
            hasSystemAccess: profileData.hasSystemAccess !== undefined ? profileData.hasSystemAccess : true,
            profilePicture: profileData.profilePicture || profileData.avatar || '',
          });
          
          // Calculate stats
          const yearsOfService = calculateYearsOfService(profileData.joiningDate);
          setStats(prev => ({ ...prev, yearsOfService }));
          
        } else {
          setError('No profile data found.');
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError('Failed to load profile: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

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

  const handleProfilePictureUpdate = (newPhotoUrl) => {
    setProfile(prev => ({ ...prev, profilePicture: newPhotoUrl }));
    // Also update the user context if needed
    if (user) {
      user.profilePicture = newPhotoUrl;
    }
  };

  const handleSave = async () => {
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
        profilePicture: profile.profilePicture
      };
      
      try {
        const res = await axiosInstance.put('/employees/profile/me', dataToSave);
        if (res.data.success) {
          alert('✅ Profile updated successfully!');
        } else {
          throw new Error(res.data.error || 'Update failed');
        }
      } catch (updateError) {
        const res = await axiosInstance.put('/employees/update/profile', dataToSave);
        if (res.data.success) {
          alert('✅ Profile updated via alternative endpoint!');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading complete profile...</p>
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
              <FaExclamationTriangle className="text-red-500 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Profile Error</h2>
            <p className="text-red-700 mb-6">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FaUser className="text-indigo-500 text-sm" />
                Employee Profile
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your personal and employment information</p>
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</> : <><FaSave className="w-4 h-4" /> Save Profile</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard icon={FaUserGraduate} label="Years of Service" value={stats.yearsOfService} sub="With company" iconBg="bg-indigo-500" />
          <KpiCard icon={FaHeart} label="Leaves Used" value={stats.leavesUsed} sub={`of ${stats.totalLeaves} total`} iconBg="bg-emerald-500" />
          <KpiCard icon={FaCheckCircle} label="Attendance Rate" value={`${stats.attendanceRate}%`} sub="This year" iconBg="bg-purple-500" />
        </div>

        {/* Profile Header with Picture Upload */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative group">
              <img
                src={profile.profilePicture 
                  ? (profile.profilePicture.startsWith('http') 
                      ? profile.profilePicture 
                      : `http://localhost:5000${profile.profilePicture}`)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'Employee')}&background=4f46e5&color=fff&size=200`}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 shadow-lg"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'Employee')}&background=4f46e5&color=fff&size=200`;
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
              <h1 className="text-3xl font-bold text-gray-900">{profile.name || 'Employee'}</h1>
              <p className="text-xl text-indigo-600 font-semibold mt-1">
                {profile.position || 'Position'} • {profile.department || 'Department'}
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
                  <Badge variant={profile.isActive ? 'success' : 'danger'}>{profile.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information Section */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Full Name</label>
              <input name="name" value={profile.name} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Father's Name</label>
              <input name="fatherName" value={profile.fatherName} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Email</label>
              <input value={profile.email} disabled className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Phone</label>
              <input name="phone" value={profile.phone} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Alternate Phone</label>
              <input name="alternatePhone" value={profile.alternatePhone} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">CNIC Number</label>
              <input name="idCardNumber" value={profile.idCardNumber} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">CNIC Issue Date</label>
              <input type="date" name="idCardIssueDate" value={profile.idCardIssueDate} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">CNIC Expiry Date</label>
              <input type="date" name="idCardExpiryDate" value={profile.idCardExpiryDate} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={profile.dateOfBirth} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Gender</label>
              <select name="gender" value={profile.gender} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500">
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Blood Group</label>
              <select name="bloodGroup" value={profile.bloodGroup} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500">
                <option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Marital Status</label>
              <select name="maritalStatus" value={profile.maritalStatus} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500">
                <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employment Information Section */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Employment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">Employee ID</label><input value={profile.employeeId} disabled className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600" /></div>
            <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">Department</label><input name="department" value={profile.department} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">Position</label><input name="position" value={profile.position} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">Joining Date</label><input type="date" name="joiningDate" value={profile.joiningDate} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">Employee Type</label><select name="employeeType" value={profile.employeeType} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500"><option value="permanent">Permanent</option><option value="contract">Contract</option><option value="probation">Probation</option><option value="intern">Intern</option></select></div>
            <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">Reporting Manager</label><input name="reportingManager" value={profile.reportingManager} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div className="space-y-2"><label className="block text-sm font-semibold text-gray-700">System Role</label><input value={profile.role} disabled className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600" /></div>
          </div>
        </div>

        {/* Address Information Section */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Present Address</label><textarea name="presentAddress" value={profile.presentAddress} onChange={handleChange} rows={3} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500"></textarea></div>
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Permanent Address</label><textarea name="permanentAddress" value={profile.permanentAddress} onChange={handleChange} rows={3} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500"></textarea></div>
            <div><label className="block text-sm font-semibold text-gray-700">City</label><input name="city" value={profile.city} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700">State/Province</label><input name="state" value={profile.state} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700">Country</label><input name="country" value={profile.country} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700">Postal Code</label><input name="postalCode" value={profile.postalCode} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
          </div>
        </div>

        {/* Emergency Contacts Section */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Emergency Contacts</h3>
          <div className="space-y-4">
            {profile.emergencyContacts.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-semibold text-gray-700 mb-2">Contact Name</label><input value={contact.name} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'name', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
                  <div><label className="block text-sm font-semibold text-gray-700 mb-2">Contact Phone</label><input value={contact.phone} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'phone', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
                  <div><label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label><select value={contact.relation} onChange={(e) => handleArrayFieldChange('emergencyContacts', index, 'relation', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500"><option value="parent">Parent</option><option value="spouse">Spouse</option><option value="sibling">Sibling</option><option value="friend">Friend</option></select></div>
                </div>
                {profile.emergencyContacts.length > 1 && (<button type="button" onClick={() => removeEmergencyContact(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">✕</button>)}
              </div>
            ))}
            <button type="button" onClick={addEmergencyContact} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"><FaPlus className="w-4 h-4" /> Add Emergency Contact</button>
          </div>
        </div>

        {/* Bank Information Section */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Bank Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-semibold text-gray-700">Bank Name</label><input name="bankName" value={profile.bankName} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700">Account Number</label><input name="bankAccountNumber" value={profile.bankAccountNumber} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700">Account Title</label><input name="bankAccountTitle" value={profile.bankAccountTitle} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700">IBAN Number</label><input name="ibanNumber" value={profile.ibanNumber} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
          </div>
        </div>

        {/* Qualifications & Experience Section */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Qualifications & Experience</h3>
          <div className="space-y-6">
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Qualifications</label><textarea name="qualifications" value={profile.qualifications} onChange={handleChange} rows={3} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700">Previous Experience (Years)</label><input type="number" name="previousExperience" value={profile.previousExperience} onChange={handleChange} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
            
            <div><h4 className="font-semibold text-gray-700 mb-3">Work Experiences</h4>
              {profile.experiences.map((exp, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Company</label><input value={exp.company} onChange={(e) => handleArrayFieldChange('experiences', index, 'company', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Position</label><input value={exp.position} onChange={(e) => handleArrayFieldChange('experiences', index, 'position', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label><input value={exp.duration} onChange={(e) => handleArrayFieldChange('experiences', index, 'duration', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Description</label><input value={exp.description} onChange={(e) => handleArrayFieldChange('experiences', index, 'description', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
                  </div>
                  <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><FaTrash className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={addExperience} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"><FaPlus className="w-4 h-4" /> Add Work Experience</button>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Skills</h3>
          <div className="space-y-4">
            {profile.skills.map((skill, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-gray-700 mb-2">Skill Name</label><input value={skill.name} onChange={(e) => handleArrayFieldChange('skills', index, 'name', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500" /></div>
                  <div><label className="block text-sm font-semibold text-gray-700 mb-2">Skill Level</label><select value={skill.level} onChange={(e) => handleArrayFieldChange('skills', index, 'level', e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl border-gray-200 hover:border-gray-300 focus:border-indigo-500"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div>
                </div>
                <button type="button" onClick={() => removeSkill(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><FaTrash className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addSkill} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"><FaPlus className="w-4 h-4" /> Add Skill</button>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex justify-center">
          <button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-12 py-4 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-lg flex items-center">
            {saving ? (
              <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</>
            ) : (
              '💾 Save Profile'
            )}
          </button>
        </div>
      </div>

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={showPictureModal}
        onClose={() => setShowPictureModal(false)}
        currentPhoto={profile.profilePicture}
        onSave={handleProfilePictureUpdate}
      />
    </div>
  );
};

export default EmployeeProfile;