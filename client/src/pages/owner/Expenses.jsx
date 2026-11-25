import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import ProfitLossCard from '../../components/monitoring/ProfitLossCard';
import { expenseApi } from '../../api/fishponds';
import { formatNumber } from '../../utils/format';

const EXPENSE_CATEGORIES = [
  { value: 'fingerlings', label: 'Fingerlings' },
  { value: 'feeds', label: 'Feeds' },
  { value: 'labor', label: 'Labor' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'medicine', label: 'Medicine / Chemicals' },
  { value: 'maintenance', label: 'Maintenance / Repairs' },
  { value: 'other', label: 'Other' },
];
const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]));

const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    required: true,
    placeholder: 'Select category',
    options: EXPENSE_CATEGORIES,
    render: (r) => CATEGORY_LABEL[r.category] || r.category,
  },
  { name: 'amount', label: 'Amount (₱)', type: 'number', required: true, render: (r) => `₱${formatNumber(r.amount, 2)}` },
  { name: 'description', label: 'Description', type: 'text' },
];

export default function Expenses() {
  return (
    <MonitoringRecordPage
      title="Expenses & Profit"
      description="Record what each cycle costs — fingerlings, feeds, labor, electricity — to see its net income."
      api={expenseApi}
      fields={fields}
      chartMetricKey="amount"
      chartLabel="Expenses (₱)"
      renderExtra={(_, refreshKey, { pondCycles }) => <ProfitLossCard cycles={pondCycles} refreshKey={refreshKey} />}
      emptyIcon="sales"
      addLabel="Add Expense"
    />
  );
}
