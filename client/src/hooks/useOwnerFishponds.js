import { useEffect, useState } from 'react';
import { fishpondApi } from '../api/fishponds';

// Approved fishponds only — the ones an owner can actually log activity against.
export function useOwnerFishponds() {
  const [fishponds, setFishponds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fishpondApi
      .list()
      .then((all) => setFishponds(all.filter((f) => f.status === 'approved')))
      .finally(() => setLoading(false));
  }, []);

  return { fishponds, loading };
}
