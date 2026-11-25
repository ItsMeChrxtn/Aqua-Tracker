const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g. "CREATE", "UPDATE", "DELETE", "APPROVE"
    targetType: { type: String, required: true }, // e.g. "Fishpond", "MortalityRecord"
    targetId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: String, trim: true },
    // For edits: each changed field with its old and new value.
    changes: [{ _id: false, field: String, from: String, to: String }],
    ip: { type: String },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
