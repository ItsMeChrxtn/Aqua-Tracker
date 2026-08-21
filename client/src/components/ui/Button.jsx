import Icon from './Icon';

const SHINE =
  "relative overflow-hidden after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-transform after:duration-700 hover:after:translate-x-full";

const VARIANTS = {
  primary: `bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-brand-700 focus-visible:outline-brand-600 ${SHINE}`,
  accent: `bg-gradient-to-br from-leaf-500 to-leaf-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-leaf-700 focus-visible:outline-leaf-600 ${SHINE}`,
  secondary: 'bg-white text-slate-700 border border-slate-300 shadow-sm hover:shadow-md hover:-translate-y-0.5',
  danger: 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-rose-700 focus-visible:outline-rose-600',
  ghost: 'text-slate-600 hover:bg-slate-100 border border-transparent',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  type = 'button',
  ...props
}) {
  const sizeClass = size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4.5 py-2 text-sm';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${VARIANTS[variant]} ${sizeClass} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
        {loading ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : icon && <Icon name={icon} className="h-4 w-4" />}
        {children}
      </span>
    </button>
  );
}
