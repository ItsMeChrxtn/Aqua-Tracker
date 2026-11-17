// Form fields shared by the record pages and Survival Monitoring's quick-add
// buttons.

export const MORTALITY_CAUSES = [
  'Pond Overflow Due to Heavy Rainfall',
  'Extreme Heat',
  'Poor Water Quality',
  'Overfeeding',
  'Overstocking',
  'Unknown Cause',
];

export const MORTALITY_FIELDS = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'quantity', label: 'Quantity (fish lost)', type: 'number', required: true, unit: 'pcs' },
  {
    name: 'cause',
    label: 'Cause of Death',
    type: 'select',
    required: true,
    placeholder: 'Select the cause',
    options: MORTALITY_CAUSES.map((c) => ({ value: c, label: c })),
  },
  { name: 'notes', label: 'Additional Notes', type: 'textarea' },
];

export const GROWTH_FIELDS = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'sampleSize', label: 'Sample Size', type: 'number', required: true, unit: 'fish' },
  { name: 'averageWeight', label: 'Average Weight', type: 'number', required: true, unit: 'g' },
  { name: 'averageLength', label: 'Average Length', type: 'number', unit: 'cm' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];
