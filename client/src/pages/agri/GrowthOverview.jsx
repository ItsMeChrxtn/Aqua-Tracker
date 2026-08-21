import AgriOverviewPage from '../../components/agri/AgriOverviewPage';
import { formatNumber } from '../../utils/format';

const columns = [
  { key: 'fishpondName', header: 'Fishpond' },
  { key: 'owner', header: 'Owner' },
  { key: 'barangay', header: 'Barangay' },
  { key: 'species', header: 'Species' },
  { key: 'averageWeight', header: 'Avg. Weight (g)', render: (r) => formatNumber(r.averageWeight) },
  { key: 'survivalRate', header: 'Survival %', render: (r) => `${r.survivalRate}%` },
];

export default function GrowthOverview() {
  return (
    <AgriOverviewPage
      title="Growth Overview"
      description="Latest average weight sample per active production cycle, municipality-wide."
      columns={columns}
      chart={{ key: 'averageWeight', label: 'Average Weight (g)', valueFormatter: (v) => `${v} g` }}
    />
  );
}
