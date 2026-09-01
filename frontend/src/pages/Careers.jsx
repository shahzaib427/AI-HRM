import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
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
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

// Colorful KPI Card Component
const KpiCard = ({ icon: Icon, label, value, sub, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    red: 'bg-red-500'
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-5 backdrop-blur-sm hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-indigo-200/70 font-medium mb-2">{label}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
          {sub && <p className="text-xs text-indigo-300/50 mt-1">{sub}</p>}
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
    default: 'bg-white/10 text-indigo-100',
    success: 'bg-emerald-400/10 text-emerald-200',
    warning: 'bg-amber-400/10 text-amber-200',
    danger: 'bg-red-400/10 text-red-200',
    info: 'bg-indigo-400/10 text-indigo-200',
    purple: 'bg-purple-400/10 text-purple-200',
    orange: 'bg-orange-400/10 text-orange-200',
    teal: 'bg-teal-400/10 text-teal-200'
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

  // Fetch jobs from PUBLIC endpoint - ✅ Updated to use axiosInstance
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        console.log('Fetching jobs from public endpoint...');

        // ✅ Updated: Use axiosInstance with /public prefix
        const response = await axiosInstance.get('/public/jobs');

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
        if (error.response?.status === 401) {
          // Not authenticated, try authenticated endpoint
          await tryAuthenticatedEndpoint();
        } else {
          setError('Unable to load job openings. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    const tryAuthenticatedEndpoint = async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        try {
          console.log('Trying authenticated endpoint...');
          // ✅ Updated: Use axiosInstance with /recruitment prefix
          const response = await axiosInstance.get('/recruitment/jobs?status=Open');

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
          if (authError.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
          }
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
      <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-300 mx-auto"></div>
          <p className="mt-4 text-indigo-200/80 font-medium">Loading career opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2c2470] to-[#1e1b4b] relative overflow-hidden">
      <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-500/20 rounded-full blur-[120px]" />

      {/* Hero Section */}
      <div className="relative border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block text-xs font-semibold tracking-widest text-indigo-300 uppercase mb-3">
              AI-HRM Careers
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Join Our Team
            </h1>
            <p className="text-indigo-200/80 text-lg mb-8">
              Discover exciting career opportunities and help shape the future with us
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-300/60" />
              <input
                type="text"
                placeholder="Search by job title, skills, or department..."
                className="w-full pl-12 pr-4 py-3 text-white placeholder-indigo-300/40 bg-white/5 border border-white/15 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400/40 focus:outline-none focus:border-indigo-300/60 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Colorful Stats Cards */}
      <div className="relative max-w-7xl mx-auto px-6 -mt-8 mb-8">
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
      <div className="relative max-w-7xl mx-auto px-6 pb-12">
        {/* Filters Bar */}
        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm mb-8">
          <div className="p-4 border-b border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-indigo-300/60" />
                <span className="text-sm font-medium text-indigo-100">Filters</span>
                {(departmentFilter !== 'all' || jobTypeFilter !== 'all' || experienceFilter !== 'all' || locationFilter !== 'all') && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-indigo-300/70 hover:text-indigo-200 ml-2"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-100 bg-white/5 border border-white/15 rounded-lg hover:bg-white/10 transition-colors md:hidden"
              >
                <FunnelIcon className="w-4 h-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <div className={`flex flex-wrap gap-3 ${!showFilters && 'hidden md:flex'}`}>
                <select
                  className="px-3 py-2 text-sm border border-white/15 rounded-lg focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 bg-white/5 text-white [&>option]:bg-[#1e1b4b] [&>option]:text-white"
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
                  className="px-3 py-2 text-sm border border-white/15 rounded-lg focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 bg-white/5 text-white [&>option]:bg-[#1e1b4b] [&>option]:text-white"
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
                  className="px-3 py-2 text-sm border border-white/15 rounded-lg focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 bg-white/5 text-white [&>option]:bg-[#1e1b4b] [&>option]:text-white"
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
                  className="px-3 py-2 text-sm border border-white/15 rounded-lg focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300/60 bg-white/5 text-white [&>option]:bg-[#1e1b4b] [&>option]:text-white"
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
            <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex flex-wrap gap-2">
              {departmentFilter !== 'all' && (
                <Badge variant="info">
                  Department: {departmentFilter}
                  <button onClick={() => setDepartmentFilter('all')} className="ml-2 hover:text-white">×</button>
                </Badge>
              )}
              {jobTypeFilter !== 'all' && (
                <Badge variant="info">
                  Type: {jobTypeFilter}
                  <button onClick={() => setJobTypeFilter('all')} className="ml-2 hover:text-white">×</button>
                </Badge>
              )}
              {experienceFilter !== 'all' && (
                <Badge variant="info">
                  Experience: {experienceFilter}
                  <button onClick={() => setExperienceFilter('all')} className="ml-2 hover:text-white">×</button>
                </Badge>
              )}
              {locationFilter !== 'all' && (
                <Badge variant="info">
                  Location: {locationFilter}
                  <button onClick={() => setLocationFilter('all')} className="ml-2 hover:text-white">×</button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-amber-400/10 border border-amber-300/30 rounded-xl p-5 mb-8">
            <div className="flex gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-amber-200">Note</h3>
                <p className="text-sm text-amber-200/80 mt-1">{error}</p>
                <p className="text-xs text-amber-200/60 mt-2">
                  You can still browse demo positions. Real positions will appear when the public API is configured.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job Count Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Open Positions
              <span className="text-indigo-300/60 ml-2">({filteredJobs.length})</span>
            </h2>
            <p className="text-sm text-indigo-200/60 mt-1">
              {filteredJobs.length === 0
                ? 'No jobs match your current filters'
                : `${filteredJobs.length} opportunity${filteredJobs.length !== 1 ? 's' : ''} waiting for you`}
            </p>
          </div>
          <button
            onClick={clearAllFilters}
            className="text-sm text-indigo-300/70 hover:text-indigo-200 font-medium flex items-center gap-1"
          >
            <RefreshIcon className="w-4 h-4" />
            Reset Filters
          </button>
        </div>

        {/* Job Listings */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
            <BriefcaseIcon className="h-16 w-16 text-indigo-300/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-indigo-200/60 mb-6">
              We don't have any open positions matching your criteria right now.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 rounded-lg font-semibold transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div
                key={job._id}
                className="bg-white/5 rounded-xl border border-white/10 p-6 backdrop-blur-sm hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-indigo-300 hover:text-indigo-200 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="default">{job.department}</Badge>
                          {getJobTypeBadge(job.jobType)}
                          {getExperienceBadge(job.experienceLevel)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {formatSalary(job.salaryRange?.min, job.salaryRange?.max)}
                        </p>
                        <p className="text-xs text-indigo-300/50">/ year</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
                      <div className="flex items-center text-indigo-200/70 text-sm">
                        <LocationMarkerIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{job.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center text-indigo-200/70 text-sm">
                        <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Posted {formatDate(job.createdAt)}</span>
                      </div>
                      <div className="flex items-center text-indigo-200/70 text-sm">
                        <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {job.deadline
                            ? `Apply by ${formatDate(job.deadline)}`
                            : 'Open until filled'}
                        </span>
                      </div>
                      <div className="flex items-center text-indigo-200/70 text-sm">
                        <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{job.applicantsCount || 0} applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <p className="text-indigo-100/70 text-sm line-clamp-2 mb-4">{job.description}</p>

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

                  <div className="lg:ml-6 lg:pl-6 lg:border-l lg:border-white/10 flex-shrink-0">
                    <div className="space-y-3 min-w-[180px]">
                      <button
                        onClick={() => navigate(`/apply/${job._id}`)}
                        className="w-full bg-indigo-400 hover:bg-indigo-300 text-indigo-950 py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        Apply Now
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setViewingJob(job)}
                        className="w-full border border-white/15 hover:bg-white/10 text-indigo-100 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBookmark(job._id)}
                          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                            isBookmarked[job._id]
                              ? 'bg-indigo-400/10 border border-indigo-300/40 text-indigo-300'
                              : 'border border-white/15 hover:bg-white/10 text-indigo-200/70'
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
                          className="flex-1 flex items-center justify-center py-2 px-3 border border-white/15 hover:bg-white/10 rounded-lg text-indigo-200/70"
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

        {/* Call to Action */}
        <div className="mt-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-2">Can't find the right role?</h3>
            <p className="text-indigo-200/70 mb-6 max-w-md mx-auto">
              Send us your resume anyway! We're always looking for talented people.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-2 bg-indigo-400 text-indigo-950 hover:bg-indigo-300 px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              <MailIcon className="h-4 w-4" />
              Send General Application
            </button>
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {viewingJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#211d54] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600/40 to-indigo-500/20 border-b border-white/10 text-white p-6 flex-shrink-0">
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
                  className="text-indigo-200/70 hover:text-white transition-colors"
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
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <DocumentTextIcon className="h-5 w-5 text-indigo-300/60" />
                      Job Description
                    </h3>
                    <p className="text-indigo-100/80 whitespace-pre-line">{viewingJob.description}</p>
                  </div>

                  {viewingJob.skillsRequired && viewingJob.skillsRequired.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <AcademicCapIcon className="h-5 w-5 text-indigo-300/60" />
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
                      <h3 className="text-lg font-semibold text-white mb-3">Key Responsibilities</h3>
                      <ul className="space-y-2">
                        {viewingJob.responsibilities.map((resp, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-indigo-100/80">
                            <CheckCircleIcon className="h-5 w-5 text-indigo-300/60 flex-shrink-0 mt-0.5" />
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="text-base font-semibold text-white mb-4">Job Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <LocationMarkerIcon className="h-5 w-5 text-indigo-300/50 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-indigo-300/50">Location</p>
                          <p className="font-medium text-white">{viewingJob.location || 'Remote'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-indigo-300/50 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-indigo-300/50">Posted On</p>
                          <p className="font-medium text-white">{formatDate(viewingJob.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <ClockIcon className="h-5 w-5 text-indigo-300/50 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-indigo-300/50">Application Deadline</p>
                          <p className="font-medium text-white">
                            {viewingJob.deadline ? formatDate(viewingJob.deadline) : 'Rolling deadline'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <UserGroupIcon className="h-5 w-5 text-indigo-300/50 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-indigo-300/50">Applicants</p>
                          <p className="font-medium text-white">{viewingJob.applicantsCount || 0} applied</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CurrencyDollarIcon className="h-5 w-5 text-indigo-300/50 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-indigo-300/50">Salary Range</p>
                          <p className="font-medium text-white">
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
                      className="w-full bg-indigo-400 hover:bg-indigo-300 text-indigo-950 py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      Apply Now
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleBookmark(viewingJob._id)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
                        isBookmarked[viewingJob._id]
                          ? 'bg-indigo-400/10 border border-indigo-300/40 text-indigo-300'
                          : 'border border-white/15 hover:bg-white/10 text-indigo-100'
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
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-white/15 hover:bg-white/10 rounded-lg text-indigo-100 transition-colors"
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

export default Careers;