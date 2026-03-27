import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaClock,
  FaSearch,
  FaFilter,
  FaUsers,
  FaGraduationCap,
  FaFileAlt,
  FaCheckCircle,
  FaTimes,
  FaShareAlt,
  FaBookmark,
  FaDollarSign,
  FaUserTie
} from 'react-icons/fa';

const Careers = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [viewingJob, setViewingJob] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState({});
  const navigate = useNavigate();

  // Fetch jobs from PUBLIC endpoint
  useEffect(() => {
  // In Careers.jsx, update the fetchJobs function:
const fetchJobs = async () => {
  try {
    setLoading(true);
    console.log('Fetching jobs from public endpoint...');
    
    // Try public endpoint first
    const response = await axios.get('http://localhost:5000/api/public/jobs');
    
    console.log('Public jobs response:', response.data);
    
    if (response.data.success) {
      setJobs(response.data.data || []);
      setError(null);
    } else {
      setError(response.data.error || 'Failed to load jobs');
      // Fallback to trying authenticated endpoint if user is logged in
      await tryAuthenticatedEndpoint();
    }
  } catch (error) {
    console.error('Error fetching from public endpoint:', error.message);
    // Try authenticated endpoint as fallback
    await tryAuthenticatedEndpoint();
  } finally {
    setLoading(false);
  }
};

// Helper function to try authenticated endpoint
const tryAuthenticatedEndpoint = async () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (token) {
    try {
      console.log('Trying authenticated endpoint...');
      const response = await axios.get('http://localhost:5000/api/recruitment/jobs?status=Open', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const openJobs = response.data.data.filter(job => job.status === 'Open');
        setJobs(openJobs);
        setError(null);
        return;
      }
    } catch (authError) {
      console.error('Authenticated endpoint also failed:', authError.message);
    }
  }
  
  // If both endpoints fail
  setError('Unable to load job openings. Please try again later.');
  setJobs([]);
};

    fetchJobs();
  }, []);

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.skillsRequired && job.skillsRequired.some(skill => 
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    
    const matchesDepartment = departmentFilter === 'all' || 
      job.department === departmentFilter;
    
    const matchesJobType = jobTypeFilter === 'all' || 
      job.jobType === jobTypeFilter;
    
    const matchesExperience = experienceFilter === 'all' || 
      job.experienceLevel === experienceFilter;
    
    return matchesSearch && matchesDepartment && matchesJobType && matchesExperience;
  });

  // Get unique filters
  const departments = ['all', ...new Set(jobs.map(job => job.department))];
  const jobTypes = ['all', ...new Set(jobs.map(job => job.jobType))];
  const experienceLevels = ['all', ...new Set(jobs.map(job => job.experienceLevel))];

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

  const handleBookmark = (jobId) => {
    setIsBookmarked(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const handleShare = (job) => {
    const shareText = `Check out this job opening: ${job.title} at ${job.department}`;
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: job.title,
        text: shareText,
        url: shareUrl,
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Job link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading career opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Join Our Team
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover exciting career opportunities and help shape the future with us
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <FaSearch className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for jobs by title, skills, or department..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              <FaFilter className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Filter Jobs</h2>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <select
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
              
              <select
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
              >
                {jobTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Job Types' : type}
                  </option>
                ))}
              </select>
              
              <select
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
              >
                {experienceLevels.map(level => (
                  <option key={level} value={level}>
                    {level === 'all' ? 'All Experience Levels' : level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Job Count */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Open Positions <span className="text-blue-600">({filteredJobs.length})</span>
          </h2>
          <p className="text-gray-600 mt-2">
            {filteredJobs.length === 0 
              ? 'No jobs match your current filters'
              : 'Browse our current openings and find your perfect role'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Note</h3>
                <p className="text-sm text-yellow-700 mt-1">{error}</p>
                <p className="text-xs text-yellow-600 mt-2">
                  You can still browse demo positions. Real positions will appear when the public API is configured.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job Listings */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <FaBriefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-6">
              We don't have any open positions matching your criteria right now.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('all');
                setJobTypeFilter('all');
                setExperienceFilter('all');
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredJobs.map(job => (
              <div key={job._id} className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                            <FaBriefcase className="h-3 w-3 mr-1" />
                            {job.department}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                            {job.jobType}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                            <FaGraduationCap className="h-3 w-3 mr-1" />
                            {job.experienceLevel}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatSalary(job.salaryRange?.min, job.salaryRange?.max)}
                        </p>
                        <p className="text-sm text-gray-600">per year</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                      <div className="flex items-center text-gray-600">
                        <FaMapMarkerAlt className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>{job.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FaCalendarAlt className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>Posted {formatDate(job.createdAt)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FaClock className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>
                          {job.deadline 
                            ? `Apply before ${formatDate(job.deadline)}`
                            : 'No deadline'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>
                    
                    <div className="flex items-center text-gray-600">
                      <FaUsers className="h-5 w-5 mr-2" />
                      <span>{job.applicantsCount || 0} applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  
                  <div className="lg:ml-6 lg:pl-6 lg:border-l lg:border-gray-200 mt-4 lg:mt-0 lg:w-64 flex-shrink-0">
                    <div className="space-y-3">
                      <button
                        onClick={() => navigate(`/apply/${job._id}`)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        Apply Now
                      </button>
                      
                      <button
                        onClick={() => setViewingJob(job)}
                        className="w-full border border-gray-300 hover:bg-gray-50 py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        View Details
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBookmark(job._id)}
                          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg ${
                            isBookmarked[job._id]
                              ? 'bg-yellow-50 border border-yellow-200 text-yellow-600'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <FaBookmark className="h-4 w-4 mr-2" />
                          {isBookmarked[job._id] ? 'Saved' : 'Save'}
                        </button>
                        
                        <button
                          onClick={() => handleShare(job)}
                          className="flex-1 flex items-center justify-center py-2 px-4 border border-gray-300 hover:bg-gray-50 rounded-lg"
                        >
                          <FaShareAlt className="h-4 w-4 mr-2" />
                          Share
                        </button>
                      </div>
                      
                      {job.applicantsCount > 0 && (
                        <div className="text-center">
                          <span className="text-sm text-gray-600">
                            ⚡ {job.applicantsCount} people already applied
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Job Details Modal */}
        {viewingJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{viewingJob.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                        <FaBriefcase className="h-3 w-3 mr-1" />
                        {viewingJob.department}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                        {viewingJob.jobType}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                        <FaGraduationCap className="h-3 w-3 mr-1" />
                        {viewingJob.experienceLevel}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingJob(null)}
                    className="text-white hover:text-gray-200"
                  >
                    <FaTimes className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    {/* Job Overview */}
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Job Description</h3>
                      <p className="text-gray-700 whitespace-pre-line">{viewingJob.description}</p>
                    </div>

                    {/* Skills */}
                    {viewingJob.skillsRequired && viewingJob.skillsRequired.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {viewingJob.skillsRequired.map((skill, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Quick Info */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-medium">{viewingJob.location || 'Remote'}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <FaCalendarAlt className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Posted On</p>
                            <p className="font-medium">{formatDate(viewingJob.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <FaClock className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Deadline</p>
                            <p className="font-medium">
                              {viewingJob.deadline ? formatDate(viewingJob.deadline) : 'No deadline'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <FaUsers className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Applicants</p>
                            <p className="font-medium">{viewingJob.applicantsCount || 0} applied</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <FaDollarSign className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm text-gray-500">Salary</p>
                            <p className="font-medium">
                              {formatSalary(viewingJob.salaryRange?.min, viewingJob.salaryRange?.max)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          navigate(`/apply/${viewingJob._id}`);
                          setViewingJob(null);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        Apply Now
                      </button>
                      
                      <button
                        onClick={() => handleBookmark(viewingJob._id)}
                        className={`w-full flex items-center justify-center py-3 px-4 rounded-lg ${
                          isBookmarked[viewingJob._id]
                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-600'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <FaBookmark className="h-4 w-4 mr-2" />
                        {isBookmarked[viewingJob._id] ? 'Remove from Saved' : 'Save for Later'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Can't find the right role?</h3>
            <p className="mb-6 opacity-90 max-w-2xl mx-auto">
              Send us your resume anyway! We're always looking for talented people and might have opportunities that match your skills.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-bold transition-colors"
            >
              Send General Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Careers;