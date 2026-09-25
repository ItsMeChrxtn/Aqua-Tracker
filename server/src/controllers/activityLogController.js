const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/activity-logs?action=&targetType=&userId=&page=&limit=
const listLogs = asyncHandler(async (req, res) => {
  const { action, targetType, userId } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (userId) filter.user = userId;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ success: true, logs, total, page, pages: Math.ceil(total / limit) });
});

module.exports = { listLogs };
