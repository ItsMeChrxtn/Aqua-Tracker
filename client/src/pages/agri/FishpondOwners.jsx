import { useEffect, useState } from 'react';
import { fishpondApi } from '../../api/fishponds';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import FishpondPhoto from '../../components/ui/FishpondPhoto';

export default function FishpondOwners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoOwner, setPhotoOwner] = useState(null);

  useEffect(() => {
    fishpondApi.list().then((fishponds) => {
      const byOwner = new Map();
      fishponds.forEach((f) => {
        if (!f.owner) return;
        const key = f.owner._id;
        if (!byOwner.has(key)) {
          byOwner.set(key, { ...f.owner, fishpondCount: 0, approvedCount: 0, photos: [] });
        }
        const entry = byOwner.get(key);
        entry.fishpondCount += 1;
        if (f.status === 'approved') entry.approvedCount += 1;
        if (f.imageUrl) entry.photos.push(f);
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
              {
                key: 'photos',
                header: 'Photos',
                render: (o) =>
                  o.photos.length > 0 ? (
                    <button type="button" onClick={() => setPhotoOwner(o)} className="flex items-center gap-2 text-xs font-medium text-brand-600 hover:underline">
                      <FishpondPhoto src={o.photos[0].imageUrl} alt={o.photos[0].name} className="h-9 w-12 rounded-lg" />
                      View ({o.photos.length})
                    </button>
                  ) : (
                    '—'
                  ),
              },
            ]}
            rows={owners}
            searchable="Search name, email, barangay…"
            emptyMessage="No fishpond owners have registered yet."
          />
        </div>
      </Card>

      <Modal open={!!photoOwner} onClose={() => setPhotoOwner(null)} title={`${photoOwner?.name || ''} — Fishpond Photos`} width="max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {photoOwner?.photos.map((f) => (
            <figure key={f._id} className="overflow-hidden rounded-xl border border-slate-200">
              <FishpondPhoto src={f.imageUrl} alt={f.name} className="h-44 w-full" />
              <figcaption className="px-3 py-2 text-sm">
                <p className="font-semibold text-slate-900">{f.name}</p>
                <p className="text-xs text-slate-500">{f.barangay}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </Modal>
    </div>
  );
}
