import { useEffect, useState } from 'react';
import { cycleApi } from '../../api/fishponds';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import Icon from '../ui/Icon';
import FishpondPhoto from '../ui/FishpondPhoto';
import { formatArea, formatDate, formatDateTime, formatNumber, STATUS_BADGE_CLASS, WATER_TYPE_LABEL } from '../../utils/format';
import { harvestMonthsLabel } from '../../utils/dates';

function InfoRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{children}</span>
    </div>
  );
}

// Everything about one production cycle (batch): its details, the fishpond
// photo, the current growth estimate and remarks.
export default function BatchDetailsModal({ cycle, fishpond, onClose }) {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cycle) return;
    setEstimate(null);
    setLoading(true);
    cycleApi
      .get(cycle._id)
      .then((res) => setEstimate(res.estimate))
      .catch(() => setEstimate(null))
      .finally(() => setLoading(false));
  }, [cycle]);

  const months = cycle ? harvestMonthsLabel(cycle.stockingDate, cycle.expectedHarvestDate) : '';

  return (
    <Modal open={!!cycle} onClose={onClose} title="Batch Details" width="max-w-3xl">
      {cycle && (
        <div className="space-y-4">
          <div className="grid gap-4 rounded-xl bg-brand-50/50 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <FishpondPhoto src={fishpond?.imageUrl} alt={fishpond?.name} className="h-48 w-full rounded-xl sm:h-full" />
            <div className="divide-y divide-slate-100">
              <InfoRow label="Batch No.">
                <Badge className="bg-brand-100 text-brand-700">{cycle.batchName || '—'}</Badge>
              </InfoRow>
              <InfoRow label="Species">
                {cycle.species?.name}
                {cycle.species?.waterType ? ` (${WATER_TYPE_LABEL[cycle.species.waterType]})` : ''}
              </InfoRow>
              <InfoRow label="Stocking Date">{formatDate(cycle.stockingDate)}</InfoRow>
              <InfoRow label="Est. Harvest Date">{cycle.expectedHarvestDate ? formatDate(cycle.expectedHarvestDate) : '—'}</InfoRow>
              <InfoRow label="Harvest Month">{months || '—'}</InfoRow>
              <InfoRow label="Initial Count">{formatNumber(cycle.initialCount)} fingerlings</InfoRow>
              <InfoRow label="Fishpond">
                {fishpond?.name}
                {fishpond?.areaSize ? ` (${formatArea(fishpond.areaSize)})` : ''}
              </InfoRow>
              <InfoRow label="Status">
                <Badge className={STATUS_BADGE_CLASS[cycle.status]}>{cycle.status}</Badge>
              </InfoRow>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Icon name="growth" className="h-4 w-4 text-brand-600" /> Growth Overview
              </p>
              {loading ? (
                <Spinner />
              ) : estimate ? (
                <div className="divide-y divide-slate-100">
                  <InfoRow label="Current Count">{formatNumber(estimate.currentCount)} fish</InfoRow>
                  <InfoRow label="Estimated Yield">≈ {formatNumber(estimate.estimatedHarvestKg, 2)} kg</InfoRow>
                  <InfoRow label="Survival Rate">{formatNumber(estimate.survivalRate, 1)}%</InfoRow>
                  <InfoRow label="Average Weight">{estimate.averageWeight ? `≈ ${formatNumber(estimate.averageWeight, 1)} g` : 'No sampling yet'}</InfoRow>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No growth data yet.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Icon name="clipboard" className="h-4 w-4 text-brand-600" /> Additional Information
              </p>
              <div className="divide-y divide-slate-100">
                <InfoRow label="Remarks">{cycle.notes || '—'}</InfoRow>
                <InfoRow label="Last Updated">{formatDateTime(cycle.updatedAt)}</InfoRow>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
