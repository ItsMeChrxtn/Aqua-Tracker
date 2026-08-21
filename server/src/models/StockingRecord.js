const mongoose = require('mongoose');

const stockingRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 1 },
    source: { type: String, trim: true }, // supplier / hatchery
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockingRecordSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('StockingRecord', stockingRecordSchema);
