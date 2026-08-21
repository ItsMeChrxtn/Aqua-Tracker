const mongoose = require('mongoose');

const mortalityRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 1 },
    // Free-text cause/notes field (no fixed disease-name list per user's request)
    cause: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mortalityRecordSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('MortalityRecord', mortalityRecordSchema);
