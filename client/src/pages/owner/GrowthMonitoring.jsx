import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import { growthApi } from '../../api/fishponds';

const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'sampleSize', label: 'Sample Size', type: 'number', required: true, unit: 'fish' },
  { name: 'averageWeight', label: 'Average Weight', type: 'number', required: true, unit: 'g' },
  { name: 'averageLength', label: 'Average Length', type: 'number', unit: 'cm' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function GrowthMonitoring() {
  return (
    <MonitoringRecordPage
      title="Growth Monitoring"
      description="Weight sampling over time — feeds harvest readiness and the estimated harvest weight."
      api={growthApi}
      fields={fields}
      chartMetricKey="averageWeight"
      chartLabel="Average Weight (g)"
      emptyIcon="growth"
    />
  );
}
