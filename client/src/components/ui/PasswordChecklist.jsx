import { PASSWORD_RULES } from '../../utils/password';
import Icon from './Icon';

// Live list of the password requirements; each turns green once met.
export default function PasswordChecklist({ password }) {
  const value = password || '';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
      <p className="mb-1.5 text-xs font-semibold text-slate-700">Password requirements</p>
      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(value);
          return (
            <li key={rule.key} className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-700' : 'text-slate-500'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${met ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white'}`}>
                {met && <Icon name="check" className="h-3 w-3" />}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
