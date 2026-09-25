const StockingRecord = require('../models/StockingRecord');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');

const pickFields = (body) => {
  const { date, quantity, source, notes } = body;
  if (!date || !quantity) throw new ApiError(400, 'Date and quantity are required');
  return { date, quantity, source, notes };
};

module.exports = createRecordHandlers(StockingRecord, { targetType: 'StockingRecord', pickFields });
