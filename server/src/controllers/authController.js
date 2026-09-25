const User = require('../models/User');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { signToken } = require('../utils/token');
const { logActivity } = require('../utils/activityLog');

// Public self-registration always creates a fishpond_owner account.
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

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone,
    barangay,
    role: 'fishpond_owner',
  });

  await logActivity({ user, ip: req.ip }, { action: 'REGISTER', targetType: 'User', targetId: user._id, details: `${user.email} registered` });

  res.status(201).json({
    success: true,
    token: signToken(user),
    user: user.toSafeObject(),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is inactive. Contact an administrator.');
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
  const ok = await req.user.comparePassword(currentPassword);
  if (!ok) {
    throw new ApiError(401, 'Current password is incorrect');
  }
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ success: true, message: 'Password updated' });
});

module.exports = { register, login, me, updateProfile, changePassword };
