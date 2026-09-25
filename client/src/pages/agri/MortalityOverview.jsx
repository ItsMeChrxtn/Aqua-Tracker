import AgriOverviewPage from '../../components/agri/AgriOverviewPage';
import Badge from '../../components/ui/Badge';
import { formatNumber } from '../../utils/format';

const columns = [
  { key: 'fishpondName', header: 'Fishpond' },
  { key: 'owner', header: 'Owner' },
  { key: 'barangay', header: 'Barangay' },
  { key: 'species', header: 'Species' },
  { key: 'totalMortality', header: 'Total Mortality', render: (r) => formatNumber(r.totalMortality) },
  {
    key: 'mortalityPercent',
    header: 'Mortality %',
    render: (r) => (
      <Badge className={r.mortalityPercent >= 15 ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-slate-50 text-slate-700 border-slate-300'}>
        {r.mortalityPercent}%
      </Badge>
    ),
  },
];

export default function MortalityOverview() {
  return (
    <AgriOverviewPage
      title="Mortality Overview"
      description="Cumulative mortality per active production cycle, municipality-wide. 15%+ is flagged as high mortality."
      columns={columns}
      chart={{ key: 'mortalityPercent', label: 'Mortality %', valueFormatter: (v) => `${v}%` }}
    />
  );
}
