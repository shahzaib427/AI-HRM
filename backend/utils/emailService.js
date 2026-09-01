const axios = require('axios');

/**
 * Sends an email via Brevo's Transactional Email HTTP API (port 443).
 * This avoids outbound SMTP ports (25/587/2525) that some hosts (e.g. Render)
 * block at the platform level, which is what was causing "Connection timeout".
 *
 * Required env vars:
 *   BREVO_API_KEY   -> Brevo dashboard -> Settings -> SMTP & API -> "API keys & MCP" tab
 *                      (NOT the SMTP tab / NOT the SMTP key you generated before)
 *   FROM_NAME        -> e.g. "HRM System"
 *   FROM_EMAIL       -> must be a verified sender in Brevo
 */
const sendEmail = async (options) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.FROM_NAME,
          email: process.env.FROM_EMAIL,
        },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000, // HTTPS call, so this should resolve in ~1-2s normally
      }
    );

    console.log(`✅ Email sent to ${options.to} (messageId: ${response.data?.messageId})`);
    return response.data;
  } catch (error) {
    const details = error.response?.data || error.message;
    console.error('❌ Brevo API email error:', details);
    throw new Error(`Failed to send email: ${JSON.stringify(details)}`);
  }
};

module.exports = sendEmail;