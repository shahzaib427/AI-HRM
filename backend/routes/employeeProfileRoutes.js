const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const employeeController = require('../controllers/employeeController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-pictures';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

// File filter
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Protect all employee routes
router.use(protect);

// Profile Picture Upload Route (add this BEFORE other routes)
router.post('/upload-profile-picture',
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  upload.single('profilePicture'),
  employeeController.uploadProfilePicture
);

// Delete profile picture
router.delete('/profile-picture',
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.deleteProfilePicture
);

// Employee Profile Routes
router.get('/profile/me', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.getMyProfile
);

router.put('/profile/me', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.updateMyProfile
);

// Employee Dashboard
router.get('/dashboard', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.getDashboard
);

// Leave Balance
router.get('/leaves/balance', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.getLeaveBalance
);

// Alternative endpoint for fallback
router.get('/profile', employeeController.getMyProfile);

module.exports = router;