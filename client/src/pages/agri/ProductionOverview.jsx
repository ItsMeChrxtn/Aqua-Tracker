import AgriOverviewPage from '../../components/agri/AgriOverviewPage';
import Badge from '../../components/ui/Badge';
import { formatDate, formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

const columns = [
  { key: 'fishpondName', header: 'Fishpond' },
  { key: 'owner', header: 'Owner' },
  { key: 'barangay', header: 'Barangay' },
  { key: 'species', header: 'Species' },
  { key: 'stockingDate', header: 'Stocking Date', render: (r) => formatDate(r.stockingDate) },
  { key: 'initialCount', header: 'Stocked', render: (r) => formatNumber(r.initialCount) },
  { key: 'currentCount', header: 'Current', render: (r) => formatNumber(r.currentCount) },
  { key: 'readinessStatus', header: 'Status', render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
];

export default function ProductionOverview() {
  return (
    <AgriOverviewPage
      title="Production Overview"
      description="All active production cycles across the municipality."
      columns={columns}
      chart={{ key: 'currentCount', label: 'Current Fish Count', valueFormatter: (v) => formatNumber(v) }}
    />
  );
}
