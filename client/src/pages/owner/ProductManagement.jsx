import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast, { confirm } from '../../utils/notify';
import { productApi } from '../../api/marketplace';
import { cycleApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import { Field, Input, Select, Textarea } from '../../components/ui/FormField';
import { WATER_TYPE_LABEL } from '../../utils/format';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL, peso, kilos } from '../../utils/marketplace';

const EMPTY_FORM = {
  fishpondId: '',
  cycleId: '',
  speciesId: '',
  productType: 'fresh',
  name: '',
  description: '',
  pricePerKg: '',
  availableKg: '',
  minOrderKg: '1',
  status: 'available',
};

const cycleName = (c) => c.batchName || (c.cycleNumber ? `Cycle #${c.cycleNumber}` : 'Cycle');

export default function ProductManagement() {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();
  const { species } = useSpeciesList();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, product = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [cycles, setCycles] = useState([]);
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    productApi
      .list()
      .then(setProducts)
      .catch((err) => toast.error(apiErrorMessage(err, 'Failed to load products')))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Cycles of the chosen fishpond; the newest one is picked for a new product.
  useEffect(() => {
    if (!editing || !form.fishpondId) return setCycles([]);
    cycleApi.listForFishpond(form.fishpondId).then((list) => {
      setCycles(list);
      setForm((f) => {
        if (f.cycleId && list.some((c) => c._id === f.cycleId)) return f;
        const pick = list[0];
        return { ...f, cycleId: pick?._id || '', speciesId: f.speciesId || pick?.species?._id || '' };
      });
    });
  }, [editing, form.fishpondId]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, fishpondId: fishponds[0]?._id || '' });
    setImage(null);
    setEditing({});
  };

  const openEdit = (p) => {
    setForm({
      fishpondId: p.fishpond?._id || '',
      cycleId: p.cycle?._id || '',
      speciesId: p.species?._id || '',
      productType: p.productType,
      name: p.name,
      description: p.description || '',
      pricePerKg: String(p.pricePerKg),
      availableKg: String(p.availableKg),
      minOrderKg: p.minOrderKg ? String(p.minOrderKg) : '',
      status: p.status,
    });
    setImage(null);
    setEditing(p);
  };

  const pickCycle = (cycleId) => {
    const cycle = cycles.find((c) => c._id === cycleId);
    setForm((f) => ({ ...f, cycleId, speciesId: cycle?.species?._id || f.speciesId }));
  };

  // Suggest a name like "Fresh Tilapia" until the owner types their own.
  const suggestedName = useMemo(() => {
    const s = species.find((x) => x._id === form.speciesId);
    if (!s) return '';
    const type = PRODUCT_TYPE_LABEL[form.productType]?.split(' / ')[0] || '';
    return `${type} ${s.name}`.trim();
  }, [species, form.speciesId, form.productType]);

  const submit = async (e) => {
    e.preventDefault();
    if (Number(form.pricePerKg) <= 0) return toast.error('Price per kg must be more than zero');
    if (Number(form.availableKg) < 0) return toast.error('Available kilos cannot be negative');
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries({ ...form, name: form.name.trim() || suggestedName }).forEach(([k, v]) => data.append(k, v));
      if (image) data.append('image', image);
      if (editing?._id) await productApi.update(editing._id, data);
      else await productApi.create(data);
      toast.success(editing?._id ? 'Product updated' : 'Product added to the marketplace');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save product'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    const status = p.status === 'available' ? 'unavailable' : 'available';
    try {
      const data = new FormData();
      data.append('status', status);
      await productApi.update(p._id, data);
      toast.success(status === 'available' ? 'Product is now shown to buyers' : 'Product is now hidden from buyers');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update product'));
    }
  };

  const remove = async (p) => {
    if (!(await confirm(`Delete "${p.name}"? Buyers will no longer see it.`))) return;
    try {
      await productApi.remove(p._id);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete product'));
    }
  };

  if (loading || loadingFishponds) return <Spinner />;

  const listed = products.filter((p) => p.status === 'available' && p.availableKg > 0);
  const totalKg = listed.reduce((sum, p) => sum + p.availableKg, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Product Management</h2>
          <p className="text-sm text-slate-600">Post your harvested fish for buyers in the marketplace, with the price per kilo.</p>
        </div>
        <Button icon="plus" onClick={openNew} disabled={fishponds.length === 0}>
          Add Product
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Products" value={products.length} icon="store" />
        <StatCard label="Shown to Buyers" value={listed.length} sub="Available and with stock" icon="eye" tone="emerald" />
        <StatCard label="Kilos for Sale" value={kilos(totalKg)} icon="fish" tone="sky" />
      </div>

      {fishponds.length === 0 ? (
        <Card>
          <EmptyState title="No approved fishpond yet" message="You can sell fish once one of your fishponds is approved and has a production cycle." />
        </Card>
      ) : (
        <Card title="My Products" action={<Link to="/owner/orders" className="text-xs font-medium text-brand-600 hover:underline">View orders →</Link>}>
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Product',
                render: (p) => (
                  <div className="flex items-center gap-3">
                    <FishpondPhoto src={p.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500">{PRODUCT_TYPE_LABEL[p.productType]}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'species', header: 'Species', render: (p) => p.species?.name || '—', value: (p) => p.species?.name },
              {
                key: 'fishpond',
                header: 'Source',
                render: (p) => (
                  <div>
                    <p>{p.fishpond?.name || '—'}</p>
                    {p.cycle && <p className="text-[11px] text-slate-500">{cycleName(p.cycle)}</p>}
                  </div>
                ),
                value: (p) => p.fishpond?.name,
              },
              { key: 'pricePerKg', header: 'Price / kg', render: (p) => peso(p.pricePerKg) },
              {
                key: 'availableKg',
                header: 'Available',
                render: (p) => <span className={p.availableKg > 0 ? '' : 'font-semibold text-rose-600'}>{p.availableKg > 0 ? kilos(p.availableKg) : 'Sold out'}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (
                  <Badge className={p.status === 'available' ? 'bg-leaf-50 text-leaf-700 border-leaf-300' : 'bg-slate-100 text-slate-600 border-slate-300'}>
                    {p.status === 'available' ? 'Shown' : 'Hidden'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (p) => (
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      icon={p.status === 'available' ? 'eyeOff' : 'eye'}
                      label={p.status === 'available' ? 'Hide from buyers' : 'Show to buyers'}
                      onClick={() => toggleStatus(p)}
                    />
                    <IconButton icon="edit" label="Edit product" tone="brand" onClick={() => openEdit(p)} />
                    <IconButton icon="trash" label="Delete product" tone="danger" onClick={() => remove(p)} />
                  </div>
                ),
              },
            ]}
            rows={products}
            pageSize={8}
            searchable={products.length > 8 ? 'Search product, species…' : false}
            emptyMessage="No products yet. Add one so buyers can order your fish."
          />
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? `Edit — ${editing.name}` : 'Add Product'} width="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fishpond" required>
              <Select required value={form.fishpondId} onChange={(e) => setForm({ ...form, fishpondId: e.target.value, cycleId: '' })}>
                {fishponds.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Production Cycle" required hint={cycles.length === 0 && form.fishpondId ? 'Start a cycle in this fishpond first' : 'Where the fish came from'}>
              <Select required value={form.cycleId} onChange={(e) => pickCycle(e.target.value)}>
                <option value="" disabled>Select cycle</option>
                {cycles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {cycleName(c)} — {c.species?.name} ({c.status})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Species" required>
              <Select required value={form.speciesId} onChange={(e) => setForm({ ...form, speciesId: e.target.value })}>
                <option value="" disabled>Select species</option>
                {species.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({WATER_TYPE_LABEL[s.waterType]})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product Type" required>
              <Select required value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Product Name" hint={suggestedName && !form.name ? `Leave blank to use "${suggestedName}"` : undefined}>
            <Input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={suggestedName || 'e.g. Fresh Tilapia'} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Price per kg (₱)" required>
              <Input type="number" min="0.01" step="0.01" required value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} />
            </Field>
            <Field label="Available (kg)" required hint="Goes down when you accept orders">
              <Input type="number" min="0" step="0.01" required value={form.availableKg} onChange={(e) => setForm({ ...form, availableKg: e.target.value })} />
            </Field>
            <Field label="Minimum order (kg)">
              <Input type="number" min="0.1" step="0.1" value={form.minOrderKg} onChange={(e) => setForm({ ...form, minOrderKg: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Size, freshness, harvest date, pickup hours…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Photo" hint="JPG or PNG. Optional.">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700"
              />
            </Field>
            <Field label="Show to buyers">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="available">Yes — show in the marketplace</option>
                <option value="unavailable">No — keep hidden</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!form.cycleId}>
              {editing?._id ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
