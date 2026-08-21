import Icon from './Icon';

export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <Icon name="spinner" className="h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}
