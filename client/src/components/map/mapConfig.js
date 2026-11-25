// Map defaults: OpenStreetMap tiles centered on Noveleta, Cavite.
export const NOVELETA_CENTER = [14.4295, 120.8806];
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// One color per fishpond barangay so the map reads at a glance.
export const BARANGAY_COLOR = {
  'San Juan II': '#2563eb',
  'San Rafael III': '#16a34a',
  'San Rafael IV': '#d97706',
};
export const colorFor = (barangay) => BARANGAY_COLOR[barangay] || '#64748b';
