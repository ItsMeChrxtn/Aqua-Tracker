import { useEffect, useState } from 'react';
import { activityLogApi } from '../../api/misc';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import { Select } from '../../components/ui/FormField';
import { formatDateTime } from '../../utils/format';
import IconButton from '../../components/ui/IconButton';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'REGISTER', 'EXPORT'];
const TARGETS = ['User', 'Fishpond', 'ProductionCycle', 'StockingRecord', 'FeedingRecord', 'MortalityRecord', 'GrowthRecord', 'HarvestRecord', 'SalesRecord', 'InventoryItem', 'Species', 'Report', 'SystemSetting'];

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    activityLogApi
      .list({ action: action || undefined, targetType: targetType || undefined, page })
      .then((res) => {
        setLogs(res.logs);
        setPages(res.pages);
      })
      .finally(() => setLoading(false));
  }, [action, targetType, page]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Activity Logs &amp; Audit Trail</h2>
        <div className="flex flex-wrap items-center gap-3">
        <Select
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">All targets</option>
          {TARGETS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        </div>
      </div>

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              { key: 'createdAt', header: 'Timestamp', render: (l) => formatDateTime(l.createdAt) },
              { key: 'user', header: 'User', render: (l) => (l.user ? `${l.user.name} (${l.user.role})` : 'System') },
              { key: 'action', header: 'Action' },
              { key: 'targetType', header: 'Target' },
              {
                key: 'details',
                header: 'Details',
                value: (l) => [l.details, ...(l.changes || []).map((ch) => `${ch.field} ${ch.from} ${ch.to}`)].join(' '),
                render: (l) => (
                  <div className="max-w-md">
                    <p>{l.details}</p>
                    {l.changes?.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                        {l.changes.map((ch) => (
                          <li key={ch.field}>
                            <span className="font-semibold text-slate-700">{ch.field}</span>: <span className="text-rose-600 line-through">{ch.from}</span> → <span className="text-leaf-700">{ch.to}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              },
            ]}
            rows={logs}
            searchable="Search user, details…"
            emptyMessage="No activity recorded yet."
          />
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <IconButton icon="chevronLeft" label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
            <span className="text-xs text-slate-400">Page {page} of {pages}</span>
            <IconButton icon="chevronRight" label="Next page" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} />
          </div>
        )}
      </Card>
    </div>
  );
}
