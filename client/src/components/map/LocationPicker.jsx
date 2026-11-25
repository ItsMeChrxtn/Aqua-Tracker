import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Button from '../ui/Button';
import { NOVELETA_CENTER, TILE_URL, TILE_ATTRIBUTION } from './mapConfig';
import { geocodeAddress } from './geocode';

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom || 17, { duration: 0.6 });
  }, [map, target]);
  return null;
}

const STATUS = {
  address: { text: 'Pinned from the address. Click the map if the exact spot is different.', tone: 'text-leaf-700' },
  barangay: { text: 'Exact address not found on the map, so the pin is at the barangay center. Click the fishpond’s exact spot.', tone: 'text-amber-700' },
  town: { text: 'Only the town was found. Click the fishpond’s exact spot on the map.', tone: 'text-amber-700' },
  manual: { text: 'Pin placed on the map.', tone: 'text-slate-600' },
  gps: { text: 'Pinned at your current location.', tone: 'text-leaf-700' },
};

/**
 * Map pin for a fishpond. `value` = { lat, lng } or null.
 * Pass `address` and `barangay` to pin automatically from the typed address:
 * the pin is found whenever `locateKey` changes (e.g. after the address field
 * loses focus), unless the owner has already placed the pin by hand.
 */
export default function LocationPicker({ value, onChange, height = 280, address, barangay, locateKey }) {
  const [flyTarget, setFlyTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(value ? 'manual' : null);
  const placedByHand = useRef(false);
  const canLookup = Boolean((address && address.trim()) || barangay);

  const findFromAddress = async ({ force = false } = {}) => {
    if (!canLookup || (placedByHand.current && !force)) return;
    setBusy(true);
    try {
      const hit = await geocodeAddress({ address, barangay });
      if (!hit) return;
      placedByHand.current = false;
      onChange({ lat: hit.lat, lng: hit.lng });
      setStatus(hit.precision);
      setFlyTarget({ lat: hit.lat, lng: hit.lng, zoom: hit.precision === 'address' ? 17 : hit.precision === 'barangay' ? 16 : 14 });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (locateKey) findFromAddress();
  }, [locateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeByHand = (point) => {
    placedByHand.current = true;
    setStatus('manual');
    onChange(point);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        placedByHand.current = true;
        onChange(point);
        setStatus('gps');
        setFlyTarget(point);
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const shown = value ? STATUS[status] || STATUS.manual : null;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
        <MapContainer center={value ? [value.lat, value.lng] : NOVELETA_CENTER} zoom={value ? 17 : 14} scrollWheelZoom className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <ClickToPlace onPick={placeByHand} />
          <FlyTo target={flyTarget} />
          {value && <CircleMarker center={[value.lat, value.lng]} radius={10} pathOptions={{ color: '#1c6e6e', fillColor: '#2a9d8f', fillOpacity: 0.85, weight: 3 }} />}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={busy ? 'text-slate-500' : shown ? shown.tone : 'text-slate-500'}>
          {busy
            ? 'Finding the address on the map…'
            : shown
              ? `${shown.text} (${value.lat.toFixed(5)}, ${value.lng.toFixed(5)})`
              : canLookup
                ? 'Click “Find from address” or click the fishpond’s spot on the map.'
                : 'Type the address above and the pin will be placed automatically.'}
        </span>
        <div className="flex flex-wrap gap-2">
          {canLookup && (
            <Button type="button" size="sm" variant="secondary" icon="search" loading={busy} onClick={() => findFromAddress({ force: true })}>
              Find from address
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" icon="location" onClick={useMyLocation} disabled={busy}>
            Use my location
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                placedByHand.current = false;
                setStatus(null);
                onChange(null);
              }}
            >
              Remove pin
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
