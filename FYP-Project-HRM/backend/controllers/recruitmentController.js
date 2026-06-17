// backend/controllers/recruitmentController.js
const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
const fs = require('fs');
const path = require('path');
const NotificationService = require('../services/notificationService');

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
    deadline: deadline && deadline !== 'null' && deadline !== '' ? new Date(deadline) : undefined,
    tags: Array.isArray(tags) ? tags : [],
    skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : []
  });

  // ✅ Send notification to HR/Admin team about new job posting
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'New Job Posted 📋',
      message: `New position "${title}" has been posted in ${department} department`,
      data: {
        jobId: job._id,
        title: title,
        department: department
      },
      priority: 'high'
    });
  }

  res.status(201).json({ success: true, data: job });
});

// @desc    Publish job with notification
// @route   PUT /api/recruitment/jobs/:id/publish
const publishJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Job not found'); }

  job.status = 'Open';
  job.publishedAt = Date.now();
  await job.save();

  // ✅ Send notification when job is published
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'Job Published ✅',
      message: `Job "${job.title}" has been published and is now open for applications`,
      data: {
        jobId: job._id,
        title: job.title
      },
      priority: 'medium'
    });
  }

  res.json({ success: true, data: job });
});

// @desc    Add candidate (with resume upload) - WITH NOTIFICATION
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

  let resumeData = null;
  if (req.file) {
    resumeData = {
      url: `/uploads/resumes/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: Date.now()
    };
    console.log('✅ Resume uploaded:', resumeData);
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
    resume: resumeData
  });

  job.applicantsCount += 1;
  await job.save();

  // ✅ Send notification to HR/Admin about new candidate application
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'New Candidate Application 👤',
      message: `${firstName} ${lastName} applied for "${job.title}"`,
      data: {
        candidateId: candidate._id,
        candidateName: `${firstName} ${lastName}`,
        jobId: job._id,
        jobTitle: job.title
      },
      priority: 'high'
    });
  }

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
    console.warn('⚠️ Confirmation email failed:', emailErr.message);
  }

  res.status(201).json({ success: true, data: candidate });
});

// @desc    Update candidate status - WITH NOTIFICATION
// @route   PUT /api/recruitment/candidates/:id/status
// @access  Private/HR & Admin
const updateCandidateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const candidate = await Candidate.findById(req.params.id).populate('jobId');
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  const oldStatus = candidate.status;
  candidate.status = status;
  candidate.lastContacted = Date.now();
  if (notes) candidate.notes.push({ content: notes, addedBy: req.user._id, isPrivate: false });
  await candidate.save();

  // ✅ Send notification to HR/Admin about status change
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'Candidate Status Updated 📝',
      message: `${candidate.firstName} ${candidate.lastName} status changed from ${oldStatus} to ${status}`,
      data: {
        candidateId: candidate._id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        oldStatus: oldStatus,
        newStatus: status
      },
      priority: 'medium'
    });
  }

  // ✅ Also notify the candidate via email (existing code)
  const statusMessages = {
    'Shortlisted': 'Congratulations! Your application has been shortlisted.',
    'Interview Scheduled': 'We would like to schedule an interview with you.',
    'Rejected': 'Thank you for your interest, but we have decided to proceed with other candidates.',
    'Offer Sent': 'Congratulations! We are pleased to extend an offer to you.',
    'Hired': 'Welcome aboard! Your application has been successful.'
  };

  if (statusMessages[status]) {
    try {
      await sendEmail({
        to: candidate.email,
        subject: 'Update on Your Application - ' + candidate.jobId.title,
        html: `
          <h2>Application Update</h2>
          <p>Dear ${candidate.firstName},</p>
          <p>${statusMessages[status]}</p>
          <br/><p>Best regards,<br/>HR Team</p>
        `
      });
    } catch (emailErr) {
      console.warn('⚠️ Status email failed:', emailErr.message);
    }
  }

  res.json({ success: true, data: candidate });
});

// @desc    Schedule interview - WITH NOTIFICATION
// @route   POST /api/recruitment/candidates/:id/interview
// @desc    Schedule interview - WITH NOTIFICATION
// @route   POST /api/recruitment/candidates/:id/interview
const scheduleInterview = asyncHandler(async (req, res) => {
  const { date, time, interviewer, interviewType, meetingLink, notes, round, sendEmail: shouldSendEmail } = req.body;
  const candidate = await Candidate.findById(req.params.id).populate('jobId');
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  candidate.interviewHistory.push({
    round: round || 1, date: new Date(date), interviewer,
    feedback: '', rating: 1, status: 'Scheduled'
  });
  candidate.interviewScheduled = { date: new Date(date), time, interviewer, interviewType, meetingLink, notes };
  candidate.status = 'Interview Scheduled';
  await candidate.save();

  // ✅ Send notification to HR/Admin
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'Interview Scheduled 📅',
      message: `Interview scheduled for ${candidate.firstName} ${candidate.lastName} on ${new Date(date).toLocaleDateString()}`,
      data: {
        candidateId: candidate._id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        interviewDate: date,
        interviewTime: time,
        interviewType: interviewType
      },
      priority: 'high'
    });
  }

  try {
    const firstName = candidate.firstName;
    const jobTitle = candidate.jobId?.title || 'the position';
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    await sendEmail({
      to: candidate.email,
      subject: `Interview Invitation - ${candidate.firstName} ${candidate.lastName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f9fafb;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">

      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#d1fae5;border-radius:9999px;padding:14px;margin-bottom:12px;">
          <span style="font-size:30px;">📅</span>
        </div>
        <h2 style="margin:0 0 6px;font-size:22px;font-weight:600;color:#111827;">Interview Invitation</h2>
        <p style="margin:0;color:#6b7280;font-size:14px;">Congratulations — you have been shortlisted!</p>
      </div>

      <p style="color:#374151;font-size:15px;margin:0 0 8px;">Dear <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.6;">
        Congratulations! We are pleased to inform you that you have been shortlisted
        for the next stage of our recruitment process for
        <strong style="color:#059669;">${jobTitle}</strong>.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;width:40%;">📅 Interview Date</td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">🕐 Interview Time</td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${time}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">🎤 Interviewer</td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${interviewer || 'HR Team'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">💻 Interview Type</td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${interviewType || 'Virtual'}</td>
          </tr>
          ${meetingLink ? `
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">🔗 Meeting Link</td>
            <td style="padding:6px 0;font-size:14px;">
              <a href="${meetingLink}" style="color:#059669;font-weight:500;word-break:break-all;">${meetingLink}</a>
            </td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;vertical-align:top;">📝 Notes</td>
            <td style="padding:6px 0;color:#374151;font-size:14px;">${notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin-bottom:20px;">
        <h4 style="margin:0 0 8px;color:#065f46;font-size:15px;font-weight:600;">🎯 Interview Preparation</h4>
        <p style="margin:0 0 10px;color:#374151;font-size:14px;line-height:1.6;">
          To help you prepare and improve your confidence before the interview,
          we recommend using our AI Interview Coach.
        </p>
        <a href="https://ai-interview-master-blush.vercel.app/"
           target="_blank"
           style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;
                  padding:10px 20px;border-radius:6px;font-size:14px;font-weight:500;">
          Start AI Interview Practice →
        </a>
      </div>

      <p style="color:#374151;font-size:14px;margin:0 0 8px;font-weight:500;">The AI Interview Coach provides:</p>
      <ul style="margin:0 0 20px;padding-left:20px;color:#374151;font-size:14px;line-height:2;">
        <li>Mock Interview Questions</li>
        <li>Technical Interview Practice</li>
        <li>HR Interview Preparation</li>
        <li>Confidence Building Sessions</li>
        <li>Real-Time Feedback</li>
      </ul>

      <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.6;">
        We look forward to speaking with you and wish you the best of luck in your interview.
      </p>

      <p style="color:#374151;font-size:15px;margin:0;">
        Best Regards,<br>
        <strong>HR Team</strong>
      </p>

    </div>

    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      This email was sent by the Recruitment System. Please do not reply directly.
    </p>
  </div>
</body>
</html>
      `
    });
    console.log('✅ Interview invitation email sent to:', candidate.email);
  } catch (emailErr) {
    console.warn('⚠️ Interview email failed:', emailErr.message);
  }

  res.json({ success: true, data: candidate });
});

// @desc    Add interview feedback - WITH NOTIFICATION
// @route   POST /api/recruitment/candidates/:id/feedback
const addInterviewFeedback = asyncHandler(async (req, res) => {
  const { feedback, rating, status } = req.body;
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }

  const latestInterview = candidate.interviewHistory[candidate.interviewHistory.length - 1];
  if (latestInterview) { 
    latestInterview.feedback = feedback; 
    latestInterview.rating = rating; 
    latestInterview.status = status; 
  }
  candidate.interviewScheduled = null;
  if (status === 'Completed') candidate.status = rating >= 4 ? 'Interviewed' : 'Under Review';
  
  await candidate.save();

  // ✅ Send notification to HR/Admin
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'Interview Feedback Added 📊',
      message: `Feedback added for ${candidate.firstName} ${candidate.lastName}. Rating: ${rating}/5`,
      data: {
        candidateId: candidate._id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        rating: rating,
        feedback: feedback.substring(0, 100)
      },
      priority: 'medium'
    });
  }

  res.json({ success: true, data: candidate });
});

// Keep all your existing functions unchanged below
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

const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (!job) { res.status(404); throw new Error('Job not found'); }
  job.viewsCount += 1;
  await job.save();
  res.json({ success: true, data: job });
});

const updateJob = asyncHandler(async (req, res) => {
  let job = await Job.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Job not found'); }
  if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403); throw new Error('Not authorized to update this job');
  }
  job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, data: job });
});

// @desc    Delete job posting
// @route   DELETE /api/recruitment/jobs/:id
// @access  Private/HR & Admin
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  
  // ✅ FIX: Allow HR and Admin to delete any job
  // Remove the postedBy check - HR and Admin should be able to delete any job
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    res.status(403);
    throw new Error('Not authorized to delete this job - Only HR and Admin can delete jobs');
  }
  
  // Delete all candidates/applications for this job
  await Candidate.deleteMany({ jobId: job._id });
  
  // Delete the job
  await job.deleteOne();
  
  // Send notification about job deletion
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'Job Deleted 🗑️',
      message: `Job "${job.title}" has been deleted by ${req.user.name || req.user.email}`,
      data: {
        jobId: job._id,
        title: job.title,
        deletedBy: req.user._id
      },
      priority: 'high'
    });
  }
  
  res.json({ 
    success: true, 
    message: 'Job deleted successfully' 
  });
});

const closeJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) { res.status(404); throw new Error('Job not found'); }
  job.status = 'Closed';
  await job.save();
  res.json({ success: true, data: job });
});

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
  const limit = parseInt(req.query.limit) || 50;
  const skip  = (page - 1) * limit;

  const sort = {};
  if (sortBy) sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  else sort.createdAt = -1;

  const candidates = await Candidate.find(query)
    .select('+resume')
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

const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .select('+resume')
    .populate('jobId', 'title department location salaryRange')
    .populate('addedBy', 'name email')
    .populate('notes.addedBy', 'name');

  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }
  res.json({ success: true, data: candidate });
});

const addCandidateNote = asyncHandler(async (req, res) => {
  const { content, isPrivate } = req.body;
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }
  candidate.notes.push({ content, addedBy: req.user._id, isPrivate: isPrivate || false });
  await candidate.save();
  res.json({ success: true, data: candidate });
});
// @desc    Delete candidate
// @route   DELETE /api/recruitment/candidates/:id
// @access  Private/HR & Admin
const deleteCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  // ✅ FIX: Allow HR and Admin to delete any candidate
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    res.status(403);
    throw new Error('Not authorized to delete this candidate - Only HR and Admin can delete candidates');
  }
  
  // Delete the candidate's resume file from disk if it exists
  if (candidate.resume && candidate.resume.url) {
    try {
      const relativePath = candidate.resume.url.startsWith('/') 
        ? candidate.resume.url.substring(1) 
        : candidate.resume.url;
      const fullPath = path.join(__dirname, '..', relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('✅ Resume file deleted:', fullPath);
      }
    } catch (err) {
      console.warn('⚠️ Could not delete resume file:', err.message);
    }
  }
  
  // Get job info before deleting candidate
  const job = await Job.findById(candidate.jobId);
  
  // Delete the candidate
  await candidate.deleteOne();
  
  // Decrement applicants count for the job
  if (job) {
    job.applicantsCount = Math.max(0, (job.applicantsCount || 1) - 1);
    await job.save();
  }
  
  // Send notification about candidate deletion
  const io = req.app.get('io');
  const NotificationService = require('../services/notificationService');
  const notificationService = new NotificationService(io);
  
  const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
  for (const hr of hrUsers) {
    await notificationService.createNotification({
      recipient: {
        userId: hr._id,
        userModel: 'User',
        role: hr.role
      },
      type: 'recruitment_update',
      title: 'Candidate Deleted 🗑️',
      message: `Candidate "${candidate.firstName} ${candidate.lastName}" has been deleted by ${req.user.name || req.user.email}`,
      data: {
        candidateId: candidate._id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        deletedBy: req.user._id
      },
      priority: 'high'
    });
  }
  
  res.json({ 
    success: true, 
    message: 'Candidate deleted successfully' 
  });
});

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

const getCandidateResume = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).select('+resume');
  if (!candidate) { res.status(404); throw new Error('Candidate not found'); }
  if (!candidate.resume || !candidate.resume.url) {
    res.status(404); throw new Error('No resume found for this candidate');
  }
  const relativePath = candidate.resume.url.startsWith('/') ? candidate.resume.url.substring(1) : candidate.resume.url;
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

const checkCandidateResume = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).select('+resume');
  if (!candidate || !candidate.resume || !candidate.resume.url) {
    return res.status(404).end();
  }
  res.status(200).end();
});

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
  addCandidate, getCandidates, getCandidate,deleteCandidate, updateCandidateStatus,
  scheduleInterview, addInterviewFeedback, addCandidateNote, uploadResume,
  getRecruitmentAnalytics, getDashboardStats, checkCandidateResume, getCandidateResume
};