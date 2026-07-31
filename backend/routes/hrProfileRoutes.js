const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const hrController = require('../controllers/hrController');
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
    cb(null, `hr-profile-${req.user.id}-${uniqueSuffix}${ext}`);
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

// Protect all HR routes
router.use(protect);

// Profile Picture Upload Routes
router.post('/upload-profile-picture',
  authorize(['hr', 'admin', 'administrator']),
  upload.single('profilePicture'),
  hrController.uploadProfilePicture
);

router.delete('/profile-picture',
  authorize(['hr', 'admin', 'administrator']),
  hrController.deleteProfilePicture
);

// HR Profile Routes
router.get('/profile', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.getHRProfile
);

router.put('/profile', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.updateHRProfile
);

// HR Stats
router.get('/stats', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.getHRStats
);

// ============= ADD THESE NEW DASHBOARD ENDPOINTS =============

// Dashboard Stats
router.get('/dashboard/stats',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getDashboardStats
);

// Recent Activity
router.get('/dashboard/recent-activity',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getRecentActivity
);

// Pending Approvals
router.get('/dashboard/pending-approvals',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getPendingApprovals
);

// Recruitment Data
router.get('/dashboard/recruitment-data',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getRecruitmentData
);

// HR Metrics
router.get('/dashboard/metrics',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getHRMetrics
);

module.exports = router;