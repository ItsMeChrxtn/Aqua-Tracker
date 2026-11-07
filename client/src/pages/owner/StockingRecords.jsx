import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import { stockingApi } from '../../api/fishponds';

const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'quantity', label: 'Quantity (fingerlings)', type: 'number', required: true, unit: 'pcs' },
  { name: 'source', label: 'Source / Supplier', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function StockingRecords() {
  return (
    <MonitoringRecordPage
      title="Stocking Records"
      description="Fingerlings stocked into each production cycle, across past and current batches."
      api={stockingApi}
      fields={fields}
      chartMetricKey="quantity"
      chartLabel="Fingerlings Stocked"
      addLabel="Add Stock"
    />
  );
}
