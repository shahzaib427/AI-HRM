// EmployeeProfile.jsx - COMPLETE VERSION
import React, { useEffect, useState } from 'react';
import axiosInstance from "@/utils/axiosInstance.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

const EmployeeProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    // BASIC INFORMATION (From Employee Creation)
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
    
    // EMPLOYMENT INFORMATION (From Employee Creation)
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
    
    // ADDRESS INFORMATION (From Employee Creation)
    presentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    country: 'Pakistan',
    postalCode: '',
    
    // EMERGENCY CONTACTS (From Employee Creation - Array)
    emergencyContacts: [{ name: '', phone: '', relation: 'parent' }],
    
    // SALARY INFORMATION (From Employee Creation)
    salary: '',
    fuelAllowance: '',
    medicalAllowance: '',
    specialAllowance: '',
    otherAllowance: '',
    currency: 'PKR',
    salaryFrequency: 'monthly',
    
    // BANK INFORMATION (From Employee Creation)
    bankName: '',
    bankAccountNumber: '',
    bankAccountTitle: '',
    bankBranchCode: '',
    ibanNumber: '',
    
    // ADDITIONAL INFORMATION (From Employee Creation)
    qualifications: '',
    experiences: [{ company: '', position: '', duration: '', description: '' }],
    skills: [{ name: '', level: 'intermediate' }],
    previousExperience: '',
    
    // SYSTEM INFORMATION
    isActive: true,
    hasSystemAccess: true,
    
    // PROFILE
    profilePicture: '',
    
    // CUSTOM FIELDS (From Employee Creation)
    customEmployeeType: '',
    customDepartment: '',
    customPosition: '',
    customSystemRole: ''
  });

  // ================= FETCH COMPLETE PROFILE =================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('🔄 Fetching complete profile...');
        
        // First try the main employee profile endpoint
        const endpoints = [
          '/employees/profile/me',
          '/auth/profile',
          '/auth/me',
          '/employees/profile'
        ];
        
        let profileData = null;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`🔍 Trying endpoint: ${endpoint}`);
            const res = await axiosInstance.get(endpoint);
            if (res.data.success) {
              profileData = res.data.data;
              console.log(`✅ Profile loaded from: ${endpoint}`, profileData);
              break;
            }
          } catch (err) {
            console.log(`❌ ${endpoint} failed:`, err.response?.status);
          }
        }
        
        // If still no data, try fetching by ID from employees list
        if (!profileData && user?._id) {
          try {
            console.log(`🔄 Fetching by ID: ${user._id}`);
            const res = await axiosInstance.get(`/employees/${user._id}`);
            if (res.data.success) {
              profileData = res.data.data;
              console.log('✅ Got data by ID:', profileData);
            }
          } catch (err) {
            console.log('❌ Fetch by ID failed:', err.response?.status);
          }
        }
        
        if (profileData) {
          // Format date fields
          const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
          };
          
          // Handle emergency contacts (could be array or object)
          let emergencyContacts = [];
          if (profileData.emergencyContacts && Array.isArray(profileData.emergencyContacts)) {
            emergencyContacts = profileData.emergencyContacts;
          } else if (profileData.emergencyContact) {
            // Convert single emergency contact to array
            emergencyContacts = [{
              name: profileData.emergencyContact.name || '',
              phone: profileData.emergencyContact.phone || '',
              relation: profileData.emergencyContact.relationship || 'parent'
            }];
          }
          
          // Handle experiences
          let experiences = [];
          if (profileData.experiences && Array.isArray(profileData.experiences)) {
            experiences = profileData.experiences;
          } else if (profileData.previousExperience) {
            experiences = [{
              company: '',
              position: '',
              duration: `${profileData.previousExperience} years`,
              description: ''
            }];
          }
          
          // Handle skills (could be array of strings or objects)
          let skills = [];
          if (profileData.skills && Array.isArray(profileData.skills)) {
            if (typeof profileData.skills[0] === 'string') {
              skills = profileData.skills.map(skill => ({ name: skill, level: 'intermediate' }));
            } else {
              skills = profileData.skills;
            }
          }
          
          // Handle address fields (could be nested object or separate fields)
          let presentAddress = profileData.presentAddress || '';
          let city = profileData.city || '';
          let state = profileData.state || '';
          let country = profileData.country || '';
          let postalCode = profileData.postalCode || '';
          
          if (profileData.address && typeof profileData.address === 'object') {
            presentAddress = profileData.address.street || presentAddress;
            city = profileData.address.city || city;
            state = profileData.address.state || state;
            country = profileData.address.country || country;
            postalCode = profileData.address.zipCode || postalCode;
          }
          
          setProfile({
            // Basic Information
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
            
            // Employment Information
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
            
            // Address Information
            presentAddress,
            permanentAddress: profileData.permanentAddress || presentAddress,
            city,
            state,
            country,
            postalCode,
            
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
            
            // Custom Fields
            customEmployeeType: profileData.customEmployeeType || '',
            customDepartment: profileData.customDepartment || '',
            customPosition: profileData.customPosition || '',
            customSystemRole: profileData.customSystemRole || ''
          });
          
          console.log('📋 Complete profile loaded:', {
            name: profileData.name,
            employeeId: profileData.employeeId,
            fieldsCount: Object.keys(profileData).length,
            hasEmergencyContacts: !!profileData.emergencyContacts,
            hasExperiences: !!profileData.experiences,
            hasSalaryComponents: !!(profileData.fuelAllowance || profileData.medicalAllowance)
          });
        } else {
          setError('No profile data found.');
        }
      } catch (err) {
        console.error('❌ Profile fetch error:', err);
        setError('Failed to load profile: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // ================= HANDLE CHANGE =================
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

  // ================= SAVE COMPLETE PROFILE =================
  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      console.log('💾 Saving complete profile...');
      
      // Prepare ALL fields that should be updatable by employee
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
        profilePicture: profile.profilePicture
      };
      
      console.log('📤 Data being sent for update:', dataToSave);
      
      // Try update profile endpoint
      try {
        const res = await axiosInstance.put('/employees/profile/me', dataToSave);
        
        if (res.data.success) {
          alert('✅ Profile updated successfully!');
          console.log('✅ Profile update response:', res.data);
        } else {
          throw new Error(res.data.error || 'Update failed');
        }
      } catch (updateError) {
        console.log('❌ Profile update failed:', updateError.response?.data);
        
        // Try alternative endpoint
        const res = await axiosInstance.put('/employees/update/profile', dataToSave);
        if (res.data.success) {
          alert('✅ Profile updated via alternative endpoint!');
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

  // ================= RENDER LOADING =================
  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} profile={profile} user={user} />;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* HEADER */}
      <ProfileHeader profile={profile} />
      
      {/* BASIC INFORMATION SECTION */}
      <Section title="Basic Information">
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
      </Section>

      {/* EMPLOYMENT INFORMATION */}
      <Section title="Employment Information">
        <Input name="employeeId" label="Employee ID" value={profile.employeeId} disabled />
        <Input name="department" label="Department" value={profile.department} onChange={handleChange} />
        <Input name="position" label="Position" value={profile.position} onChange={handleChange} />
        <Input type="date" name="joiningDate" label="Joining Date" value={profile.joiningDate} onChange={handleChange} />
        <Input name="employeeType" label="Employee Type" value={profile.employeeType} onChange={handleChange} />
        <Input name="employmentStatus" label="Status" value={profile.employmentStatus} onChange={handleChange} />
        <Input name="probationPeriod" label="Probation Period" value={profile.probationPeriod} onChange={handleChange} />
        <Input name="reportingManager" label="Reporting Manager" value={profile.reportingManager} onChange={handleChange} />
        <Input name="role" label="System Role" value={profile.role} disabled />
      </Section>

      {/* ADDRESS INFORMATION */}
      <Section title="Address Information">
        <TextArea name="presentAddress" label="Present Address" value={profile.presentAddress} onChange={handleChange} rows={3} />
        <TextArea name="permanentAddress" label="Permanent Address" value={profile.permanentAddress} onChange={handleChange} rows={3} />
        <Input name="city" label="City" value={profile.city} onChange={handleChange} />
        <Input name="state" label="State/Province" value={profile.state} onChange={handleChange} />
        <Input name="country" label="Country" value={profile.country} onChange={handleChange} />
        <Input name="postalCode" label="Postal Code" value={profile.postalCode} onChange={handleChange} />
      </Section>

      {/* EMERGENCY CONTACTS */}
      <Section title="Emergency Contacts">
        {profile.emergencyContacts.map((contact, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative">
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
                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addEmergencyContact}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400"
        >
          + Add Emergency Contact
        </button>
      </Section>

      {/* SALARY INFORMATION (Read Only) */}
      <Section title="Salary Information">
        <Input name="salary" label="Basic Salary" value={profile.salary} disabled />
        <Input name="fuelAllowance" label="Fuel Allowance" value={profile.fuelAllowance} disabled />
        <Input name="medicalAllowance" label="Medical Allowance" value={profile.medicalAllowance} disabled />
        <Input name="specialAllowance" label="Special Allowance" value={profile.specialAllowance} disabled />
        <Input name="otherAllowance" label="Other Allowance" value={profile.otherAllowance} disabled />
        <Input name="currency" label="Currency" value={profile.currency} disabled />
        <Input name="salaryFrequency" label="Payment Frequency" value={profile.salaryFrequency} disabled />
      </Section>

      {/* BANK INFORMATION */}
      <Section title="Bank Account Details">
        <Input name="bankName" label="Bank Name" value={profile.bankName} onChange={handleChange} />
        <Input name="bankAccountNumber" label="Account Number" value={profile.bankAccountNumber} onChange={handleChange} />
        <Input name="bankAccountTitle" label="Account Title" value={profile.bankAccountTitle} onChange={handleChange} />
        <Input name="bankBranchCode" label="Branch Code" value={profile.bankBranchCode} onChange={handleChange} />
        <Input name="ibanNumber" label="IBAN Number" value={profile.ibanNumber} onChange={handleChange} />
      </Section>

      {/* QUALIFICATIONS & EXPERIENCES */}
      <Section title="Qualifications & Experience">
        <TextArea name="qualifications" label="Qualifications" value={profile.qualifications} onChange={handleChange} rows={3} />
        <Input name="previousExperience" label="Previous Experience (Years)" value={profile.previousExperience} onChange={handleChange} type="number" />
        
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <h4 className="font-medium text-gray-700 mb-3">Work Experiences</h4>
          {profile.experiences.map((exp, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative">
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
                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addExperience}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400"
          >
            + Add Work Experience
          </button>
        </div>
      </Section>

      {/* SKILLS */}
      <Section title="Skills">
        {profile.skills.map((skill, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 relative">
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
              className="absolute top-2 right-2 text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSkill}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400"
        >
          + Add Skill
        </button>
      </Section>

      {/* SAVE BUTTON */}
      <SaveButton handleSave={handleSave} saving={saving} />
    </div>
  );
};

// ================= REUSABLE COMPONENTS =================
const LoadingScreen = () => (
  <div className="flex justify-center items-center h-96">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading complete profile...</p>
    </div>
  </div>
);

const ErrorScreen = ({ error, profile, user }) => (
  <div className="max-w-6xl mx-auto p-6">
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-red-900 mb-2">Profile Error</h2>
        <p className="text-red-700 mb-6">{error}</p>
        <div className="mt-8 text-left bg-white p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Debug Information:</h3>
          <p className="text-sm text-gray-600">Employee ID: {profile.employeeId || 'Not set'}</p>
          <p className="text-sm text-gray-600">Name: {profile.name || 'Not set'}</p>
          <p className="text-sm text-gray-600">Email: {profile.email || 'Not set'}</p>
          <p className="text-sm text-gray-600">User from context: {user ? 'Exists' : 'Not found'}</p>
        </div>
      </div>
    </div>
  </div>
);

const ProfileHeader = ({ profile }) => (
  <div className="bg-white shadow-xl rounded-2xl p-8 mb-8">
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
      <div className="relative">
        <img
          src={profile.profilePicture 
            ? (profile.profilePicture.startsWith('http') 
                ? profile.profilePicture 
                : `http://localhost:5000${profile.profilePicture}`)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=blue&color=fff&size=200`}
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-lg"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=blue&color=fff&size=200`;
          }}
        />
      </div>
      <div className="flex-1 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">{profile.name || 'Employee'}</h1>
        <p className="text-xl text-blue-600 font-semibold mt-1">
          {profile.position || 'Position'} • {profile.department || 'Department'}
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem label="Employee ID" value={profile.employeeId} />
          <InfoItem label="Email" value={profile.email} />
          <InfoItem label="Phone" value={profile.phone} />
          <InfoItem label="Joining Date" value={profile.joiningDate} />
          <InfoItem label="Employee Type" value={profile.employeeType} />
          <InfoItem label="Status" value={profile.isActive ? 'Active' : 'Inactive'} />
        </div>
      </div>
    </div>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div className="bg-gray-50 p-3 rounded-lg">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="font-medium text-gray-900">{value || 'N/A'}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white shadow-lg rounded-2xl p-8 mb-8">
    <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>
  </div>
);

const Input = ({ label, onChange, value, disabled = false, required = false, type = 'text', name, ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
      {disabled && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
        disabled 
          ? 'bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600' 
          : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
      }`}
      {...props}
    />
  </div>
);

const TextArea = ({ label, onChange, value, disabled = false, name, rows = 3, ...props }) => (
  <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
    <label className="block text-sm font-semibold text-gray-700">{label}</label>
    <textarea
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      rows={rows}
      className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
        disabled 
          ? 'bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600' 
          : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
      }`}
      {...props}
    />
  </div>
);

const Select = ({ label, value, onChange, options, disabled = false, name }) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-700">{label}</label>
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
        disabled 
          ? 'bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600' 
          : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
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

const SaveButton = ({ handleSave, saving }) => (
  <div className="mt-12 pt-8 border-t border-gray-200 flex justify-center">
    <button
      onClick={handleSave}
      disabled={saving}
      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-12 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-lg flex items-center"
    >
      {saving ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </>
      ) : (
        '💾 Save Complete Profile'
      )}
    </button>
  </div>
);

export default EmployeeProfile;