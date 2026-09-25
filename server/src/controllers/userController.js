const bcrypt = require('bcryptjs');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');

// GET /api/users?role=&status=&q=
const listUsers = asyncHandler(async (req, res) => {
  const { role, status, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];

  const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
  res.json({ success: true, users });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user });
});

// Admin creates staff/admin accounts (or owner accounts on behalf of someone).
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, barangay } = req.body;
  if (!name || !email || !password || !role) {
    throw new ApiError(400, 'Name, email, password, and role are required');
  }
  const validRoles = ['fishpond_owner', 'agriculture_staff', 'admin'];
  if (!validRoles.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${validRoles.join(', ')}`);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role, phone, barangay });

  await logActivity(req, { action: 'CREATE', targetType: 'User', targetId: user._id, details: `Created ${role} account ${user.email}` });

  res.status(201).json({ success: true, user: user.toSafeObject() });
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
  if (status !== undefined) user.status = status;

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

const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'User', targetId: user._id, details: `Reset password for ${user.email}` });

  res.json({ success: true, message: 'Password reset' });
});

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, resetUserPassword };
