import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import { feedingApi } from '../../api/fishponds';
import { inventoryApi } from '../../api/inventory';
import { formatNumber } from '../../utils/format';

// Kept in sync with ORGANIC_FEED in server/src/controllers/feedingController.js.
const ORGANIC_FEED = 'Organic feeds (lumot)';

// Feed types are this fishpond's feed items in inventory (feeding deducts from
// their stock), plus organic feed, which is always available.
async function loadFeedOptions(fishpondId) {
  const items = await inventoryApi.listForFishpond(fishpondId);
  return [
    ...items
      .filter((i) => i.category === 'feed')
      .map((i) => ({ value: i._id, label: `${i.name} — ${formatNumber(i.currentStock, 1)} ${i.unit} in stock` })),
    { value: ORGANIC_FEED, label: ORGANIC_FEED },
  ];
}

const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  {
    name: 'feedType',
    label: 'Feed Type',
    type: 'select',
    required: true,
    placeholder: 'Select feed type',
    loadOptions: loadFeedOptions,
    hint: 'Feeds come from this fishpond\'s Inventory & Resources; the quantity fed is deducted from its stock.',
  },
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
