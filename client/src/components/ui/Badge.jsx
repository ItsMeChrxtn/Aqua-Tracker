export default function Badge({ children, className = 'bg-slate-50 text-slate-700 border-slate-300' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${className}`}>
      {children}
    </span>
  );
}
