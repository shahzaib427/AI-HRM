// config/stripe.js
//
// Central place that decides: are we running with REAL Stripe keys, or
// should billing fall back to the dummy/mock flow?
//
// Anyone who buys this project just needs to open .env and replace
// STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET with
// their own real values. Nothing else in the codebase needs to change —
// paymentService.js checks isStripeConfigured() and routes to the real
// SDK automatically once real keys are present.

const isStripeConfigured = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return false;
  // Treat placeholder/dummy values as "not configured" so the app stays
  // in mock mode until someone deliberately pastes in a real key.
  if (key.includes('dummy') || key.includes('YOUR_') || key.trim() === '') return false;
  return key.startsWith('sk_test_') || key.startsWith('sk_live_');
};

let stripeClient = null;

if (isStripeConfigured()) {
  // Only require + instantiate the SDK when we actually have a real key —
  // avoids a hard dependency/crash for anyone running in mock mode without
  // having configured anything yet.
  const Stripe = require('stripe');
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
  });
  console.log('✅ Stripe: running in LIVE/TEST mode with real API keys');
} else {
  console.log('🧪 Stripe: no real keys found — running in MOCK/DUMMY mode');
}

module.exports = { stripeClient, isStripeConfigured };