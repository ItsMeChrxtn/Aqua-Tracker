import { useEffect, useState } from 'react';
import toast from '../../utils/notify';
import { fishpondApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Select, Field, Textarea } from '../../components/ui/FormField';
import { formatDate, STATUS_BADGE_CLASS } from '../../utils/format';
import IconButton from '../../components/ui/IconButton';

export default function FishpondsApproval() {
  const [fishponds, setFishponds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => {
    setLoading(true);
    fishpondApi.list(statusFilter ? { status: statusFilter } : undefined).then(setFishponds).finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (id) => {
    setBusyId(id);
    try {
      await fishpondApi.approve(id);
      toast.success('Fishpond approved');
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
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              { key: 'name', header: 'Fishpond' },
              { key: 'owner', header: 'Owner', render: (f) => f.owner?.name },
              { key: 'barangay', header: 'Barangay' },
              { key: 'areaSize', header: 'Area', render: (f) => (f.areaSize ? `${f.areaSize} m²` : '—') },
              { key: 'createdAt', header: 'Registered', render: (f) => formatDate(f.createdAt) },
              { key: 'status', header: 'Status', render: (f) => <Badge className={STATUS_BADGE_CLASS[f.status]}>{f.status}</Badge> },
              {
                key: 'actions',
                header: '',
                render: (f) =>
                  f.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <IconButton icon="check" label="Approve" tone="success" loading={busyId === f._id} onClick={() => approve(f._id)} />
                      <IconButton icon="close" label="Reject" tone="danger" onClick={() => setRejectTarget(f)} />
                    </div>
                  ),
              },
            ]}
            rows={fishponds}
            emptyMessage="No fishponds found."
          />
        </div>
      </Card>

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
