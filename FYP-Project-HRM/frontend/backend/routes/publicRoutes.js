// backend/routes/publicRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');

// @desc    Get all open jobs (public)
// @route   GET /api/public/jobs
// @access  Public
router.get('/jobs', async (req, res) => {
  try {
    console.log('Fetching public jobs...');
    const jobs = await Job.find({ status: 'Open' })
      .select('title department jobType location description salaryRange experienceLevel createdAt deadline applicantsCount skillsRequired')
      .sort('-createdAt');
    
    console.log(`Found ${jobs.length} open jobs`);
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Error fetching public jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @desc    Get single job (public)
// @route   GET /api/public/jobs/:id
// @access  Public
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id,
      status: 'Open'
    }).select('-postedBy -__v');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or not open'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @desc    Submit job application (public)
// @route   POST /api/public/apply
// @access  Public
// FIXED POST /apply
router.post('/apply', async (req, res) => {
  try {
    const {
      jobId, firstName, lastName, email, phone, currentCompany, currentPosition,
      totalExperience, currentSalary, expectedSalary, noticePeriod, coverLetter, skills
    } = req.body;
    
    console.log('Public application received for job:', jobId);
    console.log('Raw noticePeriod:', noticePeriod);
    
    // ✅ Map noticePeriod BEFORE creating object
    const noticePeriodMap = {
      '0': 'Immediate', '1': '15 days', '15': '15 days', 
      '30': '30 days', '60': '60 days', '90': '90 days'
    };
    const finalNoticePeriod = noticePeriodMap[noticePeriod] || '15 days';
    
    console.log('Mapped noticePeriod:', finalNoticePeriod);
    
    // ✅ Build object with NO undefined values
    const candidateData = {
      jobId: new mongoose.Types.ObjectId(jobId),  // ✅ Force ObjectId
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      currentCompany: currentCompany || '',
      currentPosition: currentPosition || '',
      noticePeriod: finalNoticePeriod,  // ✅ VALID enum value
      coverLetter: coverLetter || '',
      skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      status: 'Applied',
      source: 'Company Website',
      addedBy: new mongoose.Types.ObjectId('696a8f7d24b9d3066d9f83fe')  // ✅ VALID HR ID
    };
    
    // Add optional numeric fields ONLY if they exist
    if (totalExperience) candidateData.totalExperience = { years: parseInt(totalExperience) };
    if (currentSalary) candidateData.currentSalary = parseFloat(currentSalary);
    if (expectedSalary) candidateData.expectedSalary = parseFloat(expectedSalary);
    
    console.log('Candidate data:', candidateData);
    
    // Validate job
    const job = await Job.findOne({ _id: jobId, status: 'Open' });
    if (!job) {
      return res.status(400).json({ success: false, error: 'Job not found or closed' });
    }
    
    // Check duplicate
    const existing = await Candidate.findOne({ email: candidateData.email, jobId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Already applied' });
    }
    
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