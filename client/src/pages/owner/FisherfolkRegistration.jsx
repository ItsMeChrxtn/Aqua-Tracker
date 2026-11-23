import { useEffect, useMemo, useState } from 'react';
import toast from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';
import { fisherfolkApi } from '../../api/fisherfolk';
import { apiErrorMessage } from '../../api/client';
import { downloadFile } from '../../utils/download';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import { Field, Input, Select, BarangaySelect } from '../../components/ui/FormField';
import ApplicationSummary from '../../components/fisherfolk/ApplicationSummary';
import { localTodayISO } from '../../utils/dates';
import {
  REGISTRATION_TYPES,
  SALUTATIONS,
  EMPLOYMENT,
  SEX,
  CIVIL_STATUS,
  EDUCATION,
  RELIGIONS,
  MONTHLY_INCOME,
  INCOME_SOURCES,
  APPLICATION_STATUS,
  ageFrom,
} from '../../utils/fisherfolk';

const STEPS = ['Personal Info', 'Household & Background', 'Emergency & IDs', 'Livelihood', 'Attachments & Certification'];
const THIS_YEAR = new Date().getFullYear();
const isImage = (file) => /^image\//.test(file?.type || '');

function emptyForm(user) {
  const [firstName, ...rest] = String(user?.name || '').trim().split(/\s+/);
  return {
    registrationType: 'new',
    salutation: '',
    lastName: rest.length ? rest[rest.length - 1] : '',
    firstName: rest.length ? [firstName, ...rest.slice(0, -1)].join(' ') : firstName || '',
    middleName: '',
    appellation: '',
    address: { street: '', barangay: user?.barangay || '', municipality: 'Noveleta', province: 'Cavite' },
    fishingGround: 'Manila Bay',
    fmaNumber: '6',
    employment: '',
    contactNo: user?.phone || '',
    residentSince: '',
    birthDate: '',
    placeOfBirth: '',
    sex: '',
    civilStatus: '',
    childrenCount: '',
    household: { total: '', male: '', female: '', inSchool: '', outOfSchool: '', employed: '', unemployed: '' },
    education: '',
    educationOther: '',
    nationality: 'Filipino',
    religion: '',
    monthlyIncome: '',
    otherIncomeSource: '',
    otherIncomeValue: '',
    emergency: { name: '', relationship: '', contactNo: '', address: '' },
    hasVoterId: null,
    voterIdNo: '',
    cct4ps: null,
    indigenous: null,
    mainSources: [],
    otherSources: [],
    organizations: [],
    certified: false,
  };
}

// Server document → form state (numbers become text, dates become YYYY-MM-DD).
function toForm(app, user) {
  const base = emptyForm(user);
  if (!app) return base;
  const str = (v) => (v === undefined || v === null ? '' : String(v));
  const hh = app.household || {};
  return {
    ...base,
    ...Object.fromEntries(Object.keys(base).filter((k) => app[k] !== undefined && app[k] !== null).map((k) => [k, app[k]])),
    address: { ...base.address, ...(app.address || {}) },
    emergency: { ...base.emergency, ...(app.emergency || {}) },
    household: Object.fromEntries(Object.keys(base.household).map((k) => [k, str(hh[k])])),
    residentSince: str(app.residentSince),
    childrenCount: str(app.childrenCount),
    otherIncomeValue: str(app.otherIncomeValue),
    birthDate: app.birthDate ? String(app.birthDate).slice(0, 10) : '',
    hasVoterId: app.hasVoterId ?? null,
    cct4ps: app.cct4ps ?? null,
    indigenous: app.indigenous ?? null,
  };
}

// The required answers, and the step each one is on.
function missingFields(form, app, files) {
  const list = [];
  const need = (ok, label, step) => !ok && list.push({ label, step });
  need(form.registrationType, 'Type of registration', 0);
  need(form.lastName.trim(), 'Last name', 0);
  need(form.firstName.trim(), 'First name', 0);
  need(form.address.street.trim(), 'Street / Sitio', 0);
  need(form.address.barangay, 'Barangay', 0);
  need(form.contactNo.trim(), 'Contact number', 0);
  need(form.birthDate, 'Date of birth', 0);
  need(form.placeOfBirth.trim(), 'Place of birth', 0);
  need(form.sex, 'Sex', 0);
  need(form.civilStatus, 'Civil status', 0);
  need(form.education && (form.education !== 'others' || form.educationOther.trim()), 'Educational background', 1);
  need(form.monthlyIncome, 'Household monthly income', 1);
  need(form.emergency.name.trim(), 'Emergency contact person', 2);
  need(form.emergency.relationship.trim(), 'Emergency contact relationship', 2);
  need(form.emergency.contactNo.trim(), 'Emergency contact number', 2);
  need(form.mainSources.length, 'Main source of income', 3);
  need(files.photo || app?.photoUrl, 'Photo', 4);
  need(files.barangayCert || app?.barangayCertUrl, 'Barangay Certification', 4);
  need(form.certified, 'Certification checkbox', 4);
  return list;
}

// Pill-style single choice (radio) group.
function Choice({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(active ? '' : o.value)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
              active ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/30' : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300'
            }`}
          >
            {active && <Icon name="check" className="mr-1 inline h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const YES_NO = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
];

function SourcePicker({ title, value, onChange }) {
  const toggle = (type) => {
    const has = value.some((s) => s.type === type);
    onChange(has ? value.filter((s) => s.type !== type) : [...value, { type, details: '' }]);
  };
  const setDetails = (type, details) => onChange(value.map((s) => (s.type === type ? { ...s, details } : s)));
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-slate-700">{title}</p>
      <div className="space-y-2">
        {INCOME_SOURCES.map((o) => {
          const picked = value.find((s) => s.type === o.value);
          return (
            <div key={o.value} className="flex flex-wrap items-center gap-2">
              <label className="flex w-44 cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!picked} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
              {picked && o.detail && (
                <div className="min-w-0 flex-1">
                  <Input value={picked.details} onChange={(e) => setDetails(o.value, e.target.value)} placeholder={o.detail} maxLength={100} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilePicker({ label, hint, accept, file, savedUrl, savedName, onPick, imagePreview }) {
  const preview = useMemo(() => (file && isImage(file) ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  return (
    <Field label={label} required hint={hint}>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3">
        {imagePreview &&
          (preview ? (
            <img src={preview} alt="" className="h-24 w-24 rounded-lg object-cover" />
          ) : (
            <FishpondPhoto src={savedUrl} alt="" className="h-24 w-24 rounded-lg" />
          ))}
        <div className="min-w-0 flex-1 text-sm">
          <input type="file" accept={accept} onChange={(e) => onPick(e.target.files?.[0] || null)} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700" />
          <p className="mt-1.5 truncate text-xs text-slate-500">
            {file ? `Selected: ${file.name}` : savedUrl ? `Uploaded: ${savedName || 'file on record'}` : 'No file yet'}
          </p>
        </div>
      </div>
    </Field>
  );
}

export default function FisherfolkRegistration() {
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [form, setForm] = useState(() => emptyForm(user));
  const [files, setFiles] = useState({ photo: null, barangayCert: null });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fisherfolkApi
      .mine()
      .then((a) => {
        setApp(a);
        setForm(toForm(a, user));
      })
      .catch((err) => toast.error(apiErrorMessage(err, 'Failed to load your application')))
      .finally(() => setLoading(false));
  }, [user]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setIn = (group, key, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
  const bind = (key) => ({ value: form[key], onChange: (e) => set(key, e.target.value) });
  const bindIn = (group, key) => ({ value: form[group][key], onChange: (e) => setIn(group, key, e.target.value) });

  const locked = app && ['pending', 'approved'].includes(app.status);
  const status = APPLICATION_STATUS[app?.status || 'draft'];
  const religionIsOther = form.religion && !RELIGIONS.includes(form.religion);
  const [religionOther, setReligionOther] = useState(false);
  const showReligionOther = religionOther || religionIsOther;

  const save = async (submit) => {
    if (submit) {
      const missing = missingFields(form, app, files);
      if (missing.length) {
        setStep(missing[0].step);
        toast.error(`Please complete: ${missing.map((m) => m.label).join(', ')}`);
        return;
      }
    }
    setSaving(true);
    try {
      const saved = await fisherfolkApi.saveMine(form, { ...files, submit });
      setApp(saved);
      setForm(toForm(saved, user));
      setFiles({ photo: null, barangayCert: null });
      if (submit) {
        toast.success('Your application was submitted to the Municipal Agriculture Office for review.');
      } else {
        toast.success('Draft saved. You can continue anytime.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save your application'));
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => downloadFile(fisherfolkApi.myPdfUrl(), 'FishR_Application.pdf').catch(() => {});

  if (loading) return <Spinner />;

  // Submitted / approved: read-only.
  if (locked) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Fisherfolk Registration</h2>
            <p className="text-sm text-slate-500">Application for Municipal Fisherfolk Registration (BFAR FishR)</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.className}>{status.label}</Badge>
            <Button variant="secondary" icon="download" onClick={downloadPdf}>Download / Print PDF</Button>
          </div>
        </div>
        <Card>
          <div className={`mb-4 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${app.status === 'approved' ? 'bg-leaf-50 text-leaf-800' : 'bg-amber-50 text-amber-800'}`}>
            <Icon name={app.status === 'approved' ? 'shieldCheck' : 'clock'} className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {app.status === 'approved'
                ? `You are a registered fisherfolk. Registration No. ${app.registrationNo}.`
                : 'Your application is being reviewed by the Municipal Agriculture Office. Print the PDF, sign it, and have it verified by your Punong Barangay.'}
            </p>
          </div>
          <ApplicationSummary application={app} />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fisherfolk Registration</h2>
          <p className="text-sm text-slate-500">Application for Municipal Fisherfolk Registration (BFAR FishR). You can save a draft and continue later.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={status.className}>{status.label}</Badge>
          {app && (
            <Button variant="secondary" size="sm" icon="download" onClick={downloadPdf}>PDF</Button>
          )}
        </div>
      </div>

      {app?.status === 'rejected' && app.remarks && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">Returned for correction:</span> {app.remarks}
          </p>
        </div>
      )}

      {/* Stepper */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                i === step ? 'border-brand-600 bg-brand-600 text-white' : i < step ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i === step ? 'bg-white/20' : 'bg-white'}`}>{i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <Card title={`${step + 1}. ${STEPS[step]}`}>
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Type of Registration" required>
              <Choice options={REGISTRATION_TYPES} value={form.registrationType} onChange={(v) => set('registrationType', v)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr_1fr_110px]">
              <Field label="Salutation">
                <Select {...bind('salutation')}>
                  <option value="">—</option>
                  {SALUTATIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Last Name" required>
                <Input {...bind('lastName')} maxLength={60} />
              </Field>
              <Field label="First Name" required>
                <Input {...bind('firstName')} maxLength={60} />
              </Field>
              <Field label="Middle Name">
                <Input {...bind('middleName')} maxLength={60} />
              </Field>
              <Field label="Appellation" hint="Sr, Jr, III">
                <Input {...bind('appellation')} maxLength={10} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Field label="Street / Sitio / Purok" required>
                  <Input {...bindIn('address', 'street')} maxLength={120} />
                </Field>
              </div>
              <Field label="Barangay" required>
                <BarangaySelect {...bindIn('address', 'barangay')} />
              </Field>
              <Field label="Municipality / Province">
                <Input value={`${form.address.municipality}, ${form.address.province}`} disabled />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Fishing Ground">
                <Input {...bind('fishingGround')} maxLength={80} />
              </Field>
              <Field label="FMA Number">
                <Input {...bind('fmaNumber')} maxLength={10} />
              </Field>
              <Field label="Full Time / Part Time">
                <Choice options={EMPLOYMENT} value={form.employment} onChange={(v) => set('employment', v)} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Contact No." required>
                <Input inputMode="tel" maxLength={13} {...bind('contactNo')} placeholder="09171234567" />
              </Field>
              <Field label="Resident of Noveleta since" hint="Year">
                <Input type="number" min={1900} max={THIS_YEAR} {...bind('residentSince')} placeholder={String(THIS_YEAR)} />
              </Field>
              <Field label="Date of Birth" required hint={form.birthDate ? `Age: ${ageFrom(form.birthDate)}` : undefined}>
                <Input type="date" max={localTodayISO()} {...bind('birthDate')} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Place of Birth" required hint="Municipality, Province">
                <Input {...bind('placeOfBirth')} maxLength={100} />
              </Field>
              <Field label="Sex" required>
                <Choice options={SEX} value={form.sex} onChange={(v) => set('sex', v)} />
              </Field>
              <Field label="No. of Children">
                <Input type="number" min={0} {...bind('childrenCount')} />
              </Field>
            </div>
            <Field label="Civil Status" required>
              <Choice options={CIVIL_STATUS} value={form.civilStatus} onChange={(v) => set('civilStatus', v)} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-slate-700">Household</p>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['total', 'Total No. of Households'],
                  ['male', 'No. of Male'],
                  ['female', 'No. of Female'],
                  ['inSchool', 'No. of In-School'],
                  ['outOfSchool', 'No. of Out-of-School'],
                  ['employed', 'No. of Employed'],
                  ['unemployed', 'No. of Unemployed'],
                ].map(([k, l]) => (
                  <Field key={k} label={l}>
                    <Input type="number" min={0} {...bindIn('household', k)} />
                  </Field>
                ))}
              </div>
            </div>
            <Field label="Educational Background" required>
              <Choice options={EDUCATION} value={form.education} onChange={(v) => set('education', v)} />
            </Field>
            {form.education === 'others' && (
              <Field label="Please specify" required>
                <Input {...bind('educationOther')} maxLength={80} />
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nationality">
                <Input {...bind('nationality')} maxLength={40} />
              </Field>
              <Field label="Religion">
                <div className="space-y-2">
                  <Select
                    value={showReligionOther ? '__others__' : form.religion}
                    onChange={(e) => {
                      const other = e.target.value === '__others__';
                      setReligionOther(other);
                      set('religion', other ? '' : e.target.value);
                    }}
                  >
                    <option value="">Select religion</option>
                    {RELIGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="__others__">Others</option>
                  </Select>
                  {showReligionOther && <Input {...bind('religion')} placeholder="Please specify" maxLength={60} />}
                </div>
              </Field>
            </div>
            <Field label="Household Monthly Income" required>
              <Choice options={MONTHLY_INCOME} value={form.monthlyIncome} onChange={(v) => set('monthlyIncome', v)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Other Source of Income" hint="e.g. Farming, Fishing">
                <Input {...bind('otherIncomeSource')} maxLength={80} />
              </Field>
              <Field label="Income Value (₱ per month)">
                <Input type="number" min={0} {...bind('otherIncomeValue')} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-slate-700">Person to notify in case of emergency</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Full Name" required>
                <Input {...bindIn('emergency', 'name')} maxLength={100} />
              </Field>
              <Field label="Relationship" required>
                <Input {...bindIn('emergency', 'relationship')} maxLength={40} placeholder="e.g. Spouse" />
              </Field>
              <Field label="Contact No." required>
                <Input inputMode="tel" maxLength={13} {...bindIn('emergency', 'contactNo')} placeholder="09171234567" />
              </Field>
            </div>
            <Field label="Address" hint="Barangay, Municipality, Province">
              <Input {...bindIn('emergency', 'address')} maxLength={150} />
            </Field>
            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Field label="With Voter's ID?">
                  <Choice options={YES_NO} value={form.hasVoterId} onChange={(v) => set('hasVoterId', v === '' ? null : v)} />
                </Field>
                {form.hasVoterId && (
                  <Field label="Voter's ID No.">
                    <Input {...bind('voterIdNo')} maxLength={40} />
                  </Field>
                )}
              </div>
              <Field label="CCT / 4Ps beneficiary?">
                <Choice options={YES_NO} value={form.cct4ps} onChange={(v) => set('cct4ps', v === '' ? null : v)} />
              </Field>
              <Field label="Indigenous Cultural Community (IP)?">
                <Choice options={YES_NO} value={form.indigenous} onChange={(v) => set('indigenous', v === '' ? null : v)} />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="grid gap-6 md:grid-cols-2">
              <SourcePicker title="Main Source of Income *" value={form.mainSources} onChange={(v) => set('mainSources', v)} />
              <SourcePicker title="Other Sources of Income" value={form.otherSources} onChange={(v) => set('otherSources', v)} />
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-slate-700">Organization (if member)</p>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="plus"
                  disabled={form.organizations.length >= 5}
                  onClick={() => set('organizations', [...form.organizations, { name: '', memberSince: '', position: '' }])}
                >
                  Add
                </Button>
              </div>
              {form.organizations.length === 0 && <p className="text-xs text-slate-400">No organization added.</p>}
              <div className="space-y-2">
                {form.organizations.map((o, i) => {
                  const update = (k, v) => set('organizations', form.organizations.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                  return (
                    <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_130px_1fr_auto]">
                      <Field label={i === 0 ? 'Name of Organization' : undefined}>
                        <Input value={o.name} onChange={(e) => update('name', e.target.value)} maxLength={100} />
                      </Field>
                      <Field label={i === 0 ? 'Member Since' : undefined}>
                        <Input value={o.memberSince} onChange={(e) => update('memberSince', e.target.value)} maxLength={20} placeholder="Year" />
                      </Field>
                      <Field label={i === 0 ? 'Position / Designation' : undefined}>
                        <Input value={o.position} onChange={(e) => update('position', e.target.value)} maxLength={60} />
                      </Field>
                      <Button variant="ghost" icon="trash" onClick={() => set('organizations', form.organizations.filter((_, j) => j !== i))} aria-label="Remove" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FilePicker
                label="Photo (1½″ × 1½″)"
                hint="Taken within the last six (6) months. JPG or PNG."
                accept="image/png,image/jpeg,image/webp"
                file={files.photo}
                savedUrl={app?.photoUrl}
                imagePreview
                onPick={(f) => setFiles((x) => ({ ...x, photo: f }))}
              />
              <FilePicker
                label="Barangay Certification of fishpond ownership"
                hint="Photo or PDF of the certification from your Punong Barangay."
                accept="image/png,image/jpeg,image/webp,application/pdf"
                file={files.barangayCert}
                savedUrl={app?.barangayCertUrl}
                savedName={app?.barangayCertName}
                onPick={(f) => setFiles((x) => ({ ...x, barangayCert: f }))}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={form.certified} onChange={(e) => set('certified', e.target.checked)} />
              <span>
                <span className="font-semibold">Certification *</span> — I have personally reviewed the information on this application and I certify under penalty of perjury that to the best of my
                knowledge and belief the information on this application is true and correct, and that I understand this information is subject to public.
              </span>
            </label>
            <p className="text-xs text-slate-500">
              After submitting, download the PDF, sign it and put your thumbmark, then have it verified by your Punong Barangay before bringing it to the Municipal Agriculture Office.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button variant="secondary" icon="chevronLeft" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={saving} onClick={() => save(false)}>
              Save Draft
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Next <Icon name="chevronRight" className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="accent" icon="check" loading={saving} onClick={() => save(true)}>
                Submit Application
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
