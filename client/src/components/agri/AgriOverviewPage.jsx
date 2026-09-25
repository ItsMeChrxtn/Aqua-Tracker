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
import { formatDate } from '../../utils/format';
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

  const chartData = useMemo(() => {
    if (!chart) return [];
    return [...cycles]
      .sort((a, b) => new Date(a.lastUpdate) - new Date(b.lastUpdate))
      .map((c) => ({ x: `${c.fishpondName} (${formatDate(c.stockingDate)})`, [chart.key]: c[chart.key] }));
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
            <Card title={chart.label}>
              <LineTrendChart data={chartData} series={[{ key: chart.key, label: chart.label }]} valueFormatter={chart.valueFormatter} />
            </Card>
          )}
          <Card title={`Active Production Cycles (${cycles.length})`} padded={false}>
            <div className="p-2">
              <DataTable columns={columns} rows={cycles} keyField="cycleId" emptyMessage="No active production cycles match this filter." />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
