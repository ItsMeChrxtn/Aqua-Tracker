import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast, { confirm } from '../../utils/notify';
import { orderApi } from '../../api/marketplace';
import { apiErrorMessage } from '../../api/client';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import Spinner from '../../components/ui/Spinner';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import { Select } from '../../components/ui/FormField';
import { formatDate, formatDateTime } from '../../utils/format';
import { ORDER_STATUS, FULFILLMENT_LABEL, PRODUCT_TYPE_LABEL, peso, kilos } from '../../utils/marketplace';

const NEXT_STEP = {
  pending: 'Waiting for the fishpond owner to accept your order.',
  accepted: 'Accepted — contact the owner to arrange pickup or delivery, then pay on hand-over.',
  completed: 'Completed. Thank you for buying!',
  declined: 'The owner declined this order.',
  cancelled: 'This order was cancelled.',
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = () =>
    orderApi
      .list()
      .then(setOrders)
      .catch((err) => toast.error(apiErrorMessage(err, 'Failed to load your orders')))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const cancel = async (o) => {
    if (!(await confirm(`Cancel order ${o.orderNo}?`))) return;
    try {
      await orderApi.cancel(o._id);
      toast.success('Order cancelled');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to cancel the order'));
    }
  };

  if (loading) return <Spinner />;

  const shown = status ? orders.filter((o) => o.status === status) : orders;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">My Orders</h2>
          <p className="text-sm text-slate-600">Track the fish you ordered from fishpond owners.</p>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS).map(([value, s]) => (
            <option key={value} value={value}>{s.label}</option>
          ))}
        </Select>
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon="bag"
            title={status ? 'No orders with this status' : 'No orders yet'}
            message="Browse the marketplace and order fresh fish from local fishponds."
            action={
              <Link to="/buyer/marketplace">
                <Button icon="store">Shop Fish</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <div key={o._id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
              <FishpondPhoto src={o.item.imageUrl} alt="" className="h-24 w-full shrink-0 rounded-xl sm:w-24" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{o.item.name}</p>
                  <Badge className={ORDER_STATUS[o.status].className}>{ORDER_STATUS[o.status].label}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {o.orderNo} · {formatDateTime(o.createdAt)}
                </p>
                <p className="text-sm text-slate-700">
                  {kilos(o.quantityKg)} × {peso(o.item.pricePerKg)} · {o.item.species} · {PRODUCT_TYPE_LABEL[o.item.productType]}
                </p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Icon name={o.fulfillment === 'delivery' ? 'truck' : 'location'} className="h-3.5 w-3.5" /> {FULFILLMENT_LABEL[o.fulfillment]}{o.deliveryAddress ? ` — ${o.deliveryAddress}` : o.fishpond ? ` — ${o.fishpond.name}, ${o.fishpond.barangay}` : ''}</span>
                  {o.preferredDate && <span>Preferred: {formatDate(o.preferredDate)}</span>}
                </p>
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                  <span>Seller: {o.owner?.name}</span>
                  {o.owner?.phone && (o.status === 'accepted' || o.status === 'completed') && (
                    <span className="flex items-center gap-1"><Icon name="phone" className="h-3.5 w-3.5" /> {o.owner.phone}</span>
                  )}
                </p>
                <p className="text-xs text-slate-600">{NEXT_STEP[o.status]}{o.reason ? ` Reason: ${o.reason}` : ''}</p>
              </div>
              <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-between">
                <p className="font-display text-xl font-semibold text-slate-900">{peso(o.totalAmount)}</p>
                {o.status === 'pending' && (
                  <Button size="sm" variant="secondary" onClick={() => cancel(o)}>
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
