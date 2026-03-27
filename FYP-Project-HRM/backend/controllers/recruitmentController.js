const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');

// @desc    Create new job posting
// @route   POST /api/recruitment/jobs
// @access  Private/HR & Admin
const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    department,
    jobType,
    location,
    minSalary,
    maxSalary,
    description,
    requirements,
    responsibilities,
    benefits,
    experienceLevel,
    deadline,
    tags,
    skillsRequired
  } = req.body;

  const job = await Job.create({
    title,
    department,
    jobType,
    location,
    salaryRange: { min: minSalary, max: maxSalary },
    description,
    requirements: Array.isArray(requirements) ? requirements : [requirements],
    responsibilities: Array.isArray(responsibilities) ? responsibilities : [responsibilities],
    benefits: Array.isArray(benefits) ? benefits : [],
    experienceLevel,
    postedBy: req.user._id,
    deadline: new Date(deadline),
    tags: Array.isArray(tags) ? tags : [],
    skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : []
  });

  res.status(201).json({
    success: true,
    data: job
  });
});

// @desc    Get all job postings
// @route   GET /api/recruitment/jobs
// @access  Private/HR & Admin
const getJobs = asyncHandler(async (req, res) => {
  const { status, department, jobType, search } = req.query;
  
  let query = {};
  
  // Filter by status
  if (status && status !== 'all') {
    query.status = status;
  }
  
  // Filter by department
  if (department && department !== 'all') {
    query.department = department;
  }
  
  // Filter by job type
  if (jobType && jobType !== 'all') {
    query.jobType = jobType;
  }
  
  // Search functionality
  if (search) {
    query.$text = { $search: search };
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const jobs = await Job.find(query)
    .populate('postedBy', 'name email')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);
    
  const total = await Job.countDocuments(query);
  
  res.json({
    success: true,
    count: jobs.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: jobs
  });
});

// @desc    Get single job
// @route   GET /api/recruitment/jobs/:id
// @access  Private/HR & Admin
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('postedBy', 'name email')
    .populate({
      path: 'applicants',
      select: 'firstName lastName email status appliedDate'
    });
    
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  
  // Increment view count
  job.viewsCount += 1;
  await job.save();
  
  res.json({
    success: true,
    data: job
  });
});

// @desc    Update job
// @route   PUT /api/recruitment/jobs/:id
// @access  Private/HR & Admin
const updateJob = asyncHandler(async (req, res) => {
  let job = await Job.findById(req.params.id);
  
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  
  // Check if user is authorized to update
  if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this job');
  }
  
  job = await Job.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.json({
    success: true,
    data: job
  });
});

// @desc    Delete job
// @route   DELETE /api/recruitment/jobs/:id
// @access  Private/HR & Admin
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  
  // Check if user is authorized to delete
  if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this job');
  }
  
  // Delete all candidates associated with this job
  await Candidate.deleteMany({ jobId: job._id });
  
  await job.deleteOne();
  
  res.json({
    success: true,
    message: 'Job deleted successfully'
  });
});

// @desc    Publish job
// @route   PUT /api/recruitment/jobs/:id/publish
// @access  Private/HR & Admin
const publishJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  
  job.status = 'Open';
  job.publishedAt = Date.now();
  await job.save();
  
  res.json({
    success: true,
    data: job
  });
});

// @desc    Close job
// @route   PUT /api/recruitment/jobs/:id/close
// @access  Private/HR & Admin
const closeJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  
  job.status = 'Closed';
  await job.save();
  
  res.json({
    success: true,
    data: job
  });
});

// @desc    Add candidate
// @route   POST /api/recruitment/candidates
// @access  Private/HR & Admin
const addCandidate = asyncHandler(async (req, res) => {
  const {
    jobId,
    firstName,
    lastName,
    email,
    phone,
    location,
    currentCompany,
    currentPosition,
    totalExperience,
    currentSalary,
    expectedSalary,
    noticePeriod,
    coverLetter,
    skills,
    education,
    workExperience,
    source
  } = req.body;
  
  // Check if candidate already applied for this job
  const existingCandidate = await Candidate.findOne({ email, jobId });
  if (existingCandidate) {
    res.status(400);
    throw new Error('Candidate has already applied for this position');
  }
  
  // Check if job exists and is open
  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  
  if (job.status !== 'Open') {
    res.status(400);
    throw new Error('Job is not open for applications');
  }
  
  const candidate = await Candidate.create({
    jobId,
    firstName,
    lastName,
    email,
    phone,
    location,
    currentCompany,
    currentPosition,
    totalExperience,
    currentSalary,
    expectedSalary,
    noticePeriod,
    coverLetter,
    skills: Array.isArray(skills) ? skills : [],
    education: Array.isArray(education) ? education : [],
    workExperience: Array.isArray(workExperience) ? workExperience : [],
    source: source || 'Company Website',
    addedBy: req.user._id
  });
  
  // Update job applicants count
  job.applicantsCount += 1;
  await job.save();
  
  // Send email confirmation to candidate
  await sendEmail({
    to: email,
    subject: 'Application Received - ' + job.title,
    html: `
      <h2>Thank you for your application!</h2>
      <p>Dear ${firstName},</p>
      <p>We have received your application for the position of <strong>${job.title}</strong> at our company.</p>
      <p>We will review your application and contact you if your profile matches our requirements.</p>
      <p><strong>Position:</strong> ${job.title}</p>
      <p><strong>Department:</strong> ${job.department}</p>
      <p><strong>Location:</strong> ${job.location}</p>
      <br/>
      <p>Best regards,<br/>HR Team</p>
    `
  });
  
  res.status(201).json({
    success: true,
    data: candidate
  });
});

// @desc    Get all candidates
// @route   GET /api/recruitment/candidates
// @access  Private/HR & Admin
const getCandidates = asyncHandler(async (req, res) => {
  const { status, jobId, search, sortBy, sortOrder } = req.query;
  
  let query = {};
  
  // Filter by status
  if (status && status !== 'all') {
    query.status = status;
  }
  
  // Filter by job ID
  if (jobId && jobId !== 'all') {
    query.jobId = jobId;
  }
  
  // Search functionality
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'skills': { $regex: search, $options: 'i' } }
    ];
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Sorting
  const sort = {};
  if (sortBy) {
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  } else {
    sort.createdAt = -1;
  }
  
  const candidates = await Candidate.find(query)
    .populate('jobId', 'title department location')
    .populate('addedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
    
  const total = await Candidate.countDocuments(query);
  
  res.json({
    success: true,
    count: candidates.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: candidates
  });
});

// @desc    Get single candidate
// @route   GET /api/recruitment/candidates/:id
// @access  Private/HR & Admin
const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .populate('jobId', 'title department location salaryRange')
    .populate('addedBy', 'name email')
    .populate('notes.addedBy', 'name');
    
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  res.json({
    success: true,
    data: candidate
  });
});

// @desc    Update candidate status
// @route   PUT /api/recruitment/candidates/:id/status
// @access  Private/HR & Admin
const updateCandidateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  candidate.status = status;
  candidate.lastContacted = Date.now();
  
  if (notes) {
    candidate.notes.push({
      content: notes,
      addedBy: req.user._id,
      isPrivate: false
    });
  }
  
  await candidate.save();
  
  // Send email notification on status change
  const statusMessages = {
    'Shortlisted': 'Congratulations! Your application has been shortlisted.',
    'Interview Scheduled': 'We would like to schedule an interview with you.',
    'Rejected': 'Thank you for your interest, but we have decided to proceed with other candidates.',
    'Offer Sent': 'Congratulations! We are pleased to extend an offer to you.',
    'Hired': 'Welcome aboard! Your application has been successful.'
  };
  
  if (statusMessages[status]) {
    const job = await Job.findById(candidate.jobId);
    await sendEmail({
      to: candidate.email,
      subject: 'Update on Your Application - ' + job.title,
      html: `
        <h2>Application Update</h2>
        <p>Dear ${candidate.firstName},</p>
        <p>${statusMessages[status]}</p>
        ${status === 'Interview Scheduled' ? `
          <p><strong>Position:</strong> ${job.title}</p>
          <p><strong>Next Steps:</strong> Our HR team will contact you shortly to schedule the interview.</p>
        ` : ''}
        <br/>
        <p>Best regards,<br/>HR Team</p>
      `
    });
  }
  
  res.json({
    success: true,
    data: candidate
  });
});

// @desc    Schedule interview
// @route   POST /api/recruitment/candidates/:id/interview
// @access  Private/HR & Admin
const scheduleInterview = asyncHandler(async (req, res) => {
  const {
    date,
    time,
    interviewer,
    interviewType,
    meetingLink,
    notes,
    round
  } = req.body;
  
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  // Add to interview history
  candidate.interviewHistory.push({
    round: round || 1,
    date: new Date(date),
    interviewer,
    feedback: '',
    rating: 0,
    status: 'Scheduled'
  });
  
  // Update current interview
  candidate.interviewScheduled = {
    date: new Date(date),
    time,
    interviewer,
    interviewType,
    meetingLink,
    notes
  };
  
  candidate.status = 'Interview Scheduled';
  await candidate.save();
  
  // Send interview invitation email
  const job = await Job.findById(candidate.jobId);
  await sendEmail({
    to: candidate.email,
    subject: 'Interview Invitation - ' + job.title,
    html: `
      <h2>Interview Invitation</h2>
      <p>Dear ${candidate.firstName},</p>
      <p>We are pleased to invite you for an interview for the position of <strong>${job.title}</strong>.</p>
      <p><strong>Interview Details:</strong></p>
      <ul>
        <li><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Type:</strong> ${interviewType}</li>
        ${interviewer ? `<li><strong>Interviewer:</strong> ${interviewer}</li>` : ''}
        ${meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
      </ul>
      ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ''}
      <br/>
      <p>Best regards,<br/>HR Team</p>
    `
  });
  
  res.json({
    success: true,
    data: candidate
  });
});

// @desc    Add interview feedback
// @route   POST /api/recruitment/candidates/:id/feedback
// @access  Private/HR & Admin
const addInterviewFeedback = asyncHandler(async (req, res) => {
  const { feedback, rating, status } = req.body;
  
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  // Update the latest interview in history
  const latestInterview = candidate.interviewHistory[candidate.interviewHistory.length - 1];
  if (latestInterview) {
    latestInterview.feedback = feedback;
    latestInterview.rating = rating;
    latestInterview.status = status;
  }
  
  // Clear scheduled interview
  candidate.interviewScheduled = null;
  
  // Update candidate status based on feedback
  if (status === 'Completed') {
    if (rating >= 4) {
      candidate.status = 'Interviewed';
    } else {
      candidate.status = 'Under Review';
    }
  }
  
  await candidate.save();
  
  res.json({
    success: true,
    data: candidate
  });
});

// @desc    Add note to candidate
// @route   POST /api/recruitment/candidates/:id/notes
// @access  Private/HR & Admin
const addCandidateNote = asyncHandler(async (req, res) => {
  const { content, isPrivate } = req.body;
  
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  candidate.notes.push({
    content,
    addedBy: req.user._id,
    isPrivate: isPrivate || false
  });
  
  await candidate.save();
  
  res.json({
    success: true,
    data: candidate
  });
});

// @desc    Upload resume
// @route   POST /api/recruitment/candidates/:id/resume
// @access  Private/HR & Admin
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a file');
  }
  
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  candidate.resume = {
    url: `/uploads/resumes/${req.file.filename}`,
    filename: req.file.filename,
    uploadedAt: Date.now()
  };
  
  await candidate.save();
  
  res.json({
    success: true,
    data: candidate
  });
});

// @desc    Get recruitment analytics
// @route   GET /api/recruitment/analytics
// @access  Private/HR & Admin
const getRecruitmentAnalytics = asyncHandler(async (req, res) => {
  const totalJobs = await Job.countDocuments();
  const activeJobs = await Job.countDocuments({ status: 'Open' });
  const totalCandidates = await Candidate.countDocuments();
  
  // Candidates by status
  const candidatesByStatus = await Candidate.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Jobs by department
  const jobsByDepartment = await Job.aggregate([
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  
  // Candidates per job
  const candidatesPerJob = await Job.aggregate([
    { $lookup: {
      from: 'candidates',
      localField: '_id',
      foreignField: 'jobId',
      as: 'applicants'
    }},
    { $project: {
      title: 1,
      applicantsCount: { $size: '$applicants' }
    }},
    { $sort: { applicantsCount: -1 } },
    { $limit: 5 }
  ]);
  
  // Monthly hiring trend
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const hiringTrend = await Candidate.aggregate([
    { $match: { 
      status: 'Hired',
      createdAt: { $gte: sixMonthsAgo }
    }},
    { $group: {
      _id: { 
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      },
      count: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  res.json({
    success: true,
    data: {
      totalJobs,
      activeJobs,
      totalCandidates,
      candidatesByStatus: candidatesByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      jobsByDepartment: jobsByDepartment.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      topJobs: candidatesPerJob,
      hiringTrend
    }
  });
});

// @desc    Get dashboard stats
// @route   GET /api/recruitment/dashboard
// @access  Private/HR & Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalJobs = await Job.countDocuments();
  const activeJobs = await Job.countDocuments({ status: 'Open' });
  const totalCandidates = await Candidate.countDocuments();
  const hiredThisMonth = await Candidate.countDocuments({
    status: 'Hired',
    createdAt: {
      $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    }
  });
  const interviewScheduled = await Candidate.countDocuments({ 
    status: 'Interview Scheduled' 
  });
  
  // Recent candidates
  const recentCandidates = await Candidate.find()
    .sort('-createdAt')
    .limit(5)
    .populate('jobId', 'title')
    .select('firstName lastName email status jobId createdAt');
  
  // Upcoming interviews
  const upcomingInterviews = await Candidate.find({
    'interviewScheduled.date': { $gte: new Date() }
  })
  .sort('interviewScheduled.date')
  .limit(5)
  .populate('jobId', 'title')
  .select('firstName lastName email interviewScheduled jobId');
  
  res.json({
    success: true,
    data: {
      stats: {
        totalJobs,
        activeJobs,
        totalCandidates,
        hiredThisMonth,
        interviewScheduled
      },
      recentCandidates,
      upcomingInterviews
    }
  });
});

module.exports = {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  publishJob,
  closeJob,
  addCandidate,
  getCandidates,
  getCandidate,
  updateCandidateStatus,
  scheduleInterview,
  addInterviewFeedback,
  addCandidateNote,
  uploadResume,
  getRecruitmentAnalytics,
  getDashboardStats
};