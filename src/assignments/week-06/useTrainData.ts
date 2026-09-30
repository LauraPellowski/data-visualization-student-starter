//TODO: improve this file: DRY
//decide on what to call train vs vehicle

import { useEffect, useState } from 'react';
import { getAllTrains } from './apiService';

export interface Train {
  id: string;
  routeId: string;
  latitude: number;
  longitude: number;
  bearing: number | null;
  speed: number | null;
  currentStatus: string | null;
  stopId: string | null;
}

export function useTrainData() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadTrains() {
      try {
        const response = await getAllTrains();

        const vehicleData: Train[] = response.data
          .filter(
            (vehicle: {
              attributes: {
                latitude: number;
                longitude: number;
              };
              relationships?: {
                route?: {
                  data?: {
                    id: string;
                  };
                };
              };
            }) => vehicle.attributes.latitude != null && vehicle.attributes.longitude != null,
          )
          .map(
            (vehicle: {
              id: string;
              attributes: {
                latitude: number;
                longitude: number;
                bearing: number | null;
                speed: number | null;
                current_status: string | null;
              };
              relationships?: {
                route?: {
                  data?: {
                    id: string;
                  };
                };
                stop?: {
                  data?: {
                    id: string;
                  };
                };
              };
            }) => ({
              id: vehicle.id,
              routeId: vehicle.relationships?.route?.data?.id ?? 'Unknown',
              latitude: vehicle.attributes.latitude,
              longitude: vehicle.attributes.longitude,
              bearing: vehicle.attributes.bearing ?? null,
              speed: vehicle.attributes.speed ?? null,
              currentStatus: vehicle.attributes.current_status ?? null,
              stopId: vehicle.relationships?.stop?.data?.id ?? null,
            }),
          );

        setTrains(vehicleData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load MBTA vehicles'));
      } finally {
        setLoading(false);
      }
    }

    loadTrains();

    const interval = setInterval(() => {
      loadTrains();
    }, 10_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    vehicles: trains,
    loading,
    error,
  };
}
