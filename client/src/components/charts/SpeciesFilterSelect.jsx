import { Select } from '../ui/FormField';

// Lets a monitoring/chart page narrow combined historical + current data down
// to one species (handwritten requirement: filter per species on charts).
export default function SpeciesFilterSelect({ species, value, onChange, includeAll = true }) {
  return (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-48">
      {includeAll && <option value="">All species</option>}
      {species.map((s) => (
        <option key={s._id} value={s._id}>
          {s.name}
        </option>
      ))}
    </Select>
  );
}
