import { useEffect, useState } from 'react';
import { activityLogApi } from '../../api/misc';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/FormField';
import { formatDateTime } from '../../utils/format';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'REGISTER', 'EXPORT'];

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    activityLogApi
      .list({ action: action || undefined, page })
      .then((res) => {
        setLogs(res.logs);
        setPages(res.pages);
      })
      .finally(() => setLoading(false));
  }, [action, page]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Activity Logs &amp; Audit Trail</h2>
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

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              { key: 'createdAt', header: 'Timestamp', render: (l) => formatDateTime(l.createdAt) },
              { key: 'user', header: 'User', render: (l) => (l.user ? `${l.user.name} (${l.user.role})` : 'System') },
              { key: 'action', header: 'Action' },
              { key: 'targetType', header: 'Target' },
              { key: 'details', header: 'Details' },
            ]}
            rows={logs}
            emptyMessage="No activity recorded yet."
          />
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-xs text-slate-400">Page {page} of {pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
