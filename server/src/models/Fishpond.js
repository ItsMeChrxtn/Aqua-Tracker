const mongoose = require('mongoose');

const fishpondSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    // Code behind the public QR verification link (set once approved).
    verifyCode: { type: String, unique: true, sparse: true },
    barangay: { type: String, required: true, trim: true },
    // Pin on the map (WGS84), placed by the owner when registering.
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    address: { type: String, trim: true }, // street / sitio within the barangay
    areaSize: { type: Number, min: 0 }, // stored in square meters; shown in hectares
    capacity: { type: Number, min: 0 }, // maximum number of fish the pond can hold
    imageUrl: { type: String },
    // Registration documents: Memorandum of Agreement (required for new
    // registrations) and Special Power of Attorney (optional).
    moaUrl: { type: String },
    moaName: { type: String },
    spaUrl: { type: String },
    spaName: { type: String },
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
