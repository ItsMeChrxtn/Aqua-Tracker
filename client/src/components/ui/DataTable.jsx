import Icon from './Icon';

// Minimal, dependency-free table: columns = [{ key, header, render? }]
export default function DataTable({ columns, rows, keyField = '_id', emptyMessage = 'No records yet.', loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
        <Icon name="spinner" className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const isEmpty = !rows || rows.length === 0;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wider text-slate-600">
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-3.5 py-3 font-bold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="px-3.5 py-14 text-center text-sm text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row[keyField]} className="transition-colors hover:bg-brand-50/40">
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-3.5 py-3 text-slate-700">
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
