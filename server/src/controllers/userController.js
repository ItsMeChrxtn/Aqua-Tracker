const bcrypt = require('bcryptjs');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');
const { generateTempPassword } = require('../utils/otp');
const { sendEmail } = require('../utils/mailer');
const { accountCreatedEmail } = require('../utils/emailTemplates');

const HIDDEN_FIELDS = '-passwordHash -otpHash -otpExpiresAt -otpSentAt -otpAttempts';

// Emails the login details for an admin-created account or password reset.
// Returns false instead of throwing so the account change itself still
// succeeds; the admin is then shown the temporary password to hand over.
async function sendCredentials(req, user, tempPassword, isReset) {
  const clientUrl = (process.env.CLIENT_URL || req.get('origin') || '').replace(/\/+$/, '');
  const mail = accountCreatedEmail({
    name: user.name,
    email: user.email,
    role: user.role,
    tempPassword,
    loginUrl: `${clientUrl}/login`,
    isReset,
  });
  try {
    await sendEmail({ to: user.email, name: user.name, ...mail });
    return true;
  } catch (err) {
    console.error(`[mail] Failed to send credentials to ${user.email}:`, err.message);
    return false;
  }
}

// GET /api/users?role=&status=&q=
const listUsers = asyncHandler(async (req, res) => {
  const { role, status, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];

  const users = await User.find(filter).select(HIDDEN_FIELDS).sort({ createdAt: -1 });
  res.json({ success: true, users });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(HIDDEN_FIELDS);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user });
});

// Admin creates staff/admin accounts (or owner accounts on behalf of someone).
// A temporary password is generated and emailed; the user must replace it on
// first sign-in.
const createUser = asyncHandler(async (req, res) => {
  const { name, email, role, phone, barangay } = req.body;
  if (!name || !email || !role) {
    throw new ApiError(400, 'Name, email, and role are required');
  }
  const validRoles = ['fishpond_owner', 'agriculture_staff', 'admin'];
  if (!validRoles.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${validRoles.join(', ')}`);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    phone,
    barangay,
    emailVerified: true,
    mustChangePassword: true,
  });

  await logActivity(req, { action: 'CREATE', targetType: 'User', targetId: user._id, details: `Created ${role} account ${user.email}` });

  const emailSent = await sendCredentials(req, user, tempPassword, false);
  res.status(201).json({
    success: true,
    user: user.toSafeObject(),
    emailSent,
    ...(emailSent ? {} : { tempPassword }),
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const { name, role, phone, barangay, status } = req.body;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (barangay !== undefined) user.barangay = barangay;
  if (role !== undefined) {
    const validRoles = ['fishpond_owner', 'agriculture_staff', 'admin'];
    if (!validRoles.includes(role)) throw new ApiError(400, `Role must be one of: ${validRoles.join(', ')}`);
    user.role = role;
  }
  if (status !== undefined) {
    if (status !== 'active' && user.role === 'admin') {
      throw new ApiError(400, 'Administrator accounts cannot be deactivated.');
    }
    user.status = status;
  }
  if (user.role === 'admin' && user.status !== 'active') {
    // e.g. an inactive account being promoted to admin
    user.status = 'active';
  }

  await user.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'User', targetId: user._id, details: `Updated user ${user.email}` });

  res.json({ success: true, user: user.toSafeObject() });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');

  await user.deleteOne();
  await logActivity(req, { action: 'DELETE', targetType: 'User', targetId: req.params.id, details: `Deleted user ${user.email}` });

  res.json({ success: true, message: 'User deleted' });
});

// Generates a new temporary password, emails it, and forces a change on the
// user's next sign-in.
const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const tempPassword = generateTempPassword();
  user.passwordHash = await bcrypt.hash(tempPassword, 10);
  user.mustChangePassword = true;
  await user.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'User', targetId: user._id, details: `Reset password for ${user.email}` });

  const emailSent = await sendCredentials(req, user, tempPassword, true);
  res.json({ success: true, message: 'Password reset', emailSent, ...(emailSent ? {} : { tempPassword }) });
});

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, resetUserPassword };
