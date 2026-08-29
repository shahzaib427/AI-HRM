// services/subscriptionOnboardingService.js
//
// Shared logic for turning a completed checkout (real Stripe webhook OR
// the mock "Pay Now" click) into: Organization + Admin User + Subscription
// + a password-setup email. Used by BOTH the real webhook handler and the
// mock checkout completion handler, so there is exactly one place this
// logic lives — live and mock modes never drift apart.
//
// ⚠️ Adjust the sendEmail require path below if your project's mailer
// lives somewhere other than utils/sendEmail.js.

const crypto = require('crypto');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const sendEmail = require('../utils/emailService');

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

/**
 * Provisions Organization + Admin User + Subscription after a successful
 * guest checkout, and emails a password-setup link.
 *
 * Idempotent: safe to call multiple times for the same checkoutSessionId
 * (Stripe retries webhooks; this guards against duplicate accounts).
 */
exports.provisionOrganizationFromGuestCheckout = async ({
  checkoutSessionId,
  customerId = null,
  subscriptionId = null,
  provider, // 'stripe' | 'mock'
  companyName,
  email,
  planId,
  plan // { name, amount, currency, employeeLimit }
}) => {
  // ── Idempotency guard ──────────────────────────────────────────────────
  const existing = await Subscription.findOne({ stripeCheckoutSessionId: checkoutSessionId });
  if (existing) {
    console.log(`⏭️  Checkout ${checkoutSessionId} already provisioned — skipping duplicate webhook/call`);
    return { alreadyProcessed: true, subscription: existing };
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // ── Duplicate-email guard ──────────────────────────────────────────────
  // Should already be blocked at the pre-checkout step (guestCheckout
  // controller), but Stripe can retry webhooks and two concurrent guest
  // checkouts could theoretically race on the same email — never create a
  // second User for an email that already exists.
  let user = await User.findOne({ email: normalizedEmail });
  let organization;

  if (user) {
    console.warn(`⚠️  Checkout completed for existing email ${normalizedEmail} — attaching subscription to their existing account instead of creating a new one`);
    organization = await Organization.findOne({ admin: user._id });
    if (!organization) {
      organization = await Organization.create({
        name: companyName,
        admin: user._id,
        planId,
        employeeLimit: plan.employeeLimit
      });
    }
  } else {
    // Placeholder password: required by the User schema, never used or
    // shared with anyone. The account cannot be logged into until the
    // admin sets a real password via the emailed setup link.
    const placeholderPassword = crypto.randomBytes(24).toString('hex');

    const rawSetupToken = crypto.randomBytes(32).toString('hex');
    const hashedSetupToken = hashToken(rawSetupToken);

    user = await User.create({
      name: companyName, // no personal name collected at guest checkout
      email: normalizedEmail,
      password: placeholderPassword,
      role: 'admin',
      isActive: true,
      passwordResetToken: hashedSetupToken,
      passwordResetTokenExpires: new Date(Date.now() + SETUP_TOKEN_TTL_MS),
      passwordResetTokenUsed: false
    });

    organization = await Organization.create({
      name: companyName,
      admin: user._id,
      planId,
      employeeLimit: plan.employeeLimit
    });

    user.organization = organization._id;
    await user.save();

    // ── Email the password-setup link ─────────────────────────────────
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const setupUrl = `${clientUrl}/set-password?token=${rawSetupToken}`;

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: 'Your HRM Account Is Ready',
        html: `
          <p>Hello,</p>
          <p>Your HRM subscription has been successfully activated.</p>
          <p><strong>Company:</strong> ${companyName}<br/>
             <strong>Plan:</strong> ${plan.name}</p>
          <p>Your admin account has been created. Click the button below to create your password:</p>
          <p>
            <a href="${setupUrl}"
               style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-family:sans-serif;">
              Set Your Password
            </a>
          </p>
          <p>This link will expire in 24 hours.</p>
          <p>After setting your password, you can log in to your HRM Admin Dashboard.</p>
        `
      });
    } catch (emailErr) {
      // Don't fail the whole provisioning flow if the email bounces — log
      // loudly so it can be manually investigated/resent. The account and
      // subscription are already correctly created at this point.
      console.error('❌ Failed to send account-setup email:', emailErr.message);
    }
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await Subscription.findOneAndUpdate(
    { owner: organization._id },
    {
      owner: organization._id,
      planId,
      status: 'active',
      provider,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeCheckoutSessionId: checkoutSessionId,
      currentPeriodEnd: periodEnd
    },
    { upsert: true, new: true }
  );

  return { alreadyProcessed: false, user, organization, subscription };
};