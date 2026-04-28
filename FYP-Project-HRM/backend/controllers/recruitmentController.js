const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
const fs = require('fs');
const path = require('path');

// @desc    Create new job posting
// @route   POST /api/recruitment/jobs
// @access  Private/HR & Admin
const createJob = asyncHandler(async (req, res) => {
  const {
    title, department, jobType, location, minSalary, maxSalary,
    description, requirements, responsibilities, benefits,
    experienceLevel, deadline, tags, skillsRequired
  } = req.body;

  const job = await Job.create({
    title, department, jobType, location,
    salaryRange: { min: minSalary, max: maxSalary },
    description,
    requirements: Array.isArray(requirements) ? requirements : [requirements],
    responsibilities: Array.isArray(responsibilities) ? responsibilities : [responsibilities],
    benefits: Array.isArray(benefits) ? benefits : [],
    experienceLevel,
    postedBy: req.user._id || req.user.id || req.user,
    deadline: new Date(deadline),
    tags: Array.isArray(tags) ? tags : [],
    skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : []
  });

  res.status(201).json({ success: true, data: job });
});

// @desc    Get all job postings
// @route   GET /api/recruitment/jobs
// @access  Private/HR & Admin
const getJobs = asyncHandler(async (req, res) => {
  const { status, department, jobType, search } = req.query;
  let query = {};

  if (status && status !== 'all') query.status = status;
  if (department && department !== 'all') query.department = department;
  if (jobType && jobType !== 'all') query.jobType = jobType;
  if (search) query.$text = { $search: search };

  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const jobs  = await Job.find(query).populate('postedBy', 'name email').sort('-createdAt').skip(skip).limit(limit);
  const total = await Job.countDocuments(query);

  res.json({
    success: true, count: jobs.length, total,
    pages: Math.ceil(total / limit), currentPage: page, data: jobs
  });
});

// @desc    Get single job
// @route   GET /api/recruitment/jobs/:id
// @access  Private/HR & Admin
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('postedBy', 'name email')

  if (!job) { res.status(404); throw new Error('Job not found'); }

  job.viewsCount += 1;
  await job.save();

  res.json({ success: true, data: job });
});

// @desc    Update job
// @route   PUT /api/recruitment/jobs/:id
// @access  Private/HR & Admin
const updateJob = asyncHandler(async (req, res) => {
  let job = await Job.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Job not found'); }

  if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403); throw new Error('Not authorized to update this job');
  }

  job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, data: job });
});

// @desc    Delete job
// @route   DELETE /api/recruitment/jobs/:id
// @access  Private/HR & Admin
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Job not found'); }

  if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403); throw new Error('Not authorized to delete this job');
  }

  await Candidate.deleteMany({ jobId: job._id });
  await job.deleteOne();

  res.json({ success: true, message: 'Job deleted successfully' });
});

// @desc    Publish job
// @route   PUT /api/recruitment/jobs/:id/publish
const publishJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Job not found'); }

  job.status = 'Open';
  job.publishedAt = Date.now();
  await job.save();

  res.json({ success: true, data: job });
});

// @desc    Close job
// @route   PUT /api/recruitment/jobs/:id/close
const closeJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Job not found'); }

  job.status = 'Closed';
  await job.save();

  res.json({ success: true, data: job });
});

// @desc    Add candidate (with resume upload)
// @route   POST /api/recruitment/candidates
// @access  Private/HR & Admin
const addCandidate = asyncHandler(async (req, res) => {
  const {
    jobId, firstName, lastName, email, phone, location,
    currentCompany, currentPosition, totalExperience, currentSalary,
    expectedSalary, noticePeriod, coverLetter, skills, education,
    workExperience, source
  } = req.body;

  const existingCandidate = await Candidate.findOne({ email, jobId });
  if (existingCandidate) { res.status(400); throw new Error('Candidate has already applied for this position'); }

  const job = await Job.findById(jobId);
  if (!job) { res.status(404); throw new Error('Job not found'); }
  if (job.status !== 'Open') { res.status(400); throw new Error('Job is not open for applications'); }

  // ── FIX: handle resume upload path correctly ──────────────────────────────
  let resumeData = null;
  if (req.file) {
    resumeData = {
      url: `/uploads/resumes/${req.file.filename}`,   // consistent path
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: Date.now()
    };
    console.log('✅ Resume uploaded:', resumeData);
  } else {
    console.log('⚠️  No resume file in request');
  }

  const candidate = await Candidate.create({
    jobId, firstName, lastName, email, phone, location,
    currentCompany, currentPosition, totalExperience, currentSalary,
    expectedSalary, noticePeriod, coverLetter,
    skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
    education: Array.isArray(education) ? education : (education ? JSON.parse(education) : []),
    workExperience: Array.isArray(workExperience) ? workExperience : (workExperience ? JSON.parse(workExperience) : []),
    source: source || 'Company Website',
    addedBy: req.user._id,
    resume: resumeData   // will be null if no file — that's fine
  });

  job.applicantsCount += 1;
  await job.save();

  try {
    await sendEmail({
      to: email,
      subject: 'Application Received - ' + job.title,
      html: `
        <h2>Thank you for your application!</h2>
        <p>Dear ${firstName},</p>
        <p>We have received your application for <strong>${job.title}</strong>.</p>
        <p>We will review your application and contact you if your profile matches our requirements.</p>
        <br/><p>Best regards,<br/>HR Team</p>
      `
    });
  } catch (emailErr) {
    // Don't fail the whole request just because email failed
    console.warn('⚠️  Confirmation email failed:', emailErr.message);
  }

  res.status(201).json({ success: true, data: candidate });
});

// @desc    Get all candidates
// @route   GET /api/recruitment/candidates
// @access  Private/HR & Admin
const getCandidates = asyncHandler(async (req, res) => {
  const { status, jobId, search, sortBy, sortOrder } = req.query;
  let query = {};

  if (status && status !== 'all') query.status = status;
  if (jobId && jobId !== 'all') query.jobId = jobId;
  if (search) {
    query.$or = [
      { firstName:  { $regex: search, $options: 'i' } },
      { lastName:   { $regex: search, $options: 'i' } },
      { email:      { $regex: search, $options: 'i' } },
      { skills:     { $regex: search, $options: 'i' } }
    ];
  }

  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50; // raised default so all candidates show
  const skip  = (page - 1) * limit;

  const sort = {};
  if (sortBy) sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  else sort.createdAt = -1;

  // ── FIX: explicitly include `resume` field (it's part of the schema so no
  //    .select() exclusion is needed, but we add +resume to be safe if the
  //    Candidate schema ever uses select:false on that path) ──────────────────
  const candidates = await Candidate.find(query)
    .select('+resume')   // force-include even if schema marks it select:false
    .populate('jobId', 'title department location')
    .populate('addedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Candidate.countDocuments(query);

  res.json({
    success: true, count: candidates.length, total,
    pages: Math.ceil(total / limit), currentPage: page, data: candidates
  });
});

// @desc    Get single candidate
// @route   GET /api/recruitment/candidates/:id
// @access  Private/HR & Admin
const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .select('+resume')
    .populate('jobId', 'title department location salaryRange')
    .populate('addedBy', 'name email')
    .populate('notes.addedBy', 'name');

  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }
  res.json({ success: true, data: candidate });
});

// @desc    Update candidate status
// @route   PUT /api/recruitment/candidates/:id/status
// @access  Private/HR & Admin
const updateCandidateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  candidate.status = status;
  candidate.lastContacted = Date.now();
  if (notes) candidate.notes.push({ content: notes, addedBy: req.user._id, isPrivate: false });
  await candidate.save();

  const statusMessages = {
    'Shortlisted': 'Congratulations! Your application has been shortlisted.',
    'Interview Scheduled': 'We would like to schedule an interview with you.',
    'Rejected': 'Thank you for your interest, but we have decided to proceed with other candidates.',
    'Offer Sent': 'Congratulations! We are pleased to extend an offer to you.',
    'Hired': 'Welcome aboard! Your application has been successful.'
  };

  if (statusMessages[status]) {
    try {
      const job = await Job.findById(candidate.jobId);
      await sendEmail({
        to: candidate.email,
        subject: 'Update on Your Application - ' + job.title,
        html: `
          <h2>Application Update</h2>
          <p>Dear ${candidate.firstName},</p>
          <p>${statusMessages[status]}</p>
          <br/><p>Best regards,<br/>HR Team</p>
        `
      });
    } catch (emailErr) {
      console.warn('⚠️  Status email failed:', emailErr.message);
    }
  }

  res.json({ success: true, data: candidate });
});

// @desc    Schedule interview
// @route   POST /api/recruitment/candidates/:id/interview
const scheduleInterview = asyncHandler(async (req, res) => {
  const { date, time, interviewer, interviewType, meetingLink, notes, round } = req.body;
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  candidate.interviewHistory.push({
    round: round || 1, date: new Date(date), interviewer,
    feedback: '', rating: 0, status: 'Scheduled'
  });
  candidate.interviewScheduled = { date: new Date(date), time, interviewer, interviewType, meetingLink, notes };
  candidate.status = 'Interview Scheduled';
  await candidate.save();

  try {
    const job = await Job.findById(candidate.jobId);
    await sendEmail({
      to: candidate.email,
      subject: 'Interview Invitation - ' + job.title,
      html: `
        <h2>Interview Invitation</h2>
        <p>Dear ${candidate.firstName},</p>
        <p>We are pleased to invite you for an interview for <strong>${job.title}</strong>.</p>
        <ul>
          <li><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${time}</li>
          <li><strong>Type:</strong> ${interviewType}</li>
          ${interviewer ? `<li><strong>Interviewer:</strong> ${interviewer}</li>` : ''}
          ${meetingLink ? `<li><strong>Link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
        </ul>
        <br/><p>Best regards,<br/>HR Team</p>
      `
    });
  } catch (emailErr) {
    console.warn('⚠️  Interview email failed:', emailErr.message);
  }

  res.json({ success: true, data: candidate });
});

// @desc    Add interview feedback
// @route   POST /api/recruitment/candidates/:id/feedback
const addInterviewFeedback = asyncHandler(async (req, res) => {
  const { feedback, rating, status } = req.body;
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  const latestInterview = candidate.interviewHistory[candidate.interviewHistory.length - 1];
  if (latestInterview) { latestInterview.feedback = feedback; latestInterview.rating = rating; latestInterview.status = status; }
  candidate.interviewScheduled = null;
  if (status === 'Completed') candidate.status = rating >= 4 ? 'Interviewed' : 'Under Review';

  await candidate.save();
  res.json({ success: true, data: candidate });
});

// @desc    Add note to candidate
// @route   POST /api/recruitment/candidates/:id/notes
const addCandidateNote = asyncHandler(async (req, res) => {
  const { content, isPrivate } = req.body;
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  candidate.notes.push({ content, addedBy: req.user._id, isPrivate: isPrivate || false });
  await candidate.save();
  res.json({ success: true, data: candidate });
});

// @desc    Upload/replace resume for existing candidate
// @route   POST /api/recruitment/candidates/:id/resume
// @access  Private/HR & Admin
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('Please upload a file'); }

  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  candidate.resume = {
    url: `/uploads/resumes/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    uploadedAt: Date.now()
  };
  await candidate.save();

  res.json({ success: true, data: candidate });
});

// @desc    Stream candidate resume/CV file to browser
// @route   GET /api/recruitment/candidates/:id/resume
// @access  Private/HR & Admin
const getCandidateResume = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).select('+resume');
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  // ── FIX: gracefully handle missing resume ────────────────────────────────
  if (!candidate.resume || !candidate.resume.url) {
    res.status(404); throw new Error('No resume found for this candidate');
  }

  // Strip leading slash so path.join works correctly
  const relativePath = candidate.resume.url.startsWith('/')
    ? candidate.resume.url.substring(1)
    : candidate.resume.url;

  const fullPath = path.join(__dirname, '..', relativePath);

  if (!fs.existsSync(fullPath)) {
    res.status(404); throw new Error('Resume file not found on disk');
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentTypeMap = {
    '.pdf':  'application/pdf',
    '.doc':  'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  const safeFilename = `${candidate.firstName}_${candidate.lastName}_resume${ext}`.replace(/\s/g, '_');

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

  const fileStream = fs.createReadStream(fullPath);
  fileStream.on('error', (err) => {
    console.error('Stream error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to stream file' });
  });
  fileStream.pipe(res);
});

// @desc    HEAD check — does this candidate have a resume?
// @route   HEAD /api/recruitment/candidates/:id/resume
const checkCandidateResume = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).select('+resume');
  if (!candidate || !candidate.resume || !candidate.resume.url) {
    return res.status(404).end();
  }
  res.status(200).end();
});

// @desc    Get recruitment analytics
// @route   GET /api/recruitment/analytics
const getRecruitmentAnalytics = asyncHandler(async (req, res) => {
  const [totalJobs, activeJobs, totalCandidates, candidatesByStatus, jobsByDepartment, candidatesPerJob] =
    await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'Open' }),
      Candidate.countDocuments(),
      Candidate.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
      Job.aggregate([
        { $lookup: { from: 'candidates', localField: '_id', foreignField: 'jobId', as: 'applicants' } },
        { $project: { title: 1, applicantsCount: { $size: '$applicants' } } },
        { $sort: { applicantsCount: -1 } },
        { $limit: 5 }
      ])
    ]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const hiringTrend = await Candidate.aggregate([
    { $match: { status: 'Hired', createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      totalJobs, activeJobs, totalCandidates,
      candidatesByStatus: candidatesByStatus.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {}),
      jobsByDepartment: jobsByDepartment.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {}),
      topJobs: candidatesPerJob,
      hiringTrend
    }
  });
});

// @desc    Get dashboard stats
// @route   GET /api/recruitment/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalJobs, activeJobs, totalCandidates, hiredThisMonth, interviewScheduled, recentCandidates, upcomingInterviews] =
    await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'Open' }),
      Candidate.countDocuments(),
      Candidate.countDocuments({
        status: 'Hired',
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }),
      Candidate.countDocuments({ status: 'Interview Scheduled' }),
      Candidate.find()
        .select('+resume')
        .sort('-createdAt')
        .limit(5)
        .populate('jobId', 'title')
        .select('firstName lastName email status jobId createdAt resume'),
      Candidate.find({ 'interviewScheduled.date': { $gte: new Date() } })
        .sort('interviewScheduled.date')
        .limit(5)
        .populate('jobId', 'title')
        .select('firstName lastName email interviewScheduled jobId')
    ]);

  // Calculate rejection rate
  const totalProcessed = await Candidate.countDocuments({ status: { $in: ['Hired', 'Rejected'] } });
  const rejected = await Candidate.countDocuments({ status: 'Rejected' });
  const rejectionRate = totalProcessed > 0 ? `${Math.round((rejected / totalProcessed) * 100)}%` : '0%';

  res.json({
    success: true,
    data: {
      stats: { totalJobs, activeJobs, totalCandidates, hiredThisMonth, interviewScheduled, rejectionRate },
      recentCandidates,
      upcomingInterviews
    }
  });
});

module.exports = {
  createJob, getJobs, getJob, updateJob, deleteJob, publishJob, closeJob,
  addCandidate, getCandidates, getCandidate, updateCandidateStatus,
  scheduleInterview, addInterviewFeedback, addCandidateNote, uploadResume,
  getRecruitmentAnalytics, getDashboardStats, checkCandidateResume, getCandidateResume
};