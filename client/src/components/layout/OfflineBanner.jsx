import { useEffect, useState } from 'react';
import Icon from '../ui/Icon';
import { useT } from '../../i18n/useT';

// Shown while the device has no internet: screens still open, but saving needs a connection.
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const { t } = useT();

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;
  return (
    <div className="flex items-center gap-2 bg-amber-500 px-4 py-2 text-xs font-semibold text-white" role="status">
      <Icon name="warning" className="h-4 w-4 shrink-0" />
      {t('You are offline. You can still browse, but records will not save until the internet is back.')}
    </div>
  );
}
