import { useT } from './useT';

// EN | FIL switch shown in the top bar.
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang } = useT();
  return (
    <div className={`flex overflow-hidden rounded-lg border border-slate-200 text-[11px] font-bold ${className}`} role="group" aria-label="Language">
      {[
        ['en', 'EN'],
        ['fil', 'FIL'],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          title={value === 'fil' ? 'Filipino' : 'English'}
          className={`px-2 py-1 ${lang === value ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
