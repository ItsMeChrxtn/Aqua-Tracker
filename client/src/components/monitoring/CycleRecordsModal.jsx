import { useEffect, useState } from 'react';
import { stockingApi, feedingApi, mortalityApi, growthApi } from '../../api/fishponds';
import Modal from '../ui/Modal';
import DataTable from '../ui/DataTable';
import Spinner from '../ui/Spinner';
import { formatDate, formatNumber } from '../../utils/format';

const SECTIONS = [
  {
    key: 'stocking',
    title: 'Stocking Records',
    api: stockingApi,
    columns: [
      { key: 'quantity', header: 'Fingerlings', render: (r) => `${formatNumber(r.quantity)} pcs` },
      { key: 'source', header: 'Source / Supplier' },
    ],
  },
  {
    key: 'feeding',
    title: 'Feeding Records',
    api: feedingApi,
    columns: [
      { key: 'feedType', header: 'Feed Type' },
      { key: 'quantityKg', header: 'Quantity Fed', render: (r) => `${formatNumber(r.quantityKg, 1)} kg` },
    ],
  },
  {
    key: 'mortality',
    title: 'Mortality Records',
    api: mortalityApi,
    columns: [
      { key: 'quantity', header: 'Fish Lost', render: (r) => `${formatNumber(r.quantity)} pcs` },
      { key: 'cause', header: 'Cause / Observation' },
    ],
  },
  {
    key: 'growth',
    title: 'Growth Records',
    api: growthApi,
    columns: [
      { key: 'averageWeight', header: 'Avg. Weight', render: (r) => `${formatNumber(r.averageWeight)} g` },
      { key: 'sampleSize', header: 'Sample Size' },
    ],
  },
];

// Every monitoring record logged for one production cycle (batch).
export default function CycleRecordsModal({ row, onClose }) {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    if (!row) return;
    setRecords(null);
    Promise.all(SECTIONS.map((s) => s.api.listForCycle(row.cycleId))).then((lists) =>
      setRecords(Object.fromEntries(SECTIONS.map((s, i) => [s.key, lists[i]])))
    );
  }, [row]);

  return (
    <Modal open={!!row} onClose={onClose} width="max-w-4xl" title={row ? `${row.fishpondName} — ${row.species}${row.batchName ? ` (${row.batchName})` : ''}` : ''}>
      {!records ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.key}>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">
                {s.title} <span className="font-normal text-slate-400">({records[s.key].length})</span>
              </h4>
              <DataTable
                columns={[
                  { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
                  ...s.columns,
                  { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
                ]}
                rows={records[s.key]}
                pageSize={5}
                searchable={records[s.key].length > 5 ? 'Search…' : false}
                emptyMessage={`No ${s.title.toLowerCase()} for this batch.`}
              />
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
