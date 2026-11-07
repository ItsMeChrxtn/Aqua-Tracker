import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fishpondApi } from '../../api/fishponds';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import { formatArea, formatCapacity, formatDate, STATUS_BADGE_CLASS } from '../../utils/format';

export default function FishpondList() {
  const [fishponds, setFishponds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fishpondApi.list().then(setFishponds).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">My Fishponds</h2>
        <Link to="/owner/fishponds/new">
          <Button icon="plus">Register Fishpond</Button>
        </Link>
      </div>

      {fishponds.length === 0 ? (
        <EmptyState
          title="No fishponds registered yet"
          message="Register your first fishpond — it will need approval from the Agriculture Office before you can start a production cycle."
          action={
            <Link to="/owner/fishponds/new">
              <Button icon="plus" size="sm">Register Fishpond</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fishponds.map((f) => (
            <Link
              key={f._id}
              to={`/owner/fishponds/${f._id}`}
              className="hover-lift group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <FishpondPhoto src={f.imageUrl} alt={f.name} className="h-32 w-full" />
              <Card padded={true} className="rounded-none border-0 shadow-none">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-brand-600">{f.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <Icon name="location" className="h-3.5 w-3.5" /> {f.barangay}
                    </p>
                  </div>
                  <Badge className={STATUS_BADGE_CLASS[f.status]}>{f.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>{formatArea(f.areaSize, 'Area not set')} · {formatCapacity(f.capacity, 'Capacity not set')}</span>
                  <span>Registered {formatDate(f.createdAt)}</span>
                </div>
                {f.status === 'rejected' && f.rejectionReason && (
                  <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-600">{f.rejectionReason}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
