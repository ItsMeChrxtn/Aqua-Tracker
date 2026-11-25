const mongoose = require('mongoose');

const stockingRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    species: { type: mongoose.Schema.Types.ObjectId, ref: 'Species' },
    batchNumber: { type: Number, min: 1 }, // Batch 1 = the cycle's initial stock, then 2, 3…
    // The Batch 1 row created with the cycle: its fish are the cycle's initial
    // count, so it carries no quantity of its own (no double counting).
    isInitial: { type: Boolean, default: false },
    quantity: { type: Number, min: 1 },
    source: { type: String, trim: true }, // supplier / hatchery
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockingRecordSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('StockingRecord', stockingRecordSchema);
