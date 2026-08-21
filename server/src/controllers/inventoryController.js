const InventoryItem = require('../models/InventoryItem');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { loadFishpondWithAccess } = require('../utils/access');
const { logActivity } = require('../utils/activityLog');
const { createNotification } = require('../utils/notify');

const listForFishpond = asyncHandler(async (req, res) => {
  const fishpond = await loadFishpondWithAccess(req.user, req.params.fishpondId);
  const items = await InventoryItem.find({ fishpond: fishpond._id }).sort({ name: 1 });
  res.json({ success: true, items });
});

const createItem = asyncHandler(async (req, res) => {
  const fishpond = await loadFishpondWithAccess(req.user, req.params.fishpondId);
  const { name, category, unit, currentStock, reorderLevel, notes } = req.body;
  if (!name || !unit) throw new ApiError(400, 'Item name and unit are required');

  const item = await InventoryItem.create({
    fishpond: fishpond._id,
    name,
    category,
    unit,
    currentStock: currentStock || 0,
    reorderLevel: reorderLevel || 0,
    notes,
    createdBy: req.user._id,
  });

  await logActivity(req, { action: 'CREATE', targetType: 'InventoryItem', targetId: item._id, details: `Added inventory item ${item.name} for ${fishpond.name}` });
  res.status(201).json({ success: true, item });
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Inventory item not found');
  await loadFishpondWithAccess(req.user, item.fishpond);

  const { name, category, unit, reorderLevel, notes } = req.body;
  if (name !== undefined) item.name = name;
  if (category !== undefined) item.category = category;
  if (unit !== undefined) item.unit = unit;
  if (reorderLevel !== undefined) item.reorderLevel = reorderLevel;
  if (notes !== undefined) item.notes = notes;

  await item.save();
  await logActivity(req, { action: 'UPDATE', targetType: 'InventoryItem', targetId: item._id, details: `Updated inventory item ${item.name}` });
  res.json({ success: true, item });
});

// PATCH /api/inventory/:id/adjust  { type: 'restock'|'use', quantity }
const adjustStock = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id).populate('fishpond');
  if (!item) throw new ApiError(404, 'Inventory item not found');
  await loadFishpondWithAccess(req.user, item.fishpond._id);

  const { type, quantity } = req.body;
  const qty = Number(quantity);
  if (!qty || qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
  if (!['restock', 'use'].includes(type)) throw new ApiError(400, 'Adjustment type must be "restock" or "use"');

  const wasLow = item.currentStock <= item.reorderLevel;

  if (type === 'restock') {
    item.currentStock += qty;
  } else {
    if (qty > item.currentStock) throw new ApiError(400, 'Cannot use more than the current stock on hand');
    item.currentStock -= qty;
  }
  await item.save();

  await logActivity(req, {
    action: 'UPDATE',
    targetType: 'InventoryItem',
    targetId: item._id,
    details: `${type === 'restock' ? 'Restocked' : 'Used'} ${qty} ${item.unit} of ${item.name}`,
  });

  const isLowNow = item.currentStock <= item.reorderLevel;
  if (isLowNow && !wasLow) {
    await createNotification({
      user: item.fishpond.owner,
      fishpond: item.fishpond._id,
      type: 'low_stock',
      message: `Low stock alert: ${item.name} at ${item.fishpond.name} is down to ${item.currentStock} ${item.unit} (reorder level: ${item.reorderLevel} ${item.unit}).`,
    });
  }

  res.json({ success: true, item });
});

const removeItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Inventory item not found');
  await loadFishpondWithAccess(req.user, item.fishpond);

  await item.deleteOne();
  await logActivity(req, { action: 'DELETE', targetType: 'InventoryItem', targetId: req.params.id, details: `Deleted inventory item ${item.name}` });
  res.json({ success: true, message: 'Inventory item deleted' });
});

module.exports = { listForFishpond, createItem, updateItem, adjustStock, removeItem };
