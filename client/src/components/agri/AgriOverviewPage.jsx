import { useEffect, useMemo, useState } from 'react';
import { reportApi } from '../../api/misc';
import { fishpondApi } from '../../api/fishponds';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import { Select } from '../../components/ui/FormField';
import SpeciesFilterSelect from '../charts/SpeciesFilterSelect';
import LineTrendChart from '../charts/LineTrendChart';
import { withExistingBarangays } from '../../utils/barangays';

/**
 * Shared shell for the four municipal-wide monitoring overview pages
 * (Production / Mortality / Growth / Harvest). Each active production cycle
 * across the municipality is one row; barangay + species filters narrow it.
 */
export default function AgriOverviewPage({ title, description, columns, chart }) {
  const { species } = useSpeciesList();
  const [barangay, setBarangay] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [barangays, setBarangays] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fishpondApi.list({ status: 'approved' }).then((all) => setBarangays(withExistingBarangays(all.map((f) => f.barangay))));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (barangay) params.barangay = barangay;
    if (speciesId) params.speciesId = speciesId;
    reportApi
      .municipalSummary(params)
      .then((res) => setCycles(res.allCycles))
      .finally(() => setLoading(false));
  }, [barangay, speciesId]);

  // One point per fishpond on the x-axis and one line per species, so a pond
  // stocking several species shows each separately.
  const { chartData, chartSeries } = useMemo(() => {
    if (!chart) return { chartData: [], chartSeries: [] };
    const speciesNames = [...new Set(cycles.map((c) => c.species))].sort();
    const keyFor = (name) => `s${speciesNames.indexOf(name)}`;
    const byPond = new Map();
    [...cycles]
      .sort((a, b) => new Date(a.stockingDate) - new Date(b.stockingDate))
      .forEach((c) => {
        const point = byPond.get(c.fishpondId) || { x: c.fishpondName };
        point[keyFor(c.species)] = (point[keyFor(c.species)] || 0) + (Number(c[chart.key]) || 0);
        byPond.set(c.fishpondId, point);
      });
    return {
      chartData: [...byPond.values()],
      chartSeries: speciesNames.map((name) => ({ key: keyFor(name), label: name })),
    };
  }, [cycles, chart]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-600">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={barangay} onChange={(e) => setBarangay(e.target.value)} className="w-48">
            <option value="">All barangays</option>
            {barangays.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
          <SpeciesFilterSelect species={species} value={speciesId} onChange={setSpeciesId} />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {chart && (
            <Card title={`${chart.label} by Species`}>
              <LineTrendChart data={chartData} series={chartSeries} valueFormatter={chart.valueFormatter} />
            </Card>
          )}
          <Card title={`Active Production Cycles (${cycles.length})`} padded={false}>
            <div className="p-2">
              <DataTable columns={columns} rows={cycles} keyField="cycleId" searchable="Search fishpond, owner, species…" emptyMessage="No active production cycles match this filter." />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
