const express = require('express');
const router = express.Router();
const {
  submitContactForm,
  getContactSubmissions,
  getContactSubmission,
  updateContactStatus,
  addContactNote,
  deleteContactSubmission,
  getContactStats
} = require('../controllers/contactController');

const { protect, authorize } = require('../utils/authMiddleware');

// ================= PUBLIC ROUTES (No Login Required) =================
// Anyone can submit the contact form
router.post('/', submitContactForm);

// ================= PROTECTED ROUTES (Admin & HR Only) =================
// All routes below require authentication and admin/hr role

// Get all contact submissions (Admin & HR)
router.get('/', protect, authorize('admin', 'hr'), getContactSubmissions);

// Get contact statistics (Admin & HR)
router.get('/stats/summary', protect, authorize('admin', 'hr'), getContactStats);

// Get single contact submission (Admin & HR)
router.get('/:id', protect, authorize('admin', 'hr'), getContactSubmission);

// Update contact status (Admin & HR)
router.put('/:id/status', protect, authorize('admin', 'hr'), updateContactStatus);

// Add note to contact (Admin & HR)
router.post('/:id/notes', protect, authorize('admin', 'hr'), addContactNote);

// Delete contact submission (Admin ONLY)
router.delete('/:id', protect, authorize('admin'), deleteContactSubmission);

module.exports = router;