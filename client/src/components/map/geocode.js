// Turns a typed address into a map point with OpenStreetMap's Nominatim
// service. Searches stay inside Noveleta; if the exact address is not found,
// the barangay's center is used so the owner only has to fine-tune the pin.
// Nominatim allows about one request per second and no search-as-you-type,
// so this runs once per finished address (on blur / barangay change).
import { NOVELETA_CENTER } from './mapConfig';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const VIEWBOX = '120.84,14.47,120.93,14.40'; // left, top, right, bottom around Noveleta
const TOWN = 'Noveleta, Cavite, Philippines';

// Barangay centers (from OpenStreetMap) for when the service cannot be reached.
const BARANGAY_CENTER = {
  'San Juan II': { lat: 14.43747, lng: 120.88537 },
  'San Rafael III': { lat: 14.43487, lng: 120.87808 },
  'San Rafael IV': { lat: 14.44901, lng: 120.87997 },
};

const cache = new Map();
let lastRequest = 0;

async function search(query) {
  if (cache.has(query)) return cache.get(query);
  const wait = lastRequest + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const url = `${ENDPOINT}?format=jsonv2&limit=1&countrycodes=ph&bounded=1&viewbox=${VIEWBOX}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const [hit] = await res.json();
  const point = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  cache.set(query, point);
  return point;
}

// Returns { lat, lng, precision: 'address' | 'barangay' | 'town' } or null.
export async function geocodeAddress({ address, barangay }) {
  const street = String(address || '').trim();
  try {
    if (street) {
      // Street + barangay first; OpenStreetMap often files streets under the
      // town only, so then try the street within Noveleta.
      const hit = (barangay && (await search(`${street}, ${barangay}, ${TOWN}`))) || (await search(`${street}, ${TOWN}`));
      if (hit) return { ...hit, precision: 'address' };
    }
    if (barangay) {
      const hit = await search(`${barangay}, ${TOWN}`);
      if (hit) return { ...hit, precision: 'barangay' };
    }
  } catch {
    // Offline or service busy: fall back to the known barangay center below.
  }
  if (barangay && BARANGAY_CENTER[barangay]) return { ...BARANGAY_CENTER[barangay], precision: 'barangay' };
  if (barangay || street) return { lat: NOVELETA_CENTER[0], lng: NOVELETA_CENTER[1], precision: 'town' };
  return null;
}
