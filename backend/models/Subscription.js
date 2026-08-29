// models/Subscription.js
//
// Tracks billing status for an Organization (not a User directly).

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    planId: { type: String, default: null },       // e.g. 'plan-50' | 'plan-100' | 'plan-250'
    status: {
      type: String,
      enum: ['inactive', 'active', 'past_due', 'cancelled'],
      default: 'inactive'
    },
    provider: { type: String, enum: ['stripe', 'mock'], default: 'mock' },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    // Checkout session id — the idempotency key. A retried Stripe webhook
    // (or, in mock mode, an accidental double click on "Pay Now") must
    // never provision the same Organization/User/Subscription twice.
    stripeCheckoutSessionId: { type: String, default: null, unique: true, sparse: true },
    currentPeriodEnd: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);