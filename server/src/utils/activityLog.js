const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget audit trail write. Never throws into the caller's request flow.
// Pass the saved `doc` on updates to record which fields changed (old → new).
async function logActivity(req, { action, targetType, targetId, details, doc }) {
  try {
    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action,
      targetType,
      targetId,
      details,
      changes: doc?.$locals?.changes?.length ? doc.$locals.changes : undefined,
      ip: req.ip,
    });
  } catch (err) {
    console.error('[activityLog] failed to write log:', err.message);
  }
}

module.exports = { logActivity };
