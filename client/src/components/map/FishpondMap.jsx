import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { NOVELETA_CENTER, TILE_URL, TILE_ATTRIBUTION, BARANGAY_COLOR, colorFor } from './mapConfig';
import { formatArea, formatCapacity } from '../../utils/format';

function FitToPins({ points }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 16);
    else if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 17 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Pins of fishponds that have a location, colored by barangay.
export default function FishpondMap({ fishponds, height = 420, renderPopup }) {
  const pinned = fishponds.filter((f) => f.location?.lat !== undefined && f.location?.lng !== undefined);
  const points = pinned.map((f) => f.location);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
        <MapContainer center={NOVELETA_CENTER} zoom={14} scrollWheelZoom className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <FitToPins points={points} />
          {pinned.map((f) => (
            <CircleMarker
              key={f._id}
              center={[f.location.lat, f.location.lng]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: colorFor(f.barangay), fillOpacity: 0.95 }}
            >
              <Popup>
                {renderPopup ? (
                  renderPopup(f)
                ) : (
                  <div className="space-y-0.5 text-xs">
                    <p className="text-sm font-semibold">{f.name}</p>
                    {f.owner?.name && <p>Owner: {f.owner.name}</p>}
                    <p>{[f.address, f.barangay].filter(Boolean).join(', ')}</p>
                    <p>{formatArea(f.areaSize, 'Area not set')} · {formatCapacity(f.capacity, 'Capacity not set')}</p>
                  </div>
                )}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        {Object.entries(BARANGAY_COLOR).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} /> {name}
          </span>
        ))}
        {pinned.length < fishponds.length && (
          <span className="ml-auto text-slate-500">
            {fishponds.length - pinned.length} of {fishponds.length} fishpond{fishponds.length === 1 ? '' : 's'} not pinned yet
          </span>
        )}
      </div>
    </div>
  );
}
