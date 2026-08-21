const mongoose = require('mongoose');

// Snapshot rows written whenever a harvest estimate is (re)computed, so the
// owner can see a history/log of how the estimate evolved over the cycle.
const harvestEstimateLogSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true, default: Date.now },
    currentCount: { type: Number, required: true },
    averageWeight: { type: Number, required: true }, // grams
    survivalRate: { type: Number, required: true }, // percent
    estimatedHarvestKg: { type: Number, required: true },
    readinessStatus: {
      type: String,
      enum: ['growing', 'near_harvest', 'ready_for_harvest'],
      required: true,
    },
  },
  { timestamps: true }
);

harvestEstimateLogSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('HarvestEstimateLog', harvestEstimateLogSchema);
