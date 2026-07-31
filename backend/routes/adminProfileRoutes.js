const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const adminController = require('../controllers/adminController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-pictures';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `admin-profile-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Protect all admin routes
router.use(protect);
router.use(authorize(['admin', 'administrator']));

// Profile Picture Routes
router.post('/upload-profile-picture',
  upload.single('profilePicture'),
  adminController.uploadProfilePicture
);

router.delete('/profile-picture',
  adminController.deleteProfilePicture
);

// Admin Profile Routes
router.get('/profile', adminController.getAdminProfile);
router.put('/profile', adminController.updateAdminProfile);

// System Stats
router.get('/stats', adminController.getSystemStats);

// Dashboard Routes
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/recent-activity', adminController.getRecentActivity);
router.get('/dashboard/team-members', adminController.getTeamMembers);
router.get('/dashboard/notifications', adminController.getNotifications);
router.patch('/dashboard/notifications/:id/read', adminController.markNotificationRead);
router.get('/dashboard/performance-metrics', adminController.getPerformanceMetrics);
router.get('/dashboard/quick-actions', adminController.getQuickActions);

// 2FA Toggle
router.post('/toggle-2fa', adminController.toggle2FA);

module.exports = router;