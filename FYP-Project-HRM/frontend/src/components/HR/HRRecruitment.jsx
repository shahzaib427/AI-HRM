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
    purple: 'bg-purple-50 text-purple-700'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant]}`}>{children}</span>;
};

const HRRecruitment = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
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

  useEffect(() => {
    console.log('🚀 HRRecruitment Component Mounted');
  }, []);

  // Fetch recruitment data
  const fetchRecruitmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to access recruitment features');
      }
      
      // Fetch dashboard stats
      const statsResponse = await axiosInstance.get('/recruitment/dashboard');
      if (statsResponse.data.success) {
        setRecruitmentStats(statsResponse.data.data.stats || {});
      }
      
      // Fetch jobs
      const jobsResponse = await axiosInstance.get('/recruitment/jobs');
      if (jobsResponse.data.success) {
        setJobPostings(jobsResponse.data.data || []);
      } else {
        setJobPostings([]);
      }
      
      // Fetch candidates
      const candidatesResponse = await axiosInstance.get('/recruitment/candidates');
      if (candidatesResponse.data.success) {
        setCandidates(candidatesResponse.data.data || []);
      } else {
        setCandidates([]);
      }
      
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You do not have HR permissions.');
      } else {
        setError('Failed to load recruitment data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  // Handle new job posting
  const handlePostNewJob = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post('/recruitment/jobs', {
        ...newJob,
        requirements: newJob.requirements.filter(req => req.trim() !== ''),
        responsibilities: newJob.responsibilities.filter(resp => resp.trim() !== ''),
        deadline: newJob.deadline ? new Date(newJob.deadline).toISOString() : null
      });
      
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
      alert(error.response?.data?.message || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
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

  // Filter jobs
  const filteredJobs = jobPostings.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const getStatusBadge = (status) => {
    const variants = {
      'Open': 'success',
      'Active': 'success',
      'Closed': 'danger',
      'Draft': 'default',
      'Applied': 'info',
      'Under Review': 'warning',
      'Shortlisted': 'purple',
      'Interview Scheduled': 'info',
      'Rejected': 'danger',
      'Hired': 'success'
    };
    return <Badge variant={variants[status] || 'default'}>{status || 'Unknown'}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && jobPostings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading recruitment data...</p>
        </div>
      </div>
    );
  }

  if (error && jobPostings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center max-w-md">
          <ExclamationCircleIcon className="h-14 w-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={fetchRecruitmentData} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">Retry</button>
            <button onClick={() => window.location.href = '/login'} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Go to Login</button>
          </div>
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
                <BriefcaseIcon className="text-indigo-500 w-5 h-5" />
                Recruitment Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage job postings, candidates, and hiring workflow</p>
            </div>
            <button onClick={fetchRecruitmentData} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm">
              <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={BriefcaseIcon} label="Active Jobs" value={recruitmentStats.activeJobs} sub={`Total: ${recruitmentStats.totalJobs}`} iconBg="bg-indigo-500" />
          <KpiCard icon={UserGroupIcon} label="Total Candidates" value={recruitmentStats.totalCandidates} sub="All applicants" iconBg="bg-emerald-500" />
          <KpiCard icon={CalendarIcon} label="Hired This Month" value={recruitmentStats.hiredThisMonth} sub="New hires" iconBg="bg-green-500" />
          <KpiCard icon={ClockIcon} label="Interviews" value={recruitmentStats.interviewScheduled} sub="Scheduled" iconBg="bg-amber-500" />
          <KpiCard icon={XCircleIcon} label="Rejection Rate" value={recruitmentStats.rejectionRate} sub="Overall" iconBg="bg-red-500" />
        </div>

        {/* Quick Actions Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Accelerate Your Hiring</h3>
              <p className="text-indigo-100 text-sm mt-1">Post jobs, review candidates, and schedule interviews</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNewJobModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors">
                <PlusIcon className="w-4 h-4" /> Post New Job
              </button>
              <button onClick={() => setActiveTab('candidates')} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/30 text-white text-sm font-medium rounded-lg hover:bg-indigo-500/40 transition-colors border border-indigo-400">
                Review Applications
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg border border-gray-100">
          <div className="border-b border-gray-100">
            <nav className="flex gap-1 px-4">
              {['dashboard', 'jobs', 'candidates'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearchTerm(''); setStatusFilter('all'); setSelectedJobId(null); }}
                  className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'dashboard' ? 'Overview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Filters Bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <FunnelIcon className="w-4 h-4" /> Filters
              </button>
              <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Draft">Draft</option>
                <option value="Applied">Applied</option>
                <option value="Under Review">Under Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Rejected">Rejected</option>
                <option value="Hired">Hired</option>
              </select>
            </div>
          </div>

          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Jobs */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <BriefcaseIcon className="text-indigo-500 w-4 h-4" />
                        </div>
                        <div><p className="text-sm font-semibold text-gray-800">Recent Job Postings</p><p className="text-xs text-gray-400">Latest openings</p></div>
                      </div>
                      <button onClick={() => setActiveTab('jobs')} className="text-xs text-indigo-600 hover:text-indigo-700">View All</button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {jobPostings.slice(0, 3).map((job) => (
                      <div key={job._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div><p className="text-sm font-medium text-gray-800">{job.title}</p><p className="text-xs text-gray-500">{job.department} • {formatDate(job.createdAt)}</p></div>
                        {getStatusBadge(job.status)}
                      </div>
                    ))}
                    {jobPostings.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No job postings yet</p>}
                  </div>
                </div>

                {/* Recent Candidates */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <UserGroupIcon className="text-emerald-500 w-4 h-4" />
                        </div>
                        <div><p className="text-sm font-semibold text-gray-800">Recent Candidates</p><p className="text-xs text-gray-400">Latest applicants</p></div>
                      </div>
                      <button onClick={() => setActiveTab('candidates')} className="text-xs text-indigo-600 hover:text-indigo-700">View All</button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {candidates.slice(0, 3).map((candidate) => (
                      <div key={candidate._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">{candidate.firstName?.charAt(0) || '?'}</div>
                        <div className="flex-1"><p className="text-sm font-medium text-gray-800">{candidate.firstName} {candidate.lastName}</p><p className="text-xs text-gray-500">Applied on {formatDate(candidate.createdAt)}</p></div>
                        {getStatusBadge(candidate.status)}
                      </div>
                    ))}
                    {candidates.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No candidates yet</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Jobs View */}
          {activeTab === 'jobs' && (
            <div className="p-5">
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowNewJobModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                  <PlusIcon className="w-4 h-4" /> Post New Job
                </button>
              </div>
              {filteredJobs.length === 0 ? (
                <div className="text-center py-16">
                  <BriefcaseIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No jobs found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
                    <div key={job._id} className="bg-white rounded-lg border border-gray-100 p-5 hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h4 className="text-base font-semibold text-gray-900">{job.title}</h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{job.department} • {job.jobType} • {job.location || 'Remote'}</p>
                          <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><UserGroupIcon className="w-3.5 h-3.5" /> {job.applicantsCount || 0} applicants</span>
                            <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Closes {formatDate(job.deadline)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveTab('candidates'); setSelectedJobId(job._id); }} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">View Applicants ({job.applicantsCount || 0})</button>
                          {job.status === 'Draft' && <button onClick={() => handlePublishJob(job._id)} className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">Publish</button>}
                          {job.status === 'Open' && <button onClick={() => handleCloseJob(job._id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Close</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Candidates View */}
          {activeTab === 'candidates' && (
            <div className="p-5">
              {filteredCandidates.length === 0 ? (
                <div className="text-center py-16">
                  <UserGroupIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No candidates found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCandidates.map((candidate) => (
                    <div key={candidate._id} className="bg-white rounded-lg border border-gray-100 p-5 hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{candidate.firstName?.charAt(0) || '?'}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                              <h4 className="text-base font-semibold text-gray-900">{candidate.firstName} {candidate.lastName}</h4>
                              {getStatusBadge(candidate.status)}
                            </div>
                            <p className="text-sm text-indigo-600 font-medium mb-2">{candidate.position || 'No position specified'}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              {candidate.email && <span className="flex items-center gap-1"><MailIcon className="w-4 h-4" /> {candidate.email}</span>}
                              {candidate.phone && <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4" /> {candidate.phone}</span>}
                              {candidate.location && <span className="flex items-center gap-1"><LocationMarkerIcon className="w-4 h-4" /> {candidate.location}</span>}
                            </div>
                            {candidate.skills && candidate.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {candidate.skills.slice(0, 4).map((skill, idx) => <Badge key={idx} variant="info">{skill}</Badge>)}
                                {candidate.skills.length > 4 && <Badge>+{candidate.skills.length - 4}</Badge>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[160px]">
                          <select onChange={(e) => handleUpdateCandidateStatus(candidate._id, e.target.value)} value={candidate.status || 'Applied'} className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                            <option value="Applied">Applied</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview Scheduled">Interview Scheduled</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Hired">Hired</option>
                          </select>
                          <button className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">View Profile</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Post New Job</h2>
                <button onClick={() => setShowNewJobModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label><input type="text" value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="e.g., Senior Frontend Developer" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><select value={newJob.department} onChange={(e) => setNewJob({...newJob, department: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">{[ 'Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations' ].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label><select value={newJob.jobType} onChange={(e) => setNewJob({...newJob, jobType: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Contract">Contract</option><option value="Internship">Internship</option><option value="Remote">Remote</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="e.g., Remote, San Francisco" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label><select value={newJob.experienceLevel} onChange={(e) => setNewJob({...newJob, experienceLevel: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="Entry">Entry Level</option><option value="Mid">Mid Level</option><option value="Senior">Senior Level</option><option value="Lead">Lead Level</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label><input type="number" value={newJob.minSalary} onChange={(e) => setNewJob({...newJob, minSalary: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="80000" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label><input type="number" value={newJob.maxSalary} onChange={(e) => setNewJob({...newJob, maxSalary: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="120000" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label><input type="date" value={newJob.deadline} onChange={(e) => setNewJob({...newJob, deadline: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label><textarea value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} rows="4" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Job description..." /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end gap-3">
              <button onClick={() => setShowNewJobModal(false)} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handlePostNewJob} disabled={loading || !newJob.title.trim() || !newJob.description.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">{loading ? 'Posting...' : 'Post Job'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRRecruitment;