import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import { GROWTH_FIELDS } from '../../components/monitoring/recordFields';
import { growthApi } from '../../api/fishponds';

export default function GrowthMonitoring() {
  return (
    <MonitoringRecordPage
      title="Growth Monitoring"
      description="Weight sampling over time — feeds harvest readiness and the estimated harvest weight."
      api={growthApi}
      fields={GROWTH_FIELDS}
      chartMetricKey="averageWeight"
      chartLabel="Average Weight (g)"
      emptyIcon="growth"
    />
  );
}
