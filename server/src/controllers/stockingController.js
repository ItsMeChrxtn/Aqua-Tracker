const StockingRecord = require('../models/StockingRecord');
const Species = require('../models/Species');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');
const { assertWithinCapacity } = require('../utils/capacity');
const { assertNotPastDate } = require('../utils/validation');

const pickFields = (body) => {
  const { date, quantity, source, notes, species } = body;
  if (!species || !date || !quantity) throw new ApiError(400, 'Species, date and quantity are required');
  assertNotPastDate(date, 'Stocking date');
  return { species, date, quantity, source, notes };
};

// Added fingerlings count toward the fishpond's capacity. Each added stock is
// the cycle's next batch: Batch 1 is the cycle's initial stock, so the first
// one added is Batch 2.
const prepare = async ({ data, cycle }) => {
  if (cycle.status !== 'active') throw new ApiError(400, 'Stock can only be added to an active cycle');
  if (!(await Species.exists({ _id: data.species }))) throw new ApiError(404, 'Species not found');
  await assertWithinCapacity(cycle.fishpond, data.quantity);
  const last = await StockingRecord.findOne({ cycle: cycle._id }).sort({ batchNumber: -1 }).select('batchNumber');
  return { ...data, batchNumber: Math.max(last?.batchNumber || 0, 1) + 1 };
};

const beforeRemove = async ({ record }) => {
  if (record.isInitial) throw new ApiError(400, "Batch 1 is the cycle's initial stock and cannot be deleted");
};

module.exports = createRecordHandlers(StockingRecord, { targetType: 'StockingRecord', pickFields, prepare, beforeRemove });
