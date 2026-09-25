import AgriOverviewPage from '../../components/agri/AgriOverviewPage';
import Badge from '../../components/ui/Badge';
import { formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

const columns = [
  { key: 'fishpondName', header: 'Fishpond' },
  { key: 'owner', header: 'Owner' },
  { key: 'barangay', header: 'Barangay' },
  { key: 'species', header: 'Species' },
  { key: 'estimatedHarvestKg', header: 'Est. Harvest (kg)', render: (r) => formatNumber(r.estimatedHarvestKg, 1) },
  { key: 'readinessStatus', header: 'Status', render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
];

export default function HarvestOverview() {
  return (
    <AgriOverviewPage
      title="Harvest Overview"
      description="Estimated harvest and readiness per active production cycle, municipality-wide."
      columns={columns}
      chart={{ key: 'estimatedHarvestKg', label: 'Estimated Harvest (kg)', valueFormatter: (v) => `${v} kg` }}
    />
  );
}
