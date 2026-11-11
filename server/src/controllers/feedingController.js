const mongoose = require('mongoose');
const FeedingRecord = require('../models/FeedingRecord');
const InventoryItem = require('../models/InventoryItem');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');
const { changeStock } = require('../utils/inventory');

// Always offered, whether or not it is tracked in inventory.
const ORGANIC_FEED = 'Organic feeds (lumot)';

const pickFields = (body) => {
  const { date, feedType, quantityKg, notes } = body;
  if (!date || quantityKg === undefined) throw new ApiError(400, 'Date and feed quantity are required');
  if (!(Number(quantityKg) > 0)) throw new ApiError(400, 'Feed quantity must be greater than zero');
  if (!feedType) throw new ApiError(400, 'Feed type is required');
  return { date, feedType, quantityKg: Number(quantityKg), notes };
};

// `feedType` is either an inventory item id or the organic feed label. An
// inventory feed is deducted from that item's stock.
const prepare = async ({ data, cycle }) => {
  if (data.feedType === ORGANIC_FEED) return data;
  if (!mongoose.isValidObjectId(data.feedType)) {
    throw new ApiError(400, `Pick a feed from this fishpond's inventory, or "${ORGANIC_FEED}".`);
  }
  const item = await InventoryItem.findById(data.feedType).populate('fishpond');
  if (!item || !item.fishpond._id.equals(cycle.fishpond._id) || item.category !== 'feed') {
    throw new ApiError(400, "That feed isn't in this fishpond's inventory.");
  }
  await changeStock(item, -data.quantityKg);
  return { ...data, feedType: item.name, inventoryItem: item._id };
};

const onRemoved = async ({ record }) => {
  if (!record.inventoryItem) return;
  const item = await InventoryItem.findById(record.inventoryItem).populate('fishpond');
  if (item) await changeStock(item, record.quantityKg);
};

module.exports = createRecordHandlers(FeedingRecord, { targetType: 'FeedingRecord', pickFields, prepare, onRemoved });
module.exports.ORGANIC_FEED = ORGANIC_FEED;
