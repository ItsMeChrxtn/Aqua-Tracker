const mongoose = require('mongoose');

const speciesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    waterType: {
      type: String,
      enum: ['freshwater', 'saltwater', 'brackish'],
      required: true,
    },
    recommendedHarvestWeightMin: { type: Number, required: true, min: 0 }, // grams
    recommendedHarvestWeightMax: { type: Number, required: true, min: 0 }, // grams
    typicalGrowoutDays: { type: Number, min: 0 },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Species', speciesSchema);
