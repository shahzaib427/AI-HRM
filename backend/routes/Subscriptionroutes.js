// routes/subscriptionRoutes.js
//
// All routes here are PUBLIC on purpose — this is the "no account yet"
// onboarding flow. Mount in server.js as: app.use('/api/subscription', ...)

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/Subscriptioncontroller');

router.post('/guest-checkout', subscriptionController.guestCheckout);
router.get('/setup-token-check', subscriptionController.checkSetupToken);
router.post('/set-password', subscriptionController.setPassword);

module.exports = router;