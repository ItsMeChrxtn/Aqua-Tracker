import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { cycleApi, salesApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/FormField';
import LineTrendChart from '../../components/charts/LineTrendChart';
import SpeciesFilterSelect from '../../components/charts/SpeciesFilterSelect';
import { formatDate, formatNumber } from '../../utils/format';

const todayISO = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { date: todayISO(), buyerName: '', quantityKg: '', pricePerKg: '', notes: '' };

export default function SalesRecords() {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();
  const { species } = useSpeciesList();

  const [fishpondId, setFishpondId] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [activeCycles, setActiveCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fishpondId && fishponds.length > 0) setFishpondId(fishponds[0]._id);
  }, [fishponds, fishpondId]);

  const loadRecords = () => {
    if (!fishpondId) return;
    setLoading(true);
    salesApi
      .listForFishpond(fishpondId, speciesFilter ? { speciesId: speciesFilter } : undefined)
      .then((res) => setRecords(res.records))
      .finally(() => setLoading(false));
  };

  useEffect(loadRecords, [fishpondId, speciesFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!fishpondId) return;
    cycleApi.listForFishpond(fishpondId, { status: 'active' }).then((list) => {
      setActiveCycles(list);
      setSelectedCycle(list[0]?._id || '');
    });
  }, [fishpondId]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedCycle) {
      toast.error('This fishpond has no active production cycle yet.');
      return;
    }
    setSaving(true);
    try {
      await salesApi.create(selectedCycle, {
        date: form.date,
        buyerName: form.buyerName,
        quantityKg: Number(form.quantityKg),
        pricePerKg: Number(form.pricePerKg),
        notes: form.notes,
      });
      toast.success('Sale recorded');
      setModalOpen(false);
      loadRecords();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to record sale'));
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (id) => {
    if (!window.confirm('Delete this sales record?')) return;
    await salesApi.remove(id);
    toast.success('Sales record deleted');
    loadRecords();
  };

  if (loadingFishponds) return null;
  if (fishponds.length === 0) {
    return <EmptyState icon="report" title="No approved fishponds yet" message="Register a fishpond and get it approved before recording sales." />;
  }

  const totalRevenue = records.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalQuantity = records.reduce((sum, r) => sum + r.quantityKg, 0);
  const revenueChart = records.map((r) => ({ x: formatDate(r.date), totalAmount: r.totalAmount }));
  const previewTotal = (Number(form.quantityKg) || 0) * (Number(form.pricePerKg) || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sales Records</h2>
          <p className="text-sm text-slate-600">Fish sales transactions and revenue, across past and current batches.</p>
        </div>
        <Button icon="plus" onClick={openModal}>Record Sale</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={fishpondId} onChange={(e) => setFishpondId(e.target.value)} className="w-56">
          {fishponds.map((f) => (
            <option key={f._id} value={f._id}>{f.name}</option>
          ))}
        </Select>
        <SpeciesFilterSelect species={species} value={speciesFilter} onChange={setSpeciesFilter} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Revenue" value={`₱${formatNumber(totalRevenue, 2)}`} icon="harvest" tone="emerald" />
        <StatCard label="Total Quantity Sold" value={`${formatNumber(totalQuantity, 1)} kg`} icon="fish" tone="brand" />
        <StatCard label="Transactions" value={formatNumber(records.length)} icon="report" tone="sky" />
      </div>

      <Card title="Revenue Over Time">
        <LineTrendChart data={revenueChart} series={[{ key: 'totalAmount', label: 'Revenue (₱)' }]} valueFormatter={(v) => `₱${formatNumber(v, 2)}`} />
      </Card>

      <Card title="Sales Transactions" padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'buyerName', header: 'Buyer', render: (r) => r.buyerName || '—' },
              { key: 'quantityKg', header: 'Quantity (kg)', render: (r) => formatNumber(r.quantityKg, 1) },
              { key: 'pricePerKg', header: 'Price/kg', render: (r) => `₱${formatNumber(r.pricePerKg, 2)}` },
              { key: 'totalAmount', header: 'Total Amount', render: (r) => `₱${formatNumber(r.totalAmount, 2)}` },
              { key: 'batch', header: 'Batch', render: (r) => r.cycle?.batchName || '—' },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <button onClick={() => removeRecord(r._id)} className="text-xs font-medium text-rose-500 hover:underline">Delete</button>
                ),
              },
            ]}
            rows={records}
            emptyMessage="No sales recorded yet."
          />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Sale">
        <form onSubmit={submit} className="space-y-4">
          {activeCycles.length > 1 && (
            <Field label="Batch / Cycle" required>
              <Select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
                {activeCycles.map((c) => (
                  <option key={c._id} value={c._id}>{c.batchName || c._id.slice(-6)} — {c.species?.name}</option>
                ))}
              </Select>
            </Field>
          )}
          {activeCycles.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">No active production cycle for this fishpond.</p>
          )}
          <Field label="Date" required>
            <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Buyer Name">
            <Input value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} placeholder="e.g. Local Market Buyer" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity (kg)" required>
              <Input type="number" step="any" min="0" required value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} />
            </Field>
            <Field label="Price per kg (₱)" required>
              <Input type="number" step="any" min="0" required value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} />
            </Field>
          </div>
          <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
            Total: <span className="font-semibold text-slate-900">₱{formatNumber(previewTotal, 2)}</span>
          </p>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={activeCycles.length === 0}>Save Sale</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
