import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { cycleApi, harvestApi } from '../../api/fishponds';
import { reportApi } from '../../api/misc';
import { apiErrorMessage } from '../../api/client';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import { downloadFile } from '../../utils/download';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import { Select, Field, Input, Textarea } from '../../components/ui/FormField';
import LineTrendChart from '../../components/charts/LineTrendChart';
import { formatDate, formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

const READINESS_COPY = {
  growing: 'Fish are still growing toward the recommended harvest weight. Keep monitoring!',
  near_harvest: 'Fish are approaching the recommended harvest weight — plan your harvest logistics soon.',
  ready_for_harvest: 'Fish have reached the recommended harvest weight and are ready for harvest.',
};

export default function HarvestEstimation() {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();
  const [fishpondId, setFishpondId] = useState('');
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [harvestForm, setHarvestForm] = useState({ date: new Date().toISOString().slice(0, 10), actualQuantity: '', actualWeightKg: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fishpondId && fishponds.length > 0) setFishpondId(fishponds[0]._id);
  }, [fishponds, fishpondId]);

  useEffect(() => {
    reportApi.ownerSummary().then((res) => setSummary(res.productionSummary));
  }, []);

  useEffect(() => {
    if (!fishpondId) return;
    cycleApi.listForFishpond(fishpondId, { status: 'active' }).then((list) => {
      setCycles(list);
      setCycleId(list[0]?._id || '');
    });
  }, [fishpondId]);

  useEffect(() => {
    if (!cycleId) {
      setEstimate(null);
      setHistory([]);
      return;
    }
    setLoading(true);
    const cycle = cycles.find((c) => c._id === cycleId);
    Promise.all([
      harvestApi.getEstimate(cycleId),
      harvestApi.history(fishpondId, cycle?.species?._id ? { speciesId: cycle.species._id } : undefined),
    ])
      .then(([est, logs]) => {
        setEstimate(est);
        setHistory([...logs].reverse());
      })
      .finally(() => setLoading(false));
  }, [cycleId, cycles, fishpondId]);

  const exportPdf = () => downloadFile(reportApi.exportPdfUrl(), 'aquatrack-harvest-report.pdf').catch(() => toast.error('Export failed'));

  const submitHarvest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await harvestApi.logHarvest(cycleId, { ...harvestForm, actualQuantity: Number(harvestForm.actualQuantity), actualWeightKg: Number(harvestForm.actualWeightKg) });
      toast.success('Harvest logged — cycle closed.');
      setHarvestModalOpen(false);
      const list = await cycleApi.listForFishpond(fishpondId, { status: 'active' });
      setCycles(list);
      setCycleId(list[0]?._id || '');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to log harvest'));
    } finally {
      setSaving(false);
    }
  };

  if (loadingFishponds) return null;
  if (fishponds.length === 0) {
    return <EmptyState icon="harvest" title="No approved fishponds yet" message="Register and get a fishpond approved to see harvest estimates." />;
  }

  const growthTrend = history.map((l) => ({ x: formatDate(l.date), averageWeight: l.averageWeight }));
  const harvestTrend = history.map((l) => ({ x: formatDate(l.date), estimatedHarvestKg: l.estimatedHarvestKg }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Harvest Estimation</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={fishpondId} onChange={(e) => setFishpondId(e.target.value)} className="w-52">
            {fishponds.map((f) => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </Select>
          <Select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className="w-48">
            {cycles.length === 0 && <option value="">No active batch</option>}
            {cycles.map((c) => (
              <option key={c._id} value={c._id}>{c.batchName || c._id.slice(-6)} — {c.species?.name}</option>
            ))}
          </Select>
          <Button variant="secondary" size="sm" icon="download" onClick={exportPdf}>Export PDF</Button>
        </div>
      </div>

      {loading && <Spinner />}

      {!loading && !estimate && (
        <EmptyState icon="harvest" title="No active production cycle" message="Start a production cycle from the fishpond's detail page to see a harvest estimate." />
      )}

      {!loading && estimate && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Total Stocked Fish" value={formatNumber(estimate.initialCount)} icon="fish" tone="brand" />
            <StatCard label="Remaining Fish" value={formatNumber(estimate.currentCount)} icon="fish" tone="sky" />
            <StatCard label="Average Weight" value={`${formatNumber(estimate.averageWeight)} g`} icon="growth" tone="violet" />
            <StatCard label="Survival Rate" value={`${estimate.survivalRate}%`} icon="survival" tone="emerald" />
            <StatCard label="Estimated Harvest" value={`${formatNumber(estimate.estimatedHarvestKg, 1)} kg`} icon="harvest" tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card title="Growth Trend (Average Weight)" className="lg:col-span-2">
              <LineTrendChart data={growthTrend} series={[{ key: 'averageWeight', label: 'Avg. Weight (g)' }]} valueFormatter={(v) => `${v} g`} />
            </Card>
            <Card title="Harvest Readiness Status">
              <div className="flex flex-col items-center justify-center gap-2.5 py-2 text-center">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    estimate.readinessStatus === 'ready_for_harvest' ? 'bg-emerald-100 text-emerald-600' : estimate.readinessStatus === 'near_harvest' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <Icon name={estimate.readinessStatus === 'ready_for_harvest' ? 'success' : 'clock'} className="h-7 w-7" />
                </div>
                <Badge className={READINESS_BADGE_CLASS[estimate.readinessStatus]}>{READINESS_LABEL[estimate.readinessStatus]}</Badge>
                <p className="text-xs text-slate-600">{READINESS_COPY[estimate.readinessStatus]}</p>
                <p className="text-xs text-slate-400">
                  Recommended: {estimate.recommendedHarvestWeightMin}–{estimate.recommendedHarvestWeightMax} g · Current: {formatNumber(estimate.averageWeight)} g
                </p>
                {estimate.readinessStatus === 'ready_for_harvest' && (
                  <Button size="sm" className="mt-1.5" onClick={() => setHarvestModalOpen(true)}>Log Harvest</Button>
                )}
              </div>
            </Card>
          </div>

          <Card title="Estimated Harvest Trend (kg)">
            <LineTrendChart data={harvestTrend} series={[{ key: 'estimatedHarvestKg', label: 'Est. Harvest (kg)' }]} valueFormatter={(v) => `${v} kg`} />
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card title="Harvest Estimation Summary" className="lg:col-span-2" padded={false}>
              <div className="p-2">
                <DataTable
                  columns={[
                    { key: 'fishpondName', header: 'Fishpond' },
                    { key: 'species', header: 'Species' },
                    { key: 'stocked', header: 'Stocked', render: (r) => formatNumber(r.stocked) },
                    { key: 'remaining', header: 'Remaining', render: (r) => formatNumber(r.remaining) },
                    { key: 'survivalRate', header: 'Survival %' },
                    { key: 'estimatedHarvestKg', header: 'Est. Harvest (kg)' },
                    { key: 'readinessStatus', header: 'Status', render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
                  ]}
                  rows={summary || []}
                  keyField="cycleId"
                />
              </div>
            </Card>
            <Card title="Estimation Details">
              <dl className="space-y-2 text-sm">
                {[
                  ['Total Stocked Fish', formatNumber(estimate.initialCount)],
                  ['Total Mortality', formatNumber(estimate.totalMortality)],
                  ['Remaining Fish', formatNumber(estimate.currentCount)],
                  ['Average Weight (current)', `${formatNumber(estimate.averageWeight)} g`],
                  ['Survival Rate', `${estimate.survivalRate}%`],
                  ['Estimated Harvest', `${formatNumber(estimate.estimatedHarvestKg, 1)} kg`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-slate-200 pb-1.5">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-medium text-slate-700">{value}</dd>
                  </div>
                ))}
                <p className="pt-1 text-xs italic text-slate-400">
                  Estimate = Remaining Fish × Average Weight ({formatNumber(estimate.currentCount)} × {formatNumber(estimate.averageWeight)} g)
                </p>
              </dl>
            </Card>
          </div>
        </>
      )}

      <Modal open={harvestModalOpen} onClose={() => setHarvestModalOpen(false)} title="Log Actual Harvest">
        <form onSubmit={submitHarvest} className="space-y-4">
          <Field label="Harvest Date" required>
            <Input type="date" required value={harvestForm.date} onChange={(e) => setHarvestForm({ ...harvestForm, date: e.target.value })} />
          </Field>
          <Field label="Actual Quantity Harvested" required>
            <Input type="number" min="0" required value={harvestForm.actualQuantity} onChange={(e) => setHarvestForm({ ...harvestForm, actualQuantity: e.target.value })} />
          </Field>
          <Field label="Actual Total Weight (kg)" required>
            <Input type="number" step="any" min="0" required value={harvestForm.actualWeightKg} onChange={(e) => setHarvestForm({ ...harvestForm, actualWeightKg: e.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea value={harvestForm.notes} onChange={(e) => setHarvestForm({ ...harvestForm, notes: e.target.value })} />
          </Field>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Logging a harvest closes this production cycle.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setHarvestModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Confirm Harvest</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
