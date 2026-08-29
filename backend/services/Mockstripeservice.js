// services/mockStripeService.js
//
// A fake, in-memory stand-in for Stripe Checkout, used only when no real
// Stripe key is configured (see config/stripe.js). Lets the whole
// checkout -> payment -> subscription-activated flow be built, demoed,
// and tested with zero real API keys.
//
// NOTE: sessions live in memory and are lost on server restart. That's
// fine for a demo/dev flow — this whole module stops being used the
// moment real Stripe keys are added to .env.

const crypto = require('crypto');

const mockSessions = new Map();

exports.createCheckoutSession = ({ planId, planName, amount, currency, customerEmail, metadata = {} }) => {
  const sessionId = 'mock_cs_' + crypto.randomBytes(12).toString('hex');

  mockSessions.set(sessionId, {
    id: sessionId,
    planId,
    planName,
    amount,
    currency,
    customerEmail,
    metadata,
    status: 'open' // open -> complete
  });

  // Points at our own in-app fake checkout page instead of Stripe's
  // hosted checkout page.
  // ⚠️ FIX: fallback was 'http://localhost:3000' (a leftover CRA default).
  // This project's frontend runs on Vite, default port 5173 — always set
  // CLIENT_URL in .env explicitly, this is just a safety-net default.
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const url = `${clientUrl}/mock-checkout/${sessionId}`;

  return { id: sessionId, url, mock: true };
};

exports.getSession = (sessionId) => mockSessions.get(sessionId) || null;

exports.completeSession = (sessionId) => {
  const session = mockSessions.get(sessionId);
  if (!session) return null;
  session.status = 'complete';
  mockSessions.set(sessionId, session);
  return session;
};