import Card from '../ui/Card';
import Icon from '../ui/Icon';
import { formatDate, formatNumber } from '../../utils/format';

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-display mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

const fcrHint = (fcr) => {
  if (!fcr) return 'Needs feeding records and 2 weighings';
  if (fcr <= 1.5) return 'Efficient — little feed wasted';
  if (fcr <= 2) return 'Normal for pond culture';
  return 'High — check for overfeeding';
};

// Growth rates, feed efficiency, the feeding guide and where the growth line
// says the harvest will land. `analytics` comes from GET /cycles/:id/analytics.
export default function CycleAnalyticsPanel({ analytics }) {
  if (!analytics) return null;
  const { growth, feeding, projection } = analytics;
  const guide = feeding.guide;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card title="Growth & Feed Efficiency" subtitle="Computed from your weighings and feeding records" className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Avg. Daily Gain" value={growth.adg !== null ? `${formatNumber(growth.adg, 2)} g/day` : '—'} hint={growth.adg !== null ? 'Weight added per fish per day' : 'Needs 2 weighings'} />
          <Metric label="Specific Growth Rate" value={growth.sgr !== null ? `${formatNumber(growth.sgr, 2)}%/day` : '—'} hint="Body-weight growth per day" />
          <Metric label="Feed Conversion (FCR)" value={feeding.fcr ? formatNumber(feeding.fcr, 2) : '—'} hint={fcrHint(feeding.fcr)} />
          <Metric label="Feed Given" value={`${formatNumber(feeding.totalFeedKg, 1)} kg`} hint={`${feeding.feedingDays} feeding day${feeding.feedingDays === 1 ? '' : 's'} recorded`} />
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon name="sparkles" className="h-4 w-4 text-brand-600" /> Harvest Projection
          </p>
          {projection?.available ? (
            <div className="space-y-1.5 text-sm text-slate-700">
              <p>
                Growing about <b>{formatNumber(projection.gramsPerDay, 2)} g per day</b>.
                {projection.daysToTarget > 0 ? (
                  <>
                    {' '}Expected to reach the harvest weight of <b>{projection.targetWeight} g</b> on <b>{formatDate(projection.projectedHarvestDate)}</b> ({projection.daysToTarget} days from now), giving about{' '}
                    <b>{formatNumber(projection.projectedKgAtTarget, 1)} kg</b>.
                  </>
                ) : (
                  <> The fish should already be at the harvest weight of <b>{projection.targetWeight} g</b> — weigh a sample to confirm.</>
                )}
              </p>
              {projection.expectedHarvestDate && (
                <p className={projection.onTrack === false ? 'text-amber-700' : 'text-leaf-700'}>
                  On your planned harvest date ({formatDate(projection.expectedHarvestDate)}): about <b>{formatNumber(projection.weightAtExpectedDate, 1)} g</b> per fish,{' '}
                  {formatNumber(projection.fishAtExpectedDate)} fish ≈ <b>{formatNumber(projection.kgAtExpectedDate, 1)} kg</b>.{' '}
                  {projection.onTrack === false ? 'Below the harvest weight — consider moving the harvest later.' : 'On track.'}
                </p>
              )}
              <p className="text-[11px] text-slate-500">Straight-line projection from your weighings, minus the current daily death rate. More weighings make it more accurate.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{projection?.reason || 'Not available for this cycle.'}</p>
          )}
        </div>
      </Card>

      <Card title="Feeding Guide (Today)" subtitle="Based on fish count × average weight">
        {guide ? (
          <div className="space-y-3 text-center">
            <p className="font-display text-3xl font-semibold text-brand-700">{formatNumber(guide.dailyFeedKg, 2)} kg</p>
            <p className="text-xs text-slate-600">
              {guide.feedingsPerDay} feedings of about <b>{formatNumber(guide.perFeedingKg, 2)} kg</b>
            </p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-left text-xs">
              <p className="flex justify-between px-3 py-2"><span className="text-slate-500">Fish weight in pond</span><span className="font-medium">{formatNumber(guide.biomassKg, 1)} kg</span></p>
              <p className="flex justify-between px-3 py-2"><span className="text-slate-500">Feeding rate</span><span className="font-medium">{guide.ratePercent}% of body weight</span></p>
            </div>
            <p className="text-[11px] text-slate-500">General guide; follow the feed label and feed less on cloudy or very hot days.</p>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-500">Weigh a sample of fish first so the guide knows their size.</p>
        )}
      </Card>
    </div>
  );
}
