// routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { protect } = require('../utils/authMiddleware');

// PUBLIC — pricing list only, no subscription lookup.
router.get('/plans', billingController.getPlans);

// PUBLIC — no protect. Works for both guest and logged-in mock checkouts;
// the session's own metadata (set at creation time) determines which path
// to take. req.user is never read inside the controller, so protect here
// only blocked guests (who have no token) without adding real security.
router.post('/mock/complete/:sessionId', billingController.completeMockCheckout);

// PROTECTED — existing logged-in admin's billing page
router.get('/status', protect, billingController.getBillingStatus);
router.post('/checkout-session', protect, billingController.createCheckoutSession);

// ⚠️ IMPORTANT: Stripe webhooks must receive the RAW request body (not
// JSON-parsed) to verify the signature. This route uses express.raw()
// instead of the app-wide express.json() middleware. Make sure this
// router is mounted BEFORE any global express.json() call in your
// server.js, OR mount this specific path with raw parsing there instead:
//
//   app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);
//   app.use('/api/billing', billingRoutes);   // <- your other json-parsed routes
//
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

module.exports = router;