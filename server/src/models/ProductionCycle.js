const mongoose = require('mongoose');

const productionCycleSchema = new mongoose.Schema(
  {
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    species: { type: mongoose.Schema.Types.ObjectId, ref: 'Species', required: true },
    batchName: { type: String, trim: true }, // display label, e.g. "Cycle #1"
    cycleNumber: { type: Number, min: 1 }, // 1, 2, 3… per fishpond
    stockingDate: { type: Date, required: true },
    expectedHarvestDate: { type: Date }, // owner's planned harvest date
    initialCount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['active', 'harvested', 'closed'],
      default: 'active',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

productionCycleSchema.index({ fishpond: 1, status: 1 });
productionCycleSchema.index({ species: 1 });

module.exports = mongoose.model('ProductionCycle', productionCycleSchema);
