import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportApi } from '../../api/misc';
import { useAuth } from '../../auth/AuthContext';
import Card from '../../components/ui/Card';
import WelcomeBanner from '../../components/ui/WelcomeBanner';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import LineTrendChart from '../../components/charts/LineTrendChart';
import SpeciesPieChart from '../../components/charts/SpeciesPieChart';
import { formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const QUICK_ACTIONS = [
  { to: '/agri/fishponds', icon: 'list', label: 'Review Registrations', tone: 'brand' },
  { to: '/agri/monitoring/production', icon: 'fish', label: 'Production Overview', tone: 'leaf' },
  { to: '/agri/reports', icon: 'report', label: 'Generate Report', tone: 'clay' },
];

const ACTION_TONE = {
  rose: 'bg-rose-50 text-rose-600 group-hover:border-rose-200',
  leaf: 'bg-leaf-50 text-leaf-600 group-hover:border-leaf-200',
  clay: 'bg-leaf-50 text-leaf-600 group-hover:border-leaf-200',
  brand: 'bg-brand-50 text-brand-600 group-hover:border-brand-200',
};

export default function AgriDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportApi.municipalSummary().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const { summary, highMortality, nearHarvest, harvestPerMonth, productionBySpecies } = data;
  const harvestChart = harvestPerMonth.map((r) => ({ x: MONTH_NAMES[r.month - 1], estimatedKg: r.totalKg }));
  const pieData = productionBySpecies.map((p) => ({ name: p.species, value: p.estimatedHarvestKg }));

  return (
    <div className="space-y-5">
      <WelcomeBanner name={user.name} message="Here's what's happening across the municipality's fishponds today." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Registered Fishponds" value={formatNumber(summary.totalRegisteredFishponds)} icon="fish" tone="brand" />
        <StatCard label="Total Production (This Month)" value={`${formatNumber(summary.totalProductionThisMonth, 1)} kg`} icon="harvest" tone="emerald" />
        <StatCard label="Estimated Harvest (This Month)" value={`${formatNumber(summary.estimatedHarvestThisMonth, 1)} kg`} icon="harvest" tone="amber" />
        <StatCard label="Sales Revenue (This Month)" value={`₱${formatNumber(summary.salesRevenueThisMonth, 2)}`} icon="report" tone="sky" />
        <StatCard label="Fishponds with High Mortality" value={formatNumber(summary.fishpondsHighMortalityCount)} icon="mortality" tone="rose" />
        <StatCard label="Fishponds Near Harvest" value={formatNumber(summary.fishpondsNearHarvestCount)} icon="clock" tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Estimated Harvest per Month (kg)">
          <LineTrendChart data={harvestChart} series={[{ key: 'estimatedKg', label: 'Harvest (kg)' }]} valueFormatter={(v) => `${v} kg`} />
        </Card>
        <Card title="Fish Production by Species">
          <SpeciesPieChart data={pieData} valueFormatter={(v) => `${v} kg`} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Fishponds with High Mortality" action={<Link to="/agri/monitoring/mortality" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>} padded={false}>
          <div className="p-2">
            <DataTable
              columns={[
                { key: 'fishpondName', header: 'Fishpond Name' },
                { key: 'owner', header: 'Owner Name' },
                { key: 'species', header: 'Species' },
                { key: 'mortalityPercent', header: 'Mortality %', render: (r) => `${r.mortalityPercent}%` },
              ]}
              rows={highMortality.slice(0, 6)}
              keyField="cycleId"
              wrap
              emptyMessage="No high-mortality fishponds right now."
            />
          </div>
        </Card>
        <Card title="Fishponds Near Harvest" action={<Link to="/agri/monitoring/harvest" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>} padded={false}>
          <div className="p-2">
            <DataTable
              columns={[
                { key: 'fishpondName', header: 'Fishpond Name' },
                { key: 'owner', header: 'Owner Name' },
                { key: 'species', header: 'Species' },
                { key: 'estimatedHarvestKg', header: 'Est. Harvest (kg)' },
                { key: 'readinessStatus', header: 'Status', render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
              ]}
              rows={nearHarvest.slice(0, 6)}
              keyField="cycleId"
              wrap
              emptyMessage="No fishponds nearing harvest right now."
            />
          </div>
        </Card>
      </div>

      <Card title="Quick Actions">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
