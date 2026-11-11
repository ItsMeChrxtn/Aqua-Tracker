const { ApiError } = require('../middleware/errorHandler');
const { createNotification } = require('./notify');

// Adds (positive delta) or removes (negative delta) stock from an inventory
// item and alerts the owner the moment it falls to its reorder level.
// `item.fishpond` must be populated.
async function changeStock(item, delta) {
  const wasLow = item.currentStock <= item.reorderLevel;
  const next = item.currentStock + delta;
  if (next < 0) {
    throw new ApiError(400, `Not enough ${item.name} in inventory: only ${item.currentStock} ${item.unit} left.`);
  }
  item.currentStock = Number(next.toFixed(4));
  await item.save();

  if (item.currentStock <= item.reorderLevel && !wasLow) {
    await createNotification({
      user: item.fishpond.owner,
      fishpond: item.fishpond._id,
      type: 'low_stock',
      message: `Low stock alert: ${item.name} at ${item.fishpond.name} is down to ${item.currentStock} ${item.unit} (reorder level: ${item.reorderLevel} ${item.unit}).`,
    });
  }
  return item;
}

module.exports = { changeStock };
