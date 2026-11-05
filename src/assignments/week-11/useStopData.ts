import { useEffect, useState } from 'react';
import { getRailStops, type MbtaResource } from './apiService';

export type Stop = MbtaResource;

function isStopResource(resource: MbtaResource): boolean {
  return (
    typeof resource?.id === 'string' &&
    resource.attributes !== null &&
    typeof resource.attributes === 'object' &&
    !Array.isArray(resource.attributes)
  );
}

export function useStopData() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    getRailStops()
      .then((response) => {
        if (active) {
          setStops(Array.isArray(response.data) ? response.data.filter(isStopResource) : []);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err : new Error('Failed to load MBTA stops'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { stops, loading, error };
}
