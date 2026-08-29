// controllers/subscriptionController.js
//
// PUBLIC endpoints for the "new company, no account yet" flow:
//  - guestCheckout: collects companyName + email, starts Stripe Checkout
//  - checkSetupToken / setPassword: the emailed password-setup link flow

const crypto = require('crypto');
const User = require('../models/User');
const paymentService = require('../services/paymentService');
const { isStripeConfigured } = require('../config/stripe');
const { PLANS } = require('./billingController'); // single source of truth for plans

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const isValidEmail = (email) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);

// POST /api/subscription/guest-checkout — PUBLIC
// { companyName, email, planId }
exports.guestCheckout = async (req, res) => {
  try {
    const { companyName, email, planId } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required' });
    }
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Don't blindly create a second account for an email that already has
    // one — send them to log in and subscribe from their billing page instead.
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_EXISTS',
        message: 'An account with this email already exists. Please log in and subscribe from your billing page.'
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await paymentService.createCheckoutSession({
      planId,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      customerEmail: normalizedEmail,
      successUrl: `${clientUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(normalizedEmail)}`,
      cancelUrl: `${clientUrl}/subscription/cancel`,
      metadata: {
        guestCheckout: 'true',
        companyName: companyName.trim(),
        email: normalizedEmail,
        planId
      }
    });

    res.json({ success: true, data: session, mockMode: !isStripeConfigured() });
  } catch (err) {
    console.error('Guest checkout error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/subscription/setup-token-check?token=... — PUBLIC
// Lets the SetPassword page show a friendly "expired link" message before
// the person even starts typing a password.
exports.checkSetupToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing token' });
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenUsed: false,
      passwordResetTokenExpires: { $gt: new Date() }
    }).select('email');

    if (!user) {
      return res.status(400).json({ success: false, message: 'This setup link is invalid or has expired' });
    }

    res.json({ success: true, data: { email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/subscription/set-password — PUBLIC
// { token, password, confirmPassword }
exports.setPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing setup token' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenUsed: false,
      passwordResetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'This setup link is invalid or has expired' });
    }

    user.password = password; // hashed automatically by the User pre-save hook
    user.passwordResetTokenUsed = true;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password created. You can now log in.' });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};