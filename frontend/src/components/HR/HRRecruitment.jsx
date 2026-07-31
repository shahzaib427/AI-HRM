import React, { useState, useEffect, useCallback } from 'react';
import {
  BriefcaseIcon, UserGroupIcon, CalendarIcon, CheckCircleIcon,
  ClockIcon, XCircleIcon, PlusIcon,
  MagnifyingGlassIcon as SearchIcon, DocumentTextIcon,
  EnvelopeIcon as MailIcon, PhoneIcon, MapPinIcon,
  ExclamationCircleIcon, ArrowPathIcon as RefreshIcon,
  UserIcon, CodeBracketIcon, EyeIcon,
  TrashIcon, ChartBarIcon, EnvelopeIcon, CalendarDaysIcon,
  XMarkIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon,
  TrophyIcon, RocketLaunchIcon, BeakerIcon, ArrowDownTrayIcon,
  AcademicCapIcon, BriefcaseIcon as WorkIcon, ArrowLeftIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../utils/axiosInstance';

// Helper function to safely render text values (prevents object rendering errors)
const safeText = (value, defaultValue = 'N/A') => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'object') {
    if (value.years !== undefined) return String(value.years);
    if (value.toString && value.toString !== Object.prototype.toString) {
      return value.toString();
    }
    return defaultValue;
  }
  return String(value);
};

// Helper to safely get experience years
const getExperienceYears = (exp) => {
  if (exp === null || exp === undefined) return null;
  if (typeof exp === 'object') {
    return exp.years !== undefined ? exp.years : null;
  }
  return exp;
};

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// ATS Score Badge Component
const ATSScoreBadge = ({ score, size = 'md', loading = false }) => {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 animate-pulse">
        <BeakerIcon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">Analyzing…</span>
      </div>
    );
  }

  if (score === null || score === undefined) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100">
        <ChartBarIcon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">Not analyzed</span>
      </div>
    );
  }

  const cfg =
    score >= 60
      ? { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: 'text-emerald-700', label: 'Strong Match' }
      : score >= 40
      ? { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'text-amber-700', label: 'Medium Match' }
      : { bg: 'bg-red-100', text: 'text-red-800', icon: 'text-red-700', label: 'Weak Match' };

  const sz = { sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-base' };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg ${cfg.bg} ${sz[size]}`}>
      <ChartBarIcon className={`w-4 h-4 ${cfg.icon}`} />
      <span className={`font-semibold ${cfg.text}`}>{Math.round(score)}%</span>
      <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ value }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div
      className={`h-2.5 rounded-full transition-all duration-700 ${
        value >= 60 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
      }`}
      style={{ width: `${value}%` }}
    />
  </div>
);

// KPI Card Component
const KPICard = ({ icon: Icon, label, value, iconBg }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{safeText(value, '—')}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// ATS Sub-scores panel Component
const ATSSubScores = ({ analysis }) => {
  if (!analysis) return null;
  const bars = [
    { label: 'Skills Match', val: analysis.sub_scores?.skills ?? analysis.skills_score ?? 0 },
    { label: 'Experience', val: analysis.sub_scores?.experience ?? analysis.experience_score ?? 0 },
    { label: 'Keywords', val: analysis.sub_scores?.keywords ?? analysis.keyword_score ?? 0 },
    { label: 'Education', val: analysis.sub_scores?.education ?? analysis.education_score ?? 0 },
  ];
  return (
    <div className="space-y-3">
      {bars.map(({ label, val }) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">{label}</span>
            <span className="font-semibold text-gray-800">{Math.round(val)}%</span>
          </div>
          <ProgressBar value={val} />
        </div>
      ))}
    </div>
  );
};

// Main HR Recruitment Component
const HRRecruitment = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [atsFilter, setAtsFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewingResume, setViewingResume] = useState(false);
  const [resumeFileUrl, setResumeFileUrl] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // ATS state
  const [atsScores, setAtsScores] = useState({});
  const [atsAnalyses, setAtsAnalyses] = useState({});
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [atsStats, setAtsStats] = useState(null);

  // Delete job
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Delete candidate
  const [showDeleteCandidateConfirm, setShowDeleteCandidateConfirm] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [deletingCandidate, setDeletingCandidate] = useState(false);

  // Interview modal state
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [candidateForInterview, setCandidateForInterview] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState({
    date: '', time: '', interviewType: 'Virtual',
    meetingLink: '', interviewer: '', notes: '',
  });
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // Data
  const [jobPostings, setJobPostings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruitmentStats, setRecruitmentStats] = useState({
    totalJobs: 0, activeJobs: 0, totalCandidates: 0,
    hiredThisMonth: 0, interviewScheduled: 0, rejectionRate: '0%',
  });

  const [newJob, setNewJob] = useState({
    title: '', department: 'Engineering', jobType: 'Full-time',
    location: '', minSalary: '', maxSalary: '', description: '',
    requirements: [''], responsibilities: [''], benefits: [],
    experienceLevel: 'Mid', deadline: '', skillsRequired: [],
  });

  const itemsPerPage = 6;

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    const d = new Date(ds);
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Fetch recruitment data
  const fetchRecruitmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, jobsRes, candidatesRes] = await Promise.all([
        axiosInstance.get('/recruitment/dashboard'),
        axiosInstance.get('/recruitment/jobs'),
        axiosInstance.get('/recruitment/candidates'),
      ]);

      if (statsRes.data.success) setRecruitmentStats(statsRes.data.data.stats || {});
      if (jobsRes.data.success) setJobPostings(jobsRes.data.data || []);
      if (candidatesRes.data.success) {
        const cands = candidatesRes.data.data || [];
        setCandidates(cands);
        fetchBulkATSScores(cands.map(c => c._id));
      }
    } catch (err) {
      if (err.response?.status === 401) setError('Session expired. Please login again.');
      else if (err.response?.status === 403) setError('Access denied — HR permissions required.');
      else setError('Failed to load recruitment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bulk ATS scores
  const fetchBulkATSScores = async (ids) => {
    if (!ids.length) return;
    try {
      const res = await axiosInstance.post('/ats/bulk-scores', { candidate_ids: ids });
      if (res.data.success) setAtsScores(res.data.data || {});
    } catch (_) {}
  };

  // Fetch ATS stats
  const fetchATSStats = async () => {
    try {
      const res = await axiosInstance.get('/ats/stats');
      if (res.data.success) setAtsStats(res.data.data);
    } catch (_) {}
  };

  useEffect(() => { fetchRecruitmentData(); fetchATSStats(); }, []);

  // Trigger ATS analysis
  const triggerATSAnalysis = async (candidateId, forceReanalyze = false) => {
    setAnalyzingIds(prev => new Set([...prev, candidateId]));
    try {
      const res = await axiosInstance.post(`/ats/analyze/${candidateId}`, { force_reanalyze: forceReanalyze });
      if (res.data.success) {
        const analysis = res.data.data;
        setAtsScores(prev => ({ ...prev, [candidateId]: analysis.overall_score }));
        setAtsAnalyses(prev => ({ ...prev, [candidateId]: analysis }));
        if (analysis.email_triggered) {
          showNotification(`✨ Shortlist email sent to candidate! (ATS: ${Math.round(analysis.overall_score)}%)`, 'success');
        }
        if (selectedCandidate?._id === candidateId) {
          setSelectedCandidate(prev => ({ ...prev, _atsAnalysis: analysis }));
        }
        fetchATSStats();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'ATS analysis failed', 'error');
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(candidateId); return s; });
    }
  };

  // Send shortlist email
  const sendShortlistEmail = async (candidateId) => {
    setSendingEmail(true);
    try {
      const res = await axiosInstance.post(`/ats/send-shortlist-email/${candidateId}`);
      if (res.data.success) {
        showNotification('Shortlist notification email sent!', 'success');
        setAtsAnalyses(prev => ({
          ...prev,
          [candidateId]: { ...(prev[candidateId] || {}), email_notification_sent: true },
        }));
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Email failed', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // Update candidate status
  const handleUpdateCandidateStatus = async (candidateId, newStatus) => {
    try {
      const res = await axiosInstance.put(`/recruitment/candidates/${candidateId}/status`, { status: newStatus });
      if (res.data.success) {
        showNotification(`Status updated to ${newStatus}`, 'success');
        fetchRecruitmentData();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setDeletingCandidate(true);
    try {
      await axiosInstance.delete(`/recruitment/candidates/${candidateToDelete._id}`);
      showNotification(`Candidate "${candidateToDelete.firstName} ${candidateToDelete.lastName}" deleted`);
      setShowDeleteCandidateConfirm(false);
      setCandidateToDelete(null);
      if (showCandidateModal && selectedCandidate?._id === candidateToDelete._id) {
        setShowCandidateModal(false);
        setSelectedCandidate(null);
      }
      fetchRecruitmentData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeletingCandidate(false);
    }
  };

  // Validate interview form
const isInterviewFormValid = () => {
  const { date, time, meetingLink, interviewer, interviewType } = interviewDetails;
  return (
    date &&
    time &&
    interviewer?.trim() &&
    (interviewType === 'Virtual' ? meetingLink?.trim() : true)
  );
};

  // Show confirmation dialog before sending email
  const handleConfirmSendEmail = () => {
    if (!isInterviewFormValid()) {
      showNotification('Please fill all required fields: Date, Time, Meeting Link, Interviewer Name', 'error');
      return;
    }
    setShowEmailConfirm(true);
  };

  // Send interview invitation email
// ✅ REPLACE WITH THIS (real API call):
const sendInterviewInvitation = async () => {
  if (!candidateForInterview) return;
  setEmailSending(true);
  try {
    const res = await axiosInstance.post(
      `/recruitment/candidates/${candidateForInterview._id}/schedule-interview`,
      {
        date: interviewDetails.date,
        time: interviewDetails.time,
        interviewType: interviewDetails.interviewType,
        meetingLink: interviewDetails.meetingLink,
        interviewer: interviewDetails.interviewer,
        notes: interviewDetails.notes,
        sendEmail: true,
        rating: 1,
      }
    );

    if (res.data.success) {
      setEmailSentSuccess(true);
      setShowEmailConfirm(false);
      showNotification(
        `Interview invitation sent to ${candidateForInterview.firstName}!`,
        'success'
      );
      await handleUpdateCandidateStatus(candidateForInterview._id, 'Interview Scheduled');
      setTimeout(() => {
        setShowInterviewModal(false);
        setCandidateForInterview(null);
        setInterviewDetails({
          date: '', time: '', interviewType: 'Virtual',
          meetingLink: '', interviewer: '', notes: '',
        });
        setEmailSentSuccess(false);
        setEmailSending(false);
      }, 1500);
    }
  } catch (err) {
    showNotification(
      err.response?.data?.message || 'Failed to send interview invitation',
      'error'
    );
    setEmailSending(false);
    setShowEmailConfirm(false);
  }
};
  // Back button handler
  const handleBackToCandidate = () => {
    if (window.confirm('Go back to candidate profile? Any unsaved interview details will be lost.')) {
      setShowInterviewModal(false);
      setCandidateForInterview(null);
      setInterviewDetails({
        date: '', time: '', interviewType: 'Virtual',
        meetingLink: '', interviewer: '', notes: '',
      });
    }
  };

  // Get analysis for candidate
  const getAnalysis = (candidateId) =>
    atsAnalyses[candidateId] ||
    candidates.find(c => c._id === candidateId)?._atsAnalysis ||
    null;

  // View candidate profile
  const handleViewProfile = (candidate) => {
    setSelectedCandidate({
      ...candidate,
      _atsAnalysis: atsAnalyses[candidate._id] || null,
    });
    setShowCandidateModal(true);
    setViewingResume(false);
    if (!atsScores[candidate._id] && atsScores[candidate._id] !== 0) {
      setTimeout(() => triggerATSAnalysis(candidate._id), 500);
    }
  };

  // View resume
  const handleViewResume = async (candidateId) => {
    try {
      setViewingResume(true);
      const res = await axiosInstance.get(`/recruitment/candidates/${candidateId}/resume`, { responseType: 'blob' });
      if (res.data?.size > 0) {
        const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
        setResumeFileUrl(URL.createObjectURL(blob));
        triggerATSAnalysis(candidateId);
      }
    } catch (_) {
      showNotification('Failed to load resume', 'error');
      setViewingResume(false);
    }
  };

  // Download resume
  const handleDownloadResume = async (candidateId, candidateName) => {
    try {
      const res = await axiosInstance.get(`/recruitment/candidates/${candidateId}/resume`, { responseType: 'blob' });
      if (res.data?.size > 0) {
        const ct = res.headers['content-type'];
        const ext = ct?.includes('pdf') ? 'pdf' : ct?.includes('docx') ? 'docx' : 'doc';
        const url = URL.createObjectURL(new Blob([res.data], { type: ct }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${candidateName.replace(/\s/g, '_')}_Resume.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (_) { showNotification('No resume found', 'error'); }
  };

  // Post new job
  const handlePostNewJob = async () => {
    try {
      setLoading(true);
      const payload = {
        title: newJob.title,
        department: newJob.department,
        jobType: newJob.jobType,
        location: newJob.location,
        description: newJob.description,
        experienceLevel: newJob.experienceLevel,
        requirements: newJob.requirements.filter(r => r.trim()),
        responsibilities: newJob.responsibilities.filter(r => r.trim()),
        benefits: newJob.benefits,
        skillsRequired: newJob.skillsRequired,
        minSalary: newJob.minSalary ? Number(newJob.minSalary) : 0,
        maxSalary: newJob.maxSalary ? Number(newJob.maxSalary) : 0,
        salaryRange: {
          min: newJob.minSalary ? Number(newJob.minSalary) : 0,
          max: newJob.maxSalary ? Number(newJob.maxSalary) : 0,
        },
      };
      if (newJob.deadline && newJob.deadline.trim()) {
        payload.deadline = new Date(newJob.deadline).toISOString();
      }

      const res = await axiosInstance.post('/recruitment/jobs', payload);
      if (res.data.success) {
        showNotification('Job posted successfully!');
        setShowNewJobModal(false);
        setNewJob({
          title: '', department: 'Engineering', jobType: 'Full-time',
          location: '', minSalary: '', maxSalary: '', description: '',
          requirements: [''], responsibilities: [''], benefits: [],
          experienceLevel: 'Mid', deadline: '', skillsRequired: [],
        });
        fetchRecruitmentData();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to post job', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete job
  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/recruitment/jobs/${jobToDelete._id}`);
      showNotification(`Job "${jobToDelete.title}" deleted`);
      setShowDeleteConfirm(false);
      setJobToDelete(null);
      fetchRecruitmentData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Publish job
  const handlePublishJob = async (id) => {
    try {
      const res = await axiosInstance.put(`/recruitment/jobs/${id}/publish`);
      if (res.data.success) { showNotification('Job published!'); fetchRecruitmentData(); }
    } catch (err) { showNotification(err.response?.data?.message || 'Publish failed', 'error'); }
  };

  // Close job
  const handleCloseJob = async (id) => {
    try {
      const res = await axiosInstance.put(`/recruitment/jobs/${id}/close`);
      if (res.data.success) { showNotification('Job closed'); fetchRecruitmentData(); }
    } catch (err) { showNotification(err.response?.data?.message || 'Close failed', 'error'); }
  };

  // Derived data
  const candidatesWithScores = candidates.map(c => ({
    ...c,
    atsScore: atsScores[c._id] ?? null,
    _atsAnalysis: atsAnalyses[c._id] ?? null,
  }));

  const filteredCandidates = candidatesWithScores.filter(c => {
    const q = searchTerm.toLowerCase();
    const ms = !searchTerm || c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const ss = statusFilter === 'all' || c.status === statusFilter;
    const as = atsFilter === 'all' ||
      (atsFilter === 'high' && (c.atsScore ?? 0) >= 60) ||
      (atsFilter === 'medium' && (c.atsScore ?? 0) >= 40 && (c.atsScore ?? 0) < 60) ||
      (atsFilter === 'low' && (c.atsScore ?? 0) < 40);
    return ms && ss && as;
  });

  const filteredJobs = jobPostings.filter(j => {
    const q = searchTerm.toLowerCase();
    const ms = !searchTerm || j.title?.toLowerCase().includes(q) || j.department?.toLowerCase().includes(q);
    const ss = statusFilter === 'all' || j.status === statusFilter;
    return ms && ss;
  });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const validScores = candidatesWithScores.filter(c => c.atsScore !== null);
  const avgATS = validScores.length ? Math.round(validScores.reduce((s, c) => s + c.atsScore, 0) / validScores.length) : 0;
  const strongMatches = candidatesWithScores.filter(c => (c.atsScore ?? 0) >= 60).length;
  const eligibleCount = candidatesWithScores.filter(c => (c.atsScore ?? 0) >= 60).length;

  const getStatusBadge = (status) => {
    const v = {
      Open: 'success', Active: 'success', Closed: 'danger', Draft: 'default',
      Applied: 'info', 'Under Review': 'warning', Shortlisted: 'purple',
      'Interview Scheduled': 'info', Rejected: 'danger', Hired: 'success',
    };
    return <Badge variant={v[status] || 'default'}>{status || 'Unknown'}</Badge>;
  };

  if (loading && !jobPostings.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading recruitment data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-sm ${notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200' :
              notification.type === 'error' ? 'bg-red-50 border border-red-200' :
                'bg-blue-50 border border-blue-200'}`}>
            {notification.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {notification.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />}
            {notification.type === 'info' && <ExclamationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            <p className="text-sm font-medium text-gray-800 flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)}><XMarkIcon className="w-4 h-4 text-gray-400" /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BriefcaseIcon className="text-indigo-600 w-6 h-6" /> Recruitment Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage jobs, candidates, and AI-powered ATS scoring</p>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <SparklesIcon className="w-4 h-4" /> AI ATS Active
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          <KPICard icon={BriefcaseIcon} label="Total Jobs" value={recruitmentStats.totalJobs} iconBg="bg-indigo-500" />
          <KPICard icon={UserGroupIcon} label="Total Applicants" value={recruitmentStats.totalCandidates} iconBg="bg-emerald-500" />
          <KPICard icon={CheckCircleIcon} label="New Hires" value={recruitmentStats.hiredThisMonth} iconBg="bg-green-500" />
          <KPICard icon={CalendarIcon} label="Interviews" value={recruitmentStats.interviewScheduled} iconBg="bg-amber-500" />
          <KPICard icon={ChartBarIcon} label="Avg ATS Score" value={validScores.length ? `${avgATS}%` : '—'} iconBg="bg-purple-500" />
        </div>

        {/* ATS Status Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <RocketLaunchIcon className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">✨ Real AI-Powered ATS Active</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Resumes are analyzed by AI. Candidates scoring ≥ 60% receive automatic shortlist notifications. &nbsp;
                <strong>{strongMatches}</strong> strong matches · <strong>{eligibleCount}</strong> eligible ·
                avg score <strong>{validScores.length ? `${avgATS}%` : 'pending'}</strong>
              </p>
            </div>
            <TrophyIcon className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          </div>
        </div>

        {/* Main panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-100">
            <nav className="flex gap-1 px-4">
              {[
                { id: 'dashboard', label: 'Overview', icon: BriefcaseIcon },
                { id: 'jobs', label: 'Jobs', icon: BriefcaseIcon },
                { id: 'candidates', label: 'Candidates', icon: UserGroupIcon },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm('');
                    setStatusFilter('all');
                    setAtsFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Filters */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/30">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name, email, or position…"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
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
              {activeTab === 'candidates' && (
                <select
                  className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white"
                  value={atsFilter}
                  onChange={e => setAtsFilter(e.target.value)}
                >
                  <option value="all">All ATS Scores</option>
                  <option value="high">Strong Match (≥60%)</option>
                  <option value="medium">Medium Match (40–59%)</option>
                  <option value="low">Weak Match (&lt;40%)</option>
                </select>
              )}
              <button
                onClick={fetchRecruitmentData}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Recent Job Postings</p>
                    <button onClick={() => setActiveTab('jobs')} className="text-xs text-indigo-600 hover:text-indigo-700">View All →</button>
                  </div>
                  <div className="p-4 space-y-3">
                    {jobPostings.slice(0, 4).map(job => (
                      <div key={job._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{safeText(job.title)}</p>
                          <p className="text-xs text-gray-500">{safeText(job.department)} · {formatDate(job.createdAt)}</p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                    ))}
                    {!jobPostings.length && <p className="text-gray-400 text-sm text-center py-4">No jobs yet</p>}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Recent Candidates</p>
                    <button onClick={() => setActiveTab('candidates')} className="text-xs text-indigo-600 hover:text-indigo-700">View All →</button>
                  </div>
                  <div className="p-4 space-y-3">
                    {candidatesWithScores.slice(0, 4).map(c => (
                      <div key={c._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {safeText(c.firstName?.charAt(0))}{safeText(c.lastName?.charAt(0))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{safeText(c.firstName)} {safeText(c.lastName)}</p>
                          <p className="text-xs text-gray-500 truncate">{safeText(c.jobId?.title, 'Position N/A')}</p>
                        </div>
                        <ATSScoreBadge score={c.atsScore} size="sm" loading={analyzingIds.has(c._id)} />
                      </div>
                    ))}
                    {!candidates.length && <p className="text-gray-400 text-sm text-center py-4">No candidates yet</p>}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">Real-Time ATS Insights</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      <strong>{strongMatches}</strong> candidates are strong matches (ATS ≥ 60%).
                      &nbsp;<strong>{eligibleCount}</strong> candidates are eligible for interview.
                      &nbsp;<strong>{safeText(atsStats?.emails_sent, 0)}</strong> total shortlist emails sent.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() => { setActiveTab('candidates'); setAtsFilter('high'); }}
                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        View Strong Matches
                      </button>
                      <button
                        onClick={fetchATSStats}
                        className="text-xs px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50"
                      >
                        Refresh ATS Stats
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600">{validScores.length ? `${avgATS}%` : '—'}</div>
                    <div className="text-xs text-gray-500">Avg ATS Score</div>
                    <div className="text-xs text-gray-400 mt-1">{validScores.length} analyzed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="p-6">
              <div className="flex justify-end mb-5">
                <button
                  onClick={() => setShowNewJobModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" /> Post New Job
                </button>
              </div>
              {!filteredJobs.length ? (
                <div className="text-center py-16">
                  <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No jobs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map(job => (
                    <div key={job._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h4 className="text-base font-semibold text-gray-900">{safeText(job.title)}</h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-gray-500 mb-1">
                            {safeText(job.department)} · {safeText(job.jobType)} · {safeText(job.location, 'Remote')}
                          </p>
                          {(job.salaryRange?.min > 0 || job.salaryRange?.max > 0) && (
                            <p className="text-sm text-emerald-600 font-medium mb-1">
                              ${safeText(job.salaryRange?.min)?.toLocaleString()} – ${safeText(job.salaryRange?.max)?.toLocaleString()}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{safeText(job.description)}</p>
                          {job.requirements?.filter(r => r && r.trim()).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {job.requirements.filter(r => r && r.trim()).slice(0, 3).map((req, i) => (
                                <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{safeText(req)}</span>
                              ))}
                              {job.requirements.filter(r => r && r.trim()).length > 3 && (
                                <span className="text-xs text-gray-400">+{job.requirements.filter(r => r && r.trim()).length - 3} more</span>
                              )}
                            </div>
                          )}
                          <div className="flex gap-4 mt-3 text-xs text-gray-400">
                            <span><UserGroupIcon className="w-3.5 h-3.5 inline mr-1" />{safeText(job.applicantsCount, 0)} applicants</span>
                            {job.deadline && new Date(job.deadline).getFullYear() > 1970 && (
                              <span><CalendarIcon className="w-3.5 h-3.5 inline mr-1" />Closes {formatDate(job.deadline)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {job.status === 'Draft' && (
                            <button onClick={() => handlePublishJob(job._id)} className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100">
                              Publish
                            </button>
                          )}
                          {job.status === 'Open' && (
                            <button onClick={() => handleCloseJob(job._id)} className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100">
                              Close
                            </button>
                          )}
                          <button
                            onClick={() => { setJobToDelete(job); setShowDeleteConfirm(true); }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"
                          >
                            <TrashIcon className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Candidates Tab */}
          {activeTab === 'candidates' && (
            <div className="p-6">
              {!filteredCandidates.length ? (
                <div className="text-center py-16">
                  <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No candidates found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedCandidates.map(candidate => {
                      const score = candidate.atsScore;
                      const isAnalyzing = analyzingIds.has(candidate._id);
                      const isEligible = (score ?? 0) >= 60;
                      const analysis = getAnalysis(candidate._id);
                      const expYears = getExperienceYears(candidate.totalExperience || candidate.experience);

                      return (
                        <div
                          key={candidate._id}
                          className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all ${isEligible ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200'}`}
                        >
                          <div className="flex flex-col md:flex-row gap-5">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
                                {safeText(candidate.firstName?.charAt(0))}{safeText(candidate.lastName?.charAt(0))}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 flex-wrap mb-1">
                                  <h4 className="text-base font-bold text-gray-900">{safeText(candidate.firstName)} {safeText(candidate.lastName)}</h4>
                                  {getStatusBadge(candidate.status)}
                                </div>
                                <p className="text-sm text-indigo-600 font-medium mb-2">{safeText(candidate.jobId?.title, 'Position not specified')}</p>

                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <ATSScoreBadge score={score} loading={isAnalyzing} />
                                  {isEligible && !isAnalyzing && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg">
                                      <SparklesIcon className="w-3 h-3" /> Eligible for Interview
                                    </span>
                                  )}
                                  {analysis?.email_notification_sent && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
                                      <EnvelopeIcon className="w-3 h-3" /> Notified
                                    </span>
                                  )}
                                  {score === null && !isAnalyzing && (
                                    <button
                                      onClick={() => triggerATSAnalysis(candidate._id)}
                                      className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                                    >
                                      <BeakerIcon className="w-3 h-3" /> Run ATS
                                    </button>
                                  )}
                                  {score !== null && !isAnalyzing && (
                                    <button
                                      onClick={() => triggerATSAnalysis(candidate._id, true)}
                                      className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                                    >
                                      <RefreshIcon className="w-3 h-3" /> Re-analyze
                                    </button>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <MailIcon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate max-w-[200px]">{safeText(candidate.email)}</span>
                                  </span>
                                  {candidate.phone && (
                                    <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4" />{safeText(candidate.phone)}</span>
                                  )}
                                  {candidate.location && (
                                    <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" />{safeText(candidate.location)}</span>
                                  )}
                                  {expYears !== null && (
                                    <span className="flex items-center gap-1"><WorkIcon className="w-4 h-4" />{expYears} yrs exp</span>
                                  )}
                                </div>

                                {candidate.education && (() => {
                                  const edu = candidate.education;
                                  if (!edu) return null;
                                  if (Array.isArray(edu) && edu.length > 0) {
                                    const firstEdu = edu[0];
                                    if (typeof firstEdu === 'object') {
                                      return (
                                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                          <AcademicCapIcon className="w-3.5 h-3.5" />
                                          {safeText(firstEdu.degree)} {safeText(firstEdu.field)} — {safeText(firstEdu.institution)}
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                          <AcademicCapIcon className="w-3.5 h-3.5" />{safeText(firstEdu)}
                                        </div>
                                      );
                                    }
                                  } else if (typeof edu === 'string') {
                                    return (
                                      <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                        <AcademicCapIcon className="w-3.5 h-3.5" />{safeText(edu)}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                {candidate.skills?.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {candidate.skills.slice(0, 4).map((sk, i) => <Badge key={i} variant="info">{safeText(sk)}</Badge>)}
                                    {candidate.skills.length > 4 && <Badge>+{candidate.skills.length - 4}</Badge>}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 min-w-[180px]">
                              <select
                                onChange={e => handleUpdateCandidateStatus(candidate._id, e.target.value)}
                                value={candidate.status || 'Applied'}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                              >
                                <option value="Applied">📝 Applied</option>
                                <option value="Under Review">🔍 Under Review</option>
                                <option value="Shortlisted">⭐ Shortlisted</option>
                                <option value="Interview Scheduled">📅 Interview Scheduled</option>
                                <option value="Rejected">❌ Rejected</option>
                                <option value="Hired">✅ Hired</option>
                              </select>

                              <button
                                onClick={() => handleViewProfile(candidate)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1"
                              >
                                <EyeIcon className="w-4 h-4" /> View Profile
                              </button>

                              {isEligible && !analysis?.email_notification_sent && (
                                <button
                                  onClick={() => sendShortlistEmail(candidate._id)}
                                  disabled={sendingEmail}
                                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  <EnvelopeIcon className="w-4 h-4" /> Send Shortlist Email
                                </button>
                              )}

                              <button
                                onClick={() => { setCandidateForInterview(candidate); setShowInterviewModal(true); }}
                                disabled={!isEligible}
                                className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-1 ${isEligible
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                title={!isEligible ? `ATS Score: ${score ?? 'N/A'}% (minimum 60% required)` : ''}
                              >
                                <CalendarDaysIcon className="w-4 h-4" />
                                {isEligible ? 'Schedule Interview' : 'Not Eligible'}
                              </button>

                              <button
                                onClick={() => { setCandidateToDelete(candidate); setShowDeleteCandidateConfirm(true); }}
                                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1"
                              >
                                <TrashIcon className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-3 py-2 text-sm rounded-lg ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'border hover:bg-gray-50'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Candidate Confirm Modal */}
      {showDeleteCandidateConfirm && candidateToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Candidate</h3>
            <p className="text-gray-600 mb-2">
              Delete <span className="font-semibold">"{safeText(candidateToDelete.firstName)} {safeText(candidateToDelete.lastName)}"</span>?
            </p>
            <p className="text-sm text-red-600 mb-6">⚠️ This cannot be undone. All data for this candidate will be permanently removed.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowDeleteCandidateConfirm(false); setCandidateToDelete(null); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCandidate}
                disabled={deletingCandidate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingCandidate ? <><RefreshIcon className="w-4 h-4 animate-spin" />Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Job Confirm Modal */}
      {showDeleteConfirm && jobToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Job</h3>
            <p className="text-gray-600 mb-2">Delete <span className="font-semibold">"{safeText(jobToDelete.title)}"</span>?</p>
            <p className="text-sm text-red-600 mb-6">⚠️ This cannot be undone. All applications will also be deleted.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setJobToDelete(null); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <><RefreshIcon className="w-4 h-4 animate-spin" />Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Profile Modal */}
      {showCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
                    {safeText(selectedCandidate.firstName?.charAt(0))}{safeText(selectedCandidate.lastName?.charAt(0))}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{safeText(selectedCandidate.firstName)} {safeText(selectedCandidate.lastName)}</h2>
                    <p className="text-indigo-100 text-sm mt-1">{safeText(selectedCandidate.jobId?.title, 'Position N/A')}</p>
                    <p className="text-indigo-200 text-xs mt-0.5">{safeText(selectedCandidate.email)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <ATSScoreBadge
                        score={atsScores[selectedCandidate._id] ?? selectedCandidate._atsAnalysis?.overall_score ?? null}
                        loading={analyzingIds.has(selectedCandidate._id)}
                      />
                      {(selectedCandidate._atsAnalysis?.email_notification_sent || getAnalysis(selectedCandidate._id)?.email_notification_sent) && (
                        <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-lg">✉ Notified</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCandidateModal(false);
                    if (resumeFileUrl) URL.revokeObjectURL(resumeFileUrl);
                    setResumeFileUrl(null);
                    setViewingResume(false);
                  }}
                >
                  <XMarkIcon className="h-6 w-6 text-white/80 hover:text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {viewingResume && resumeFileUrl ? (
                <div>
                  <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg mb-4">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <DocumentTextIcon className="w-5 h-5 text-indigo-600" />Resume Preview
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setViewingResume(false); URL.revokeObjectURL(resumeFileUrl); setResumeFileUrl(null); }}
                        className="px-3 py-1 text-xs bg-white rounded-md border"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => handleDownloadResume(selectedCandidate._id, `${selectedCandidate.firstName}_${selectedCandidate.lastName}`)}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md flex items-center gap-1"
                      >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                  <iframe src={resumeFileUrl} className="w-full h-[600px] rounded-lg border" title="Resume" />
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const analysis = selectedCandidate._atsAnalysis || getAnalysis(selectedCandidate._id);
                    const score = atsScores[selectedCandidate._id] ?? analysis?.overall_score ?? null;
                    const isRunning = analyzingIds.has(selectedCandidate._id);
                    return (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5 text-indigo-600" /> AI ATS Analysis
                          </h3>
                          <button
                            onClick={() => triggerATSAnalysis(selectedCandidate._id, true)}
                            disabled={isRunning}
                            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isRunning
                              ? <><RefreshIcon className="w-3 h-3 animate-spin" /> Analyzing…</>
                              : <><BeakerIcon className="w-3 h-3" /> Re-analyze</>}
                          </button>
                        </div>

                        {isRunning ? (
                          <div className="text-center py-6">
                            <RefreshIcon className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-indigo-600">AI is analyzing the resume…</p>
                          </div>
                        ) : score !== null ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Overall Match Score</span>
                              <span className="text-2xl font-bold text-indigo-600">{Math.round(score)}%</span>
                            </div>
                            <ProgressBar value={score} />
                            <p className="text-xs text-gray-500">
                              {score >= 60
                                ? '✅ Strong match — candidate meets requirements.'
                                : score >= 40
                                  ? '⚠️ Medium match — review skills carefully.'
                                  : '❌ Weak match — may need additional training.'}
                            </p>
                            {analysis && <ATSSubScores analysis={analysis} />}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500 mb-3">
                              No ATS analysis yet. Click Re-analyze or view the resume to trigger analysis.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {(() => {
                    const analysis = selectedCandidate._atsAnalysis || getAnalysis(selectedCandidate._id);
                    const matchedSkills = analysis?.matched_skills?.length
                      ? analysis.matched_skills
                      : selectedCandidate.skills || [];
                    const missingSkills = analysis?.missing_skills || [];
                    const hasAnalysis = !!analysis;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <CodeBracketIcon className="w-5 h-5 text-emerald-600" /> Matched Skills
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {matchedSkills.length > 0
                              ? matchedSkills.map((sk, i) => <Badge key={i} variant="success">{safeText(sk)}</Badge>)
                              : <span className="text-sm text-gray-400 italic">No skills listed</span>}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <ExclamationCircleIcon className="w-5 h-5 text-amber-600" /> Missing Skills
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {missingSkills.length > 0
                              ? missingSkills.map((sk, i) => <Badge key={i} variant="warning">{safeText(sk)}</Badge>)
                              : hasAnalysis
                                ? <span className="text-sm text-emerald-600 italic">✅ No major gaps detected</span>
                                : <span className="text-sm text-gray-400 italic">Run ATS analysis to see gaps</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <UserIcon className="w-5 h-5 text-indigo-600" /> Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                      <p><span className="font-medium text-gray-600">Email:</span> {safeText(selectedCandidate.email)}</p>
                      <p><span className="font-medium text-gray-600">Email Domain:</span> {selectedCandidate.email ? selectedCandidate.email.split('@')[1] : 'N/A'}</p>
                      <p><span className="font-medium text-gray-600">Phone:</span> {safeText(selectedCandidate.phone)}</p>
                      <p><span className="font-medium text-gray-600">Location:</span> {safeText(selectedCandidate.location)}</p>
                      <p>
                        <span className="font-medium text-gray-600">Experience:</span>{' '}
                        {(() => {
                          const exp = selectedCandidate.totalExperience || selectedCandidate.experience;
                          if (!exp) return 'N/A';
                          const expYears = getExperienceYears(exp);
                          return expYears !== null ? `${expYears} years` : 'N/A';
                        })()}
                      </p>
                      <p><span className="font-medium text-gray-600">Current Position:</span> {safeText(selectedCandidate.currentPosition)}</p>
                      <p><span className="font-medium text-gray-600">Current Company:</span> {safeText(selectedCandidate.currentCompany)}</p>
                      <p><span className="font-medium text-gray-600">Notice Period:</span> {safeText(selectedCandidate.noticePeriod)}</p>
                    </div>
                  </div>

                  {(() => {
                    const edu = selectedCandidate.education;
                    if (!edu || (Array.isArray(edu) && edu.length === 0)) return null;
                    return (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <AcademicCapIcon className="w-5 h-5 text-purple-600" /> Education
                        </h3>
                        {Array.isArray(edu) ? (
                          <div className="space-y-2">
                            {edu.map((e, i) => (
                              <div key={i} className="text-sm">
                                {typeof e === 'object' && e !== null ? (
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {safeText(e.degree)}{e.field ? ` in ${safeText(e.field)}` : ''}
                                    </p>
                                    <p className="text-gray-500">
                                      {safeText(e.institution)}{e.year ? ` · ${safeText(e.year)}` : ''}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-gray-700">{safeText(e)}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">{safeText(edu)}</p>
                        )}
                      </div>
                    );
                  })()}

                  {selectedCandidate.resume && (
                    <button
                      onClick={() => handleViewResume(selectedCandidate._id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      <DocumentTextIcon className="w-5 h-5" /> View Resume & Run ATS Analysis
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end gap-3 flex-wrap">
              <select
                onChange={e => handleUpdateCandidateStatus(selectedCandidate._id, e.target.value)}
                value={selectedCandidate.status || 'Applied'}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="Applied">Applied</option>
                <option value="Under Review">Under Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Rejected">Rejected</option>
                <option value="Hired">Hired</option>
              </select>
              <button
                onClick={() => {
                  setCandidateToDelete(selectedCandidate);
                  setShowDeleteCandidateConfirm(true);
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1"
              >
                <TrashIcon className="w-4 h-4" /> Delete
              </button>
              <button onClick={() => setShowCandidateModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERVIEW MODAL - WITH EMAIL PREVIEW AND CONFIRMATION */}
      {showInterviewModal && candidateForInterview && (() => {
        const candidateScore = atsScores[candidateForInterview._id] ?? 0;
        const candidateAnalysis = getAnalysis(candidateForInterview._id);
        const matchedSkills = candidateAnalysis?.matched_skills?.length
          ? candidateAnalysis.matched_skills.slice(0, 5)
          : (candidateForInterview.skills || []).slice(0, 5);
        const experienceYears = getExperienceYears(candidateForInterview.totalExperience || candidateForInterview.experience);
        const keywords = candidateAnalysis?.matched_keywords?.slice(0, 6) || [];
        const education = candidateForInterview.education;
        const educationDisplay = Array.isArray(education) && education.length > 0
          ? (typeof education[0] === 'object'
            ? `${education[0].degree || ''} ${education[0].field || ''}`.trim() || education[0].institution || 'Education provided'
            : education[0])
          : (typeof education === 'string' ? education : null);

        const isFormValid =
  interviewDetails.date &&
  interviewDetails.time &&
  interviewDetails.interviewer?.trim() &&
  (interviewDetails.interviewType === 'Virtual'
    ? interviewDetails.meetingLink?.trim()
    : true);

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-emerald-600" />
                    Schedule Interview
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    For {safeText(candidateForInterview.firstName)} {safeText(candidateForInterview.lastName)}
                  </p>
                </div>
                <button
                  onClick={() => { setShowInterviewModal(false); setCandidateForInterview(null); setShowEmailConfirm(false); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* ATS Eligibility Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-emerald-800">
                      ATS Score: <strong>{Math.round(candidateScore)}%</strong> ·
                      Candidate is eligible based on ATS score
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                    Invitation via SMTP
                  </span>
                </div>

                {/* Candidate Summary with Skills, Experience, Keywords, Education */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-500" />
                    Candidate Summary (ATS Breakdown)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <CodeBracketIcon className="w-3 h-3" /> Skills Match
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {matchedSkills.length > 0 ? (
                          matchedSkills.map((skill, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                              {safeText(skill)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No skills listed</span>
                        )}
                      </div>
                      {candidateAnalysis?.sub_scores?.skills !== undefined && (
                        <div className="mt-1">
                          <ProgressBar value={candidateAnalysis.sub_scores.skills} />
                          <span className="text-xs text-gray-400">{Math.round(candidateAnalysis.sub_scores.skills)}% match</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <WorkIcon className="w-3 h-3" /> Experience
                      </p>
                      <p className="text-sm font-medium text-gray-800">
                        {experienceYears ? `${experienceYears} years` : 'Not specified'}
                      </p>
                      {candidateAnalysis?.sub_scores?.experience !== undefined && (
                        <div className="mt-1">
                          <ProgressBar value={candidateAnalysis.sub_scores.experience} />
                          <span className="text-xs text-gray-400">{Math.round(candidateAnalysis.sub_scores.experience)}% match</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <SearchIcon className="w-3 h-3" /> Keywords Match
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {keywords.length > 0 ? (
                          keywords.map((kw, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {safeText(kw)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Run ATS to see keywords</span>
                        )}
                      </div>
                      {candidateAnalysis?.sub_scores?.keywords !== undefined && (
                        <div className="mt-1">
                          <ProgressBar value={candidateAnalysis.sub_scores.keywords} />
                          <span className="text-xs text-gray-400">{Math.round(candidateAnalysis.sub_scores.keywords)}% match</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <AcademicCapIcon className="w-3 h-3" /> Education
                      </p>
                      <p className="text-sm text-gray-700 truncate" title={educationDisplay || 'Not specified'}>
                        {educationDisplay || 'Not specified'}
                      </p>
                      {candidateAnalysis?.sub_scores?.education !== undefined && (
                        <div className="mt-1">
                          <ProgressBar value={candidateAnalysis.sub_scores.education} />
                          <span className="text-xs text-gray-400">{Math.round(candidateAnalysis.sub_scores.education)}% match</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interview Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interview Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={interviewDetails.date}
                      onChange={(e) => setInterviewDetails({ ...interviewDetails, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interview Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={interviewDetails.time}
                      onChange={(e) => setInterviewDetails({ ...interviewDetails, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meeting Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={interviewDetails.meetingLink}
                      onChange={(e) => setInterviewDetails({ ...interviewDetails, meetingLink: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interviewer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Smith"
                      value={interviewDetails.interviewer}
                      onChange={(e) => setInterviewDetails({ ...interviewDetails, interviewer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interview Type
                    </label>
                    <select
                      value={interviewDetails.interviewType}
                      onChange={(e) => setInterviewDetails({ ...interviewDetails, interviewType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="Virtual">Virtual (Video Call)</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Phone">Phone Call</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      rows="2"
                      value={interviewDetails.notes}
                      onChange={(e) => setInterviewDetails({ ...interviewDetails, notes: e.target.value })}
                      placeholder="Any additional notes for the candidate..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer with Back, Cancel, and Send buttons */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end gap-3 rounded-b-xl">
                <button
                  onClick={handleBackToCandidate}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center gap-2 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => { setShowInterviewModal(false); setCandidateForInterview(null); setShowEmailConfirm(false); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendEmail}
                  disabled={!isFormValid || emailSending}
                  className={`px-5 py-2 rounded-lg flex items-center gap-2 transition-all ${isFormValid && !emailSending
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {emailSending ? (
                    <><RefreshIcon className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><EnvelopeIcon className="w-4 h-4" /> Send Email</>
                  )}
                </button>
              </div>
            </div>

{/* Email Confirmation Modal */}
{showEmailConfirm && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
          <MailIcon className="h-6 w-6 text-emerald-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Confirm Interview Invitation
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          An interview invitation email will be sent to:
          <br />
          <span className="font-medium text-gray-800">
            {candidateForInterview?.email}
          </span>
        </p>

        {/* Email Preview */}
        <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700 mb-5 max-h-80 overflow-y-auto">
          <p className="font-semibold text-gray-900 mb-3">
            Email Preview
          </p>

          <p className="mb-2">
            <strong>Subject:</strong> Interview Invitation -{" "}
            {candidateForInterview?.firstName}{" "}
            {candidateForInterview?.lastName}
          </p>

          <hr className="my-3" />

          <p className="mb-2">
            Dear {candidateForInterview?.firstName},
          </p>

          <p className="mb-3">
            Congratulations! We are pleased to inform you that you have
            been shortlisted for the next stage of our recruitment
            process.
          </p>

          <div className="bg-white border rounded-lg p-3 mb-3">
            <p>
              <strong>Interview Date:</strong>{" "}
              {interviewDetails.date}
            </p>

            <p>
              <strong>Interview Time:</strong>{" "}
              {interviewDetails.time}
            </p>

            <p>
              <strong>Interviewer:</strong>{" "}
              {interviewDetails.interviewer}
            </p>
          </div>

          {/* AI Interview Coach Section */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
            <h4 className="font-semibold text-emerald-800 mb-2">
              🎯 Interview Preparation
            </h4>

            <p className="mb-2 text-gray-700">
              To help you prepare and improve your confidence before
              the interview, we recommend using our AI Interview Coach.
            </p>

            <a
              href="https://ai-interview-master-blush.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-emerald-700 font-medium underline break-all"
            >
              Start AI Interview Practice
            </a>
          </div>

          <p className="mb-2">
            The AI Interview Coach provides:
          </p>

          <ul className="list-disc ml-5 mb-3 text-gray-700">
            <li>Mock Interview Questions</li>
            <li>Technical Interview Practice</li>
            <li>HR Interview Preparation</li>
            <li>Confidence Building Sessions</li>
            <li>Real-Time Feedback</li>
          </ul>

          <p className="mb-3">
            We look forward to speaking with you and wish you the best
            of luck in your interview.
          </p>

          <p>
            Best Regards,
            <br />
            HR Team
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowEmailConfirm(false)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={sendInterviewInvitation}
            disabled={emailSending}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            {emailSending ? (
              <>
                <RefreshIcon className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Invitation"
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

            {/* Success Toast */}
            {emailSentSuccess && (
              <div className="fixed bottom-8 right-8 z-[70] animate-slide-up">
                <div className="bg-emerald-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Interview invitation sent successfully!</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Post New Job</h2>
              <button onClick={() => setShowNewJobModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newJob.title}
                  onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Senior Frontend Developer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newJob.department}
                    onChange={e => setNewJob({ ...newJob, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newJob.jobType}
                    onChange={e => setNewJob({ ...newJob, jobType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newJob.location}
                  onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Lahore, Remote, Karachi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={newJob.experienceLevel}
                  onChange={e => setNewJob({ ...newJob, experienceLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {['Entry', 'Mid', 'Senior', 'Lead', 'Executive'].map(l => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
                  <input
                    type="number"
                    value={newJob.minSalary}
                    onChange={e => setNewJob({ ...newJob, minSalary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
                  <input
                    type="number"
                    value={newJob.maxSalary}
                    onChange={e => setNewJob({ ...newJob, maxSalary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 80000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={newJob.deadline}
                  onChange={e => setNewJob({ ...newJob, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty for rolling deadline</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  value={newJob.description}
                  onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Job description…"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements <span className="text-red-500">*</span>
                </label>
                {newJob.requirements.map((req, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={req}
                      placeholder={`Requirement ${i + 1}`}
                      onChange={e => {
                        const r = [...newJob.requirements];
                        r[i] = e.target.value;
                        setNewJob({ ...newJob, requirements: r });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    {newJob.requirements.length > 1 && (
                      <button
                        onClick={() => setNewJob({ ...newJob, requirements: newJob.requirements.filter((_, idx) => idx !== i) })}
                        className="px-2 py-2 text-red-400 hover:text-red-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setNewJob({ ...newJob, requirements: [...newJob.requirements, ''] })}
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <PlusIcon className="w-3 h-3" /> Add requirement
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                {newJob.responsibilities.map((resp, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={resp}
                      placeholder={`Responsibility ${i + 1}`}
                      onChange={e => {
                        const r = [...newJob.responsibilities];
                        r[i] = e.target.value;
                        setNewJob({ ...newJob, responsibilities: r });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    {newJob.responsibilities.length > 1 && (
                      <button
                        onClick={() => setNewJob({ ...newJob, responsibilities: newJob.responsibilities.filter((_, idx) => idx !== i) })}
                        className="px-2 py-2 text-red-400 hover:text-red-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setNewJob({ ...newJob, responsibilities: [...newJob.responsibilities, ''] })}
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <PlusIcon className="w-3 h-3" /> Add responsibility
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills Required <span className="text-xs text-gray-400 font-normal">(comma separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, Python"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={newJob.skillsRequired?.join(', ') || ''}
                  onChange={e => setNewJob({ ...newJob, skillsRequired: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowNewJobModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={handlePostNewJob}
                disabled={loading || !newJob.title || !newJob.description || !newJob.location}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Posting…' : 'Post Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRRecruitment;