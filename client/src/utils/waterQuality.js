// Safe ranges for pond water. Keep in sync with server/src/utils/waterQuality.js.
export const WATER_RANGES = {
  temperature: { label: 'Temperature', unit: '°C', min: 25, max: 32 },
  ph: { label: 'pH', unit: '', min: 6.5, max: 8.5 },
  dissolvedOxygen: { label: 'Dissolved Oxygen', unit: 'mg/L', min: 4 },
  ammonia: { label: 'Ammonia', unit: 'mg/L', max: 0.5 },
};

export const SALINITY_RANGES = {
  freshwater: { min: 0, max: 5 },
  brackish: { min: 5, max: 30 },
  saltwater: { min: 28, max: 40 },
};

export function rangeText(r) {
  const unit = r.unit ? ` ${r.unit}` : '';
  if (r.min !== undefined && r.max !== undefined) return `${r.min}–${r.max}${unit}`;
  if (r.min !== undefined) return `${r.min}${unit} or more`;
  return `${r.max}${unit} or less`;
}

export function rangeFor(key, waterType) {
  if (key === 'salinity') {
    const s = SALINITY_RANGES[waterType];
    return s ? { label: 'Salinity', unit: 'ppt', ...s } : null;
  }
  return WATER_RANGES[key];
}

export function isOutOfRange(key, value, waterType) {
  const r = rangeFor(key, waterType);
  if (!r || value === undefined || value === null || value === '') return false;
  return (r.min !== undefined && value < r.min) || (r.max !== undefined && value > r.max);
}
