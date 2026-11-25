// Safe ranges for pond water. General guide values for tilapia and bangus
// culture (BFAR / FAO extension material); salinity depends on the species'
// water type. Keep in sync with client/src/utils/waterQuality.js.
const RANGES = {
  temperature: { label: 'Temperature', unit: '°C', min: 25, max: 32 },
  ph: { label: 'pH', unit: '', min: 6.5, max: 8.5 },
  dissolvedOxygen: { label: 'Dissolved oxygen', unit: 'mg/L', min: 4 },
  ammonia: { label: 'Ammonia', unit: 'mg/L', max: 0.5 },
};

const SALINITY = {
  freshwater: { min: 0, max: 5 },
  brackish: { min: 5, max: 30 },
  saltwater: { min: 28, max: 40 },
};

function rangesFor(waterType) {
  const salinity = SALINITY[waterType];
  return salinity ? { ...RANGES, salinity: { label: 'Salinity', unit: 'ppt', ...salinity } } : RANGES;
}

// Lists the readings outside their safe range.
function waterQualityIssues(reading, waterType) {
  const issues = [];
  Object.entries(rangesFor(waterType)).forEach(([key, r]) => {
    const value = reading[key];
    if (value === undefined || value === null || value === '') return;
    const shown = `${value}${r.unit ? ` ${r.unit}` : ''}`;
    if (r.min !== undefined && value < r.min) issues.push(`Low ${r.label.toLowerCase()} (${shown})`);
    else if (r.max !== undefined && value > r.max) issues.push(`High ${r.label.toLowerCase()} (${shown})`);
  });
  return issues;
}

module.exports = { RANGES, SALINITY, rangesFor, waterQualityIssues };
