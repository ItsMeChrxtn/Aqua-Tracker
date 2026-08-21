const mongoose = require('mongoose');

const salesRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    buyerName: { type: String, trim: true },
    quantityKg: { type: Number, required: true, min: 0 },
    pricePerKg: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

salesRecordSchema.index({ cycle: 1, date: 1 });

module.exports = mongoose.model('SalesRecord', salesRecordSchema);
