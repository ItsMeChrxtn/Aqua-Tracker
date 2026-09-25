const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond' },
    type: {
      type: String,
      enum: ['high_mortality', 'near_harvest', 'low_stock', 'registration_approved', 'registration_rejected', 'general'],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
