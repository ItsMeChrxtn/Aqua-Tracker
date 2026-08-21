import Icon from './Icon';

export default function WelcomeBanner({ name, message }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-sm">
      <Icon name="fish" className="absolute -right-2 -top-2 h-20 w-20 text-white/10" />
      <p className="font-display relative text-xl font-semibold">Welcome, {name}</p>
      <p className="relative mt-1 text-sm text-brand-100">{message}</p>
    </div>
  );
}
