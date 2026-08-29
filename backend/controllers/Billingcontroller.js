// controllers/billingController.js
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const paymentService = require('../services/paymentService');
const mockStripeService = require('../services/mockStripeService');
const { isStripeConfigured } = require('../config/stripe');
const { provisionOrganizationFromGuestCheckout } = require('../services/subscriptionOnboardingService');

// Plans are keyed by employee-count tier. Amounts are in cents.
// Rename ids/prices freely — just keep planId consistent with whatever the
// frontend sends.
const PLANS = {
  'plan-50':  { name: '50 Employees',  amount: 4900,  currency: 'usd', employeeLimit: 50  },
  'plan-100': { name: '100 Employees', amount: 8900,  currency: 'usd', employeeLimit: 100 },
  'plan-250': { name: '250 Employees', amount: 19900, currency: 'usd', employeeLimit: 250 }
};

// Exported so subscriptionController.js (guest checkout) reuses the exact
// same plan list instead of duplicating it.
exports.PLANS = PLANS;

// GET /billing/plans — PUBLIC. Used by the public pricing page.
exports.getPlans = async (req, res) => {
  res.json({
    success: true,
    data: { mockMode: !isStripeConfigured(), plans: PLANS }
  });
};

// GET /billing/status — PROTECTED. Existing logged-in admin's org + subscription.
exports.getBillingStatus = async (req, res) => {
  try {
    const org = await Organization.findOne({ admin: req.user.id });
    const subscription = org ? await Subscription.findOne({ owner: org._id }) : null;

    res.json({
      success: true,
      data: {
        mockMode: !isStripeConfigured(),
        plans: PLANS,
        subscription: subscription || { status: 'inactive', planId: null }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /billing/checkout-session { planId } — PROTECTED.
// Existing logged-in admin subscribing/upgrading from their billing page.
exports.createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    let org = await Organization.findOne({ admin: req.user.id });
    if (!org) {
      // Logged-in user with no Organization yet (e.g. account predates this
      // feature) — create one now so the subscription has somewhere to attach.
      org = await Organization.create({
        name: req.user.name || 'My Company',
        admin: req.user.id,
        planId,
        employeeLimit: plan.employeeLimit
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await paymentService.createCheckoutSession({
      planId,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      customerEmail: req.user.email,
      successUrl: `${clientUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${clientUrl}/billing/cancel`,
      metadata: {
        guestCheckout: 'false',
        organizationId: org._id.toString(),
        planId
      }
    });

    res.json({ success: true, data: session, mockMode: !isStripeConfigured() });
  } catch (err) {
    console.error('Create checkout session error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /billing/mock/complete/:sessionId — PUBLIC (no protect).
// Works for BOTH guest and logged-in mock checkouts — the session's own
// metadata (set at creation time) determines which path to take, exactly
// like the real Stripe webhook does. req.user is never used here, so
// requiring auth added no real protection, just an artificial gate that
// broke the guest flow (guests have no token to send).
exports.completeMockCheckout = async (req, res) => {
  try {
    if (isStripeConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Real Stripe is configured — mock checkout is disabled'
      });
    }

    const { sessionId } = req.params;
    const session = mockStripeService.completeSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Mock session not found or expired' });
    }

    const metadata = session.metadata || {};
    const plan = PLANS[metadata.planId];

    if (metadata.guestCheckout === 'true') {
      const result = await provisionOrganizationFromGuestCheckout({
        checkoutSessionId: session.id,
        customerId: null,
        subscriptionId: null,
        provider: 'mock',
        companyName: metadata.companyName,
        email: metadata.email,
        planId: metadata.planId,
        plan
      });
      return res.json({
        success: true,
        message: 'Mock payment completed',
        data: session,
        provisioned: !result.alreadyProcessed
      });
    }

    // Existing logged-in flow
    const organizationId = metadata.organizationId;
    if (organizationId) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await Subscription.findOneAndUpdate(
        { owner: organizationId },
        {
          owner: organizationId,
          planId: metadata.planId,
          status: 'active',
          provider: 'mock',
          stripeCheckoutSessionId: session.id,
          currentPeriodEnd: periodEnd
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Mock payment completed', data: session });
  } catch (err) {
    console.error('Complete mock checkout error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /billing/webhook — real Stripe webhook.
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = paymentService.constructWebhookEvent(req.body, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata || {};
        const plan = PLANS[metadata.planId];

        if (metadata.guestCheckout === 'true') {
          await provisionOrganizationFromGuestCheckout({
            checkoutSessionId: session.id,
            customerId: session.customer,
            subscriptionId: session.subscription,
            provider: 'stripe',
            companyName: metadata.companyName,
            email: metadata.email,
            planId: metadata.planId,
            plan
          });
        } else if (metadata.organizationId) {
          await Subscription.findOneAndUpdate(
            { owner: metadata.organizationId },
            {
              owner: metadata.organizationId,
              planId: metadata.planId,
              status: 'active',
              provider: 'stripe',
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              stripeCheckoutSessionId: session.id
            },
            { upsert: true, new: true }
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeCustomerId: invoice.customer },
          { status: 'past_due' }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { status: 'cancelled' }
        );
        break;
      }

      default:
        // Unhandled event type — safe to ignore
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ success: false, error: `Webhook Error: ${err.message}` });
  }
};