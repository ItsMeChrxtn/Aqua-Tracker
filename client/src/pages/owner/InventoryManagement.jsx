import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { inventoryApi } from '../../api/inventory';
import { apiErrorMessage } from '../../api/client';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { Field, Input, Select, SelectWithOther, Textarea } from '../../components/ui/FormField';
import { formatNumber } from '../../utils/format';
import IconButton from '../../components/ui/IconButton';

const EMPTY_FORM = { name: '', category: 'feed', unit: 'kg', currentStock: '', reorderLevel: '', notes: '' };

const CATEGORY_LABEL = { feed: 'Feed', medicine: 'Medicine', chemical: 'Chemical', other: 'Other' };

const CATEGORY_OPTIONS = ['feed', 'medicine', 'chemical'].map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));
const UNIT_OPTIONS = ['kg', 'sack', 'liter'].map((u) => ({ value: u, label: u }));

export default function InventoryManagement() {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();
  const [fishpondId, setFishpondId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState(null); // { item, type }
  const [adjustQty, setAdjustQty] = useState('');

  useEffect(() => {
    if (!fishpondId && fishponds.length > 0) setFishpondId(fishponds[0]._id);
  }, [fishponds, fishpondId]);

  const load = () => {
    if (!fishpondId) return;
    setLoading(true);
    inventoryApi.listForFishpond(fishpondId).then(setItems).finally(() => setLoading(false));
  };

  useEffect(load, [fishpondId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await inventoryApi.create(fishpondId, {
        ...form,
        currentStock: Number(form.currentStock) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
      });
      toast.success('Inventory item added');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to add item'));
    } finally {
      setSaving(false);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.adjust(adjustTarget.item._id, adjustTarget.type, Number(adjustQty));
      toast.success(adjustTarget.type === 'restock' ? 'Stock added' : 'Stock deducted');
      setAdjustTarget(null);
      setAdjustQty('');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to adjust stock'));
    }
  };

  const removeItem = async (item) => {
    if (!(await confirm(`Delete "${item.name}" from inventory?`))) return;
    await inventoryApi.remove(item._id);
    toast.success('Item deleted');
    load();
  };

  if (loadingFishponds) return null;
  if (fishponds.length === 0) {
    return <EmptyState icon="clipboard" title="No approved fishponds yet" message="Register a fishpond and get it approved to manage its resource inventory." />;
  }

  const lowStockCount = items.filter((i) => i.currentStock <= i.reorderLevel).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Inventory &amp; Resources</h2>
        <p className="text-sm text-slate-600">Tracks feed, medicine, and other pond inputs — flags items at or below their reorder level.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">Fishpond</span>
          <Select value={fishpondId} onChange={(e) => setFishpondId(e.target.value)} className="w-64">
            {fishponds.map((f) => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </Select>
        </label>
        <Button icon="plus" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>Add Item</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Items" value={formatNumber(items.length)} icon="clipboard" tone="brand" />
        <StatCard label="Low Stock Items" value={formatNumber(lowStockCount)} icon="warning" tone={lowStockCount > 0 ? 'rose' : 'emerald'} />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Card padded={false}>
          <div className="p-2">
            <DataTable
              columns={[
                { key: 'name', header: 'Item' },
                { key: 'category', header: 'Category', render: (i) => CATEGORY_LABEL[i.category] || i.category, value: (i) => CATEGORY_LABEL[i.category] || i.category },
                { key: 'currentStock', header: 'Current Stock', render: (i) => `${formatNumber(i.currentStock, 1)} ${i.unit}` },
                { key: 'reorderLevel', header: 'Reorder Level', render: (i) => `${formatNumber(i.reorderLevel, 1)} ${i.unit}` },
                {
                  key: 'status',
                  header: 'Status',
                  value: (i) => (i.currentStock <= i.reorderLevel ? 'Low Stock' : 'OK'),
                  render: (i) =>
                    i.currentStock <= i.reorderLevel ? (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-300">Low Stock</Badge>
                    ) : (
                      <Badge className="bg-leaf-50 text-leaf-700 border-leaf-300">OK</Badge>
                    ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (i) => (
                    <div className="flex gap-1.5">
                      <IconButton icon="restock" label="Restock" tone="success" onClick={() => setAdjustTarget({ item: i, type: 'restock' })} />
                      <IconButton icon="useStock" label="Use" tone="warning" onClick={() => setAdjustTarget({ item: i, type: 'use' })} />
                      <IconButton icon="trash" label="Delete" tone="danger" onClick={() => removeItem(i)} />
                    </div>
                  ),
                },
              ]}
              rows={items}
              searchable="Search items…"
              emptyMessage="No inventory items yet. Add feed, medicine, or other pond inputs to start tracking stock."
            />
          </div>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Add Inventory Item — ${fishponds.find((f) => f._id === fishpondId)?.name || ''}`}>
        <form onSubmit={submitAdd} className="space-y-4">
          <Field label="Item Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tilapia Pellets (Grower)" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <SelectWithOther required options={CATEGORY_OPTIONS} value={form.category} onChange={(category) => setForm({ ...form, category })} otherPlaceholder="Type the category" />
            </Field>
            <Field label="Unit" required>
              <SelectWithOther required options={UNIT_OPTIONS} value={form.unit} onChange={(unit) => setForm({ ...form, unit })} otherPlaceholder="Type the unit" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting Stock">
              <Input type="number" min="0" step="any" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
            </Field>
            <Field label="Reorder Level" hint="Alert when stock falls to this level">
              <Input type="number" min="0" step="any" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Item</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!adjustTarget} onClose={() => setAdjustTarget(null)} title={`${adjustTarget?.type === 'restock' ? 'Restock' : 'Use'} ${adjustTarget?.item?.name || ''}`}>
        <form onSubmit={submitAdjust} className="space-y-4">
          <Field label={`Quantity (${adjustTarget?.item?.unit || ''})`} required>
            <Input type="number" min="0.01" step="any" required value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} autoFocus />
          </Field>
          <p className="text-xs text-slate-400">Current stock: {formatNumber(adjustTarget?.item?.currentStock, 1)} {adjustTarget?.item?.unit}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAdjustTarget(null)}>Cancel</Button>
            <Button type="submit">{adjustTarget?.type === 'restock' ? 'Add Stock' : 'Deduct Stock'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
