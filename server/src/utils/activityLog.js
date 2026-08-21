const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget audit trail write. Never throws into the caller's request flow.
async function logActivity(req, { action, targetType, targetId, details }) {
  try {
    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action,
      targetType,
      targetId,
      details,
      ip: req.ip,
    });
  } catch (err) {
    console.error('[activityLog] failed to write log:', err.message);
  }
}

module.exports = { logActivity };
