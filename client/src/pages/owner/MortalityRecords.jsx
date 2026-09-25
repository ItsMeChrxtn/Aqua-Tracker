import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import { mortalityApi } from '../../api/fishponds';

const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'quantity', label: 'Quantity (fish lost)', type: 'number', required: true, unit: 'pcs' },
  { name: 'cause', label: 'Cause / Observation', type: 'text', hint: 'Free text — e.g. "floaters after heavy rain", "signs of disease"' },
  { name: 'notes', label: 'Additional Notes', type: 'textarea' },
];

export default function MortalityRecords() {
  return (
    <MonitoringRecordPage
      title="Mortality Records"
      description="Fish losses logged with a free-text cause/notes field, across past and current batches."
      api={mortalityApi}
      fields={fields}
      chartMetricKey="quantity"
      chartLabel="Fish Lost"
      emptyIcon="mortality"
    />
  );
}
