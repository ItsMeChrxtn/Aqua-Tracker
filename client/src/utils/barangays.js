// The 16 barangays of Noveleta, Cavite (source: PhilAtlas / PSA PSGC).
export const NOVELETA_BARANGAYS = [
  'Magdiwang',
  'Poblacion',
  'Salcedo I',
  'Salcedo II',
  'San Antonio I',
  'San Antonio II',
  'San Jose I',
  'San Jose II',
  'San Juan I',
  'San Juan II',
  'San Rafael I',
  'San Rafael II',
  'San Rafael III',
  'San Rafael IV',
  'Santa Rosa I',
  'Santa Rosa II',
];

// Official list first, then any other values already stored in the data
// (older free-text entries), so filters still reach every record.
export function withExistingBarangays(values) {
  const extras = [...new Set(values.filter((v) => v && !NOVELETA_BARANGAYS.includes(v)))].sort();
  return [...NOVELETA_BARANGAYS, ...extras];
}
