import { useMemo, useState } from 'react';
import Icon from './Icon';

const PAGE_SIZE = 10;

// The plain value a column holds, used for searching and sorting. Columns can
// supply `value(row)` when the cell shows something derived (names inside
// objects, labels, etc.).
function cellValue(col, row) {
  if (col.value) return col.value(row);
  const raw = row[col.key];
  return raw !== null && typeof raw === 'object' ? undefined : raw;
}

function compare(a, b) {
  if (a === undefined || a === null || a === '') return 1;
  if (b === undefined || b === null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

const isSortable = (col) => col.sortable !== false && Boolean(col.header);

/**
 * Table with click-to-sort headers and pagination; pass `searchable` (true or
 * placeholder text) for a search box. columns = [{ key, header, render?, value?, sortable? }]
 */
export default function DataTable({
  columns,
  rows,
  keyField = '_id',
  emptyMessage = 'No records yet.',
  loading,
  searchable = false,
  pageSize = PAGE_SIZE,
  wrap = false,
  toolbar,
  query: controlledQuery,
  onQueryChange,
}) {
  const [ownQuery, setOwnQuery] = useState('');
  const query = controlledQuery ?? ownQuery;
  const setQuery = onQueryChange || setOwnQuery;
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);

  const visible = useMemo(() => {
    let list = rows || [];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) {
      list = list.filter((row) => {
        const text = columns.map((c) => cellValue(c, row)).filter((v) => v !== undefined && v !== null).join(' ').toLowerCase();
        return terms.every((t) => text.includes(t));
      });
    }
    const col = columns.find((c) => c.key === sort.key);
    if (col) {
      list = [...list].sort((a, b) => {
        const result = compare(cellValue(col, a), cellValue(col, b));
        return sort.dir === 'asc' ? result : -result;
      });
    }
    return list;
  }, [rows, columns, query, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageRows = visible.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (col) => {
    if (!isSortable(col)) return;
    setSort((s) => (s.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'asc' }));
    setPage(1);
  };

  const searchBox = searchable && (
    <div className="relative w-full sm:w-72">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={typeof searchable === 'string' ? searchable : 'Search…'}
        className="block w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        aria-label="Search table"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
        <Icon name="spinner" className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const cellClass = wrap ? 'px-3.5 py-3 text-slate-700' : 'whitespace-nowrap px-3.5 py-3 text-slate-700';
  const emptyText = query && rows?.length ? `No results for "${query}".` : emptyMessage;

  return (
    <div className="space-y-3">
      {(searchBox || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
          {searchBox}
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className={`w-full text-left text-sm ${wrap ? '' : 'min-w-max'}`}>
          <thead>
            <tr className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wider text-slate-600">
              {columns.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th key={col.key} className="whitespace-nowrap px-3.5 py-3 font-bold" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {isSortable(col) ? (
                      <button type="button" onClick={() => toggleSort(col)} className="group inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-900" title="Sort">
                        {col.header}
                        <Icon
                          name={active && sort.dir === 'desc' ? 'chevronDown' : 'chevronUp'}
                          className={`h-3.5 w-3.5 ${active ? 'text-brand-600' : 'text-slate-300 group-hover:text-slate-400'}`}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3.5 py-14 text-center text-sm text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row[keyField]} className="transition-colors hover:bg-brand-50/40">
                  {columns.map((col) => (
                    <td key={col.key} className={cellClass}>
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {visible.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 text-xs text-slate-500">
          <span>
            Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, visible.length)} of {visible.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 1}
              className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <Icon name="chevronLeft" className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {current} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current === pageCount}
              className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
