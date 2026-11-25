const mongoose = require('mongoose');

// pending → accepted → completed, or declined (owner) / cancelled (buyer while
// pending, owner while accepted). Kilos leave the product's stock on accept and
// go back if an accepted order is cancelled.
const ORDER_STATUSES = ['pending', 'accepted', 'declined', 'cancelled', 'completed'];

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true }, // e.g. ORD-20261125-0001
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond' },
    // What the buyer saw when ordering, kept even if the product changes later.
    item: {
      name: { type: String, trim: true },
      species: { type: String, trim: true },
      productType: { type: String, trim: true },
      pricePerKg: { type: Number, min: 0 },
      imageUrl: { type: String },
    },
    quantityKg: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 }, // pesos
    fulfillment: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
    deliveryAddress: { type: String, trim: true },
    contactNo: { type: String, trim: true },
    preferredDate: { type: Date },
    notes: { type: String, trim: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    reason: { type: String, trim: true }, // why it was declined / cancelled
    salesRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesRecord' },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ owner: 1, status: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
Order.ORDER_STATUSES = ORDER_STATUSES;

module.exports = Order;
