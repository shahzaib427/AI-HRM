const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');

// Setup multer locally (avoids import issues)
const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX allowed'));
    }
  }
});

// GET /api/public/jobs
router.get('/jobs', async (req, res) => {
  try {
    console.log('Fetching public jobs...');
    const jobs = await Job.find({ status: 'Open' })
      .select('title department jobType location description salaryRange experienceLevel createdAt deadline applicantsCount skillsRequired')
      .sort('-createdAt');
    console.log(`Found ${jobs.length} open jobs`);
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('Error fetching public jobs:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/public/jobs/:id
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, status: 'Open' })
      .select('-postedBy -__v');
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found or not open' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/public/apply
router.post('/apply', upload.single('resume'), async (req, res) => {
  try {
        console.log('=== APPLY DEBUG ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body));
    console.log('req.file:', req.file);
    console.log('==================');
    const {
      
      jobId, firstName, lastName, email, phone,
      currentCompany, currentPosition, totalExperience,
      currentSalary, expectedSalary, noticePeriod,
      coverLetter, skills
    } = req.body;

    console.log('Public application received for job:', jobId);
    console.log('Resume file:', req.file ? req.file.filename : 'NO FILE');

    const noticePeriodMap = {
      '0': 'Immediate', '1': '15 days', '15': '15 days',
      '30': '30 days', '60': '60 days', '90': '90 days'
    };
    const finalNoticePeriod = noticePeriodMap[noticePeriod] || '15 days';

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
      console.log('✅ Resume saved:', resumeData.originalName);
    } else {
      console.log('⚠️  No resume file received');
    }

    const job = await Job.findOne({ _id: jobId, status: 'Open' });
    if (!job) {
      return res.status(400).json({ success: false, error: 'Job not found or closed' });
    }

    const existing = await Candidate.findOne({ email: email.toLowerCase().trim(), jobId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Already applied for this position' });
    }

    const candidateData = {
      jobId: new mongoose.Types.ObjectId(jobId),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      currentCompany: currentCompany || '',
      currentPosition: currentPosition || '',
      noticePeriod: finalNoticePeriod,
      coverLetter: coverLetter || '',
      skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      status: 'Applied',
      source: 'Company Website',
      addedBy: new mongoose.Types.ObjectId('696a8f7d24b9d3066d9f83fe'),
      resume: resumeData
    };

    if (totalExperience) candidateData.totalExperience = { years: parseInt(totalExperience) };
    if (currentSalary) candidateData.currentSalary = parseFloat(currentSalary);
    if (expectedSalary) candidateData.expectedSalary = parseFloat(expectedSalary);

    const candidate = await Candidate.create(candidateData);
    job.applicantsCount = (job.applicantsCount || 0) + 1;
    await job.save();

    console.log(`✅ SUCCESS: Candidate ID: ${candidate._id}`);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: { id: candidate._id, fullName: `${firstName} ${lastName}` }
    });

  } catch (error) {
    console.error('🚨 FULL ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;