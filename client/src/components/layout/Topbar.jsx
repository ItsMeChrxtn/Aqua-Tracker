import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABEL } from '../../utils/format';
import Icon from '../ui/Icon';
import NotificationBell from './NotificationBell';

export default function Topbar({ title, onMenuClick }) {
  const { user } = useAuth();
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-700 sm:text-base">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight text-slate-700">{user.name}</p>
            <p className="text-[11px] leading-tight text-slate-400">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
