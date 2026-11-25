import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { orderApi } from '../../api/marketplace';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { Field, Select, Textarea } from '../../components/ui/FormField';
import { formatDate, formatDateTime } from '../../utils/format';
import { ORDER_STATUS, FULFILLMENT_LABEL, PRODUCT_TYPE_LABEL, peso, kilos } from '../../utils/marketplace';

// Orders buyers placed for this owner's products: accept / decline, then
// complete (saved to Sales Records) or cancel.
export default function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [reasonFor, setReasonFor] = useState(null); // { order, action: 'decline' | 'cancel' }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    orderApi
      .list()
      .then(setOrders)
      .catch((err) => toast.error(apiErrorMessage(err, 'Failed to load orders')))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      setReasonFor(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const accept = async (o) => {
    if (!(await confirm(`${kilos(o.quantityKg)} of ${o.item.name} will be reserved for ${o.buyer?.name}.`, { title: 'Accept this order?', danger: false }))) return;
    run(() => orderApi.accept(o._id), 'Order accepted');
  };

  const complete = async (o) => {
    if (!(await confirm('Mark as completed once the buyer has paid and received the fish. It will be saved to your Sales Records.', { title: 'Complete this order?', danger: false }))) return;
    run(() => orderApi.complete(o._id), 'Order completed and saved to Sales Records');
  };

  const submitReason = (e) => {
    e.preventDefault();
    const { order, action } = reasonFor;
    run(
      () => (action === 'decline' ? orderApi.decline(order._id, reason) : orderApi.cancel(order._id, reason)),
      action === 'decline' ? 'Order declined' : 'Order cancelled'
    );
  };

  if (loading) return <Spinner />;

  const count = (s) => orders.filter((o) => o.status === s).length;
  const earned = orders.filter((o) => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);
  const shown = status ? orders.filter((o) => o.status === status) : orders;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
        <p className="text-sm text-slate-600">Orders buyers placed for your products in the marketplace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New (Pending)" value={count('pending')} icon="bell" tone="amber" />
        <StatCard label="To Hand Over" value={count('accepted')} sub="Accepted, not yet completed" icon="truck" tone="sky" />
        <StatCard label="Completed" value={count('completed')} icon="check" tone="emerald" />
        <StatCard label="Earned from Orders" value={peso(earned)} icon="sales" tone="violet" />
      </div>

      <Card
        title="Received Orders"
        action={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="">All statuses</option>
            {Object.entries(ORDER_STATUS).map(([value, s]) => (
              <option key={value} value={value}>{s.label}</option>
            ))}
          </Select>
        }
      >
        <DataTable
          columns={[
            {
              key: 'orderNo',
              header: 'Order',
              render: (o) => (
                <div>
                  <p className="font-medium text-slate-900">{o.orderNo}</p>
                  <p className="text-[11px] text-slate-500">{formatDateTime(o.createdAt)}</p>
                </div>
              ),
              value: (o) => o.createdAt,
            },
            {
              key: 'buyer',
              header: 'Buyer',
              render: (o) => (
                <div>
                  <p>{o.buyer?.name || '—'}</p>
                  <p className="text-[11px] text-slate-500">{o.contactNo || o.buyer?.phone || '—'}</p>
                </div>
              ),
              value: (o) => o.buyer?.name,
            },
            {
              key: 'item',
              header: 'Product',
              render: (o) => (
                <div>
                  <p>{o.item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {kilos(o.quantityKg)} × {peso(o.item.pricePerKg)} · {PRODUCT_TYPE_LABEL[o.item.productType]}
                  </p>
                </div>
              ),
              value: (o) => o.item.name,
            },
            { key: 'totalAmount', header: 'Total', render: (o) => <span className="font-semibold">{peso(o.totalAmount)}</span> },
            {
              key: 'fulfillment',
              header: 'Pickup / Delivery',
              render: (o) => (
                <div className="max-w-[14rem]">
                  <p>{FULFILLMENT_LABEL[o.fulfillment]}</p>
                  {o.deliveryAddress && <p className="text-[11px] text-slate-500">{o.deliveryAddress}</p>}
                  {o.preferredDate && <p className="text-[11px] text-slate-500">Preferred: {formatDate(o.preferredDate)}</p>}
                  {o.notes && <p className="text-[11px] italic text-slate-500">“{o.notes}”</p>}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (o) => (
                <div>
                  <Badge className={ORDER_STATUS[o.status].className}>{ORDER_STATUS[o.status].label}</Badge>
                  {o.reason && <p className="mt-1 max-w-[10rem] text-[11px] text-slate-500">{o.reason}</p>}
                </div>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (o) => (
                <div className="flex justify-end gap-2">
                  {o.status === 'pending' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => { setReason(''); setReasonFor({ order: o, action: 'decline' }); }}>
                        Decline
                      </Button>
                      <Button size="sm" variant="accent" icon="check" onClick={() => accept(o)} disabled={busy}>
                        Accept
                      </Button>
                    </>
                  )}
                  {o.status === 'accepted' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => { setReason(''); setReasonFor({ order: o, action: 'cancel' }); }}>
                        Cancel
                      </Button>
                      <Button size="sm" icon="checkAll" onClick={() => complete(o)} disabled={busy}>
                        Complete
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={shown}
          pageSize={10}
          searchable={shown.length > 10 ? 'Search order no., buyer, product…' : false}
          emptyMessage={status ? 'No orders with this status.' : 'No orders yet. Buyers will see your products under Shop Fish.'}
        />
      </Card>

      <Modal open={!!reasonFor} onClose={() => setReasonFor(null)} title={reasonFor?.action === 'decline' ? `Decline ${reasonFor?.order.orderNo}` : `Cancel ${reasonFor?.order.orderNo}`}>
        <form onSubmit={submitReason} className="space-y-4">
          <Field label="Reason (the buyer will see this)" required={reasonFor?.action === 'decline'}>
            <Textarea
              required={reasonFor?.action === 'decline'}
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Not enough stock today, please order again next week."
            />
          </Field>
          {reasonFor?.action === 'cancel' && <p className="text-xs text-slate-500">The reserved kilos go back to the product.</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setReasonFor(null)}>
              Back
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              {reasonFor?.action === 'decline' ? 'Decline Order' : 'Cancel Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
