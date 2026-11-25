import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Icon from '../ui/Icon';

const LEVEL_STYLE = {
  danger: { box: 'border-rose-200 bg-rose-50', icon: 'text-rose-600', name: 'shieldAlert' },
  warning: { box: 'border-amber-200 bg-amber-50', icon: 'text-amber-600', name: 'warning' },
  info: { box: 'border-sky-200 bg-sky-50', icon: 'text-sky-600', name: 'sparkles' },
  success: { box: 'border-leaf-200 bg-leaf-50', icon: 'text-leaf-600', name: 'success' },
};

// "Needs your attention" list built by the server's insight rules.
export default function InsightsPanel({ insights, loading }) {
  return (
    <Card title="Needs Your Attention" subtitle="Reminders and warnings from your latest records">
      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Checking your records…</p>
      ) : !insights?.length ? (
        <div className="flex items-center gap-3 rounded-xl border border-leaf-200 bg-leaf-50 px-4 py-3 text-sm text-leaf-800">
          <Icon name="success" className="h-5 w-5 shrink-0" /> All good — nothing needs your attention right now.
        </div>
      ) : (
        <ul className="space-y-2">
          {insights.map((i, idx) => {
            const style = LEVEL_STYLE[i.level] || LEVEL_STYLE.info;
            const body = (
              <>
                <Icon name={style.name} className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{i.title}</span>
                  <span className="block text-xs text-slate-600">{i.message}</span>
                </span>
                {i.link && <Icon name="arrowRight" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
              </>
            );
            return (
              <li key={idx}>
                {i.link ? (
                  <Link to={i.link} className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 transition hover:shadow-sm ${style.box}`}>
                    {body}
                  </Link>
                ) : (
                  <div className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${style.box}`}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
