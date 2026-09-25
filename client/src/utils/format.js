export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const READINESS_LABEL = {
  growing: 'Growing',
  near_harvest: 'Near Harvest',
  ready_for_harvest: 'Ready for Harvest',
};

export const READINESS_BADGE_CLASS = {
  growing: 'bg-amber-50 text-amber-700 border-amber-300',
  near_harvest: 'bg-sky-50 text-sky-700 border-sky-300',
  ready_for_harvest: 'bg-leaf-50 text-leaf-700 border-leaf-300',
};

export const STATUS_BADGE_CLASS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  approved: 'bg-leaf-50 text-leaf-700 border-leaf-300',
  rejected: 'bg-rose-50 text-rose-700 border-rose-300',
  active: 'bg-sky-50 text-sky-700 border-sky-300',
  harvested: 'bg-violet-50 text-violet-700 border-violet-300',
  closed: 'bg-slate-100 text-slate-700 border-slate-300',
};

export const WATER_TYPE_LABEL = {
  freshwater: 'Freshwater',
  saltwater: 'Saltwater',
  brackish: 'Brackish',
};

export const ROLE_LABEL = {
  fishpond_owner: 'Fishpond Owner',
  agriculture_staff: 'Agriculture Office Staff',
  admin: 'Administrator',
};
