import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  BriefcaseIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon as LocationMarkerIcon,
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon,
  DocumentTextIcon,
  EnvelopeIcon as MailIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  HeartIcon as BookmarkIcon,
  ShareIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  ArrowPathIcon as RefreshIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

// Colorful KPI Card Component
const KpiCard = ({ icon: Icon, label, value, sub, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
};

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    teal: 'bg-teal-50 text-teal-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Careers = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [viewingJob, setViewingJob] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    remoteJobs: 0,
    departments: 0
  });

  // Fetch jobs from PUBLIC endpoint
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        console.log('Fetching jobs from public endpoint...');
        
        const response = await axios.get('http://localhost:5000/api/public/jobs');
        
        console.log('Public jobs response:', response.data);
        
        if (response.data.success) {
          const jobsData = response.data.data || [];
          setJobs(jobsData);
          setError(null);
          
          const activeJobsCount = jobsData.filter(job => job.status === 'Open' || job.status === 'Active').length;
          const remoteJobsCount = jobsData.filter(job => 
            job.location?.toLowerCase().includes('remote') || 
            job.jobType?.toLowerCase().includes('remote')
          ).length;
          const uniqueDepts = new Set(jobsData.map(job => job.department)).size;
          
          setStats({
            totalJobs: jobsData.length,
            activeJobs: activeJobsCount,
            remoteJobs: remoteJobsCount,
            departments: uniqueDepts
          });
        } else {
          setError(response.data.error || 'Failed to load jobs');
          await tryAuthenticatedEndpoint();
        }
      } catch (error) {
        console.error('Error fetching from public endpoint:', error.message);
        await tryAuthenticatedEndpoint();
      } finally {
        setLoading(false);
      }
    };

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
            
            setStats({
              totalJobs: openJobs.length,
              activeJobs: openJobs.length,
              remoteJobs: openJobs.filter(job => job.location?.toLowerCase().includes('remote')).length,
              departments: new Set(openJobs.map(job => job.department)).size
            });
            return;
          }
        } catch (authError) {
          console.error('Authenticated endpoint also failed:', authError.message);
        }
      }
      
      setError('Unable to load job openings. Please try again later.');
      setJobs([]);
      setStats({
        totalJobs: 0,
        activeJobs: 0,
        remoteJobs: 0,
        departments: 0
      });
    };

    fetchJobs();
  }, []);

  const departments = ['all', ...new Set(jobs.map(job => job.department).filter(Boolean))];
  const jobTypes = ['all', ...new Set(jobs.map(job => job.jobType).filter(Boolean))];
  const experienceLevels = ['all', ...new Set(jobs.map(job => job.experienceLevel).filter(Boolean))];
  const locations = ['all', ...new Set(jobs.map(job => job.location).filter(Boolean))];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.skillsRequired && job.skillsRequired.some(skill => 
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    
    const matchesDepartment = departmentFilter === 'all' || 
      job.department === departmentFilter;
    
    const matchesJobType = jobTypeFilter === 'all' || 
      job.jobType === jobTypeFilter;
    
    const matchesExperience = experienceFilter === 'all' || 
      job.experienceLevel === experienceFilter;
    
    const matchesLocation = locationFilter === 'all' || 
      job.location === locationFilter;
    
    return matchesSearch && matchesDepartment && matchesJobType && matchesExperience && matchesLocation;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Competitive';
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

  const handleShare = async (job) => {
    const shareText = `Check out this job: ${job.title} at ${job.department}`;
    const shareUrl = `${window.location.origin}/careers/${job._id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Job link copied to clipboard!');
    }
  };

  const getJobTypeBadge = (type) => {
    const variants = {
      'Full-time': 'success',
      'Part-time': 'warning',
      'Contract': 'info',
      'Remote': 'teal',
      'Hybrid': 'purple',
      'Internship': 'orange'
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  const getExperienceBadge = (level) => {
    const variants = {
      'Entry': 'info',
      'Mid': 'purple',
      'Senior': 'orange',
      'Lead': 'danger',
      'Executive': 'danger'
    };
    return <Badge variant={variants[level] || 'default'}>{level} Level</Badge>;
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setJobTypeFilter('all');
    setExperienceFilter('all');
    setLocationFilter('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading career opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Simple without gradient */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Join Our Team
            </h1>
            <p className="text-gray-500 text-lg mb-8">
              Discover exciting career opportunities and help shape the future with us
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by job title, skills, or department..."
                className="w-full pl-12 pr-4 py-3 text-gray-900 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-300 focus:outline-none focus:border-gray-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Colorful Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard 
            icon={BriefcaseIcon} 
            label="Open Positions" 
            value={stats.activeJobs} 
            sub={`Total: ${stats.totalJobs}`} 
            color="blue"
          />
          <KpiCard 
            icon={BuildingOfficeIcon} 
            label="Departments" 
            value={stats.departments} 
            sub="Hiring across teams" 
            color="green"
          />
          <KpiCard 
            icon={UserGroupIcon} 
            label="Remote Friendly" 
            value={stats.remoteJobs} 
            sub="Remote/Hybrid roles" 
            color="purple"
          />
          <KpiCard 
            icon={SparklesIcon} 
            label="Growth" 
            value="100%" 
            sub="Career development" 
            color="orange"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Filters Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-8">
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
                {(departmentFilter !== 'all' || jobTypeFilter !== 'all' || experienceFilter !== 'all' || locationFilter !== 'all') && (
                  <button 
                    onClick={clearAllFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-2"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
              >
                <FunnelIcon className="w-4 h-4" /> 
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <div className={`flex flex-wrap gap-3 ${!showFilters && 'hidden md:flex'}`}>
                <select
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-300 bg-white"
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
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-300 bg-white"
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
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-300 bg-white"
                  value={experienceFilter}
                  onChange={(e) => setExperienceFilter(e.target.value)}
                >
                  {experienceLevels.map(level => (
                    <option key={level} value={level}>
                      {level === 'all' ? 'All Experience Levels' : level}
                    </option>
                  ))}
                </select>

                <select
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-300 bg-white"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>
                      {loc === 'all' ? 'All Locations' : loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(departmentFilter !== 'all' || jobTypeFilter !== 'all' || experienceFilter !== 'all' || locationFilter !== 'all') && (
            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-2">
              {departmentFilter !== 'all' && (
                <Badge variant="info">
                  Department: {departmentFilter}
                  <button onClick={() => setDepartmentFilter('all')} className="ml-2 hover:text-gray-700">×</button>
                </Badge>
              )}
              {jobTypeFilter !== 'all' && (
                <Badge variant="info">
                  Type: {jobTypeFilter}
                  <button onClick={() => setJobTypeFilter('all')} className="ml-2 hover:text-gray-700">×</button>
                </Badge>
              )}
              {experienceFilter !== 'all' && (
                <Badge variant="info">
                  Experience: {experienceFilter}
                  <button onClick={() => setExperienceFilter('all')} className="ml-2 hover:text-gray-700">×</button>
                </Badge>
              )}
              {locationFilter !== 'all' && (
                <Badge variant="info">
                  Location: {locationFilter}
                  <button onClick={() => setLocationFilter('all')} className="ml-2 hover:text-gray-700">×</button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-8">
            <div className="flex gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Note</h3>
                <p className="text-sm text-yellow-700 mt-1">{error}</p>
                <p className="text-xs text-yellow-600 mt-2">
                  You can still browse demo positions. Real positions will appear when the public API is configured.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job Count Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Open Positions
              <span className="text-gray-500 ml-2">({filteredJobs.length})</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {filteredJobs.length === 0 
                ? 'No jobs match your current filters'
                : `${filteredJobs.length} opportunity${filteredJobs.length !== 1 ? 's' : ''} waiting for you`}
            </p>
          </div>
          <button 
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            <RefreshIcon className="w-4 h-4" />
            Reset Filters
          </button>
        </div>

        {/* Job Listings */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <BriefcaseIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-6">
              We don't have any open positions matching your criteria right now.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div 
                key={job._id} 
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 hover:text-gray-700 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="default">{job.department}</Badge>
                          {getJobTypeBadge(job.jobType)}
                          {getExperienceBadge(job.experienceLevel)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatSalary(job.salaryRange?.min, job.salaryRange?.max)}
                        </p>
                        <p className="text-xs text-gray-500">/ year</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
                      <div className="flex items-center text-gray-500 text-sm">
                        <LocationMarkerIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{job.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center text-gray-500 text-sm">
                        <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Posted {formatDate(job.createdAt)}</span>
                      </div>
                      <div className="flex items-center text-gray-500 text-sm">
                        <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {job.deadline 
                            ? `Apply by ${formatDate(job.deadline)}`
                            : 'Open until filled'}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-500 text-sm">
                        <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{job.applicantsCount || 0} applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">{job.description}</p>
                    
                    {job.skillsRequired && job.skillsRequired.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skillsRequired.slice(0, 4).map((skill, idx) => (
                          <Badge key={idx} variant="default">{skill}</Badge>
                        ))}
                        {job.skillsRequired.length > 4 && (
                          <Badge variant="default">+{job.skillsRequired.length - 4} more</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="lg:ml-6 lg:pl-6 lg:border-l lg:border-gray-200 flex-shrink-0">
                    <div className="space-y-3 min-w-[180px]">
                      <button
                        onClick={() => navigate(`/apply/${job._id}`)}
                        className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        Apply Now
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => setViewingJob(job)}
                        className="w-full border border-gray-200 hover:bg-gray-50 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBookmark(job._id)}
                          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                            isBookmarked[job._id]
                              ? 'bg-gray-100 border border-gray-200 text-gray-700'
                              : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          {isBookmarked[job._id] ? (
                            <BookmarkSolidIcon className="h-4 w-4" />
                          ) : (
                            <BookmarkIcon className="h-4 w-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleShare(job)}
                          className="flex-1 flex items-center justify-center py-2 px-3 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600"
                        >
                          <ShareIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action - Simple */}
        <div className="mt-12">
          <div className="bg-gray-100 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Can't find the right role?</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Send us your resume anyway! We're always looking for talented people.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-900 px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              <MailIcon className="h-4 w-4" />
              Send General Application
            </button>
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {viewingJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header - Simple */}
            <div className="bg-gray-800 text-white p-6 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-2">{viewingJob.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{viewingJob.department}</Badge>
                    {getJobTypeBadge(viewingJob.jobType)}
                    {getExperienceBadge(viewingJob.experienceLevel)}
                  </div>
                </div>
                <button
                  onClick={() => setViewingJob(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                      Job Description
                    </h3>
                    <p className="text-gray-700 whitespace-pre-line">{viewingJob.description}</p>
                  </div>

                  {viewingJob.skillsRequired && viewingJob.skillsRequired.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AcademicCapIcon className="h-5 w-5 text-gray-500" />
                        Required Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingJob.skillsRequired.map((skill, index) => (
                          <Badge key={index} variant="default">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingJob.responsibilities && viewingJob.responsibilities.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Responsibilities</h3>
                      <ul className="space-y-2">
                        {viewingJob.responsibilities.map((resp, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700">
                            <CheckCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Job Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <LocationMarkerIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="font-medium text-gray-900">{viewingJob.location || 'Remote'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Posted On</p>
                          <p className="font-medium text-gray-900">{formatDate(viewingJob.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Application Deadline</p>
                          <p className="font-medium text-gray-900">
                            {viewingJob.deadline ? formatDate(viewingJob.deadline) : 'Rolling deadline'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <UserGroupIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Applicants</p>
                          <p className="font-medium text-gray-900">{viewingJob.applicantsCount || 0} applied</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Salary Range</p>
                          <p className="font-medium text-gray-900">
                            {formatSalary(viewingJob.salaryRange?.min, viewingJob.salaryRange?.max)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        navigate(`/apply/${viewingJob._id}`);
                        setViewingJob(null);
                      }}
                      className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Apply Now
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleBookmark(viewingJob._id)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
                        isBookmarked[viewingJob._id]
                          ? 'bg-gray-100 border border-gray-200 text-gray-700'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {isBookmarked[viewingJob._id] ? (
                        <>
                          <BookmarkSolidIcon className="h-4 w-4" />
                          Saved for Later
                        </>
                      ) : (
                        <>
                          <BookmarkIcon className="h-4 w-4" />
                          Save for Later
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleShare(viewingJob)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                    >
                      <ShareIcon className="h-4 w-4" />
                      Share this Job
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SparklesIcon component
const SparklesIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

export default Careers;