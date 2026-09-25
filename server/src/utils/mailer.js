// Transactional email via Brevo's HTTP API (https://developers.brevo.com).
// Needs BREVO_API_KEY plus a sender (MAIL_FROM_EMAIL) that is verified in the
// Brevo dashboard. Without an API key outside production, emails are printed
// to the console instead so local development still works.
const { ApiError } = require('../middleware/errorHandler');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail({ to, name, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(500, 'Email service is not configured');
    }
    console.log(`[mail] (dev, not sent) to=${to} subject="${subject}"\n${text}`);
    return;
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || 'AquaTrack' },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[mail] Brevo error ${res.status}: ${body}`);
    throw new ApiError(502, 'We could not send the email right now. Please try again.');
  }
}

module.exports = { sendEmail };
