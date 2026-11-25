const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = ['fingerlings', 'feeds', 'labor', 'electricity', 'fuel', 'medicine', 'maintenance', 'other'];

// Money spent on one production cycle — compared with its sales to get the
// cycle's net income.
const expenseRecordSchema = new mongoose.Schema(
  {
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCycle', required: true },
    fishpond: { type: mongoose.Schema.Types.ObjectId, ref: 'Fishpond', required: true },
    date: { type: Date, required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0 }, // pesos
    description: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

expenseRecordSchema.index({ cycle: 1, date: 1 });

const ExpenseRecord = mongoose.model('ExpenseRecord', expenseRecordSchema);
ExpenseRecord.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;

module.exports = ExpenseRecord;
