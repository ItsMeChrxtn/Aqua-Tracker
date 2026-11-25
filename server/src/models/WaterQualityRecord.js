const mongoose = require('mongoose');

// One water-quality reading of a fishpond during a cycle. Every reading is
// optional except the date, since owners may only have some test kits.
const waterQualityRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    temperature: { type: Number, min: 0, max: 50 }, // °C
    ph: { type: Number, min: 0, max: 14 },
    dissolvedOxygen: { type: Number, min: 0, max: 30 }, // mg/L
    salinity: { type: Number, min: 0, max: 60 }, // ppt
    ammonia: { type: Number, min: 0, max: 20 }, // mg/L total ammonia
    // Readings outside the safe range when saved, e.g. ["Low dissolved oxygen (2.5 mg/L)"].
    issues: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

waterQualityRecordSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('WaterQualityRecord', waterQualityRecordSchema);
