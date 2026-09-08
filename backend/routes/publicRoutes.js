const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
// ✅ CHANGED: previously this file had its own inline multer.diskStorage()
// setup that saved resumes to a local folder — a second, separate copy of
// the same problem fixed in utils/uploadMiddleware.js. Now it reuses that
// same shared Cloudinary-based upload middleware, so public applications
// and HR-added candidates both store resumes the same permanent way.
const upload = require('../utils/uploadMiddleware');

// GET /api/public/jobs
router.get('/jobs', async (req, res) => {
  try {
    console.log('Fetching public jobs...');
    const jobs = await Job.find({ status: 'Open' })
      .select('title department jobType location description salaryRange experienceLevel createdAt deadline applicantsCount skillsRequired status')
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

    // ✅ CHANGED: req.file.path is now the permanent Cloudinary URL
    // (previously a local disk path that would be wiped on redeploy).
    let resumeData = null;
    if (req.file) {
      resumeData = {
        url: req.file.path,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: Date.now()
      };
      console.log('✅ Resume saved to Cloudinary:', resumeData.originalName);
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