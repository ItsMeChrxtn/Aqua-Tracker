const crypto = require('crypto');
const { sendEmail } = require('./mailer');
const { otpEmail } = require('./emailTemplates');

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function hashOtp(otp) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(otp).digest('hex');
}

function secondsUntilResend(user) {
  if (!user.otpSentAt) return 0;
  const elapsed = (Date.now() - user.otpSentAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
}

// Generates a fresh 6-digit code, stores its hash on the user and emails it.
// Caller is responsible for enforcing the resend cooldown.
async function issueOtp(user) {
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  user.otpHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user.otpSentAt = new Date();
  user.otpAttempts = 0;
  await user.save();

  const mail = otpEmail({ name: user.name, otp, minutes: OTP_TTL_MINUTES });
  await sendEmail({ to: user.email, name: user.name, ...mail });
}

// Returns null when the code is valid, otherwise a user-facing error message.
async function checkOtp(user, otp) {
  if (!user.otpHash || !user.otpExpiresAt) return 'No verification code was requested. Please request a new one.';
  if (user.otpExpiresAt < new Date()) return 'This code has expired. Please request a new one.';
  if (user.otpAttempts >= MAX_ATTEMPTS) return 'Too many incorrect attempts. Please request a new code.';

  const expected = Buffer.from(user.otpHash, 'hex');
  const actual = Buffer.from(hashOtp(String(otp || '').trim()), 'hex');
  if (!crypto.timingSafeEqual(expected, actual)) {
    user.otpAttempts += 1;
    await user.save();
    const left = MAX_ATTEMPTS - user.otpAttempts;
    return left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Please request a new code.';
  }
  return null;
}

function clearOtp(user) {
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpSentAt = undefined;
  user.otpAttempts = 0;
}

// Readable temporary password for admin-created accounts, e.g. "Aqua-7KQ-M9XT" (13 characters, the maximum password length).
function generateTempPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from({ length: n }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return `Aqua-${pick(3)}-${pick(4)}`;
}

module.exports = { issueOtp, checkOtp, clearOtp, secondsUntilResend, generateTempPassword, RESEND_COOLDOWN_SECONDS };
