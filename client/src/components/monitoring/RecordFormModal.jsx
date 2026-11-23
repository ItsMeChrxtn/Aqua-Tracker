import { useEffect, useState } from 'react';
import toast from '../../utils/notify';
import { apiErrorMessage } from '../../api/client';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Field, Input, Select, SelectWithOther, Textarea } from '../ui/FormField';
import { fishLabel } from '../../utils/cycleLabels';
import { localTodayISO as todayISO } from '../../utils/dates';

function buildInitialForm(fields) {
  return fields.reduce((acc, f) => ({ ...acc, [f.name]: f.type === 'date' ? todayISO() : '' }), {});
}

/**
 * Form for logging one monitoring record (stocking / feeding / mortality /
 * growth) against one of the fishpond's active batches. `fields` describe the
 * inputs; a field with `loadOptions(fishpondId)` gets its choices on open.
 */
export default function RecordFormModal({ open, onClose, title, api, fields, fishpondId, activeCycles, onSaved }) {
  const [form, setForm] = useState(() => buildInitialForm(fields));
  const [selectedCycle, setSelectedCycle] = useState('');
  const [fieldOptions, setFieldOptions] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(fields));
    setSelectedCycle(activeCycles[0]?._id || '');
    fields
      .filter((f) => f.loadOptions)
      .forEach((f) => f.loadOptions(fishpondId).then((options) => setFieldOptions((o) => ({ ...o, [f.name]: options }))));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
      onClose();
      onSaved?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save record'));
    } finally {
      setSaving(false);
    }
  };

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        {activeCycles.length > 0 ? (
          <Field label="Fish Name" required>
            <Select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
              {activeCycles.map((c) => (
                <option key={c._id} value={c._id}>
                  {fishLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No active production cycle for this fishpond. Start one from the fishpond&apos;s detail page first.
          </p>
        )}
        {fields.map((f) => (
          <Field key={f.name} label={f.label} required={f.required} hint={f.hint}>
            {f.type === 'textarea' ? (
              <Textarea value={form[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'select' ? (
              <Select required={f.required} value={form[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">{f.placeholder || 'Select…'}</option>
                {(fieldOptions[f.name] || f.options || []).map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === 'selectWithOther' ? (
              <SelectWithOther
                options={f.options}
                placeholder={f.placeholder}
                otherPlaceholder={f.otherPlaceholder}
                required={f.required}
                value={form[f.name]}
                onChange={(value) => set(f.name, value)}
              />
            ) : (
              <Input
                type={f.type}
                step={f.type === 'number' ? 'any' : undefined}
                min={f.type === 'number' ? 0 : f.minToday ? todayISO() : undefined}
                required={f.required}
                value={form[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
          </Field>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={activeCycles.length === 0}>
            Save Record
          </Button>
        </div>
      </form>
    </Modal>
  );
}
