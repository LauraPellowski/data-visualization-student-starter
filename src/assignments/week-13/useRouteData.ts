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

        const seenGeometries = new Set<string>();
        const routeShapes: RouteShape[] = responses.flatMap((response, index) => {
          const canonicalShapes = response.data.filter((shape) =>
            shape.id.startsWith('canonical-'),
          );
          const shapesToRender = canonicalShapes.length > 0 ? canonicalShapes : response.data;

          return shapesToRender.flatMap((shape) => {
            const decoded = polyline.decode(shape.attributes.polyline);
            const coordinates = decoded.map(
              ([latitude, longitude]) => [longitude, latitude] as [number, number],
            );
            const geometryKey = getGeometryKey(index, coordinates);
            if (seenGeometries.has(geometryKey)) {
              return [];
            }
            seenGeometries.add(geometryKey);

            return [{ id: shape.id, routeId: index, coordinates }];
          });
        });
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

function getGeometryKey(routeId: number, coordinates: [number, number][]): string {
  const forward = coordinates.map(([longitude, latitude]) => `${longitude},${latitude}`).join(';');
  const reverse = [...coordinates]
    .reverse()
    .map(([longitude, latitude]) => `${longitude},${latitude}`)
    .join(';');
  return `${routeId}:${forward < reverse ? forward : reverse}`;
}
