const mongoose = require('mongoose');

const productionCycleSchema = new mongoose.Schema(
  {
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    species: { type: mongoose.Schema.Types.ObjectId, ref: 'Species', required: true },
    batchName: { type: String, trim: true }, // e.g. "Batch 1"
    stockingDate: { type: Date, required: true },
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
