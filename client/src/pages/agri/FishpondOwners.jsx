import { useEffect, useState } from 'react';
import { fishpondApi } from '../../api/fishponds';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';

export default function FishpondOwners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fishpondApi.list().then((fishponds) => {
      const byOwner = new Map();
      fishponds.forEach((f) => {
        if (!f.owner) return;
        const key = f.owner._id;
        if (!byOwner.has(key)) {
          byOwner.set(key, { ...f.owner, fishpondCount: 0, approvedCount: 0 });
        }
        const entry = byOwner.get(key);
        entry.fishpondCount += 1;
        if (f.status === 'approved') entry.approvedCount += 1;
      });
      setOwners([...byOwner.values()].sort((a, b) => a.name.localeCompare(b.name)));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Fishpond Owners</h2>
      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'phone', header: 'Phone', render: (o) => o.phone || '—' },
              { key: 'barangay', header: 'Barangay', render: (o) => o.barangay || '—' },
              { key: 'fishpondCount', header: 'Total Fishponds' },
              { key: 'approvedCount', header: 'Approved' },
            ]}
            rows={owners}
            emptyMessage="No fishpond owners have registered yet."
          />
        </div>
      </Card>
    </div>
  );
}
