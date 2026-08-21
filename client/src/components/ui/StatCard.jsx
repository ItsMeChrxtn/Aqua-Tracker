import Icon from './Icon';

const TONE = {
  brand: 'from-brand-400 to-brand-600',
  emerald: 'from-leaf-400 to-leaf-600',
  amber: 'from-amber-400 to-amber-600',
  rose: 'from-rose-400 to-rose-600',
  violet: 'from-violet-400 to-violet-600',
  sky: 'from-sky-400 to-sky-600',
};

export default function StatCard({ label, value, sub, icon, tone = 'brand' }) {
  const t = TONE[tone] || TONE.brand;
  return (
    <div className="hover-lift rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase leading-snug tracking-wide text-slate-600">{label}</p>
          <p className="font-display mt-1.5 text-2xl font-medium leading-none tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-slate-600">{sub}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t} text-white shadow-sm`}>
            <Icon name={icon} className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
    </div>
  );
}
