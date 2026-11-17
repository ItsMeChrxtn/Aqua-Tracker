import { useEffect, useState } from 'react';
import { harvestApi } from '../../api/fishponds';
import StatCard from '../ui/StatCard';
import { formatNumber } from '../../utils/format';

// Total stocked vs. fish still in the pond for the given active batches, so
// owners see the effect of a new record without opening the dashboard.
export default function FishCountCards({ cycles, refreshKey }) {
  const [totals, setTotals] = useState(null);
  const ids = cycles.map((c) => c._id).join(',');

  useEffect(() => {
    if (!ids) {
      setTotals({ stocked: 0, remaining: 0, mortality: 0 });
      return;
    }
    let cancelled = false;
    Promise.all(ids.split(',').map((id) => harvestApi.getEstimate(id))).then((estimates) => {
      if (cancelled) return;
      setTotals({
        stocked: estimates.reduce((s, e) => s + e.totalStocked, 0),
        remaining: estimates.reduce((s, e) => s + e.currentCount, 0),
        mortality: estimates.reduce((s, e) => s + e.totalMortality, 0),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ids, refreshKey]);

  const value = (n) => (totals ? formatNumber(n) : '…');
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Total Stocked Fish" value={value(totals?.stocked)} icon="fish" tone="brand" />
      <StatCard label="Remaining Fish" value={value(totals?.remaining)} icon="fish" tone="sky" />
      <StatCard label="Total Mortality" value={value(totals?.mortality)} icon="mortality" tone="rose" />
    </div>
  );
}
