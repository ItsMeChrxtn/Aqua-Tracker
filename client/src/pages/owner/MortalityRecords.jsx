import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import { MORTALITY_FIELDS } from '../../components/monitoring/recordFields';
import { mortalityApi } from '../../api/fishponds';

export default function MortalityRecords() {
  return (
    <MonitoringRecordPage
      title="Mortality Records"
      description="Fish losses and their cause, across past and current batches."
      api={mortalityApi}
      fields={MORTALITY_FIELDS}
      chartMetricKey="quantity"
      chartLabel="Fish Lost"
      emptyIcon="mortality"
    />
  );
}
