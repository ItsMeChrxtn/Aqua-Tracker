import { formatNumber } from './format';

export const PRODUCT_TYPES = [
  { value: 'fresh', label: 'Fresh / Live' },
  { value: 'dressed', label: 'Dressed / Cleaned' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'dried', label: 'Dried / Processed' },
];
export const PRODUCT_TYPE_LABEL = Object.fromEntries(PRODUCT_TYPES.map((t) => [t.value, t.label]));

export const ORDER_STATUS = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  accepted: { label: 'Accepted', className: 'bg-sky-50 text-sky-700 border-sky-300' },
  completed: { label: 'Completed', className: 'bg-leaf-50 text-leaf-700 border-leaf-300' },
  declined: { label: 'Declined', className: 'bg-rose-50 text-rose-700 border-rose-300' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-700 border-slate-300' },
};

export const FULFILLMENT_LABEL = { pickup: 'Pickup at the fishpond', delivery: 'Delivery' };

export const peso = (n) => `₱${formatNumber(n || 0, 2)}`;
export const kilos = (n) => `${formatNumber(n || 0, Number.isInteger(Number(n)) ? 0 : 2)} kg`;
