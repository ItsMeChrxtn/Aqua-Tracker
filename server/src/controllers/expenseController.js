const ExpenseRecord = require('../models/ExpenseRecord');
const { createRecordHandlers } = require('../utils/recordFactory');
const { ApiError } = require('../middleware/errorHandler');
const { dateOnly } = require('../utils/validation');

// Expenses can be logged for past dates (receipts are often entered later).
const pickFields = (body) => {
  const { date, category, amount, description } = body;
  if (!date || !category || amount === undefined || amount === '') throw new ApiError(400, 'Date, category and amount are required');
  if (!dateOnly(date)) throw new ApiError(400, 'Date is not a valid date');
  if (!ExpenseRecord.EXPENSE_CATEGORIES.includes(category)) throw new ApiError(400, 'Invalid expense category');
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new ApiError(400, 'Amount must be more than zero');
  return { date, category, amount: Math.round(value * 100) / 100, description: description ? String(description).trim().slice(0, 200) : undefined };
};

module.exports = createRecordHandlers(ExpenseRecord, { targetType: 'ExpenseRecord', pickFields });
