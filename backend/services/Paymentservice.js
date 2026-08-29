// services/paymentService.js
//
// The rest of the app (billingController.js) only ever talks to THIS
// file. It never imports Stripe or the mock service directly. That way
// switching from dummy mode to real Stripe is purely a .env change —
// zero controller/route changes required.

const { stripeClient, isStripeConfigured } = require('../config/stripe');
const mockStripeService = require('./Mockstripeservice');

/** 
 * Creates a checkout session — real Stripe Checkout if configured,
 * otherwise a fake session pointing at our own /mock-checkout page.
 */
exports.createCheckoutSession = async ({
  planId,
  planName,
  amount,       // in the smallest currency unit, e.g. cents
  currency = 'usd',
  customerEmail,
  successUrl,
  cancelUrl,
  metadata = {}
}) => {
  if (isStripeConfigured()) {
    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: planName },
            unit_amount: amount,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }
      ],
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    });

    return { id: session.id, url: session.url, mock: false };
  }

  return mockStripeService.createCheckoutSession({
    planId,
    planName,
    amount,
    currency,
    customerEmail,
    metadata
  });
};

/**
 * Verifies + parses an incoming webhook payload.
 * Real mode: validates the Stripe signature.
 * Mock mode: the payload is already trusted (it only ever comes from our
 * own /mock/complete endpoint), so it's just parsed as-is.
 */
exports.constructWebhookEvent = (rawBody, signature) => {
  if (isStripeConfigured() && process.env.STRIPE_WEBHOOK_SECRET) {
    return stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
  return typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
};

exports.isLiveMode = isStripeConfigured;