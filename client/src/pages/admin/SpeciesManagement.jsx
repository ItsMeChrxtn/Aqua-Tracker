import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { speciesApi } from '../../api/species';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Icon from '../../components/ui/Icon';
import { Field, Input, Select, Textarea } from '../../components/ui/FormField';
import { WATER_TYPE_LABEL } from '../../utils/format';
import IconButton from '../../components/ui/IconButton';

const EMPTY_FORM = {
  name: '',
  waterType: 'freshwater',
  recommendedHarvestWeightMin: '',
  recommendedHarvestWeightMax: '',
  typicalGrowoutDays: '',
  notes: '',
};

// Suggestions for the species name; any other name can still be typed.
const SPECIES_SUGGESTIONS = ['Tilapia', 'Bangus (Milkfish)', 'Hito (Catfish)', 'Shrimp (Hipon)', 'Crab (Alimango)', 'Carp'];

const WATER_TYPE_BADGE = {
  freshwater: 'bg-sky-50 text-sky-700 border-sky-300',
  saltwater: 'bg-cyan-50 text-cyan-700 border-cyan-300',
  brackish: 'bg-teal-50 text-teal-700 border-teal-300',
};

export default function SpeciesManagement() {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    speciesApi.list().then(setSpecies).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      waterType: s.waterType,
      recommendedHarvestWeightMin: s.recommendedHarvestWeightMin,
      recommendedHarvestWeightMax: s.recommendedHarvestWeightMax,
      typicalGrowoutDays: s.typicalGrowoutDays || '',
      notes: s.notes || '',
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (Number(form.recommendedHarvestWeightMin) > Number(form.recommendedHarvestWeightMax)) {
      toast.error('The minimum harvest weight cannot be more than the maximum.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        recommendedHarvestWeightMin: Number(form.recommendedHarvestWeightMin),
        recommendedHarvestWeightMax: Number(form.recommendedHarvestWeightMax),
        typicalGrowoutDays: form.typicalGrowoutDays ? Number(form.typicalGrowoutDays) : undefined,
      };
      if (editing) {
        await speciesApi.update(editing._id, payload);
        toast.success('Species updated');
      } else {
        await speciesApi.create(payload);
        toast.success('Species added');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save species'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!(await confirm(`Delete species "${s.name}"? Existing production cycles referencing it will be unaffected.`, { title: 'Delete this species?' }))) return;
    try {
      await speciesApi.remove(s._id);
      toast.success('Species deleted');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete species'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Species Management</h2>
          <p className="text-sm text-slate-600">Defines each species&apos; type of water and recommended harvest weight, used to drive harvest-readiness recommendations.</p>
        </div>
        <Button icon="plus" onClick={openCreate}>Add Species</Button>
      </div>

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              { key: 'name', header: 'Species' },
              {
                key: 'waterType',
                header: 'Type of Water',
                value: (s) => WATER_TYPE_LABEL[s.waterType],
                render: (s) => (
                  <Badge className={WATER_TYPE_BADGE[s.waterType]}>
                    <Icon name={s.waterType === 'freshwater' ? 'freshwater' : 'saltwater'} className="mr-1 h-3 w-3" />
                    {WATER_TYPE_LABEL[s.waterType]}
                  </Badge>
                ),
              },
              {
                key: 'recommendedHarvestWeightMin',
                header: 'Recommended Harvest Weight',
                value: (s) => s.recommendedHarvestWeightMin,
                render: (s) => `${s.recommendedHarvestWeightMin}–${s.recommendedHarvestWeightMax} g`,
              },
              { key: 'typicalGrowoutDays', header: 'Typical Grow-out', render: (s) => (s.typicalGrowoutDays ? `${s.typicalGrowoutDays} days` : '—') },
              { key: 'isActive', header: 'Status', value: (s) => (s.isActive ? 'Active' : 'Inactive'), render: (s) => <Badge className={s.isActive ? 'bg-leaf-50 text-leaf-700 border-leaf-300' : 'bg-slate-50 text-slate-600 border-slate-300'}>{s.isActive ? 'Active' : 'Inactive'}</Badge> },
              {
                key: 'actions',
                header: '',
                render: (s) => (
                  <div className="flex gap-1.5">
                    <IconButton icon="edit" label="Edit" tone="brand" onClick={() => openEdit(s)} />
                    <IconButton icon="trash" label="Delete" tone="danger" onClick={() => remove(s)} />
                  </div>
                ),
              },
            ]}
            rows={species}
            searchable="Search species, type of water…"
            emptyMessage="No species defined yet. Add one so fishpond owners can start production cycles."
          />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : 'Add Species'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Species Name" required>
            <Input required list="species-suggestions" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tilapia" />
            <datalist id="species-suggestions">
              {SPECIES_SUGGESTIONS.filter((n) => !species.some((s) => s.name.toLowerCase() === n.toLowerCase())).map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          {!editing && (
            <div className="-mt-2 flex flex-wrap gap-1.5">
              {SPECIES_SUGGESTIONS.filter((n) => !species.some((s) => s.name.toLowerCase() === n.toLowerCase())).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, name: n })}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700"
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <Field label="Type of Water" required hint="Whether this species is raised in freshwater, saltwater, or brackish ponds">
            <Select value={form.waterType} onChange={(e) => setForm({ ...form, waterType: e.target.value })}>
              <option value="freshwater">Freshwater</option>
              <option value="saltwater">Saltwater</option>
              <option value="brackish">Brackish</option>
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-slate-700">
              Recommended Harvest Weight (g) <span className="text-rose-500">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum">
                <Input type="number" min="1" required placeholder="e.g. 250" value={form.recommendedHarvestWeightMin} onChange={(e) => setForm({ ...form, recommendedHarvestWeightMin: e.target.value })} />
              </Field>
              <Field label="Maximum">
                <Input type="number" min="1" required placeholder="e.g. 350" value={form.recommendedHarvestWeightMax} onChange={(e) => setForm({ ...form, recommendedHarvestWeightMax: e.target.value })} />
              </Field>
            </div>
          </fieldset>
          <Field label="Typical Grow-out Period (days)">
            <Input type="number" min="1" value={form.typicalGrowoutDays} onChange={(e) => setForm({ ...form, typicalGrowoutDays: e.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save Changes' : 'Add Species'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
