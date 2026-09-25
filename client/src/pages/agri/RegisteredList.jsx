import { useEffect, useMemo, useState } from 'react';
import { fishpondApi } from '../../api/fishponds';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import { Select } from '../../components/ui/FormField';
import { formatDate } from '../../utils/format';

// Registry of approved fishponds, groupable by barangay — a tabular stand-in
// for a GIS map (real map integration is out of scope for this system).
export default function RegisteredList() {
  const [fishponds, setFishponds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barangay, setBarangay] = useState('');

  useEffect(() => {
    fishpondApi.list({ status: 'approved' }).then(setFishponds).finally(() => setLoading(false));
  }, []);

  const barangays = useMemo(() => [...new Set(fishponds.map((f) => f.barangay))].sort(), [fishponds]);
  const filtered = barangay ? fishponds.filter((f) => f.barangay === barangay) : fishponds;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Registered Fishponds</h2>
        <Select value={barangay} onChange={(e) => setBarangay(e.target.value)} className="w-52">
          <option value="">All barangays</option>
          {barangays.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            columns={[
              { key: 'name', header: 'Fishpond' },
              { key: 'owner', header: 'Owner', render: (f) => f.owner?.name },
              { key: 'barangay', header: 'Barangay' },
              { key: 'areaSize', header: 'Area', render: (f) => (f.areaSize ? `${f.areaSize} m²` : '—') },
              { key: 'approvedAt', header: 'Approved On', render: (f) => formatDate(f.approvedAt) },
              { key: 'approvedBy', header: 'Approved By', render: (f) => f.approvedBy?.name || '—' },
            ]}
            rows={filtered}
            emptyMessage="No approved fishponds yet."
          />
        </div>
      </Card>
    </div>
  );
}
