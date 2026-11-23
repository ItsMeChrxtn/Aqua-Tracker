import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { fishpondApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import { STATUS_BADGE_CLASS } from '../../utils/format';
import { Select } from '../../components/ui/FormField';
import { withExistingBarangays } from '../../utils/barangays';

function groupByOwner(fishponds) {
  const byOwner = new Map();
  fishponds.forEach((f) => {
    if (!f.owner) return;
    const key = f.owner._id;
    if (!byOwner.has(key)) {
      byOwner.set(key, { ...f.owner, fishpondCount: 0, approvedCount: 0, fishponds: [] });
    }
    const entry = byOwner.get(key);
    entry.fishpondCount += 1;
    if (f.status === 'approved') entry.approvedCount += 1;
    entry.fishponds.push(f);
  });
  return [...byOwner.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function FishpondOwners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState(null);
  const [deletingId, setDeletingId] = useState('');
  const [barangay, setBarangay] = useState('');
  const barangays = withExistingBarangays(owners.map((o) => o.barangay)).filter((b) => owners.some((o) => o.barangay === b));
  const shownOwners = barangay ? owners.filter((o) => o.barangay === barangay) : owners;

  const load = () =>
    fishpondApi
      .list()
      .then((fishponds) => setOwners(groupByOwner(fishponds)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const selectedOwner = owners.find((o) => o._id === ownerId) || null;

  const deleteFishpond = async (f) => {
    const ok = await confirm(`"${f.name}" of ${selectedOwner?.name || 'this owner'} will be permanently deleted. This cannot be undone.`, {
      title: 'Delete this fishpond?',
    });
    if (!ok) return;
    setDeletingId(f._id);
    try {
      await fishpondApi.remove(f._id);
      toast.success('Fishpond deleted');
      const remaining = (selectedOwner?.fishponds.length || 0) - 1;
      if (remaining <= 0) setOwnerId(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete fishpond'));
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Fishpond Owners</h2>
        <Select value={barangay} onChange={(e) => setBarangay(e.target.value)} className="w-48">
          <option value="">All barangays</option>
          {barangays.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
      </div>
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
                key: 'fishponds',
                header: 'Fishponds',
                value: (o) => o.fishponds.map((f) => f.name).join(' '),
                render: (o) => {
                  const cover = o.fishponds.find((f) => f.imageUrl) || o.fishponds[0];
                  return (
                    <button type="button" onClick={() => setOwnerId(o._id)} className="flex items-center gap-2 text-xs font-medium text-brand-600 hover:underline">
                      <FishpondPhoto src={cover?.imageUrl} alt={cover?.name} className="h-9 w-12 rounded-lg" />
                      View ({o.fishponds.length})
                    </button>
                  );
                },
              },
            ]}
            rows={shownOwners}
            searchable="Search name, email, barangay…"
            emptyMessage="No fishpond owners have registered yet."
          />
        </div>
      </Card>

      <Modal open={!!selectedOwner} onClose={() => setOwnerId(null)} title={`${selectedOwner?.name || ''} — Fishponds`} width="max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectedOwner?.fishponds.map((f) => (
            <figure key={f._id} className="overflow-hidden rounded-xl border border-slate-200">
              <FishpondPhoto src={f.imageUrl} alt={f.name} className="h-44 w-full" />
              <figcaption className="flex items-start justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{f.name}</p>
                  <p className="text-xs text-slate-500">{f.barangay}</p>
                  <Badge className={`mt-1 ${STATUS_BADGE_CLASS[f.status]}`}>{f.status}</Badge>
                </div>
                <Button size="sm" variant="danger" icon="trash" loading={deletingId === f._id} onClick={() => deleteFishpond(f)}>
                  Delete
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      </Modal>
    </div>
  );
}
