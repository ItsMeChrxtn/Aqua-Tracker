import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from '../../utils/notify';
import { fishpondApi, cycleApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import { Field, Input, Select } from '../../components/ui/FormField';
import { formatArea, formatCapacity, formatDate, formatNumber, STATUS_BADGE_CLASS, WATER_TYPE_LABEL } from '../../utils/format';

const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Suggests the next unused "Batch N" for this fishpond.
function nextBatchName(cycles) {
  let n = cycles.length + 1;
  while (cycles.some((c) => sameName(c.batchName, `Batch ${n}`) || sameName(c.batchName, String(n)))) n += 1;
  return `Batch ${n}`;
}

export default function FishpondDetail() {
  const { id } = useParams();
  const { species } = useSpeciesList();
  const [fishpond, setFishpond] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ speciesId: '', batchName: '', stockingDate: '', initialCount: '' });
  const [room, setRoom] = useState(null); // { capacity, current, available }

  const load = () => {
    setLoading(true);
    Promise.all([fishpondApi.get(id), cycleApi.listForFishpond(id)])
      .then(([fp, cy]) => {
        setFishpond(fp);
        setCycles(cy);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCycleModal = () => {
    setForm({ speciesId: '', batchName: nextBatchName(cycles), stockingDate: new Date().toISOString().slice(0, 10), initialCount: '' });
    setRoom(null);
    cycleApi.capacity(id).then(setRoom);
    setModalOpen(true);
  };

  const duplicateBatch = form.batchName.trim() && cycles.some((c) => sameName(c.batchName, form.batchName));

  const submit = async (e) => {
    e.preventDefault();
    if (duplicateBatch) {
      toast.error(`"${form.batchName.trim()}" already exists in this fishpond. Use a different batch name.`);
      return;
    }
    if (room?.capacity && Number(form.initialCount) > room.available) {
      toast.error(`This fishpond can only take ${formatNumber(room.available)} more fish (capacity ${formatNumber(room.capacity)}).`);
      return;
    }
    setSaving(true);
    try {
      await cycleApi.create(id, { ...form, initialCount: Number(form.initialCount) });
      toast.success('Production cycle started');
      setModalOpen(false);
      setForm({ speciesId: '', batchName: '', stockingDate: '', initialCount: '' });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to start cycle'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (!fishpond) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{fishpond.name}</h2>
          <p className="flex items-center gap-1 text-sm text-slate-600">
            <Icon name="location" className="h-4 w-4" /> {fishpond.address ? `${fishpond.address}, ` : ''}{fishpond.barangay} · {formatArea(fishpond.areaSize, 'Area not set')} · {formatCapacity(fishpond.capacity, 'Capacity not set')}
          </p>
        </div>
        <Badge className={STATUS_BADGE_CLASS[fishpond.status]}>{fishpond.status}</Badge>
      </div>

      {fishpond.status !== 'approved' && (
        <Card>
          <p className="text-sm text-slate-600">
            {fishpond.status === 'pending'
              ? 'This fishpond is awaiting approval from the Agriculture Office before you can start a production cycle.'
              : `This fishpond registration was rejected.${fishpond.rejectionReason ? ` Reason: ${fishpond.rejectionReason}` : ''}`}
          </p>
        </Card>
      )}

      {fishpond.status === 'approved' && (
        <Card
          title="Production Cycles (Batches)"
          action={
            <Button size="sm" icon="plus" onClick={openCycleModal}>
              Start New Cycle
            </Button>
          }
        >
          <DataTable
            columns={[
              { key: 'batchName', header: 'Batch', render: (c) => c.batchName || '—' },
              { key: 'species', header: 'Species', render: (c) => `${c.species?.name} (${WATER_TYPE_LABEL[c.species?.waterType]})` },
              { key: 'stockingDate', header: 'Stocking Date', render: (c) => formatDate(c.stockingDate) },
              { key: 'initialCount', header: 'Initial Count' },
              { key: 'status', header: 'Status', render: (c) => <Badge className={STATUS_BADGE_CLASS[c.status]}>{c.status}</Badge> },
              {
                key: 'actions',
                header: '',
                render: (c) =>
                  c.status === 'active' && (
                    <Link to="/owner/harvest-estimation" className="text-xs font-medium text-brand-600 hover:underline">
                      View harvest estimate →
                    </Link>
                  ),
              },
            ]}
            rows={cycles}
            emptyMessage="No production cycles yet. Start one to begin monitoring."
          />
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Start New Production Cycle">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Species" required>
            <Select required value={form.speciesId} onChange={(e) => setForm({ ...form, speciesId: e.target.value })}>
              <option value="">Select species</option>
              {species.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({WATER_TYPE_LABEL[s.waterType]})
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Batch Name"
            required
            error={duplicateBatch ? 'This batch name is already used in this fishpond.' : undefined}
            hint="Each batch in a fishpond needs its own name"
          >
            <Input required value={form.batchName} onChange={(e) => setForm({ ...form, batchName: e.target.value })} />
          </Field>
          <Field label="Stocking Date" required>
            <Input type="date" required value={form.stockingDate} onChange={(e) => setForm({ ...form, stockingDate: e.target.value })} />
          </Field>
          <Field
            label="Initial Count (fingerlings)"
            required
            hint={
              room?.capacity
                ? `Up to ${formatNumber(room.available)} more fish — capacity ${formatNumber(room.capacity)}, ${formatNumber(room.current)} already in the pond`
                : undefined
            }
          >
            <Input
              type="number"
              min="1"
              max={room?.capacity ? room.available : undefined}
              step="1"
              required
              value={form.initialCount}
              onChange={(e) => setForm({ ...form, initialCount: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={Boolean(duplicateBatch) || room?.available === 0}>
              Start Cycle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
