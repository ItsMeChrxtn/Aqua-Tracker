const StockingRecord = require('../models/StockingRecord');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');
const { assertWithinCapacity } = require('../utils/capacity');
const { assertNotPastDate } = require('../utils/validation');

const pickFields = (body) => {
  const { date, quantity, source, notes } = body;
  if (!date || !quantity) throw new ApiError(400, 'Date and quantity are required');
  assertNotPastDate(date, 'Stocking date');
  return { date, quantity, source, notes };
};

// Added fingerlings count toward the fishpond's capacity.
const prepare = async ({ data, cycle }) => {
  await assertWithinCapacity(cycle.fishpond, data.quantity);
  return data;
};

module.exports = createRecordHandlers(StockingRecord, { targetType: 'StockingRecord', pickFields, prepare });
