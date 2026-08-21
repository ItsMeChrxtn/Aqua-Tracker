const mongoose = require('mongoose');

// Actual logged harvest — logging this closes the production cycle.
const harvestRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    actualQuantity: { type: Number, required: true, min: 0 },
    actualWeightKg: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

harvestRecordSchema.index({ cycle: 1 });

module.exports = mongoose.model('HarvestRecord', harvestRecordSchema);
