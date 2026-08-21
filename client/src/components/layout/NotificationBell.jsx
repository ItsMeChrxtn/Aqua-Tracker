import { useEffect, useRef, useState } from 'react';
import { notificationApi } from '../../api/misc';
import { formatDateTime } from '../../utils/format';
import Icon from '../ui/Icon';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const load = () => {
    notificationApi
      .list()
      .then((res) => {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markRead = async (id) => {
    await notificationApi.markRead(id);
    load();
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in-up absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl" style={{ animationDuration: '0.18s' }}>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</p>}
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => markRead(n._id)}
                className={`block w-full border-b border-slate-200 px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
                  n.read ? 'text-slate-400' : 'text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                  <div className={n.read ? 'ml-3.5' : ''}>
                    <p>{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
