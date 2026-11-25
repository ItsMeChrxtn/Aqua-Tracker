import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { cycleApi } from '../../api/fishponds';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import Card from '../ui/Card';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import { Select } from '../ui/FormField';
import LineTrendChart from '../charts/LineTrendChart';
import SpeciesFilterSelect from '../charts/SpeciesFilterSelect';
import { formatDate } from '../../utils/format';
import IconButton from '../ui/IconButton';
import RecordFormModal from './RecordFormModal';
import { batchLabel } from '../../utils/cycleLabels';
import FishCountCards from './FishCountCards';

/**
 * Shared page shell for the four fishpond-wide monitoring record types
 * (stocking / feeding / mortality / growth). Combines every cycle's records
 * for the selected fishpond — past batches and the current one — and can be
 * narrowed to a single species or batch.
 */
// Optional: `extraColumns` are added before the Batch column, `renderExtra(cycles)`
// shows a panel under the fish counts for the active cycles in view, and a field
// with `render(record)` controls how its column is shown.
export default function MonitoringRecordPage({ title, description, api, fields, chartMetricKey, chartLabel, chartSeries, emptyIcon = 'clipboard', addLabel, extraColumns = [], renderExtra }) {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();

  const [fishpondId, setFishpondId] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [pondCycles, setPondCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!fishpondId && fishponds.length > 0) setFishpondId(fishponds[0]._id);
  }, [fishponds, fishpondId]);

  const loadRecords = () => {
    if (!fishpondId) return;
    setLoading(true);
    api
      .listForFishpond(fishpondId, speciesFilter ? { speciesId: speciesFilter } : undefined)
      .then((res) => {
        setRecords(res.records);
        setCycles(res.cycles);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadRecords, [fishpondId, speciesFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!fishpondId) return;
    cycleApi.listForFishpond(fishpondId).then(setPondCycles);
  }, [fishpondId]);

  const refresh = () => {
    loadRecords();
    setRefreshKey((k) => k + 1);
  };

  const activeCycles = pondCycles.filter((c) => c.status === 'active');
  const countedCycles = activeCycles.filter(
    (c) => (!speciesFilter || c.species?._id === speciesFilter) && (!batchFilter || c._id === batchFilter)
  );

  // Only the species this fishpond has actually stocked, from its cycles.
  const pondSpecies = [...new Map(pondCycles.filter((c) => c.species).map((c) => [c.species._id, c.species])).values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const removeRecord = async (id) => {
    if (!(await confirm('Delete this record?'))) return;
    await api.remove(id);
    toast.success('Record deleted');
    refresh();
  };

  const visibleRecords = batchFilter ? records.filter((r) => r.cycle?._id === batchFilter) : records;

  const series = chartSeries || (chartMetricKey ? [{ key: chartMetricKey, label: chartLabel }] : []);
  const chartData = series.length ? visibleRecords.map((r) => ({ x: formatDate(r.date), ...Object.fromEntries(series.map((sr) => [sr.key, r[sr.key] ?? null])) })) : [];

  const columns = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'species', header: 'Fish Name', render: (r) => r.cycle?.species?.name || '—', value: (r) => r.cycle?.species?.name },
    ...fields
      .filter((f) => f.name !== 'date')
      .map((f) => ({
        key: f.name,
        header: f.label,
        render: f.render || ((r) => (r[f.name] !== undefined && r[f.name] !== '' && r[f.name] !== null ? `${r[f.name]}${f.unit ? ` ${f.unit}` : ''}` : '—')),
      })),
    ...extraColumns,
    { key: 'batch', header: 'Batch', render: (r) => batchLabel(r.cycle), value: (r) => batchLabel(r.cycle) },
    {
      key: 'actions',
      header: '',
      render: (r) => <IconButton icon="trash" label="Delete" tone="danger" onClick={() => removeRecord(r._id)} />,
    },
  ];

  if (loadingFishponds) return null;

  if (fishponds.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title="No approved fishponds yet"
        message="Register a fishpond and wait for Agriculture Office approval before you can log monitoring data."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-600">{description}</p>}
        </div>
        <Button icon="plus" onClick={() => setModalOpen(true)}>
          {addLabel || 'Add Record'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={fishpondId}
          onChange={(e) => {
            setFishpondId(e.target.value);
            setSpeciesFilter('');
            setBatchFilter('');
          }}
          className="w-56"
          aria-label="Fishpond"
        >
          {fishponds.map((f) => (
            <option key={f._id} value={f._id}>
              {f.name}
            </option>
          ))}
        </Select>
        <SpeciesFilterSelect
          species={pondSpecies}
          value={speciesFilter}
          onChange={(value) => {
            setSpeciesFilter(value);
            setBatchFilter('');
          }}
        />
        <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="w-56" aria-label="Batch">
          <option value="">All batches</option>
          {cycles.map((c) => (
            <option key={c._id} value={c._id}>
              {batchLabel(c)}
            </option>
          ))}
        </Select>
      </div>

      <FishCountCards cycles={countedCycles} refreshKey={refreshKey} />

      {renderExtra && renderExtra(countedCycles, refreshKey, { fishpondId, pondCycles })}

      {series.length > 0 && (
        <Card title={chartLabel}>
          <LineTrendChart data={chartData} series={series} />
        </Card>
      )}

      <Card title="Records" padded={false}>
        <div className="p-2">
          <DataTable columns={columns} rows={visibleRecords} loading={loading} searchable="Search records…" />
        </div>
      </Card>

      <RecordFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={addLabel || `Add ${title.slice(0, -1)}`}
        api={api}
        fields={fields}
        fishpondId={fishpondId}
        activeCycles={activeCycles}
        onSaved={refresh}
      />
    </div>
  );
}
