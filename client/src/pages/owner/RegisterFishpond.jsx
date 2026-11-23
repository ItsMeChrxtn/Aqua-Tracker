import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from '../../utils/notify';
import { fishpondApi } from '../../api/fishponds';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Field, Input, BarangaySelect } from '../../components/ui/FormField';
import Icon from '../../components/ui/Icon';
import { hectaresToSquareMeters } from '../../utils/format';
import { FISHPOND_BARANGAYS } from '../../utils/barangays';
import { MAX_AREA_HECTARES, MIN_AREA_HECTARES, MAX_CAPACITY } from '../../utils/limits';

const DOCUMENT_ACCEPT = 'image/*,.pdf,.doc,.docx';
const MAX_FILE_MB = 10;

// Upload box for one file: shows an image preview, or the file name for a
// PDF / Word document.
function UploadBox({ label, required, hint, accept, file, onChange }) {
  const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  return (
    <Field label={label} required={required} hint={hint}>
      <label
        className={`flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-2 text-center transition-colors ${
          file ? 'border-brand-300 bg-brand-50/40 text-brand-700' : 'border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500'
        }`}
      >
        {preview ? (
          <img src={preview} alt={label} className="h-20 max-w-full rounded-lg object-cover" />
        ) : (
          <Icon name={file ? 'clipboard' : 'image'} className="h-6 w-6" />
        )}
        <span className="line-clamp-2 break-all text-xs">{file ? file.name : 'Click to upload'}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files[0] || null;
            if (picked && picked.size > MAX_FILE_MB * 1024 * 1024) {
              toast.error(`${picked.name} is larger than ${MAX_FILE_MB} MB`);
              return;
            }
            onChange(picked);
          }}
        />
      </label>
    </Field>
  );
}

export default function RegisterFishpond() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', barangay: '', address: '', areaHectares: '', capacity: '' });
  const [image, setImage] = useState(null);
  const [moa, setMoa] = useState(null);
  const [spa, setSpa] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!moa) {
      toast.error('Please attach the MOA (Memorandum of Agreement) before submitting.');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('barangay', form.barangay);
      formData.append('address', form.address);
      if (form.areaHectares) formData.append('areaSize', hectaresToSquareMeters(form.areaHectares));
      if (form.capacity) formData.append('capacity', form.capacity);
      if (image) formData.append('image', image);
      formData.append('moa', moa);
      if (spa) formData.append('spa', spa);

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
    <div className="mx-auto max-w-2xl space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Register Fishpond</h2>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Fishpond Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JDC Tilapia Farm" />
          </Field>
          <Field label="Barangay" required>
            <BarangaySelect required options={FISHPOND_BARANGAYS} value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
          </Field>
          <Field label="Address" required hint="Street, sitio, or landmark of the fishpond">
            <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. Purok 3, near the barangay hall" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area Size (hectares)" hint={`Up to ${MAX_AREA_HECTARES} hectares`}>
              <Input type="number" min={MIN_AREA_HECTARES} max={MAX_AREA_HECTARES} step="any" value={form.areaHectares} onChange={(e) => setForm({ ...form, areaHectares: e.target.value })} placeholder="e.g. 0.5" />
            </Field>
            <Field label="Capacity (no. of fish)" hint="Most fish this pond can hold">
              <Input type="number" min="1" max={MAX_CAPACITY} step="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 5000" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <UploadBox label="Fishpond Photo" hint="Optional" accept="image/*" file={image} onChange={setImage} />
            <UploadBox label="MOA" required hint="Memorandum of Agreement — photo or PDF/Word" accept={DOCUMENT_ACCEPT} file={moa} onChange={setMoa} />
            <UploadBox label="SPA" hint="Special Power of Attorney — optional" accept={DOCUMENT_ACCEPT} file={spa} onChange={setSpa} />
          </div>
          <p className="text-xs text-slate-400">These help the Agriculture Office verify your registration. You cannot submit without the MOA.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" loading={saving} disabled={!moa}>
              Submit for Approval
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
