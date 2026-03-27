import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaClock,
  FaUsers,
  FaGraduationCap,
  FaArrowLeft
} from 'react-icons/fa';

const Apply = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentPosition: '',
    totalExperience: '',
    currentSalary: '',
    expectedSalary: '',
    noticePeriod: '',
    coverLetter: '',
    skills: '',
    resume: null
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        
        // TRY 1: Public endpoint first
        try {
          const response = await axios.get(`http://localhost:5000/api/public/jobs/${jobId}`);
          if (response.data.success) {
            setJob(response.data.data);
            setLoading(false);
            return;
          }
        } catch (publicError) {
          console.log('Public endpoint failed, trying authenticated...');
        }
        
        // TRY 2: Authenticated endpoint (if user is logged in)
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token) {
          try {
            const response = await axios.get(`http://localhost:5000/api/recruitment/jobs/${jobId}`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            if (response.data.success) {
              setJob(response.data.data);
              setLoading(false);
              return;
            }
          } catch (authError) {
            console.log('Authenticated endpoint also failed');
          }
        }
        
        // If both fail
        setJob({
          _id: jobId,
          title: 'Job Position',
          department: 'Department',
          jobType: 'Full-time',
          location: 'Location not available',
          description: 'Job details could not be loaded.',
          salaryRange: { min: 0, max: 0 }
        });
        
      } catch (error) {
        console.error('Error fetching job:', error);
        setJob({
          _id: jobId,
          title: 'Job Position',
          department: 'Department',
          jobType: 'Full-time',
          location: 'Location not available',
          description: 'Job details could not be loaded.',
          salaryRange: { min: 0, max: 0 }
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchJob();
  }, [jobId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Competitive Salary';
    if (!min) return `Up to $${Number(max).toLocaleString()}`;
    if (!max) return `From $${Number(min).toLocaleString()}`;
    return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`;
  };

 // In handleSubmit function:
const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  
  try {
    // Submit application to recruitment endpoint
    // Replace the axios.post section:
const response = await axios.post('http://localhost:5000/api/public/apply', {
  jobId,
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  phone: formData.phone,
  currentCompany: formData.currentCompany || '',
  currentPosition: formData.currentPosition || '',
  totalExperience: formData.totalExperience || '',
  currentSalary: formData.currentSalary || '',
  expectedSalary: formData.expectedSalary || '',
  noticePeriod: formData.noticePeriod || '15', // ✅ Send number
  coverLetter: formData.coverLetter || '',
  skills: formData.skills || ''
});

    
    if (response.data.success) {
      alert('Application submitted successfully!');
      navigate('/careers');
    } else {
      alert(response.data.error || 'Failed to submit application');
    }
  } catch (error) {
    console.error('Submission error:', error);
    alert(`Failed to submit application: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
  } finally {
    setSubmitting(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <FaArrowLeft className="h-5 w-5 mr-2" />
          Back to Job Listings
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Job Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">
              Apply for: {job?.title || 'Job Position'}
            </h1>
            {job && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                  <FaBriefcase className="h-3 w-3 mr-1" />
                  {job.department}
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                  {job.jobType}
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                  <FaGraduationCap className="h-3 w-3 mr-1" />
                  {job.experienceLevel || 'Not specified'}
                </span>
              </div>
            )}
          </div>

          {/* Job Details */}
          {job && (
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center text-gray-600">
                  <FaMapMarkerAlt className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{job.location || 'Remote'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FaMoneyBillWave className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{formatSalary(job.salaryRange?.min, job.salaryRange?.max)}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FaUsers className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{job.applicantsCount || 0} applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              {job.deadline && (
                <div className="flex items-center text-gray-600">
                  <FaClock className="h-5 w-5 mr-2" />
                  <span>Apply before: {formatDate(job.deadline)}</span>
                </div>
              )}
            </div>
          )}

          {/* Application Form */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Form</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Company
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({...formData, currentCompany: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Position
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.currentPosition}
                    onChange={(e) => setFormData({...formData, currentPosition: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Experience (years)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.totalExperience}
                    onChange={(e) => setFormData({...formData, totalExperience: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Salary ($)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.currentSalary}
                    onChange={(e) => setFormData({...formData, currentSalary: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Salary ($)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.expectedSalary}
                    onChange={(e) => setFormData({...formData, expectedSalary: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notice Period (days)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.noticePeriod}
                  onChange={(e) => setFormData({...formData, noticePeriod: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="React, Node.js, MongoDB, AWS"
                  value={formData.skills}
                  onChange={(e) => setFormData({...formData, skills: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter
                </label>
                <textarea
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us why you're interested in this position and why you'd be a great fit..."
                  value={formData.coverLetter}
                  onChange={(e) => setFormData({...formData, coverLetter: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resume/CV *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => setFormData({...formData, resume: e.target.files[0]})}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Accepted formats: PDF, DOC, DOCX, TXT (Max 5MB)
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/careers')}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Apply;