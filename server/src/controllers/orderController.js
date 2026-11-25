const Order = require('../models/Order');
const Product = require('../models/Product');
const SalesRecord = require('../models/SalesRecord');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');
const { createNotification } = require('../utils/notify');
const { assertValidPhone, assertNotPastDate, dateOnly } = require('../utils/validation');

const PRODUCT_TYPE_LABEL = { fresh: 'Fresh / Live', dressed: 'Dressed / Cleaned', frozen: 'Frozen', dried: 'Dried / Processed' };
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const kg = (n) => `${Number(n).toLocaleString('en-PH')} kg`;

const POPULATE = [
  { path: 'buyer', select: 'name email phone address' },
  { path: 'owner', select: 'name email phone barangay' },
  { path: 'fishpond', select: 'name barangay address' },
];

// ORD-20261125-0001: date of the order plus that day's running number.
async function nextOrderNo() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `ORD-${stamp}-`;
  let n = (await Order.countDocuments({ orderNo: { $regex: `^${prefix}` } })) + 1;
  while (await Order.exists({ orderNo: `${prefix}${String(n).padStart(4, '0')}` })) n += 1;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

async function loadOrder(req) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  const mine = req.user.role === 'buyer' ? order.buyer.equals(req.user._id) : order.owner.equals(req.user._id);
  if (!mine && req.user.role !== 'admin' && req.user.role !== 'agriculture_staff') throw new ApiError(403, 'This order belongs to someone else');
  return order;
}

const respond = async (res, order, status = 200) => {
  await order.populate(POPULATE);
  res.status(status).json({ success: true, order });
};

// GET /api/orders?status= — buyers see their orders, owners the orders they received
const listOrders = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'buyer' ? { buyer: req.user._id } : { owner: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const orders = await Order.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await loadOrder(req);
  await respond(res, order);
});

// POST /api/orders — buyer places an order for one product
const createOrder = asyncHandler(async (req, res) => {
  const { productId, quantityKg, fulfillment = 'pickup', deliveryAddress, contactNo, preferredDate, notes } = req.body;
  const product = await Product.findById(productId).populate('species', 'name').populate('owner', 'name status');
  if (!product || product.status !== 'available' || product.owner?.status !== 'active') {
    throw new ApiError(404, 'This product is no longer available');
  }

  const qty = Math.round(Number(quantityKg) * 100) / 100;
  if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, 'Enter how many kilos you want to order');
  if (product.minOrderKg && qty < product.minOrderKg) throw new ApiError(400, `The minimum order for this product is ${kg(product.minOrderKg)}`);
  if (qty > product.availableKg) throw new ApiError(400, `Only ${kg(product.availableKg)} is available right now`);

  if (!['pickup', 'delivery'].includes(fulfillment)) throw new ApiError(400, 'Choose pickup or delivery');
  const address = String(deliveryAddress || '').trim();
  if (fulfillment === 'delivery' && !address) throw new ApiError(400, 'Delivery address is required for delivery orders');
  const phone = String(contactNo || req.user.phone || '').trim();
  if (!phone) throw new ApiError(400, 'Contact number is required so the owner can reach you');
  assertValidPhone(phone);
  if (preferredDate) assertNotPastDate(preferredDate, 'Preferred date');
  const preferred = preferredDate ? dateOnly(preferredDate) : undefined;

  const order = await Order.create({
    orderNo: await nextOrderNo(),
    buyer: req.user._id,
    owner: product.owner._id,
    product: product._id,
    fishpond: product.fishpond,
    item: {
      name: product.name,
      species: product.species?.name,
      productType: product.productType,
      pricePerKg: product.pricePerKg,
      imageUrl: product.imageUrl,
    },
    quantityKg: qty,
    totalAmount: Math.round(qty * product.pricePerKg * 100) / 100,
    fulfillment,
    deliveryAddress: fulfillment === 'delivery' ? address.slice(0, 200) : undefined,
    contactNo: phone,
    preferredDate: preferred,
    notes: notes ? String(notes).trim().slice(0, 300) : undefined,
  });

  await createNotification({
    user: order.owner,
    type: 'order',
    message: `New order ${order.orderNo}: ${kg(qty)} of ${product.name} from ${req.user.name} (${peso(order.totalAmount)}).`,
  });
  await logActivity(req, { action: 'CREATE', targetType: 'Order', targetId: order._id, details: `Placed order ${order.orderNo}` });
  await respond(res, order, 201);
});

function assertStatus(order, allowed, action) {
  if (!allowed.includes(order.status)) throw new ApiError(400, `Only ${allowed.join(' or ')} orders can be ${action}`);
}

function assertOwner(req, order) {
  if (!order.owner.equals(req.user._id)) throw new ApiError(403, 'Only the fishpond owner can do this');
}

// PATCH /api/orders/:id/accept — reserves the kilos from the product
const acceptOrder = asyncHandler(async (req, res) => {
  const order = await loadOrder(req);
  assertOwner(req, order);
  assertStatus(order, ['pending'], 'accepted');

  const product = await Product.findOneAndUpdate(
    { _id: order.product, availableKg: { $gte: order.quantityKg } },
    { $inc: { availableKg: -order.quantityKg } },
    { new: true }
  );
  if (!product) throw new ApiError(400, 'Not enough kilos left for this order. Update the product stock or decline the order.');

  order.status = 'accepted';
  order.acceptedAt = new Date();
  await order.save();

  await createNotification({ user: order.buyer, type: 'order', message: `Your order ${order.orderNo} (${order.item.name}) was accepted by the fishpond owner.` });
  await logActivity(req, { action: 'APPROVE', targetType: 'Order', targetId: order._id, details: `Accepted order ${order.orderNo}` });
  await respond(res, order);
});

// PATCH /api/orders/:id/decline { reason }
const declineOrder = asyncHandler(async (req, res) => {
  const order = await loadOrder(req);
  assertOwner(req, order);
  assertStatus(order, ['pending'], 'declined');
  const reason = String(req.body.reason || '').trim();
  if (!reason) throw new ApiError(400, 'Please give the buyer a reason');

  order.status = 'declined';
  order.reason = reason.slice(0, 300);
  await order.save();

  await createNotification({ user: order.buyer, type: 'order', message: `Your order ${order.orderNo} (${order.item.name}) was declined: ${order.reason}` });
  await logActivity(req, { action: 'REJECT', targetType: 'Order', targetId: order._id, details: `Declined order ${order.orderNo}` });
  await respond(res, order);
});

// PATCH /api/orders/:id/cancel { reason } — buyer while pending, owner while accepted
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await loadOrder(req);
  const byBuyer = req.user.role === 'buyer';
  if (byBuyer) assertStatus(order, ['pending'], 'cancelled by the buyer');
  else {
    assertOwner(req, order);
    assertStatus(order, ['accepted'], 'cancelled by the owner');
  }

  if (order.status === 'accepted') {
    await Product.updateOne({ _id: order.product }, { $inc: { availableKg: order.quantityKg } });
  }
  order.status = 'cancelled';
  order.reason = String(req.body.reason || '').trim().slice(0, 300) || undefined;
  await order.save();

  await createNotification({
    user: byBuyer ? order.owner : order.buyer,
    type: 'order',
    message: `Order ${order.orderNo} (${order.item.name}) was cancelled by the ${byBuyer ? 'buyer' : 'fishpond owner'}${order.reason ? `: ${order.reason}` : '.'}`,
  });
  await logActivity(req, { action: 'UPDATE', targetType: 'Order', targetId: order._id, details: `Cancelled order ${order.orderNo}` });
  await respond(res, order);
});

// PATCH /api/orders/:id/complete — paid and handed over; saved as a sale
const completeOrder = asyncHandler(async (req, res) => {
  const order = await loadOrder(req);
  assertOwner(req, order);
  assertStatus(order, ['accepted'], 'completed');

  const product = await Product.findById(order.product).select('cycle fishpond');
  if (product) {
    const sale = await SalesRecord.create({
      cycle: product.cycle,
      fishpond: product.fishpond,
      date: new Date(),
      buyerName: (await order.populate('buyer', 'name')).buyer?.name,
      quantityKg: order.quantityKg,
      pricePerKg: order.item.pricePerKg,
      totalAmount: order.totalAmount,
      notes: `Marketplace order ${order.orderNo} — ${order.item.name} (${PRODUCT_TYPE_LABEL[order.item.productType] || order.item.productType})`,
      recordedBy: req.user._id,
    });
    order.salesRecord = sale._id;
  }
  order.status = 'completed';
  order.completedAt = new Date();
  await order.save();

  await createNotification({ user: order.buyer._id || order.buyer, type: 'order', message: `Your order ${order.orderNo} (${order.item.name}) is completed. Thank you for buying!` });
  await logActivity(req, { action: 'UPDATE', targetType: 'Order', targetId: order._id, details: `Completed order ${order.orderNo}` });
  await respond(res, order);
});

module.exports = { listOrders, getOrder, createOrder, acceptOrder, declineOrder, cancelOrder, completeOrder };
