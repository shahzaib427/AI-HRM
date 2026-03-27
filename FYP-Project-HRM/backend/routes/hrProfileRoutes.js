const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const hrController = require('../controllers/hrController');

// Protect all HR routes
router.use(protect);

// HR Profile Routes ✅ WORKING (assuming hrController has these)
router.get('/profile', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.getHRProfile
);

router.put('/profile', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.updateHRProfile
);

// HR Stats ✅ WORKING (assuming hrController has this)  
router.get('/stats', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.getHRStats
);

// HR Employee Management ❌ MISSING - COMMENTED OUT
/*
router.get('/employees', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.getAllEmployees  // ← LINE 27 - UNDEFINED
);
*/

module.exports = router;
