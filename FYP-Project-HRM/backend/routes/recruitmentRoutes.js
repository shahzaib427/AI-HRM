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
  getDashboardStats,
  checkCandidateResume,
  getCandidateResume,
  deleteCandidate
} = require('../controllers/recruitmentController');
const { protect, authorize } = require('../utils/authMiddleware');
const upload = require('../utils/uploadMiddleware');

// ── Job routes ────────────────────────────────────────────────────────────────
router.route('/jobs')
  .get(protect, authorize('hr', 'admin'), getJobs)
  .post(protect, authorize('hr', 'admin'), createJob);

router.route('/jobs/:id')
  .get(protect, authorize('hr', 'admin'), getJob)
  .put(protect, authorize('hr', 'admin'), updateJob)
  .delete(protect, authorize('hr', 'admin'), deleteJob);

router.put('/jobs/:id/publish', protect, authorize('hr', 'admin'), publishJob);
router.put('/jobs/:id/close',   protect, authorize('hr', 'admin'), closeJob);

// ── Candidate routes ──────────────────────────────────────────────────────────
router.route('/candidates')
  .get(protect, authorize('hr', 'admin'), getCandidates)
  .post(protect, authorize('hr', 'admin'), upload.single('resume'), addCandidate);

router.route('/candidates/:id')
  .get(protect,    authorize('hr', 'admin'), getCandidate)
  .delete(protect, authorize('hr', 'admin'), deleteCandidate);

router.put('/candidates/:id/status',
  protect, authorize('hr', 'admin'), updateCandidateStatus);

router.post('/candidates/:id/schedule-interview',
  protect, authorize('hr', 'admin'), scheduleInterview);

router.post('/candidates/:id/feedback',
  protect, authorize('hr', 'admin'), addInterviewFeedback);

router.post('/candidates/:id/notes',
  protect, authorize('hr', 'admin'), addCandidateNote);

// ✅ FIXED: merged all three resume methods into one route block (no conflict)
router.route('/candidates/:id/resume')
  .get(protect,  authorize('hr', 'admin'), getCandidateResume)
  .head(protect, authorize('hr', 'admin'), checkCandidateResume)
  .post(protect, authorize('hr', 'admin'), upload.single('resume'), uploadResume);

// ── Analytics routes ──────────────────────────────────────────────────────────
router.get('/analytics', protect, authorize('hr', 'admin'), getRecruitmentAnalytics);
router.get('/dashboard', protect, authorize('hr', 'admin'), getDashboardStats);

module.exports = router;