import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast, { confirm } from '../../utils/notify';
import { fishpondApi, cycleApi, stockingApi } from '../../api/fishponds';
import { apiErrorMessage, assetUrl } from '../../api/client';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import { Field, Input, Select } from '../../components/ui/FormField';
import BatchDetailsModal from '../../components/monitoring/BatchDetailsModal';
import RecordFormModal from '../../components/monitoring/RecordFormModal';
import { localTodayISO, nextDayISO, harvestMonthsLabel } from '../../utils/dates';
import { formatArea, formatCapacity, formatDate, formatNumber, STATUS_BADGE_CLASS, WATER_TYPE_LABEL } from '../../utils/format';

// The number the server will give the next cycle (Cycle #1, #2, …).
function nextCycleNumber(cycles) {
  return Math.max(cycles.length, ...cycles.map((c) => c.cycleNumber || 0)) + 1;
}

const cycleName = (c) => c?.batchName || (c?.cycleNumber ? `Cycle #${c.cycleNumber}` : '—');

const EMPTY_CYCLE = { speciesId: '', stockingDate: '', expectedHarvestDate: '', initialCount: '' };

const stockingFields = (species) => [
  {
    name: 'species',
    label: 'Species',
    type: 'select',
    required: true,
    placeholder: 'Select species',
    options: species.map((s) => ({ value: s._id, label: `${s.name} (${WATER_TYPE_LABEL[s.waterType]})` })),
  },
  { name: 'date', label: 'Date', type: 'date', required: true, minToday: true, hint: 'Today or a later date' },
  { name: 'quantity', label: 'Quantity (fingerlings)', type: 'number', required: true },
  { name: 'source', label: 'Source / Supplier', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function FishpondDetail() {
  const { id } = useParams();
  const { species } = useSpeciesList();
  const [fishpond, setFishpond] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [stocking, setStocking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_CYCLE);
  const [room, setRoom] = useState(null); // { capacity, current, available }
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingCycle, setViewingCycle] = useState(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [batchFilter, setBatchFilter] = useState('');

  const loadStocking = () => stockingApi.listForFishpond(id).then((res) => setStocking(res.records));

  const load = () => {
    setLoading(true);
    Promise.all([fishpondApi.get(id), cycleApi.listForFishpond(id)])
      .then(([fp, cy]) => {
        setFishpond(fp);
        setCycles(cy);
        if (fp.status === 'approved') loadStocking();
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const runningCycle = cycles.find((c) => c.status === 'active');

  const openCycleModal = () => {
    if (runningCycle) {
      toast.error(`${cycleName(runningCycle)} is still active. Harvest it first before starting a new cycle.`);
      return;
    }
    setForm({ ...EMPTY_CYCLE, stockingDate: localTodayISO() });
    setRoom(null);
    cycleApi.capacity(id).then(setRoom);
    setModalOpen(true);
  };

  const harvestMonths = harvestMonthsLabel(form.stockingDate, form.expectedHarvestDate);

  const submit = async (e) => {
    e.preventDefault();
    if (form.stockingDate < localTodayISO()) {
      toast.error('Stocking date cannot be in the past.');
      return;
    }
    if (!form.expectedHarvestDate || form.expectedHarvestDate <= form.stockingDate) {
      toast.error('Estimated harvest date must be after the stocking date.');
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
      setForm(EMPTY_CYCLE);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to start cycle'));
    } finally {
      setSaving(false);
    }
  };

  const removeStocking = async (record) => {
    if (!(await confirm('Delete this stocking record?'))) return;
    try {
      await stockingApi.remove(record._id);
      toast.success('Stocking record deleted');
      loadStocking();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete record'));
    }
  };

  if (loading) return <Spinner />;
  if (!fishpond) return null;

  const activeCycles = cycles.filter((c) => c.status === 'active');
  const shownStocking = batchFilter ? stocking.filter((r) => r.cycle?._id === batchFilter) : stocking;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{fishpond.name}</h2>
            <Badge className={STATUS_BADGE_CLASS[fishpond.status]}>{fishpond.status}</Badge>
          </div>
          <p className="flex items-center gap-1 text-sm text-slate-600">
            <Icon name="location" className="h-4 w-4" /> {fishpond.address ? `${fishpond.address}, ` : ''}{fishpond.barangay} · {formatArea(fishpond.areaSize, 'Area not set')} · {formatCapacity(fishpond.capacity, 'Capacity not set')}
          </p>
        </div>
        {fishpond.imageUrl && (
          <Button size="sm" variant="secondary" icon="image" onClick={() => setImageViewerOpen(true)}>
            View Photo
          </Button>
        )}
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
        <>
          <Card
            title="Production Cycles"
            action={
              <div className="flex items-center gap-3">
                {runningCycle && <span className="text-xs text-slate-500">Harvest {cycleName(runningCycle)} first to start a new cycle</span>}
                <Button size="sm" icon="plus" onClick={openCycleModal} disabled={Boolean(runningCycle)}>
                  Start New Cycle
                </Button>
              </div>
            }
          >
            <DataTable
              columns={[
                { key: 'batchName', header: 'Cycle', render: cycleName, value: (c) => c.cycleNumber || 0 },
                { key: 'stockingDate', header: 'Stocking Date', render: (c) => formatDate(c.stockingDate) },
                { key: 'expectedHarvestDate', header: 'Est. Harvest', render: (c) => (c.expectedHarvestDate ? formatDate(c.expectedHarvestDate) : '—') },
                { key: 'initialCount', header: 'Initial Count', render: (c) => formatNumber(c.initialCount) },
                { key: 'status', header: 'Status', render: (c) => <Badge className={STATUS_BADGE_CLASS[c.status]}>{c.status}</Badge> },
                {
                  key: 'actions',
                  header: '',
                  render: (c) => (
                    <div className="flex items-center justify-end gap-3">
                      {c.status === 'active' && (
                        <Link to="/owner/harvest-estimation" className="text-xs font-medium text-brand-600 hover:underline">
                          View harvest estimate →
                        </Link>
                      )}
                      <IconButton icon="eye" label="View batch details" tone="brand" onClick={() => setViewingCycle(c)} />
                    </div>
                  ),
                },
              ]}
              rows={cycles}
              emptyMessage="No production cycles yet. Start one to begin monitoring."
            />
          </Card>

          <Card
            title="Stocking Records"
            action={
              <div className="flex items-center gap-2">
                <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="w-44">
                  <option value="">All cycles</option>
                  {cycles.map((c) => (
                    <option key={c._id} value={c._id}>
                      {cycleName(c)}
                    </option>
                  ))}
                </Select>
                <Button size="sm" icon="plus" onClick={() => setStockModalOpen(true)} disabled={activeCycles.length === 0}>
                  Add Stock
                </Button>
              </div>
            }
          >
            <DataTable
              columns={[
                { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
                {
                  key: 'batch',
                  header: 'Batch',
                  render: (r) => (
                    <div>
                      <p>{r.batchNumber ? `Batch ${r.batchNumber}` : '—'}</p>
                      {r.cycle && <p className="text-[11px] text-slate-500">{cycleName(r.cycle)}</p>}
                    </div>
                  ),
                  value: (r) => `${cycleName(r.cycle)} ${String(r.batchNumber || 0).padStart(4, '0')}`,
                },
                {
                  key: 'species',
                  header: 'Species',
                  render: (r) => {
                    const s = r.species || r.cycle?.species;
                    return s ? `${s.name} (${WATER_TYPE_LABEL[s.waterType]})` : '—';
                  },
                  value: (r) => (r.species || r.cycle?.species)?.name,
                },
                { key: 'quantity', header: 'Fingerlings', render: (r) => (r.quantity ? formatNumber(r.quantity) : '—') },
                { key: 'source', header: 'Source / Supplier', render: (r) => r.source || '—' },
                { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
                {
                  key: 'actions',
                  header: '',
                  render: (r) =>
                    r.isInitial ? null : <IconButton icon="trash" label="Delete record" tone="danger" onClick={() => removeStocking(r)} />,
                },
              ]}
              rows={[...shownStocking].reverse()}
              pageSize={5}
              searchable={shownStocking.length > 5 ? 'Search supplier, notes…' : false}
              emptyMessage={activeCycles.length === 0 ? 'Start a production cycle first, then add stock to it.' : 'No stocking records yet.'}
            />
          </Card>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Start New Production Cycle">
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            This will be <span className="font-semibold">Cycle #{nextCycleNumber(cycles)}</span> of {fishpond.name}. Its starting stock is saved as Batch 1 in the
            Stocking Records.
          </p>
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
          <Field label="Stocking Date" required hint="Today or a later date">
            <Input
              type="date"
              required
              min={localTodayISO()}
              value={form.stockingDate}
              onChange={(e) => setForm({ ...form, stockingDate: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimated Harvest Date" required>
              <Input
                type="date"
                required
                min={nextDayISO(form.stockingDate || localTodayISO())}
                value={form.expectedHarvestDate}
                onChange={(e) => setForm({ ...form, expectedHarvestDate: e.target.value })}
              />
            </Field>
            <Field label="Harvest Month" hint="Counted automatically from the dates">
              <Input readOnly value={harvestMonths} placeholder="—" />
            </Field>
          </div>
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
            <Button type="submit" loading={saving} disabled={room?.available === 0}>
              Start Cycle
            </Button>
          </div>
        </form>
      </Modal>

      <RecordFormModal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title={`Add Stock — ${fishpond.name}`}
        api={stockingApi}
        fields={stockingFields(species)}
        showCyclePicker={activeCycles.length > 1}
        fishpondId={id}
        activeCycles={activeCycles}
        onSaved={loadStocking}
      />

      <BatchDetailsModal cycle={viewingCycle} fishpond={fishpond} onClose={() => setViewingCycle(null)} />

      <Modal open={imageViewerOpen} onClose={() => setImageViewerOpen(false)} title="Fishpond Photo">
        {fishpond.imageUrl && (
          <div className="flex justify-center">
            <img src={assetUrl(fishpond.imageUrl)} alt={fishpond.name} className="max-h-96 max-w-full rounded-lg" />
          </div>
        )}
      </Modal>
    </div>
  );
}
