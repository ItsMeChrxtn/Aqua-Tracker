import { useEffect, useState } from 'react';
import { cycleApi } from '../../api/fishponds';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import { formatNumber, STATUS_BADGE_CLASS } from '../../utils/format';
import { batchLabel } from '../../utils/cycleLabels';

const peso = (n) => `₱${formatNumber(n || 0, 2)}`;

// Sales minus expenses for each cycle of the fishpond, newest first.
export default function ProfitLossCard({ cycles, refreshKey }) {
  const [rows, setRows] = useState(null);
  const ids = cycles.map((c) => c._id).join(',');

  useEffect(() => {
    const recent = [...cycles].sort((a, b) => new Date(b.stockingDate) - new Date(a.stockingDate)).slice(0, 8);
    if (!recent.length) return setRows([]);
    Promise.all(recent.map((c) => cycleApi.analytics(c._id).then((a) => ({ cycleId: c._id, cycle: c, ...a.finance })).catch(() => null))).then((list) =>
      setRows(list.filter(Boolean))
    );
  }, [ids, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = (rows || []).reduce((t, r) => ({ revenue: t.revenue + r.revenue, expenses: t.expenses + r.totalExpenses }), { revenue: 0, expenses: 0 });
  const net = total.revenue - total.expenses;

  return (
    <Card title="Profit & Loss per Cycle" subtitle="Sales (including marketplace orders) minus the expenses recorded below">
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-sky-50 p-3">
          <p className="text-[11px] font-bold uppercase text-sky-700">Sales</p>
          <p className="font-display text-xl font-semibold text-slate-900">{peso(total.revenue)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-[11px] font-bold uppercase text-amber-700">Expenses</p>
          <p className="font-display text-xl font-semibold text-slate-900">{peso(total.expenses)}</p>
        </div>
        <div className={`rounded-xl p-3 ${net >= 0 ? 'bg-leaf-50' : 'bg-rose-50'}`}>
          <p className={`text-[11px] font-bold uppercase ${net >= 0 ? 'text-leaf-700' : 'text-rose-700'}`}>{net >= 0 ? 'Net Income' : 'Net Loss'}</p>
          <p className="font-display text-xl font-semibold text-slate-900">{peso(net)}</p>
        </div>
      </div>
      <DataTable
        columns={[
          { key: 'cycle', header: 'Cycle', render: (r) => `${batchLabel(r.cycle)} — ${r.cycle.species?.name || ''}`, value: (r) => batchLabel(r.cycle) },
          { key: 'status', header: 'Status', render: (r) => <Badge className={STATUS_BADGE_CLASS[r.cycle.status]}>{r.cycle.status}</Badge> },
          { key: 'revenue', header: 'Sales', render: (r) => peso(r.revenue) },
          { key: 'totalExpenses', header: 'Expenses', render: (r) => peso(r.totalExpenses) },
          {
            key: 'netIncome',
            header: 'Net',
            render: (r) => <span className={r.netIncome >= 0 ? 'font-semibold text-leaf-700' : 'font-semibold text-rose-600'}>{peso(r.netIncome)}</span>,
          },
          { key: 'costPerKg', header: 'Cost / kg', render: (r) => (r.costPerKg ? peso(r.costPerKg) : '—') },
          { key: 'roiPercent', header: 'ROI', render: (r) => (r.roiPercent !== null ? `${formatNumber(r.roiPercent, 1)}%` : '—') },
        ]}
        rows={rows || []}
        loading={rows === null}
        keyField="cycleId"
        emptyMessage="No production cycles yet."
      />
      <p className="mt-2 text-[11px] text-slate-500">Cost / kg = expenses ÷ kilos harvested. ROI = net income ÷ expenses.</p>
    </Card>
  );
}
