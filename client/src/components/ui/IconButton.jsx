import Icon from './Icon';

const TONES = {
  brand: 'text-brand-600 hover:bg-brand-50 hover:border-brand-200',
  success: 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200',
  warning: 'text-amber-600 hover:bg-amber-50 hover:border-amber-200',
  danger: 'text-rose-600 hover:bg-rose-50 hover:border-rose-200',
  neutral: 'text-slate-600 hover:bg-slate-100 hover:border-slate-300',
};

// Icon-only action button. `label` is required: it becomes the hover tooltip
// and the accessible name, since there is no visible text.
export default function IconButton({ icon, label, tone = 'neutral', loading = false, className = '', ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TONES[tone]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      <Icon name={loading ? 'spinner' : icon} className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}
