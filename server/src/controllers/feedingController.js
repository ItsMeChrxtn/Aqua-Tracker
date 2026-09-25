const FeedingRecord = require('../models/FeedingRecord');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');

const pickFields = (body) => {
  const { date, feedType, quantityKg, notes } = body;
  if (!date || quantityKg === undefined) throw new ApiError(400, 'Date and feed quantity (kg) are required');
  return { date, feedType, quantityKg, notes };
};

module.exports = createRecordHandlers(FeedingRecord, { targetType: 'FeedingRecord', pickFields });
