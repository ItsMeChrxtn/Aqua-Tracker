// Buckets dated records into weekly sums, keyed by the Sunday that starts
// each week. Used for "per week" trend charts (e.g. mortality/week).
export function bucketByWeek(records, valueKey) {
  const buckets = new Map();
  records.forEach((r) => {
    const d = new Date(r.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) || 0) + Number(r[valueKey] || 0));
  });
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ x: date, value }));
}
