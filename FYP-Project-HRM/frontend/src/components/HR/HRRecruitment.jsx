import React, { useState, useEffect } from 'react';
import { 
  BriefcaseIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon as SearchIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EnvelopeIcon as MailIcon,
  PhoneIcon,
  MapPinIcon as LocationMarkerIcon,
  AcademicCapIcon,
  StarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../utils/axiosInstance';

const HRRecruitment = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  
  // Real data states
  const [jobPostings, setJobPostings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruitmentStats, setRecruitmentStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    hiredThisMonth: 0,
    interviewScheduled: 0,
    rejectionRate: '0%'
  });
  
  // New job form state
  const [newJob, setNewJob] = useState({
    title: '',
    department: 'Engineering',
    jobType: 'Full-time',
    location: '',
    minSalary: '',
    maxSalary: '',
    description: '',
    requirements: [''],
    responsibilities: [''],
    benefits: [],
    experienceLevel: 'Mid',
    deadline: '',
    skillsRequired: []
  });
  
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  // Check if we're in development and log initialization
  useEffect(() => {
    console.log('🚀 HRRecruitment Component Mounted');
    console.log('🔧 Environment:', process.env.NODE_ENV);
    console.log('🔗 Base URL:', axiosInstance.defaults.baseURL);
    
    // Check auth status
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔐 Auth Check:');
    console.log('  Token:', token ? 'Found' : 'Not found');
    if (token) console.log('  Token preview:', token.substring(0, 20) + '...');
    console.log('  User:', user ? JSON.parse(user) : 'Not found');
  }, []);

  // Fetch recruitment data
  const fetchRecruitmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Starting recruitment data fetch...');
      
      // Test if we can reach the server first
      try {
        console.log('🔄 Testing server connection...');
        const healthCheck = await axiosInstance.get('/health');
        console.log('✅ Server health:', healthCheck.data);
      } catch (healthError) {
        console.error('❌ Server not reachable:', healthError.message);
        throw new Error('Server is not reachable. Please check if backend is running.');
      }
      
      // Check auth
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to access recruitment features');
      }
      
      // Fetch dashboard stats
      console.log('📊 Fetching dashboard stats...');
      const statsResponse = await axiosInstance.get('/recruitment/dashboard');
      console.log('✅ Dashboard response:', statsResponse.data);
      
      if (statsResponse.data.success) {
        setRecruitmentStats(statsResponse.data.data.stats || {});
      } else {
        console.warn('Dashboard response not successful:', statsResponse.data);
      }
      
      // Fetch jobs
      console.log('📋 Fetching jobs...');
      const jobsResponse = await axiosInstance.get('/recruitment/jobs');
      console.log('✅ Jobs response:', jobsResponse.data);
      
      if (jobsResponse.data.success) {
        setJobPostings(jobsResponse.data.data || []);
      } else {
        console.warn('Jobs response not successful:', jobsResponse.data);
        setJobPostings([]);
      }
      
      // Fetch candidates
      console.log('👥 Fetching candidates...');
      const candidatesResponse = await axiosInstance.get('/recruitment/candidates');
      console.log('✅ Candidates response:', candidatesResponse.data);
      
      if (candidatesResponse.data.success) {
        setCandidates(candidatesResponse.data.data || []);
      } else {
        console.warn('Candidates response not successful:', candidatesResponse.data);
        setCandidates([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching recruitment data:', error);
      
      // Handle specific error cases
      if (error.response) {
        // Server responded with error status
        console.error('Response error:', error.response.status, error.response.data);
        if (error.response.status === 401) {
          setError('Your session has expired. Please login again.');
          // Redirect to login
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (error.response.status === 403) {
          setError('Access denied. You do not have HR permissions.');
        } else if (error.response.status === 404) {
          setError('Recruitment API endpoint not found. Please check backend routes.');
        } else {
          setError(`Server error: ${error.response.status} - ${error.response.data.error || 'Unknown error'}`);
        }
      } else if (error.request) {
        // Request was made but no response
        console.error('No response received:', error.request);
        setError('Cannot connect to server. Please check if backend is running on http://localhost:5000');
      } else {
        // Something else happened
        console.error('Request setup error:', error.message);
        setError(`Error: ${error.message}`);
      }
      
      // Set default empty data
      setJobPostings([]);
      setCandidates([]);
      setRecruitmentStats({
        totalJobs: 0,
        activeJobs: 0,
        totalCandidates: 0,
        hiredThisMonth: 0,
        interviewScheduled: 0,
        rejectionRate: '0%'
      });
    } finally {
      setLoading(false);
      console.log('🏁 Data fetch completed');
    }
  };

  useEffect(() => {
    fetchRecruitmentData();
  }, [activeTab]);

  // Handle new job posting
  const handlePostNewJob = async () => {
    try {
      setLoading(true);
      console.log('📝 Posting new job:', newJob);
      
      const response = await axiosInstance.post('/recruitment/jobs', {
        ...newJob,
        requirements: newJob.requirements.filter(req => req.trim() !== ''),
        responsibilities: newJob.responsibilities.filter(resp => resp.trim() !== ''),
        deadline: newJob.deadline ? new Date(newJob.deadline).toISOString() : null
      });
      
      console.log('✅ Job post response:', response.data);
      
      if (response.data.success) {
        alert('Job posted successfully!');
        setShowNewJobModal(false);
        setNewJob({
          title: '',
          department: 'Engineering',
          jobType: 'Full-time',
          location: '',
          minSalary: '',
          maxSalary: '',
          description: '',
          requirements: [''],
          responsibilities: [''],
          benefits: [],
          experienceLevel: 'Mid',
          deadline: '',
          skillsRequired: []
        });
        fetchRecruitmentData();
      } else {
        alert(response.data.error || 'Failed to post job');
      }
    } catch (error) {
      console.error('❌ Error posting job:', error);
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle add candidate
  const handleAddCandidate = async (jobId) => {
    setShowCandidateModal(jobId);
  };

  // Publish job
  const handlePublishJob = async (jobId) => {
    try {
      const response = await axiosInstance.put(`/recruitment/jobs/${jobId}/publish`);
      if (response.data.success) {
        alert('Job published successfully!');
        fetchRecruitmentData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to publish job.');
    }
  };

  // Close job
  const handleCloseJob = async (jobId) => {
    try {
      const response = await axiosInstance.put(`/recruitment/jobs/${jobId}/close`);
      if (response.data.success) {
        alert('Job closed successfully!');
        fetchRecruitmentData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to close job.');
    }
  };

  // Update candidate status
  const handleUpdateCandidateStatus = async (candidateId, newStatus) => {
    try {
      const response = await axiosInstance.put(`/recruitment/candidates/${candidateId}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        alert(`Candidate status updated to ${newStatus}`);
        fetchRecruitmentData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update candidate status.');
    }
  };

  // Filter jobs based on search and status
  const filteredJobs = jobPostings.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Filter candidates
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = !searchTerm || 
      candidate.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Status colors and icons
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'open': 
      case 'hired':
      case 'offer accepted': 
        return 'bg-green-100 text-green-800';
      case 'closed': 
      case 'rejected': 
        return 'bg-red-100 text-red-800';
      case 'applied': 
      case 'under review': 
        return 'bg-blue-100 text-blue-800';
      case 'interview':
      case 'interview scheduled':
      case 'shortlisted':
        return 'bg-yellow-100 text-yellow-800';
      case 'offer sent':
        return 'bg-purple-100 text-purple-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'open': 
      case 'hired':
      case 'offer accepted': 
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'applied': 
      case 'under review':
      case 'interview scheduled':
      case 'shortlisted':
        return <ClockIcon className="h-4 w-4" />;
      case 'closed': 
      case 'rejected': 
        return <XCircleIcon className="h-4 w-4" />;
      default: 
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading && jobPostings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recruitment data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && jobPostings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <ExclamationCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-6 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Job Postings
  const renderJobPostings = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Job Openings</h3>
          <p className="text-sm text-gray-600">{filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <SearchIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="Draft">Draft</option>
          </select>
          <button 
            onClick={() => setShowNewJobModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600 mb-4">Get started by posting your first job opening</p>
          <button 
            onClick={() => setShowNewJobModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Post New Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div key={job._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">{job.title}</h4>
                  <p className="text-gray-600 text-sm">{job.department} • {job.jobType}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  <span className="ml-1">{job.status}</span>
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center text-gray-600 mb-2">
                  <LocationMarkerIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="text-sm">{job.location}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{job.applicantsCount || 0} applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {job.deadline ? `Closes ${formatDate(job.deadline)}` : 'No deadline'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button 
                  onClick={() => {
                    setActiveTab('candidates');
                    setSearchTerm('');
                    setSelectedJobId(job._id);
                  }}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  View Applicants ({job.applicantsCount || 0})
                </button>
                {job.status === 'Draft' && (
                  <button 
                    onClick={() => handlePublishJob(job._id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Publish
                  </button>
                )}
                {job.status === 'Open' && (
                  <button 
                    onClick={() => handleCloseJob(job._id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render Candidates
  const renderCandidates = () => {
    // Filter candidates by selected job if applicable
    const displayCandidates = selectedJobId 
      ? candidates.filter(candidate => candidate.jobId === selectedJobId)
      : filteredCandidates;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Candidate Pipeline</h3>
            <p className="text-sm text-gray-600">{displayCandidates.length} candidate{displayCandidates.length !== 1 ? 's' : ''} found</p>
            {selectedJobId && (
              <div className="mt-2">
                <button 
                  onClick={() => setSelectedJobId(null)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <ChevronRightIcon className="h-4 w-4 mr-1 rotate-180" />
                  Back to all candidates
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <SearchIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Applied">Applied</option>
              <option value="Under Review">Under Review</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Rejected">Rejected</option>
              <option value="Hired">Hired</option>
            </select>
          </div>
        </div>

        {displayCandidates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">No candidates have applied yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayCandidates.map((candidate) => (
              <div key={candidate._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {candidate.firstName?.charAt(0) || '?'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {candidate.firstName} {candidate.lastName}
                      </h4>
                      <p className="text-blue-600 font-medium">
                        {candidate.position || 'No position specified'}
                      </p>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        {candidate.email && (
                          <div className="flex items-center">
                            <MailIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{candidate.email}</span>
                          </div>
                        )}
                        {candidate.phone && (
                          <div className="flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>{candidate.phone}</span>
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center">
                            <LocationMarkerIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>{candidate.location}</span>
                          </div>
                        )}
                      </div>

                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {candidate.skills.slice(0, 5).map((skill, index) => (
                            <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 5 && (
                            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">
                              +{candidate.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 flex flex-col items-end space-y-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(candidate.status)}`}>
                      {getStatusIcon(candidate.status)}
                      <span className="ml-1">{candidate.status}</span>
                    </span>
                    
                    {candidate.rating && (
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon 
                            key={i} 
                            className={`h-4 w-4 ${i < Math.floor(candidate.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                        <span className="ml-1 text-sm text-gray-600">{candidate.rating}</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {candidate.status === 'Shortlisted' && (
                        <button 
                          onClick={() => handleUpdateCandidateStatus(candidate._id, 'Interview Scheduled')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          Schedule Interview
                        </button>
                      )}
                      <button className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Dashboard
  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Accelerate Your Hiring</h3>
            <p className="mt-2 opacity-90">Post jobs, review candidates, and schedule interviews</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={() => setShowNewJobModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Post New Job
            </button>
            <button 
              onClick={() => setActiveTab('candidates')}
              className="bg-transparent border-2 border-white hover:bg-white/10 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Review Applications
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Jobs</p>
              <p className="text-3xl font-bold text-gray-900">{recruitmentStats.activeJobs}</p>
            </div>
            <BriefcaseIcon className="h-12 w-12 text-blue-100" />
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Total Jobs: {recruitmentStats.totalJobs}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Candidates</p>
              <p className="text-3xl font-bold text-gray-900">{recruitmentStats.totalCandidates}</p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-green-100" />
          </div>
          <div className="mt-4">
            <p className="text-sm text-blue-600">
              {recruitmentStats.interviewScheduled} interviews scheduled
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Hired This Month</p>
              <p className="text-3xl font-bold text-gray-900">{recruitmentStats.hiredThisMonth}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-purple-100" />
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Rejection rate: {recruitmentStats.rejectionRate}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Recent Job Postings</h3>
            <button 
              onClick={() => setActiveTab('jobs')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {jobPostings.slice(0, 3).map((job) => (
              <div key={job._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 truncate">{job.title}</h4>
                  <p className="text-sm text-gray-600">{job.department} • {formatDate(job.createdAt)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
            ))}
            {jobPostings.length === 0 && (
              <p className="text-gray-500 text-center py-4">No job postings yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Recent Candidates</h3>
            <button 
              onClick={() => setActiveTab('candidates')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {candidates.slice(0, 3).map((candidate) => (
              <div key={candidate._id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  {candidate.firstName?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{candidate.firstName} {candidate.lastName}</h4>
                  <p className="text-sm text-gray-600">
                    Applied on {formatDate(candidate.createdAt)}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                  {candidate.status}
                </span>
              </div>
            ))}
            {candidates.length === 0 && (
              <p className="text-gray-500 text-center py-4">No candidates yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recruitment Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage job postings, candidates, and hiring workflow</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={fetchRecruitmentData}
                className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center space-x-2"
                disabled={loading}
              >
                <RefreshIcon className="h-5 w-5" />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <p className="text-red-700 mt-1 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 space-x-3">
              <button
                onClick={fetchRecruitmentData}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-blue-800">Debug Info</h4>
              <button 
                onClick={() => {
                  console.log('🔍 Manual Debug Check');
                  console.log('LocalStorage:', {
                    token: localStorage.getItem('authToken') || localStorage.getItem('token'),
                    user: localStorage.getItem('user')
                  });
                  console.log('Job Postings:', jobPostings);
                  console.log('Candidates:', candidates);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Console Log
              </button>
            </div>
            <div className="mt-2 text-xs text-blue-700 space-y-1">
              <div>Loading: {loading ? 'Yes' : 'No'}</div>
              <div>Jobs: {jobPostings.length}</div>
              <div>Candidates: {candidates.length}</div>
              <div>Active Tab: {activeTab}</div>
              <div>Selected Job: {selectedJobId ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['dashboard', 'jobs', 'candidates'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSelectedJobId(null);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'dashboard' ? 'Overview' : tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading recruitment data...</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <div className="bg-white shadow-xl rounded-2xl p-6">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'jobs' && renderJobPostings()}
            {activeTab === 'candidates' && renderCandidates()}
          </div>
        )}

        {/* Footer Notes */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact the recruitment team</p>
        </div>
      </div>

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Post New Job</h2>
                <button 
                  onClick={() => setShowNewJobModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-4 pb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={newJob.title}
                    onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Senior Frontend Developer"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      value={newJob.department}
                      onChange={(e) => setNewJob({...newJob, department: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Product">Product</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Type
                    </label>
                    <select
                      value={newJob.jobType}
                      onChange={(e) => setNewJob({...newJob, jobType: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={newJob.location}
                      onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Remote, San Francisco, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level
                    </label>
                    <select
                      value={newJob.experienceLevel}
                      onChange={(e) => setNewJob({...newJob, experienceLevel: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="Entry">Entry Level</option>
                      <option value="Mid">Mid Level</option>
                      <option value="Senior">Senior Level</option>
                      <option value="Lead">Lead Level</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Salary ($)
                    </label>
                    <input
                      type="number"
                      value={newJob.minSalary}
                      onChange={(e) => setNewJob({...newJob, minSalary: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 80000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Salary ($)
                    </label>
                    <input
                      type="number"
                      value={newJob.maxSalary}
                      onChange={(e) => setNewJob({...newJob, maxSalary: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 120000"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={newJob.deadline}
                    onChange={(e) => setNewJob({...newJob, deadline: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newJob.description}
                    onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Job description..."
                  />
                </div>
              </div>
            </div>
            
            {/* Fixed Footer with Buttons - ALWAYS VISIBLE */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewJobModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostNewJob}
                  disabled={loading || !newJob.title.trim() || !newJob.description.trim()}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    loading || !newJob.title.trim() || !newJob.description.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading ? 'Posting...' : 'Post Job'}
                </button>
              </div>
              
              {/* Validation hint */}
              {(!newJob.title.trim() || !newJob.description.trim()) && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  * Please fill in both Title and Description fields
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRRecruitment;