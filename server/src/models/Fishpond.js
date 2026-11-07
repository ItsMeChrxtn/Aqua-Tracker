const mongoose = require('mongoose');

const fishpondSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    barangay: { type: String, required: true, trim: true },
    areaSize: { type: Number, min: 0 }, // stored in square meters; shown in hectares
    capacity: { type: Number, min: 0 }, // maximum number of fish the pond can hold
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

fishpondSchema.index({ owner: 1 });
fishpondSchema.index({ barangay: 1 });

module.exports = mongoose.model('Fishpond', fishpondSchema);
