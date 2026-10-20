import { useEffect, useState } from 'react';
import polyline from '@mapbox/polyline';
import { getRouteMapByLine } from './apiService';
import { lines } from './apiService';

export interface RouteShape {
  id: string;
  routeId: number;
  coordinates: [number, number][];
}

export function useRouteData() {
  const [shapes, setShapes] = useState<RouteShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadShapes() {
      try {
        const responses = await Promise.all(lines.map((line) => getRouteMapByLine(line)));

        const routeShapes: RouteShape[] = responses.flatMap((response, index) =>
          response.data.map(
            (shape: {
              id: string;
              attributes: {
                polyline: string;
              };
            }) => {
              const decoded = polyline.decode(shape.attributes.polyline);

              const coordinates = decoded.map(
                ([latitude, longitude]) => [longitude, latitude] as [number, number],
              );

              return {
                id: shape.id,
                routeId: index, //should this be called ID?
                coordinates,
              };
            },
          ),
        );
        setShapes(routeShapes);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load MBTA shapes'));
      } finally {
        setLoading(false);
      }
    }

    loadShapes();
  }, []);

  return {
    shapes,
    loading,
    error,
  };
}
