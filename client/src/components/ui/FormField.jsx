import { useState } from 'react';
import { NOVELETA_BARANGAYS } from '../../utils/barangays';

export function Field({ label, hint, error, required, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

const baseInput =
  'block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-shadow focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 disabled:bg-slate-50 disabled:text-slate-400';

export function Input(props) {
  return <input className={baseInput} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={`${baseInput} cursor-pointer`} {...props}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  return <textarea className={baseInput} rows={3} {...props} />;
}

const OTHERS = '__others__';

// Dropdown with an "Others" choice that reveals a text box. `onChange` gets the
// plain value: the picked option, or whatever was typed.
export function SelectWithOther({ options, value, onChange, required, placeholder, otherPlaceholder = 'Please specify' }) {
  const [typing, setTyping] = useState(Boolean(value) && !options.some((o) => o.value === value));

  const pick = (e) => {
    const others = e.target.value === OTHERS;
    setTyping(others);
    onChange(others ? '' : e.target.value);
  };

  return (
    <div className="space-y-2">
      <Select required={required} value={typing ? OTHERS : value} onChange={pick}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        <option value={OTHERS}>Others</option>
      </Select>
      {typing && <Input required autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={otherPlaceholder} />}
    </div>
  );
}

// Dropdown of Noveleta barangays. A saved value outside the official list
// (older free-text data) is kept as an extra option so editing doesn't drop it.
export function BarangaySelect({ value, placeholder = 'Select barangay', ...props }) {
  const legacy = value && !NOVELETA_BARANGAYS.includes(value);
  return (
    <Select value={value || ''} {...props}>
      <option value="" disabled={props.required}>
        {placeholder}
      </option>
      {NOVELETA_BARANGAYS.map((b) => (
        <option key={b} value={b}>{b}</option>
      ))}
      {legacy && <option value={value}>{value}</option>}
    </Select>
  );
}
