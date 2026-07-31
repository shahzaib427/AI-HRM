const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { protect, authorize } = require('../utils/authMiddleware');

const FLASK_BASE      = process.env.FLASK_URL          || 'http://localhost:5001';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'internal-secret-change-me';

// Debug: confirm this file loaded
console.log('✅ atsProxyRoutes.js loaded — FLASK_BASE:', FLASK_BASE);

// ── proxy helper ─────────────────────────────────────────────────────────────
const proxyToFlask = async (req, res, method, flaskPath, body = null) => {
  const url = `${FLASK_BASE}/api/ats${flaskPath}`;
  console.log(`[ATS Proxy] ${method} ${url}`);

  try {
    const response = await axios({
      method,
      url,
      headers: {
        'Content-Type':    'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      ...(body   && { data:   body }),
      ...(req.query && { params: req.query }),
      timeout: 30000,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data   = err.response?.data   || { success: false, message: err.message };
    console.error(`[ATS Proxy] Error ${status}:`, data);
    return res.status(status).json(data);
  }
};

// ── routes ────────────────────────────────────────────────────────────────────

// Test route — no auth needed
router.get('/test-route', (req, res) => {
  res.json({ success: true, message: 'ATS proxy is working!' });
});

router.post('/analyze/:candidateId',
  protect, authorize('hr', 'Hr', 'HR', 'admin', 'Admin'),
  (req, res) => proxyToFlask(req, res, 'POST', `/analyze/${req.params.candidateId}`, req.body)
);

router.get('/score/:candidateId',
  protect, authorize('hr', 'Hr', 'HR', 'admin', 'Admin'),
  (req, res) => proxyToFlask(req, res, 'GET', `/score/${req.params.candidateId}`)
);

router.post('/bulk-scores',
  protect, authorize('hr', 'Hr', 'HR', 'admin', 'Admin'),
  (req, res) => proxyToFlask(req, res, 'POST', '/bulk-scores', req.body)
);

router.post('/send-shortlist-email/:candidateId',
  protect, authorize('hr', 'Hr', 'HR', 'admin', 'Admin'),
  (req, res) => proxyToFlask(req, res, 'POST', `/send-shortlist-email/${req.params.candidateId}`, req.body)
);

router.get('/eligible-candidates',
  protect, authorize('hr', 'Hr', 'HR', 'admin', 'Admin'),
  (req, res) => proxyToFlask(req, res, 'GET', '/eligible-candidates')
);

router.post('/schedule-interview',
  protect, authorize('hr', 'Hr', 'HR', 'admin', 'Admin'),
  (req, res) => proxyToFlask(req, res, 'POST', '/schedule-interview', req.body)
);

router.get('/stats',
  protect, authorize('hr', 'Hr', 'HR', 'admin', 'Admin'),
  (req, res) => proxyToFlask(req, res, 'GET', '/stats')
);

module.exports = router;