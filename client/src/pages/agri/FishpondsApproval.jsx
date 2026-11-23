import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { fishpondApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Select, Field, Textarea } from '../../components/ui/FormField';
import { formatArea, formatCapacity, formatDate, STATUS_BADGE_CLASS } from '../../utils/format';
import IconButton from '../../components/ui/IconButton';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import FishpondRegistrationModal from '../../components/fishpond/FishpondRegistrationModal';
import { FISHPOND_BARANGAYS } from '../../utils/barangays';

export default function FishpondsApproval() {
  const [fishponds, setFishponds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState('');
  const [viewing, setViewing] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (barangayFilter) params.barangay = barangayFilter;
    fishpondApi.list(params).then(setFishponds).finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter, barangayFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (fishpond) => {
    const ok = await confirm(`"${fishpond.name}" by ${fishpond.owner?.name || 'this owner'} will be approved so the owner can start monitoring.`, {
      title: 'Approve this fishpond?',
      danger: false,
    });
    if (!ok) return;
    const id = fishpond._id;
    setBusyId(id);
    try {
      await fishpondApi.approve(id);
      toast.success('Fishpond approved');
      setViewing(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to approve'));
    } finally {
      setBusyId('');
    }
  };

  const submitReject = async (e) => {
    e.preventDefault();
    setBusyId(rejectTarget._id);
    try {
      await fishpondApi.reject(rejectTarget._id, reason);
      toast.success('Fishpond registration rejected');
      setRejectTarget(null);
      setViewing(null);
      setReason('');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reject'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Fishponds</h2>
        <div className="flex flex-wrap items-center gap-3">
        <Select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)} className="w-48">
          <option value="">All barangays</option>
          {FISHPOND_BARANGAYS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        </div>
      </div>

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              {
                key: 'photo',
                header: 'Photo',
                render: (f) => (
                  <button type="button" onClick={() => setViewing(f)} title="View registration details" className="block overflow-hidden rounded-lg transition hover:opacity-80">
                    <FishpondPhoto src={f.imageUrl} alt={f.name} className="h-10 w-14 rounded-lg" />
                  </button>
                ),
              },
              {
                key: 'name',
                header: 'Fishpond',
                render: (f) => (
                  <button type="button" onClick={() => setViewing(f)} className="text-left font-medium text-slate-900 hover:text-brand-600 hover:underline">
                    {f.name}
                  </button>
                ),
                value: (f) => f.name,
              },
              { key: 'owner', header: 'Owner', render: (f) => f.owner?.name, value: (f) => f.owner?.name },
              { key: 'barangay', header: 'Barangay' },
              { key: 'address', header: 'Address', render: (f) => f.address || '—' },
              { key: 'areaSize', header: 'Area', render: (f) => formatArea(f.areaSize) },
              { key: 'capacity', header: 'Capacity', render: (f) => formatCapacity(f.capacity) },
              { key: 'createdAt', header: 'Registered', render: (f) => formatDate(f.createdAt) },
              { key: 'documents', header: 'MOA', render: (f) => (f.moaUrl ? <span className="text-xs font-medium text-emerald-700">Submitted</span> : <span className="text-xs text-slate-400">—</span>), value: (f) => (f.moaUrl ? 'Submitted' : '') },
              { key: 'status', header: 'Status', render: (f) => <Badge className={STATUS_BADGE_CLASS[f.status]}>{f.status}</Badge> },
              {
                key: 'actions',
                header: '',
                render: (f) => (
                    <div className="flex gap-1.5">
                      <IconButton icon="eye" label="View registration details" tone="brand" onClick={() => setViewing(f)} />
                      {f.status === 'pending' && (
                        <>
                          <IconButton icon="check" label="Approve" tone="success" loading={busyId === f._id} onClick={() => approve(f)} />
                          <IconButton icon="close" label="Reject" tone="danger" onClick={() => setRejectTarget(f)} />
                        </>
                      )}
                    </div>
                  ),
              },
            ]}
            rows={[...fishponds].sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))}
            searchable="Search fishpond, owner, barangay…"
            emptyMessage="No fishponds found."
          />
        </div>
      </Card>

      <FishpondRegistrationModal
        fishpond={viewing}
        onClose={() => setViewing(null)}
        onApprove={approve}
        onReject={(f) => setRejectTarget(f)}
        busy={busyId === viewing?._id}
      />

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Reject "${rejectTarget?.name}"`}>
        <form onSubmit={submitReject} className="space-y-4">
          <Field label="Reason" hint="Shown to the fishpond owner">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Incomplete barangay information" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busyId === rejectTarget?._id}>Reject Registration</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
