const Product = require('../models/Product');
const Order = require('../models/Order');
const Fishpond = require('../models/Fishpond');
const ProductionCycle = require('../models/ProductionCycle');
const Species = require('../models/Species');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');

const uploadedPath = (file) => (file ? `/uploads/${file.filename}` : undefined);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const POPULATE = [
  { path: 'species', select: 'name waterType' },
  { path: 'fishpond', select: 'name barangay address' },
  { path: 'cycle', select: 'batchName cycleNumber status' },
];

function toNumber(value, label, { min = 0, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ApiError(400, `${label} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) throw new ApiError(400, `${label} must be a number of at least ${min}`);
  return Math.round(n * 100) / 100;
}

// Checks the owner's fishpond / cycle / species picks and returns the fields to save.
async function readProductBody(req, existing) {
  const body = req.body;
  const data = {};

  const fishpondId = body.fishpondId || existing?.fishpond?._id || existing?.fishpond;
  const cycleId = body.cycleId || existing?.cycle?._id || existing?.cycle;
  if (!fishpondId || !cycleId) throw new ApiError(400, 'Fishpond and production cycle are required');
  const fishpond = await Fishpond.findOne({ _id: fishpondId, owner: req.user._id, status: 'approved' });
  if (!fishpond) throw new ApiError(400, 'Choose one of your approved fishponds');
  const cycle = await ProductionCycle.findOne({ _id: cycleId, fishpond: fishpond._id });
  if (!cycle) throw new ApiError(400, 'Choose a production cycle of that fishpond');
  data.fishpond = fishpond._id;
  data.cycle = cycle._id;

  const speciesId = body.speciesId || existing?.species?._id || existing?.species || cycle.species;
  if (!(await Species.exists({ _id: speciesId }))) throw new ApiError(400, 'Species not found');
  data.species = speciesId;

  if (body.productType !== undefined) {
    if (!Product.PRODUCT_TYPES.includes(body.productType)) throw new ApiError(400, 'Invalid product type');
    data.productType = body.productType;
  }
  if (body.name !== undefined || !existing) {
    const name = String(body.name || '').trim();
    if (!name) throw new ApiError(400, 'Product name is required');
    data.name = name.slice(0, 80);
  }
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 500);

  const isNew = !existing;
  const price = toNumber(body.pricePerKg, 'Price per kg', { required: isNew });
  if (price !== undefined) data.pricePerKg = price;
  const available = toNumber(body.availableKg, 'Available kilos', { required: isNew });
  if (available !== undefined) data.availableKg = available;
  const minOrder = toNumber(body.minOrderKg, 'Minimum order', { min: 0.1 });
  if (minOrder !== undefined) data.minOrderKg = minOrder;

  if (body.status !== undefined) {
    if (!['available', 'unavailable'].includes(body.status)) throw new ApiError(400, 'Invalid status');
    data.status = body.status;
  }
  if (req.file) data.imageUrl = uploadedPath(req.file);
  return data;
}

async function loadOwnProduct(req) {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  if (!product.owner.equals(req.user._id)) throw new ApiError(403, 'This product belongs to another owner');
  return product;
}

// GET /api/products — the logged-in owner's products
const listMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ owner: req.user._id }).populate(POPULATE).sort({ createdAt: -1 });
  res.json({ success: true, products });
});

// POST /api/products (multipart, optional "image")
const createProduct = asyncHandler(async (req, res) => {
  const data = await readProductBody(req);
  const product = await Product.create({ ...data, owner: req.user._id });
  await product.populate(POPULATE);
  await logActivity(req, { action: 'CREATE', targetType: 'Product', targetId: product._id, details: `Added product ${product.name}` });
  res.status(201).json({ success: true, product });
});

// PUT /api/products/:id (multipart, optional "image")
const updateProduct = asyncHandler(async (req, res) => {
  const product = await loadOwnProduct(req);
  product.set(await readProductBody(req, product));
  await product.save();
  await product.populate(POPULATE);
  await logActivity(req, { action: 'UPDATE', targetType: 'Product', targetId: product._id, doc: product, details: `Updated product ${product.name}` });
  res.json({ success: true, product });
});

// DELETE /api/products/:id — not while orders for it are still open
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await loadOwnProduct(req);
  const open = await Order.exists({ product: product._id, status: { $in: ['pending', 'accepted'] } });
  if (open) throw new ApiError(400, 'This product still has pending or accepted orders. Finish them first, or mark the product unavailable.');
  await product.deleteOne();
  await logActivity(req, { action: 'DELETE', targetType: 'Product', targetId: product._id, details: `Deleted product ${product.name}` });
  res.json({ success: true, message: 'Product deleted' });
});

// What buyers see: available products with kilos left, from active owners.
const MARKET_POPULATE = [...POPULATE.slice(0, 2), { path: 'owner', select: 'name phone barangay status' }];

// GET /api/marketplace/products?q=&speciesId=&productType=&barangay=&sort=price_asc|price_desc|newest
const listMarketplace = asyncHandler(async (req, res) => {
  const filter = { status: 'available', availableKg: { $gt: 0 } };
  if (req.query.speciesId) filter.species = req.query.speciesId;
  if (req.query.productType) filter.productType = req.query.productType;
  if (req.query.barangay) filter.fishpond = { $in: await Fishpond.find({ barangay: req.query.barangay }).distinct('_id') };
  if (req.query.q) filter.name = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');

  const activeOwners = await User.find({ role: 'fishpond_owner', status: 'active' }).distinct('_id');
  filter.owner = { $in: activeOwners };

  const sort = { price_asc: { pricePerKg: 1 }, price_desc: { pricePerKg: -1 } }[req.query.sort] || { createdAt: -1 };
  const products = await Product.find(filter).populate(MARKET_POPULATE).sort(sort);
  res.json({ success: true, products });
});

// GET /api/marketplace/products/:id
const getMarketplaceProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(MARKET_POPULATE);
  if (!product || product.status !== 'available' || product.owner?.status !== 'active') throw new ApiError(404, 'This product is no longer available');
  res.json({ success: true, product });
});

module.exports = { listMyProducts, createProduct, updateProduct, deleteProduct, listMarketplace, getMarketplaceProduct };
