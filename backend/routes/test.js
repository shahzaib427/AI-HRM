// Create a file: routes/test.js
const express = require('express');
const router = express.Router();

// Test POST route
router.post('/test-post', (req, res) => {
  console.log('Received POST data:', req.body);
  res.json({
    success: true,
    message: 'POST request received successfully',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test GET route
router.get('/test-get', (req, res) => {
  res.json({
    success: true,
    message: 'GET request received successfully',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;