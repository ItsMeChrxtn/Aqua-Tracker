const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

const listMine = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unreadOnly === 'true') filter.read = false;

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

  res.json({ success: true, notifications, unreadCount });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.read = true;
  await notification.save();
  res.json({ success: true, notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { listMine, markRead, markAllRead };
