import { useEffect, useState } from 'react';
import { cycleApi, harvestApi, mortalityApi } from '../../api/fishponds';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { Select } from '../../components/ui/FormField';
import LineTrendChart from '../../components/charts/LineTrendChart';
import SpeciesFilterSelect from '../../components/charts/SpeciesFilterSelect';
import { formatDate, formatNumber } from '../../utils/format';
import { bucketByWeek } from '../../utils/aggregate';

export default function SurvivalMonitoring() {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();
  const { species } = useSpeciesList();
  const [fishpondId, setFishpondId] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [logs, setLogs] = useState([]);
  const [mortality, setMortality] = useState([]);
  const [activeStats, setActiveStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fishpondId && fishponds.length > 0) setFishpondId(fishponds[0]._id);
  }, [fishponds, fishpondId]);

  useEffect(() => {
    if (!fishpondId) return;
    setLoading(true);
    const params = speciesFilter ? { speciesId: speciesFilter } : undefined;

    Promise.all([
      harvestApi.history(fishpondId, params),
      mortalityApi.listForFishpond(fishpondId, params),
      cycleApi.listForFishpond(fishpondId, { status: 'active', ...(speciesFilter ? { speciesId: speciesFilter } : {}) }),
    ])
      .then(async ([historyLogs, mortalityRes, activeCycles]) => {
        setLogs([...historyLogs].reverse());
        setMortality(mortalityRes.records);

        if (activeCycles.length > 0) {
          const estimates = await Promise.all(activeCycles.map((c) => harvestApi.getEstimate(c._id)));
          const totalStocked = activeCycles.reduce((s, c) => s + c.initialCount, 0);
          const totalCurrent = estimates.reduce((s, e) => s + e.currentCount, 0);
          const totalMortality = estimates.reduce((s, e) => s + e.totalMortality, 0);
          const survivalRate = totalStocked > 0 ? (totalCurrent / totalStocked) * 100 : 0;
          const oldestStockingDate = activeCycles.reduce(
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
  }, [fishpondId, speciesFilter]);

  if (loadingFishponds) return null;
  if (fishponds.length === 0) {
    return <EmptyState icon="survival" title="No approved fishponds yet" message="Register and get a fishpond approved to monitor survival rate." />;
  }

  const survivalTrend = logs.map((l) => ({ x: formatDate(l.date), survivalRate: l.survivalRate }));
  const growthTrend = logs.map((l) => ({ x: formatDate(l.date), averageWeight: l.averageWeight }));
  const mortalityWeekly = bucketByWeek(mortality, 'quantity').map((p) => ({ x: formatDate(p.x), mortality: p.value }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Survival Rate Monitoring</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={fishpondId} onChange={(e) => setFishpondId(e.target.value)} className="w-56">
            {fishponds.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </Select>
          <SpeciesFilterSelect species={species} value={speciesFilter} onChange={setSpeciesFilter} />
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
        </>
      )}
    </div>
  );
}
