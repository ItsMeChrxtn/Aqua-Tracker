import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast, { confirm } from '../../utils/notify';
import { cycleApi, harvestApi, mortalityApi, growthApi } from '../../api/fishponds';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import DataTable from '../../components/ui/DataTable';
import IconButton from '../../components/ui/IconButton';
import { Select } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import RecordFormModal from '../../components/monitoring/RecordFormModal';
import { MORTALITY_FIELDS, GROWTH_FIELDS } from '../../components/monitoring/recordFields';
import LineTrendChart from '../../components/charts/LineTrendChart';
import SpeciesFilterSelect from '../../components/charts/SpeciesFilterSelect';
import { formatDate, formatNumber } from '../../utils/format';
import { bucketByWeek } from '../../utils/aggregate';
import { fishLabel } from '../../utils/cycleLabels';

const withUnit = (value, unit) => (value !== undefined && value !== null && value !== '' ? `${formatNumber(value)} ${unit}` : '—');

/**
 * Survival, mortality and growth in one page: the stat cards, the trends, and
 * the mortality and growth records themselves, with buttons to add either.
 */
export default function SurvivalMonitoring() {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();
  const [fishpondId, setFishpondId] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [logs, setLogs] = useState([]);
  const [mortality, setMortality] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [pondCycles, setPondCycles] = useState([]);
  const [activeStats, setActiveStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeCycles, setActiveCycles] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [adding, setAdding] = useState(null); // 'mortality' | 'growth'
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!fishpondId && fishponds.length > 0) setFishpondId(fishponds[0]._id);
  }, [fishponds, fishpondId]);

  useEffect(() => {
    if (!fishpondId) return;
    cycleApi.listForFishpond(fishpondId).then(setPondCycles);
  }, [fishpondId, reloadKey]);

  useEffect(() => {
    if (!fishpondId) return;
    setLoading(true);
    const params = speciesFilter ? { speciesId: speciesFilter } : undefined;

    Promise.all([
      harvestApi.history(fishpondId, params),
      mortalityApi.listForFishpond(fishpondId, params),
      growthApi.listForFishpond(fishpondId, params),
      cycleApi.listForFishpond(fishpondId, { status: 'active', ...(speciesFilter ? { speciesId: speciesFilter } : {}) }),
    ])
      .then(async ([historyLogs, mortalityRes, growthRes, active]) => {
        setLogs([...historyLogs].reverse());
        setMortality(mortalityRes.records);
        setGrowth(growthRes.records);
        setActiveCycles(active);

        if (active.length > 0) {
          const estimates = await Promise.all(active.map((c) => harvestApi.getEstimate(c._id)));
          const totalStocked = estimates.reduce((s, e) => s + e.totalStocked, 0);
          const totalCurrent = estimates.reduce((s, e) => s + e.currentCount, 0);
          const totalMortality = estimates.reduce((s, e) => s + e.totalMortality, 0);
          const survivalRate = totalStocked > 0 ? ((totalStocked - totalMortality) / totalStocked) * 100 : 0;
          const oldestStockingDate = active.reduce(
            (min, c) => (new Date(c.stockingDate) < min ? new Date(c.stockingDate) : min),
            new Date()
          );
          const daysElapsed = Math.max(1, Math.round((Date.now() - oldestStockingDate.getTime()) / 86400000));
          setActiveStats({
            totalStocked,
            totalCurrent,
            totalMortality,
            survivalRate,
            avgDailyMortality: totalMortality / daysElapsed,
          });
        } else {
          setActiveStats(null);
        }
      })
      .finally(() => setLoading(false));
  }, [fishpondId, speciesFilter, reloadKey]);

  // Dashboard shortcuts open a form directly: ?add=mortality or ?add=growth.
  useEffect(() => {
    const add = searchParams.get('add');
    if (!fishpondId || loading || !['mortality', 'growth'].includes(add)) return;
    setAdding(add);
    setSearchParams({}, { replace: true });
  }, [fishpondId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => setReloadKey((k) => k + 1);

  const removeRecord = async (api, id) => {
    if (!(await confirm('Delete this record?'))) return;
    await api.remove(id);
    toast.success('Record deleted');
    reload();
  };

  if (loadingFishponds) return null;
  if (fishponds.length === 0) {
    return <EmptyState icon="survival" title="No approved fishponds yet" message="Register and get a fishpond approved to monitor survival rate." />;
  }

  // Only the species this fishpond has actually stocked.
  const pondSpecies = [...new Map(pondCycles.filter((c) => c.species).map((c) => [c.species._id, c.species])).values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const survivalTrend = logs.map((l) => ({ x: formatDate(l.date), survivalRate: l.survivalRate }));
  const growthTrend = logs.map((l) => ({ x: formatDate(l.date), averageWeight: l.averageWeight }));
  const mortalityWeekly = bucketByWeek(mortality, 'quantity').map((p) => ({ x: formatDate(p.x), mortality: p.value }));

  const fishColumn = { key: 'fish', header: 'Fish Name', render: (r) => (r.cycle ? fishLabel(r.cycle) : '—'), value: (r) => (r.cycle ? fishLabel(r.cycle) : '') };
  const dateColumn = { key: 'date', header: 'Date', render: (r) => formatDate(r.date) };

  const mortalityColumns = [
    dateColumn,
    fishColumn,
    { key: 'quantity', header: 'Fish Lost', render: (r) => withUnit(r.quantity, 'pcs') },
    { key: 'cause', header: 'Cause of Death', render: (r) => r.cause || '—' },
    { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
    { key: 'actions', header: '', render: (r) => <IconButton icon="trash" label="Delete" tone="danger" onClick={() => removeRecord(mortalityApi, r._id)} /> },
  ];

  const growthColumns = [
    dateColumn,
    fishColumn,
    { key: 'sampleSize', header: 'Sample Size', render: (r) => withUnit(r.sampleSize, 'fish') },
    { key: 'averageWeight', header: 'Average Weight', render: (r) => withUnit(r.averageWeight, 'g') },
    { key: 'averageLength', header: 'Average Length', render: (r) => withUnit(r.averageLength, 'cm') },
    { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
    { key: 'actions', header: '', render: (r) => <IconButton icon="trash" label="Delete" tone="danger" onClick={() => removeRecord(growthApi, r._id)} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Survival Rate Monitoring</h2>
          <p className="text-sm text-slate-600">Survival, mortality and growth of the fish in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={fishpondId}
            onChange={(e) => {
              setFishpondId(e.target.value);
              setSpeciesFilter('');
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
          <SpeciesFilterSelect species={pondSpecies} value={speciesFilter} onChange={setSpeciesFilter} />
          <Button icon="plus" variant="secondary" onClick={() => setAdding('mortality')}>Add Mortality</Button>
          <Button icon="plus" onClick={() => setAdding('growth')}>Add Growth Record</Button>
        </div>
      </div>

      {loading && <Spinner />}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Survival Rate" value={activeStats ? `${formatNumber(activeStats.survivalRate, 1)}%` : '—'} icon="survival" tone="emerald" />
            <StatCard label="Stocked Fish" value={activeStats ? formatNumber(activeStats.totalStocked) : '—'} icon="fish" tone="brand" />
            <StatCard label="Current Fish Count" value={activeStats ? formatNumber(activeStats.totalCurrent) : '—'} icon="fish" tone="sky" />
            <StatCard label="Total Mortality" value={activeStats ? formatNumber(activeStats.totalMortality) : '—'} icon="mortality" tone="rose" />
            <StatCard label="Avg. Daily Mortality" value={activeStats ? formatNumber(activeStats.avgDailyMortality, 1) : '—'} sub="fish/day" icon="mortality" tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Survival Rate Trend (%)">
              <LineTrendChart data={survivalTrend} series={[{ key: 'survivalRate', label: 'Survival Rate (%)' }]} valueFormatter={(v) => `${v}%`} />
            </Card>
            <Card title="Growth Trend (Average Weight)">
              <LineTrendChart data={growthTrend} series={[{ key: 'averageWeight', label: 'Avg. Weight (g)' }]} valueFormatter={(v) => `${v} g`} />
            </Card>
          </div>

          <Card title="Mortality Trend (fish/week)">
            <LineTrendChart data={mortalityWeekly} series={[{ key: 'mortality', label: 'Mortality (fish/week)' }]} />
          </Card>

          <Card title="Mortality Records" padded={false}>
            <div className="p-2">
              <DataTable columns={mortalityColumns} rows={mortality} searchable="Search mortality records…" emptyMessage="No mortality recorded yet." />
            </div>
          </Card>

          <Card title="Growth Records" padded={false}>
            <div className="p-2">
              <DataTable columns={growthColumns} rows={growth} searchable="Search growth records…" emptyMessage="No growth samples recorded yet." />
            </div>
          </Card>
        </>
      )}

      <RecordFormModal
        open={adding === 'mortality'}
        onClose={() => setAdding(null)}
        title="Add Mortality Record"
        api={mortalityApi}
        fields={MORTALITY_FIELDS}
        fishpondId={fishpondId}
        activeCycles={activeCycles}
        onSaved={reload}
      />
      <RecordFormModal
        open={adding === 'growth'}
        onClose={() => setAdding(null)}
        title="Add Growth Record"
        api={growthApi}
        fields={GROWTH_FIELDS}
        fishpondId={fishpondId}
        activeCycles={activeCycles}
        onSaved={reload}
      />
    </div>
  );
}
