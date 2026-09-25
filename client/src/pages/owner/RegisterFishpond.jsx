import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from '../../utils/notify';
import { fishpondApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Field, Input, BarangaySelect } from '../../components/ui/FormField';
import Icon from '../../components/ui/Icon';

export default function RegisterFishpond() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', barangay: '', areaSize: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('barangay', form.barangay);
      if (form.areaSize) formData.append('areaSize', form.areaSize);
      if (image) formData.append('image', image);

      await fishpondApi.register(formData);
      toast.success('Fishpond registered — pending Agriculture Office approval.');
      navigate('/owner/fishponds');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to register fishpond'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Register Fishpond</h2>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Fishpond Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JDC Tilapia Farm" />
          </Field>
          <Field label="Barangay" required>
            <BarangaySelect required value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
          </Field>
          <Field label="Area Size (m²)">
            <Input type="number" min="0" value={form.areaSize} onChange={(e) => setForm({ ...form, areaSize: e.target.value })} />
          </Field>
          <Field label="Fishpond Photo" hint="Optional — helps the Agriculture Office verify your registration">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-6 text-slate-400 hover:border-brand-400 hover:text-brand-500">
              {preview ? (
                <img src={preview} alt="preview" className="h-24 rounded-lg object-cover" />
              ) : (
                <>
                  <Icon name="image" className="h-6 w-6" />
                  <span className="text-xs">Click to upload a photo</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" loading={saving}>
              Submit for Approval
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
