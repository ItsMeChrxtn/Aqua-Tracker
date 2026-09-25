const mongoose = require('mongoose');

const feedingRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    feedType: { type: String, trim: true },
    quantityKg: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

feedingRecordSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('FeedingRecord', feedingRecordSchema);
