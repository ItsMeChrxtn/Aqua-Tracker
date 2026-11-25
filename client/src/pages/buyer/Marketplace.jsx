import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';
import { marketplaceApi, orderApi } from '../../api/marketplace';
import { apiErrorMessage } from '../../api/client';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import { Field, Input, Select, Textarea } from '../../components/ui/FormField';
import { FISHPOND_BARANGAYS } from '../../utils/barangays';
import { localTodayISO } from '../../utils/dates';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL, peso, kilos } from '../../utils/marketplace';

const chip = (active) =>
  `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
    active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
  }`;

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { species } = useSpeciesList();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', speciesId: '', productType: '', barangay: '', sort: 'newest' });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [order, setOrder] = useState(null);
  const [placing, setPlacing] = useState(false);

  // Wait for typing to pause before searching.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: search })), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    marketplaceApi
      .list(params)
      .then(setProducts)
      .catch((err) => toast.error(apiErrorMessage(err, 'Failed to load products')))
      .finally(() => setLoading(false));
  }, [filters]);

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const openProduct = (p) => {
    setSelected(p);
    setOrder({
      quantityKg: String(p.minOrderKg || 1),
      fulfillment: 'pickup',
      deliveryAddress: user.address || '',
      contactNo: user.phone || '',
      preferredDate: '',
      notes: '',
    });
  };

  const qty = Number(order?.quantityKg) || 0;
  const total = selected ? qty * selected.pricePerKg : 0;

  const placeOrder = async (e) => {
    e.preventDefault();
    if (selected.minOrderKg && qty < selected.minOrderKg) return toast.error(`The minimum order is ${kilos(selected.minOrderKg)}`);
    if (qty > selected.availableKg) return toast.error(`Only ${kilos(selected.availableKg)} is available`);
    setPlacing(true);
    try {
      const created = await orderApi.create({ ...order, productId: selected._id, quantityKg: qty });
      toast.success(`Order ${created.orderNo} sent. The fishpond owner will confirm it.`);
      setSelected(null);
      navigate('/buyer/orders');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to place order'));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Shop Fresh Fish</h2>
          <p className="text-sm text-slate-600">Fish straight from fishponds in Noveleta, Cavite — order and pick up or have it delivered.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fish…" className="pl-9" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Species</span>
          <button type="button" className={chip(!filters.speciesId)} onClick={() => set('speciesId', '')}>All</button>
          {species.map((s) => (
            <button type="button" key={s._id} className={chip(filters.speciesId === s._id)} onClick={() => set('speciesId', s._id)}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Type</span>
          <button type="button" className={chip(!filters.productType)} onClick={() => set('productType', '')}>All</button>
          {PRODUCT_TYPES.map((t) => (
            <button type="button" key={t.value} className={chip(filters.productType === t.value)} onClick={() => set('productType', t.value)}>
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap gap-2">
            <Select value={filters.barangay} onChange={(e) => set('barangay', e.target.value)} className="w-44" aria-label="Barangay">
              <option value="">All barangays</option>
              {FISHPOND_BARANGAYS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
            <Select value={filters.sort} onChange={(e) => set('sort', e.target.value)} className="w-44" aria-label="Sort">
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Card>
          <EmptyState icon="store" title="No fish for sale here yet" message="Try another species, type or barangay, or check back after the next harvest." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <button
              type="button"
              key={p._id}
              onClick={() => openProduct(p)}
              className="hover-lift group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm"
            >
              <FishpondPhoto src={p.imageUrl} alt={p.name} className="h-40 w-full" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-brand-50 text-brand-700 border-brand-200">{p.species?.name}</Badge>
                  <Badge>{PRODUCT_TYPE_LABEL[p.productType]}</Badge>
                </div>
                <p className="font-semibold text-slate-900 group-hover:text-brand-700">{p.name}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Icon name="location" className="h-3.5 w-3.5" /> {p.fishpond?.name} · {p.fishpond?.barangay}
                </p>
                <div className="mt-auto flex items-end justify-between pt-2">
                  <p>
                    <span className="font-display text-xl font-semibold text-slate-900">{peso(p.pricePerKg)}</span>
                    <span className="text-xs text-slate-500"> / kg</span>
                  </p>
                  <p className="text-xs text-slate-500">{kilos(p.availableKg)} left</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} width="max-w-2xl">
        {selected && order && (
          <div className="grid gap-5 md:grid-cols-[14rem_1fr]">
            <div className="space-y-3">
              <FishpondPhoto src={selected.imageUrl} alt={selected.name} className="h-44 w-full rounded-xl" />
              <div className="space-y-1 text-xs text-slate-600">
                <p className="text-base font-semibold text-slate-900">
                  {peso(selected.pricePerKg)} <span className="text-xs font-normal text-slate-500">per kg</span>
                </p>
                <p>{selected.species?.name} · {PRODUCT_TYPE_LABEL[selected.productType]}</p>
                <p>{kilos(selected.availableKg)} available{selected.minOrderKg ? ` · min. ${kilos(selected.minOrderKg)}` : ''}</p>
                <p className="flex items-center gap-1"><Icon name="location" className="h-3.5 w-3.5" /> {selected.fishpond?.name}, {selected.fishpond?.barangay}</p>
                <p className="flex items-center gap-1"><Icon name="users" className="h-3.5 w-3.5" /> {selected.owner?.name}</p>
                {selected.owner?.phone && <p className="flex items-center gap-1"><Icon name="phone" className="h-3.5 w-3.5" /> {selected.owner.phone}</p>}
              </div>
              {selected.description && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{selected.description}</p>}
            </div>

            <form onSubmit={placeOrder} className="space-y-4">
              <Field label="Quantity (kg)" required>
                <Input
                  type="number"
                  required
                  min={selected.minOrderKg || 0.1}
                  max={selected.availableKg}
                  step="0.1"
                  value={order.quantityKg}
                  onChange={(e) => setOrder({ ...order, quantityKg: e.target.value })}
                />
              </Field>
              <Field label="How will you get it?" required>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'pickup', label: 'Pickup', icon: 'location' },
                    { value: 'delivery', label: 'Delivery', icon: 'truck' },
                  ].map((o) => (
                    <button
                      type="button"
                      key={o.value}
                      onClick={() => setOrder({ ...order, fulfillment: o.value })}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                        order.fulfillment === o.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300'
                      }`}
                    >
                      <Icon name={o.icon} className="h-4 w-4" /> {o.label}
                    </button>
                  ))}
                </div>
              </Field>
              {order.fulfillment === 'delivery' && (
                <Field label="Delivery Address" required hint="Delivery fee, if any, is agreed with the owner">
                  <Input required maxLength={200} value={order.deliveryAddress} onChange={(e) => setOrder({ ...order, deliveryAddress: e.target.value })} />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact No." required>
                  <Input required inputMode="tel" maxLength={13} value={order.contactNo} onChange={(e) => setOrder({ ...order, contactNo: e.target.value })} placeholder="09171234567" />
                </Field>
                <Field label="Preferred Date">
                  <Input type="date" min={localTodayISO()} value={order.preferredDate} onChange={(e) => setOrder({ ...order, preferredDate: e.target.value })} />
                </Field>
              </div>
              <Field label="Notes to the owner">
                <Textarea maxLength={300} value={order.notes} onChange={(e) => setOrder({ ...order, notes: e.target.value })} placeholder="e.g. Please choose bigger fish" />
              </Field>
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                <span className="text-sm text-brand-800">Total ({kilos(qty)})</span>
                <span className="font-display text-xl font-semibold text-brand-800">{peso(total)}</span>
              </div>
              <p className="text-[11px] text-slate-500">Pay the owner in cash on pickup or delivery. Your order is reserved once the owner accepts it.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button type="submit" icon="cart" loading={placing}>
                  Place Order
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
