const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'feed' }, // feed, medicine, chemical, or typed by the owner
    unit: { type: String, required: true, trim: true }, // e.g. "kg", "sack", "liter"
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ fishpond: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
