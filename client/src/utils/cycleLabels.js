import { formatDate } from './format';

export function batchLabel(cycle) {
  if (!cycle) return '—';
  return cycle.batchName || `Unnamed batch (${formatDate(cycle.stockingDate)})`;
}

// "Bangus (Milkfish) — Batch 1": the fish first, since owners pick by fish.
export const fishLabel = (cycle) => `${cycle.species?.name || 'Unknown species'} — ${batchLabel(cycle)}`;
