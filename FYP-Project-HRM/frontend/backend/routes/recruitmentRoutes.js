const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/recruitmentController');
const { protect, authorize } = require('../utils/authMiddleware');
const upload = require('../utils/uploadMiddleware');

// Job routes
router.route('/jobs')
  .get(protect, authorize('hr', 'admin'), getJobs)
  .post(protect, authorize('hr', 'admin'), createJob);

router.route('/jobs/:id')
  .get(protect, authorize('hr', 'admin'), getJob)
  .put(protect, authorize('hr', 'admin'), updateJob)
  .delete(protect, authorize('hr', 'admin'), deleteJob);

router.put('/jobs/:id/publish', protect, authorize('hr', 'admin'), publishJob);
router.put('/jobs/:id/close', protect, authorize('hr', 'admin'), closeJob);

// Candidate routes
router.route('/candidates')
  .get(protect, authorize('hr', 'admin'), getCandidates)
  .post(protect, authorize('hr', 'admin'), addCandidate);

router.route('/candidates/:id')
  .get(protect, authorize('hr', 'admin'), getCandidate);

router.put('/candidates/:id/status', protect, authorize('hr', 'admin'), updateCandidateStatus);
router.post('/candidates/:id/interview', protect, authorize('hr', 'admin'), scheduleInterview);
router.post('/candidates/:id/feedback', protect, authorize('hr', 'admin'), addInterviewFeedback);
router.post('/candidates/:id/notes', protect, authorize('hr', 'admin'), addCandidateNote);
router.post('/candidates/:id/resume', protect, authorize('hr', 'admin'), upload.single('resume'), uploadResume);

// Analytics routes
router.get('/analytics', protect, authorize('hr', 'admin'), getRecruitmentAnalytics);
router.get('/dashboard', protect, authorize('hr', 'admin'), getDashboardStats);
// Add this to your recruitment routes or create new public routes
router.get('/public/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'Open' })
      .select('title department jobType location description salaryRange experienceLevel createdAt deadline applicantsCount')
      .sort('-createdAt');
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router;