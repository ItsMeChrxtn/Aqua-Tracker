const mongoose = require('mongoose');

// Kinds of fish product an owner can sell — the marketplace's second category
// next to the species.
const PRODUCT_TYPES = ['fresh', 'dressed', 'frozen', 'dried'];

const productSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    // The production cycle the fish came from — completed orders are saved as
    // sales records of this cycle.
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    species: { type: mongoose.Schema.Types.ObjectId, ref: 'Species', required: true },
    productType: { type: String, enum: PRODUCT_TYPES, default: 'fresh' },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    pricePerKg: { type: Number, required: true, min: 0 }, // pesos per kilogram
    availableKg: { type: Number, required: true, min: 0 }, // kilograms still for sale
    minOrderKg: { type: Number, min: 0, default: 1 },
    imageUrl: { type: String },
    // Owners can hide a product from buyers without deleting it.
    status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  },
  { timestamps: true }
);

productSchema.index({ owner: 1, createdAt: -1 });
productSchema.index({ status: 1, species: 1, productType: 1 });

const Product = mongoose.model('Product', productSchema);
Product.PRODUCT_TYPES = PRODUCT_TYPES;

module.exports = Product;
