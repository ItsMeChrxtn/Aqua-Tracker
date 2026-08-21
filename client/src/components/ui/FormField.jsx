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
