import { useEffect, useState } from 'react';
import { speciesApi } from '../api/species';

export function useSpeciesList() {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    speciesApi
      .list({ activeOnly: 'true' })
      .then(setSpecies)
      .finally(() => setLoading(false));
  }, []);

  return { species, loading };
}
