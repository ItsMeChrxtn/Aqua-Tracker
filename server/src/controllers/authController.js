const User = require('../models/User');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { signToken } = require('../utils/token');
const { logActivity } = require('../utils/activityLog');
const { issueOtp, checkOtp, clearOtp, secondsUntilResend } = require('../utils/otp');

// Public self-registration always creates a fishpond_owner account, which
// stays unverified until the emailed OTP is confirmed via /verify-email.
// agriculture_staff / admin accounts are created via the admin bootstrap
// script or the Admin > User Management UI.
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, barangay } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 10);
  let user = await User.findOne({ email: normalizedEmail });

  if (user && user.emailVerified !== false) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  if (user) {
    // Registering again before verifying: take the latest details.
    Object.assign(user, { name, passwordHash, phone, barangay });
    await user.save();
  } else {
    user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      phone,
      barangay,
      role: 'fishpond_owner',
      emailVerified: false,
    });
    await logActivity({ user, ip: req.ip }, { action: 'REGISTER', targetType: 'User', targetId: user._id, details: `${user.email} registered` });
  }

  if (secondsUntilResend(user) === 0) await issueOtp(user);

  res.status(201).json({
    success: true,
    requiresVerification: true,
    email: user.email,
    message: `We sent a 6-digit verification code to ${user.email}.`,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'Email and verification code are required');

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new ApiError(400, 'Invalid verification code');
  if (user.emailVerified !== false) throw new ApiError(400, 'This email is already verified. Please sign in.');

  const problem = await checkOtp(user, otp);
  if (problem) throw new ApiError(400, problem);

  user.emailVerified = true;
  clearOtp(user);
  await user.save();
  await logActivity({ user, ip: req.ip }, { action: 'UPDATE', targetType: 'User', targetId: user._id, details: `${user.email} verified their email` });

  res.json({ success: true, token: signToken(user), user: user.toSafeObject() });
});

const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Same response whether or not the account exists, so this can't be used
  // to discover registered emails.
  if (user && user.emailVerified === false) {
    const wait = secondsUntilResend(user);
    if (wait > 0) {
      throw new ApiError(429, `Please wait ${wait} seconds before requesting a new code.`, 'OTP_COOLDOWN', { retryAfter: wait });
    }
    await issueOtp(user);
  }

  res.json({ success: true, message: 'If that account is awaiting verification, a new code was sent.' });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is inactive. Contact an administrator.');
  }
  if (user.emailVerified === false) {
    if (secondsUntilResend(user) === 0) await issueOtp(user);
    throw new ApiError(403, `Please verify your email first. We sent a code to ${user.email}.`, 'EMAIL_NOT_VERIFIED', {
      email: user.email,
    });
  }

  res.json({
    success: true,
    token: signToken(user),
    user: user.toSafeObject(),
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, barangay } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (barangay !== undefined) req.user.barangay = barangay;
  await req.user.save();
  res.json({ success: true, user: req.user.toSafeObject() });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }
  if (newPassword === currentPassword) {
    throw new ApiError(400, 'New password must be different from the current one');
  }
  const ok = await req.user.comparePassword(currentPassword);
  if (!ok) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  req.user.mustChangePassword = false;
  await req.user.save();
  res.json({ success: true, message: 'Password updated', user: req.user.toSafeObject() });
});

module.exports = { register, verifyEmail, resendOtp, login, me, updateProfile, changePassword };
