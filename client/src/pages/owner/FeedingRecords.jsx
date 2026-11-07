import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import { feedingApi } from '../../api/fishponds';

const FEED_TYPES = ['Starter', 'Grower', 'Finisher'].map((t) => ({ value: t, label: t }));

const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'feedType', label: 'Feed Type', type: 'selectWithOther', options: FEED_TYPES, placeholder: 'Select feed type', otherPlaceholder: 'Type the feed type' },
  { name: 'quantityKg', label: 'Quantity Fed', type: 'number', required: true, unit: 'kg' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function FeedingRecords() {
  return (
    <MonitoringRecordPage
      title="Feeding Records"
      description="Daily feed type and quantity given, across past and current batches."
      api={feedingApi}
      fields={fields}
      chartMetricKey="quantityKg"
      chartLabel="Feed Given (kg)"
    />
  );
}
