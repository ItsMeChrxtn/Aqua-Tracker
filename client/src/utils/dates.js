// Today's date on this device as YYYY-MM-DD (toISOString would give the UTC
// date, which is still "yesterday" before 8 AM in the Philippines).
export function localTodayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// YYYY-MM-DD for the day after the given YYYY-MM-DD.
export function nextDayISO(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

// Grow-out length between stocking and harvest, counted in calendar months
// (Nov → Jan = 2 months), e.g. "2 months" or "2 months, 5 days".
export function harvestMonthsLabel(fromDate, toDate) {
  if (!fromDate || !toDate) return '';
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return '';
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  const anchor = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  const days = Math.round((to - anchor) / 86400000);
  const parts = [];
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  return parts.join(', ');
}
