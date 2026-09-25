import { useEffect, useState } from 'react';
import toast from '../../utils/notify';
import { settingsApi } from '../../api/misc';
import { apiErrorMessage } from '../../api/client';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { Field, Input } from '../ui/FormField';

export default function SystemSettingsForm({ title }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.get().then(setForm);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await settingsApi.update(form);
      setForm(updated);
      toast.success('Settings updated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update settings'));
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Spinner />;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Municipality Name">
            <Input value={form.municipalityName} onChange={(e) => setForm({ ...form, municipalityName: e.target.value })} />
          </Field>
          <Field label="Office Name">
            <Input value={form.officeName} onChange={(e) => setForm({ ...form, officeName: e.target.value })} />
          </Field>
          <Field label="Office Contact Email">
            <Input type="email" value={form.officeContactEmail} onChange={(e) => setForm({ ...form, officeContactEmail: e.target.value })} />
          </Field>
          <Field label="Office Phone">
            <Input value={form.officePhone} onChange={(e) => setForm({ ...form, officePhone: e.target.value })} />
          </Field>
          <Field label="Office Address">
            <Input value={form.officeAddress} onChange={(e) => setForm({ ...form, officeAddress: e.target.value })} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>Save Settings</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
