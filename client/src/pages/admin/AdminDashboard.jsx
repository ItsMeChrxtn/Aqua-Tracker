import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportApi } from '../../api/misc';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/ui/Card';
import WelcomeBanner from '../../components/ui/WelcomeBanner';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import LineTrendChart from '../../components/charts/LineTrendChart';
import SpeciesPieChart from '../../components/charts/SpeciesPieChart';
import { formatDateTime, formatNumber, ROLE_LABEL } from '../../utils/format';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const QUICK_ACTIONS = [
  { to: '/admin/users', icon: 'users', label: 'Manage Users', tone: 'brand' },
  { to: '/admin/species', icon: 'fish', label: 'Manage Species', tone: 'leaf' },
  { to: '/admin/activity-logs', icon: 'clipboard', label: 'View Activity Logs', tone: 'clay' },
  { to: '/admin/backup', icon: 'download', label: 'Export Backup', tone: 'brand' },
];

const ACTION_TONE = {
  leaf: 'bg-leaf-50 text-leaf-600',
  clay: 'bg-leaf-50 text-leaf-600',
  brand: 'bg-brand-50 text-brand-600',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportApi.adminSummary().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const { summary, userCounts, fishpondCounts, harvestPerMonth, productionBySpecies, recentActivity } = data;

  const userPieData = Object.entries(userCounts)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => ({ name: ROLE_LABEL[role] || role, value: count }));

  const fishpondPieData = Object.entries(fishpondCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status.charAt(0).toUpperCase() + status.slice(1), value: count }));

  const harvestChart = harvestPerMonth.map((r) => ({ x: MONTH_NAMES[r.month - 1], totalKg: r.totalKg }));
  const speciesPieData = productionBySpecies.map((p) => ({ name: p.species, value: p.estimatedHarvestKg }));

  return (
    <div className="space-y-5">
      <WelcomeBanner name={user.name} message="Here's the bird's-eye view of everything happening on AquaTrack." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Users" value={formatNumber(summary.totalUsers)} icon="users" tone="brand" />
        <StatCard label="Total Fishponds" value={formatNumber(summary.totalFishponds)} icon="fish" tone="sky" />
        <StatCard label="Pending Approvals" value={formatNumber(summary.pendingApprovalsCount)} icon="clock" tone="amber" />
        <StatCard label="Species Configured" value={formatNumber(summary.speciesCount)} icon="fish" tone="violet" />
        <StatCard label="Active Production Cycles" value={formatNumber(summary.activeCyclesCount)} icon="growth" tone="emerald" />
        <StatCard label="Total Sales Revenue" value={`₱${formatNumber(summary.totalSalesRevenue, 2)}`} icon="report" tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Estimated Harvest per Month (System-wide, kg)">
          <LineTrendChart data={harvestChart} series={[{ key: 'totalKg', label: 'Harvest (kg)' }]} valueFormatter={(v) => `${v} kg`} />
        </Card>
        <Card title="Production by Species (Active Cycles)">
          {speciesPieData.length === 0 ? (
            <EmptyState icon="fish" title="No active production yet" />
          ) : (
            <SpeciesPieChart data={speciesPieData} valueFormatter={(v) => `${v} kg`} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Users by Role">
          {userPieData.length === 0 ? <EmptyState icon="users" title="No users yet" /> : <SpeciesPieChart data={userPieData} />}
        </Card>
        <Card title="Fishponds by Status">
          {fishpondPieData.length === 0 ? <EmptyState icon="fish" title="No fishponds yet" /> : <SpeciesPieChart data={fishpondPieData} />}
        </Card>
      </div>

      <Card title="Recent System Activity">
        {recentActivity.length === 0 ? (
          <EmptyState icon="clock" title="No activity yet" />
        ) : (
          <ul className="space-y-3">
            {recentActivity.map((a) => (
              <li key={a._id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <div>
                  <p className="text-slate-700">
                    {a.details}
                    {a.user && <span className="text-slate-400"> — {a.user.name} ({ROLE_LABEL[a.user.role]})</span>}
                  </p>
                  <p className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Quick Actions">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center transition-colors hover:border-brand-200"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${ACTION_TONE[a.tone]}`}>
                <Icon name={a.icon} className="h-4.5 w-4.5" />
              </span>
              <span className="text-xs font-medium leading-snug text-slate-700">{a.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
