import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BriefcaseIcon,
  LocationMarkerIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ClockIcon,
  SearchIcon,
  FilterIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/outline';

const JobPortal = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  
  // Application form
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationForm, setApplicationForm] = useState({
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

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        // Use public API endpoint (no auth required)
        const response = await axios.get('http://localhost:5000/api/public/jobs');
        
        // Or if you want to use the same endpoint but filter only open jobs:
        // const response = await axios.get('http://localhost:5000/api/recruitment/jobs?status=Open');
        
        if (response.data.success) {
          const openJobs = response.data.data.filter(job => job.status === 'Open');
          setJobs(openJobs);
          setFilteredJobs(openJobs);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setError('Failed to load job openings');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = jobs.filter(job => {
      // Search filter
      const matchesSearch = !searchTerm || 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Department filter
      const matchesDepartment = departmentFilter === 'all' || 
        job.department === departmentFilter;
      
      // Job type filter
      const matchesJobType = jobTypeFilter === 'all' || 
        job.jobType === jobTypeFilter;
      
      // Experience filter
      const matchesExperience = experienceFilter === 'all' || 
        job.experienceLevel === experienceFilter;
      
      return matchesSearch && matchesDepartment && matchesJobType && matchesExperience;
    });
    
    setFilteredJobs(result);
  }, [searchTerm, departmentFilter, jobTypeFilter, experienceFilter, jobs]);

  // Handle job apply
  const handleApply = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  // Handle form submission
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    try {
      // Submit application to backend
      const response = await axios.post('http://localhost:5000/api/recruitment/candidates', {
        jobId: selectedJob._id,
        ...applicationForm,
        skills: applicationForm.skills.split(',').map(skill => skill.trim()),
        resume: applicationForm.resume // You'll need to handle file upload
      });
      
      if (response.data.success) {
        alert('Application submitted successfully!');
        setShowApplicationForm(false);
        setApplicationForm({
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
      }
    } catch (error) {
      alert('Failed to submit application: ' + (error.response?.data?.message || error.message));
    }
  };

  // Format salary
  const formatSalary = (min, max) => {
    if (!min && !max) return 'Competitive Salary';
    if (!min) return `Up to $${Number(max).toLocaleString()}`;
    if (!max) return `From $${Number(min).toLocaleString()}`;
    return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`;
  };

  // Get unique departments for filter
  const departments = ['all', ...new Set(jobs.map(job => job.department))];
  const jobTypes = ['all', ...new Set(jobs.map(job => job.jobType))];
  const experienceLevels = ['all', ...new Set(jobs.map(job => job.experienceLevel))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job openings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl opacity-90 mb-8">
            Discover exciting career opportunities and be part of something great
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="relative">
              <SearchIcon className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for jobs by title, skills, or department..."
                className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Filter Jobs</h2>
            <FilterIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
              >
                {jobTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Job Types' : type}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
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

        {/* Job Results */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Open Positions ({filteredJobs.length})
          </h2>
          <p className="text-gray-600">
            {filteredJobs.length === 0 
              ? 'No jobs match your filters. Try different criteria.'
              : 'Browse through our current job openings'}
          </p>
        </div>

        {/* Job Listings */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <BriefcaseIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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
                            {job.department}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                            {job.jobType}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
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
                        <LocationMarkerIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>{job.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <CalendarIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <ClockIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>
                          {job.deadline 
                            ? `Apply before ${new Date(job.deadline).toLocaleDateString()}`
                            : 'No deadline'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>
                    
                    {job.skillsRequired && job.skillsRequired.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Required Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.skillsRequired.slice(0, 5).map((skill, index) => (
                            <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                          {job.skillsRequired.length > 5 && (
                            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">
                              +{job.skillsRequired.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="lg:ml-6 lg:pl-6 lg:border-l lg:border-gray-200 mt-4 lg:mt-0 lg:w-64 flex-shrink-0">
                    <div className="space-y-3">
                      <button
                        onClick={() => handleApply(job)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        Apply Now
                      </button>
                      <button
                        onClick={() => {
                          // You can create a detailed job view page
                          setSelectedJob(job);
                          // Or show job details in a modal
                        }}
                        className="w-full border border-gray-300 hover:bg-gray-50 py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-medium text-gray-700 mb-2">Quick Info</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Applicants:</span>
                          <span className="text-sm font-medium">{job.applicantsCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className="text-sm font-medium text-green-600">● Open</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Form Modal */}
      {showApplicationForm && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Apply for {selectedJob.title}</h2>
                  <p className="text-gray-600">{selectedJob.department} • {selectedJob.jobType}</p>
                </div>
                <button
                  onClick={() => setShowApplicationForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
              <form onSubmit={handleSubmitApplication} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.firstName}
                      onChange={(e) => setApplicationForm({...applicationForm, firstName: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.lastName}
                      onChange={(e) => setApplicationForm({...applicationForm, lastName: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.email}
                      onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.phone}
                      onChange={(e) => setApplicationForm({...applicationForm, phone: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Company
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.currentCompany}
                      onChange={(e) => setApplicationForm({...applicationForm, currentCompany: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Position
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.currentPosition}
                      onChange={(e) => setApplicationForm({...applicationForm, currentPosition: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Experience (years)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.totalExperience}
                      onChange={(e) => setApplicationForm({...applicationForm, totalExperience: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Salary ($)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={applicationForm.expectedSalary}
                      onChange={(e) => setApplicationForm({...applicationForm, expectedSalary: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="React, Node.js, MongoDB, AWS"
                    value={applicationForm.skills}
                    onChange={(e) => setApplicationForm({...applicationForm, skills: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Letter
                  </label>
                  <textarea
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Tell us why you're interested in this position..."
                    value={applicationForm.coverLetter}
                    onChange={(e) => setApplicationForm({...applicationForm, coverLetter: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume/CV
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    onChange={(e) => setApplicationForm({...applicationForm, resume: e.target.files[0]})}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Accepted formats: PDF, DOC, DOCX (Max 5MB)
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPortal;