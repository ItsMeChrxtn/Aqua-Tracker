import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportApi } from '../../api/misc';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/ui/Card';
import WelcomeBanner from '../../components/ui/WelcomeBanner';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import LineTrendChart from '../../components/charts/LineTrendChart';
import { formatDate, formatDateTime, formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

const STATUS_RING = {
  ready_for_harvest: { ring: 'from-leaf-400 to-leaf-600', bg: 'bg-leaf-50', text: 'text-leaf-600' },
  near_harvest: { ring: 'from-brand-400 to-brand-600', bg: 'bg-brand-50', text: 'text-brand-600' },
  growing: { ring: 'from-leaf-400 to-leaf-600', bg: 'bg-leaf-50', text: 'text-leaf-600' },
};

const QUICK_ACTIONS = [
  { to: '/owner/monitoring/mortality', icon: 'mortality', label: 'Add Mortality Record', tone: 'rose' },
  { to: '/owner/monitoring/growth', icon: 'growth', label: 'Update Sample Weight', tone: 'leaf' },
  { to: '/owner/harvest-estimation', icon: 'harvest', label: 'View Harvest Estimate', tone: 'clay' },
  { to: '/owner/monitoring/sales', icon: 'report', label: 'Record Sale', tone: 'brand' },
  { to: '/owner/inventory', icon: 'clipboard', label: 'Check Inventory', tone: 'clay' },
  { to: '/owner/reports', icon: 'report', label: 'Generate Report', tone: 'brand' },
];

const ACTION_TONE = {
  rose: { icon: 'bg-rose-50 text-rose-600', ring: 'group-hover:border-rose-200' },
  leaf: { icon: 'bg-leaf-50 text-leaf-600', ring: 'group-hover:border-leaf-200' },
  clay: { icon: 'bg-leaf-50 text-leaf-600', ring: 'group-hover:border-leaf-200' },
  brand: { icon: 'bg-brand-50 text-brand-600', ring: 'group-hover:border-brand-200' },
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportApi.ownerSummary().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const { summary, productionSummary, growthRecords, recentActivity } = data;
  const growthChartData = growthRecords.map((r) => ({ x: formatDate(r.date), averageWeight: r.averageWeight }));
  const primaryStatus = productionSummary[0]?.readinessStatus;
  const statusStyle = STATUS_RING[primaryStatus] || STATUS_RING.growing;

  return (
    <div className="space-y-5">
      <WelcomeBanner
        name={user.name}
        message={
          <>
            You have {summary.totalFishponds} fishpond{summary.totalFishponds !== 1 ? 's' : ''}
            {summary.pendingFishponds > 0 && ` (${summary.pendingFishponds} pending approval)`} and {summary.activeCyclesCount} active
            production {summary.activeCyclesCount === 1 ? 'cycle' : 'cycles'}.
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Stocked Fish" value={formatNumber(summary.totalStocked)} icon="fish" tone="brand" />
        <StatCard label="Remaining Fish" value={formatNumber(summary.totalCurrent)} icon="fish" tone="emerald" />
        <StatCard label="Total Mortality" value={formatNumber(summary.totalMortality)} icon="mortality" tone="rose" />
        <StatCard label="Estimated Harvest" value={`${formatNumber(summary.totalEstimatedHarvestKg, 1)} kg`} icon="harvest" tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Growth Monitoring (Average Weight)" className="lg:col-span-2">
          <LineTrendChart data={growthChartData} series={[{ key: 'averageWeight', label: 'Avg. Weight (g)' }]} valueFormatter={(v) => `${v} g`} />
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Harvest Status">
            {primaryStatus ? (
              <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${statusStyle.ring} text-white shadow-sm`}>
                  <Icon name="fish" className="h-7 w-7" />
                </div>
                <Badge className={READINESS_BADGE_CLASS[primaryStatus]}>{READINESS_LABEL[primaryStatus]}</Badge>
                <p className="text-xs text-slate-500">
                  {primaryStatus === 'ready_for_harvest'
                    ? 'Fish have reached target harvest weight.'
                    : primaryStatus === 'near_harvest'
                    ? 'Fish are approaching target harvest weight.'
                    : 'Keep monitoring growth.'}
                </p>
                <Link to="/owner/harvest-estimation" className="w-full">
                  <Button size="sm" variant="secondary" className="w-full justify-center">
                    View Harvest Estimation
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">No active production cycle yet.</p>
            )}
          </Card>

          <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white" padded={false}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-brand-100">Sales Revenue — This Month</p>
                <p className="font-display mt-1.5 text-2xl font-semibold">₱{formatNumber(summary.salesRevenueThisMonth, 2)}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon name="sales" className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Production Summary" className="lg:col-span-2" padded={false}>
          <div className="p-2">
            <DataTable
              columns={[
                { key: 'fishpondName', header: 'Fishpond' },
                { key: 'species', header: 'Species' },
                { key: 'stocked', header: 'Stocked', render: (r) => formatNumber(r.stocked) },
                { key: 'remaining', header: 'Remaining', render: (r) => formatNumber(r.remaining) },
                { key: 'survivalRate', header: 'Survival Rate', render: (r) => `${r.survivalRate}%` },
                { key: 'estimatedHarvestKg', header: 'Est. Harvest', render: (r) => `${formatNumber(r.estimatedHarvestKg, 1)} kg` },
                { key: 'readinessStatus', header: 'Status', render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
              ]}
              rows={productionSummary}
              keyField="cycleId"
              emptyMessage="No active production cycles yet."
            />
          </div>
        </Card>
        <Card title="Recent Activities">
          {recentActivity.length === 0 ? (
            <EmptyState icon="clock" title="No activity yet" />
          ) : (
            <ul className="space-y-3.5">
              {recentActivity.map((a) => (
                <li key={a._id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-slate-700">{a.details}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Quick Actions">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((a) => {
            const tone = ACTION_TONE[a.tone];
            return (
              <Link
                key={a.to}
                to={a.to}
                className={`group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center transition-colors ${tone.ring}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone.icon}`}>
                  <Icon name={a.icon} className="h-4.5 w-4.5" />
                </span>
                <span className="text-xs font-medium leading-snug text-slate-700">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
