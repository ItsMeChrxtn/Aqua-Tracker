import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

const HIGHLIGHTS = [
  ['harvest', 'Automated harvest estimation'],
  ['sales', 'Sales and revenue tracking'],
  ['analytics', 'Exportable reports (PDF/Excel)'],
];

export default function AuthBrandPanel({ heading, sub }) {
  return (
    <div className="relative hidden w-[40%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 lg:flex">
      <div className="blob blob-a pointer-events-none -right-16 top-1/4 h-72 w-72 bg-leaf-400/15" />

      <div className="relative px-10 pt-10">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Icon name="freshwater" className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-base font-semibold text-white">AquaTrack</span>
        </Link>
      </div>
      <div className="relative px-10 pb-14">
        <h2 className="font-display max-w-sm text-[1.7rem] font-semibold leading-tight tracking-tight text-white">{heading}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-100">{sub}</p>
        <div className="mt-8 space-y-3">
          {HIGHLIGHTS.map(([icon, label]) => (
            <div key={label} className="flex items-center gap-3 text-sm text-brand-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
                <Icon name={icon} className="h-4 w-4" />
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
