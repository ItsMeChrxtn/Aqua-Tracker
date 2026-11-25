import MonitoringRecordPage from '../../components/monitoring/MonitoringRecordPage';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { waterQualityApi } from '../../api/fishponds';
import { WATER_RANGES, SALINITY_RANGES, rangeText, isOutOfRange } from '../../utils/waterQuality';
import { WATER_TYPE_LABEL } from '../../utils/format';

// A reading cell, red when outside the safe range for the cycle's water type.
const reading = (key, unit) => (r) => {
  const value = r[key];
  if (value === undefined || value === null) return '—';
  const bad = isOutOfRange(key, value, r.cycle?.species?.waterType);
  return <span className={bad ? 'font-semibold text-rose-600' : ''}>{`${value}${unit ? ` ${unit}` : ''}`}</span>;
};

const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true, minToday: true, hint: 'Today or a later date' },
  { name: 'temperature', label: 'Temperature (°C)', type: 'number', hint: `Safe: ${rangeText(WATER_RANGES.temperature)}`, render: reading('temperature', '°C') },
  { name: 'ph', label: 'pH', type: 'number', hint: `Safe: ${rangeText(WATER_RANGES.ph)}`, render: reading('ph', '') },
  { name: 'dissolvedOxygen', label: 'Dissolved Oxygen (mg/L)', type: 'number', hint: `Safe: ${rangeText(WATER_RANGES.dissolvedOxygen)}`, render: reading('dissolvedOxygen', 'mg/L') },
  { name: 'salinity', label: 'Salinity (ppt)', type: 'number', hint: 'Freshwater 0–5, brackish 5–30, saltwater 28–40', render: reading('salinity', 'ppt') },
  { name: 'ammonia', label: 'Ammonia (mg/L)', type: 'number', hint: `Safe: ${rangeText(WATER_RANGES.ammonia)}`, render: reading('ammonia', 'mg/L') },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const statusColumn = {
  key: 'issues',
  header: 'Status',
  render: (r) =>
    r.issues?.length ? (
      <div className="space-y-1">
        <Badge className="bg-rose-50 text-rose-700 border-rose-300">Check water</Badge>
        <p className="max-w-[12rem] text-[11px] text-rose-600">{r.issues.join(', ')}</p>
      </div>
    ) : (
      <Badge className="bg-leaf-50 text-leaf-700 border-leaf-300">Normal</Badge>
    ),
  value: (r) => (r.issues?.length ? 1 : 0),
};

function SafeRanges() {
  return (
    <Card title="Safe Ranges" subtitle="Readings outside these turn red and send you an alert">
      <div className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
        {Object.values(WATER_RANGES).map((r) => (
          <div key={r.label} className="rounded-xl border border-slate-200 p-3">
            <p className="font-semibold text-slate-900">{r.label}</p>
            <p className="text-slate-600">{rangeText(r)}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="font-semibold text-slate-900">Salinity</p>
          {Object.entries(SALINITY_RANGES).map(([type, r]) => (
            <p key={type} className="text-slate-600">{WATER_TYPE_LABEL[type]}: {r.min}–{r.max} ppt</p>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function WaterQuality() {
  return (
    <MonitoringRecordPage
      title="Water Quality"
      description="Temperature, pH, dissolved oxygen, salinity and ammonia readings. Poor water is a top cause of fish deaths."
      api={waterQualityApi}
      fields={fields}
      chartLabel="Water Readings"
      chartSeries={[
        { key: 'temperature', label: 'Temperature (°C)' },
        { key: 'ph', label: 'pH' },
        { key: 'dissolvedOxygen', label: 'Dissolved Oxygen (mg/L)' },
      ]}
      extraColumns={[statusColumn]}
      renderExtra={() => <SafeRanges />}
      emptyIcon="freshwater"
      addLabel="Add Water Reading"
    />
  );
}
