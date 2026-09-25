import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { cycleApi } from '../../api/fishponds';
import { useOwnerFishponds } from '../../hooks/useOwnerFishponds';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import { apiErrorMessage } from '../../api/client';
import Card from '../ui/Card';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/FormField';
import LineTrendChart from '../charts/LineTrendChart';
import SpeciesFilterSelect from '../charts/SpeciesFilterSelect';
import { formatDate } from '../../utils/format';
import IconButton from '../ui/IconButton';

const todayISO = () => new Date().toISOString().slice(0, 10);

function buildInitialForm(fields) {
  return fields.reduce((acc, f) => ({ ...acc, [f.name]: f.type === 'date' ? todayISO() : '' }), {});
}

/**
 * Shared page shell for the four fishpond-wide monitoring record types
 * (stocking / feeding / mortality / growth). Combines every cycle's records
 * for the selected fishpond — past batches and the current one — and can be
 * narrowed to a single species, per the "chart shows history + species
 * filter" requirement.
 */
export default function MonitoringRecordPage({ title, description, api, fields, chartMetricKey, chartLabel, emptyIcon = 'clipboard' }) {
  const { fishponds, loading: loadingFishponds } = useOwnerFishponds();
  const { species } = useSpeciesList();

  const [fishpondId, setFishpondId] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [activeCycles, setActiveCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(buildInitialForm(fields));
  const [selectedCycle, setSelectedCycle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fishpondId && fishponds.length > 0) setFishpondId(fishponds[0]._id);
  }, [fishponds, fishpondId]);

  const loadRecords = () => {
    if (!fishpondId) return;
    setLoading(true);
    api
      .listForFishpond(fishpondId, speciesFilter ? { speciesId: speciesFilter } : undefined)
      .then((res) => {
        setRecords(res.records);
        setCycles(res.cycles);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadRecords, [fishpondId, speciesFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!fishpondId) return;
    cycleApi.listForFishpond(fishpondId, { status: 'active' }).then((list) => {
      setActiveCycles(list);
      setSelectedCycle(list[0]?._id || '');
    });
  }, [fishpondId]);

  const openModal = () => {
    setForm(buildInitialForm(fields));
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedCycle) {
      toast.error('This fishpond has no active production cycle yet. Start one from Fishpond List first.');
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      fields.forEach((f) => {
        if (form[f.name] !== '') payload[f.name] = f.type === 'number' ? Number(form[f.name]) : form[f.name];
      });
      await api.create(selectedCycle, payload);
      toast.success('Record saved');
      setModalOpen(false);
      loadRecords();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save record'));
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (id) => {
    if (!(await confirm('Delete this record?'))) return;
    await api.remove(id);
    toast.success('Record deleted');
    loadRecords();
  };

  const chartData = chartMetricKey
    ? records.map((r) => ({ x: formatDate(r.date), [chartMetricKey]: r[chartMetricKey] }))
    : [];

  const columns = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    ...fields
      .filter((f) => f.name !== 'date')
      .map((f) => ({ key: f.name, header: f.label, render: (r) => (r[f.name] !== undefined && r[f.name] !== '' ? `${r[f.name]}${f.unit ? ` ${f.unit}` : ''}` : '—') })),
    { key: 'batch', header: 'Batch', render: (r) => r.cycle?.batchName || '—' },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <IconButton icon="trash" label="Delete" tone="danger" onClick={() => removeRecord(r._id)} />
      ),
    },
  ];

  if (loadingFishponds) return null;

  if (fishponds.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title="No approved fishponds yet"
        message="Register a fishpond and wait for Agriculture Office approval before you can log monitoring data."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-600">{description}</p>}
        </div>
        <Button icon="plus" onClick={openModal}>
          Add Record
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={fishpondId} onChange={(e) => setFishpondId(e.target.value)} className="w-56">
          {fishponds.map((f) => (
            <option key={f._id} value={f._id}>
              {f.name}
            </option>
          ))}
        </Select>
        <SpeciesFilterSelect species={species} value={speciesFilter} onChange={setSpeciesFilter} />
      </div>

      {chartMetricKey && (
        <Card title={chartLabel}>
          <LineTrendChart data={chartData} series={[{ key: chartMetricKey, label: chartLabel }]} />
        </Card>
      )}

      <Card title="Records" padded={false}>
        <div className="p-2">
          <DataTable columns={columns} rows={records} loading={loading} />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${title.slice(0, -1)}`}>
        <form onSubmit={submit} className="space-y-4">
          {activeCycles.length > 1 && (
            <Field label="Batch / Cycle" required>
              <Select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
                {activeCycles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.batchName || c._id.slice(-6)} — {c.species?.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {activeCycles.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              No active production cycle for this fishpond. Start one from the fishpond&apos;s detail page first.
            </p>
          )}
          {fields.map((f) => (
            <Field key={f.name} label={f.label} required={f.required} hint={f.hint}>
              {f.type === 'textarea' ? (
                <Textarea value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
              ) : (
                <Input
                  type={f.type}
                  step={f.type === 'number' ? 'any' : undefined}
                  required={f.required}
                  value={form[f.name]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              )}
            </Field>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={activeCycles.length === 0}>
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
