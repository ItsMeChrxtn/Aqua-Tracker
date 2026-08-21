const SalesRecord = require('../models/SalesRecord');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');

const pickFields = (body) => {
  const { date, buyerName, quantityKg, pricePerKg, notes } = body;
  if (!date || quantityKg === undefined || pricePerKg === undefined) {
    throw new ApiError(400, 'Date, quantity (kg), and price per kg are required');
  }
  if (Number(quantityKg) <= 0 || Number(pricePerKg) < 0) {
    throw new ApiError(400, 'Quantity must be greater than zero and price cannot be negative');
  }
  const totalAmount = Number(quantityKg) * Number(pricePerKg);
  return { date, buyerName, quantityKg, pricePerKg, totalAmount, notes };
};

module.exports = createRecordHandlers(SalesRecord, { targetType: 'SalesRecord', pickFields });
