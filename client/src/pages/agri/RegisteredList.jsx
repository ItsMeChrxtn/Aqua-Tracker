import { useEffect, useMemo, useState } from 'react';
import { fishpondApi } from '../../api/fishponds';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import { Select } from '../../components/ui/FormField';
import { formatArea, formatCapacity, formatDate } from '../../utils/format';
import { FISHPOND_BARANGAYS } from '../../utils/barangays';
import FishpondMap from '../../components/map/FishpondMap';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Registry of approved fishponds, groupable by barangay — a tabular stand-in
// for a GIS map (real map integration is out of scope for this system).
export default function RegisteredList() {
  const [fishponds, setFishponds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barangay, setBarangay] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [order, setOrder] = useState('newest');
  const [view, setView] = useState('table'); // table | map

  useEffect(() => {
    fishpondApi.list({ status: 'approved' }).then(setFishponds).finally(() => setLoading(false));
  }, []);

  const years = useMemo(
    () => [...new Set(fishponds.filter((f) => f.approvedAt).map((f) => new Date(f.approvedAt).getFullYear()))].sort((a, b) => b - a),
    [fishponds]
  );

  const filtered = fishponds
    .filter((f) => {
      const approved = new Date(f.approvedAt);
      return (
        (!barangay || f.barangay === barangay) &&
        (!year || approved.getFullYear() === Number(year)) &&
        (month === '' || approved.getMonth() === Number(month)) &&
        (!day || approved.getDate() === Number(day))
      );
    })
    .sort((a, b) => {
      const oldestFirst = new Date(a.approvedAt) - new Date(b.approvedAt);
      return order === 'oldest' ? oldestFirst : -oldestFirst;
    });

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Registered Fishponds</h2>
        <div className="flex flex-wrap items-center gap-2 [&>select]:w-auto">
          <Select value={barangay} onChange={(e) => setBarangay(e.target.value)} aria-label="Barangay">
            <option value="">All barangays</option>
            {FISHPOND_BARANGAYS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
          <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year approved">
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month approved">
            <option value="">All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </Select>
          <Select value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day approved">
            <option value="">All days</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
          <Select value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Sort by approval date">
            <option value="newest">Newest approved first</option>
            <option value="oldest">Oldest approved first</option>
          </Select>
          <div className="flex overflow-hidden rounded-xl border border-slate-200" role="group" aria-label="View">
            {[
              ['table', 'Table', 'list'],
              ['map', 'Map', 'location'],
            ].map(([value, label, icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${view === value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon name={icon} className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'map' && (
        <Card title="Fishpond Map" subtitle="Approved fishponds pinned by their owners, colored by barangay">
          <FishpondMap fishponds={filtered} height={520} />
        </Card>
      )}

      <Card padded={false} className={view === 'map' ? 'hidden' : ''}>
        <div className="p-2">
          <DataTable
            columns={[
              { key: 'name', header: 'Fishpond' },
              { key: 'owner', header: 'Owner', render: (f) => f.owner?.name, value: (f) => f.owner?.name },
              { key: 'barangay', header: 'Barangay' },
              { key: 'address', header: 'Address', render: (f) => f.address || '—' },
              { key: 'areaSize', header: 'Area', render: (f) => formatArea(f.areaSize) },
              { key: 'capacity', header: 'Capacity', render: (f) => formatCapacity(f.capacity) },
              { key: 'approvedAt', header: 'Approved On', render: (f) => formatDate(f.approvedAt) },
              { key: 'approvedBy', header: 'Approved By', render: (f) => f.approvedBy?.name || '—', value: (f) => f.approvedBy?.name },
            ]}
            rows={filtered}
            searchable="Search fishpond, owner, barangay…"
            emptyMessage="No approved fishponds match these filters."
          />
        </div>
      </Card>
    </div>
  );
}
