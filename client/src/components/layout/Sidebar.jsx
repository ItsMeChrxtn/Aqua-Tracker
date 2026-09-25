import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { NAV_CONFIG } from '../../utils/navConfig';
import Icon from '../ui/Icon';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const sections = NAV_CONFIG[user.role] || [];

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-700 shadow-sm transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm">
            <Icon name="freshwater" className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold leading-tight text-slate-800">AquaTrack</p>
            <p className="text-[11px] leading-tight text-slate-400">Aquaculture Monitoring System</p>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
          {sections.map((section, idx) => (
            <div key={section.section || idx}>
              {section.section && (
                <p className="mb-1 px-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {section.section}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to.endsWith('dashboard') || item.to.endsWith('users') || item.to.endsWith('fishponds')}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm'
                          : 'text-slate-600 hover:translate-x-0.5 hover:bg-brand-50 hover:text-brand-700'
                      }`
                    }
                  >
                    <Icon name={item.icon} className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-2.5">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Icon name="logout" className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
