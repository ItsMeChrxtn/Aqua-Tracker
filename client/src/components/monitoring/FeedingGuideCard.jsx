import { useEffect, useState } from 'react';
import { cycleApi } from '../../api/fishponds';
import Card from '../ui/Card';
import { formatNumber } from '../../utils/format';
import { batchLabel } from '../../utils/cycleLabels';

// Today's suggested feed for each active cycle in view (fish weight × rate).
export default function FeedingGuideCard({ cycles, refreshKey }) {
  const [rows, setRows] = useState([]);
  const ids = cycles.map((c) => c._id).join(',');

  useEffect(() => {
    if (!cycles.length) return setRows([]);
    Promise.all(cycles.map((c) => cycleApi.analytics(c._id).then((a) => ({ cycle: c, a })).catch(() => null))).then((list) => setRows(list.filter(Boolean)));
  }, [ids, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rows.length) return null;
  return (
    <Card title="Feeding Guide (Today)" subtitle="Suggested feed = fish weight in the pond × feeding rate for their size">
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(({ cycle, a }) => {
          const g = a.feeding.guide;
          return (
            <div key={cycle._id} className="rounded-xl border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-900">
                {cycle.species?.name} — {batchLabel(cycle)}
              </p>
              {g ? (
                <p className="mt-1 text-slate-700">
                  Feed about <b>{formatNumber(g.dailyFeedKg, 2)} kg</b> today ({g.feedingsPerDay} × {formatNumber(g.perFeedingKg, 2)} kg) — {formatNumber(g.biomassKg, 1)} kg of fish at {g.ratePercent}% body weight.
                </p>
              ) : (
                <p className="mt-1 text-slate-500">Weigh a sample of fish first so the guide knows their size.</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                FCR so far: {a.feeding.fcr ? formatNumber(a.feeding.fcr, 2) : '—'} · Feed given: {formatNumber(a.feeding.totalFeedKg, 1)} kg
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
