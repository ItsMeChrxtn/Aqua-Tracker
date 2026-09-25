const mongoose = require('mongoose');

const growthRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    sampleSize: { type: Number, required: true, min: 1 },
    averageWeight: { type: Number, required: true, min: 0 }, // grams
    averageLength: { type: Number, min: 0 }, // cm, optional
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

growthRecordSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('GrowthRecord', growthRecordSchema);
