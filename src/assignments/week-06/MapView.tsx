import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { geoMercator } from 'd3-geo';

import { useRouteData } from './useRouteData';
import { renderRoutes } from './renderRoutes';
import { useTrainData } from './useTrainData';
import { renderTrains } from './renderTrains';

const width = 800;
const height = 600;

export function MapView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { shapes, loading, error } = useRouteData();
  const { vehicles } = useTrainData();

  useEffect(() => {
    if (!svgRef.current || shapes.length === 0) {
      return;
    }
    const svg = select(svgRef.current);
    // autosize to svg?
    const geoJson = {
      type: 'FeatureCollection' as const,
      features: shapes.map((shape) => ({
        type: 'Feature' as const,
        properties: {
          routeId: shape.routeId,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: shape.coordinates,
        },
      })),
    };
    const projection = geoMercator().fitSize([width, height], geoJson);
    renderRoutes(svg, shapes, projection);
    renderTrains(svg, vehicles, projection);
  }, [shapes, vehicles]);

  if (loading) {
    return <div>Loading MBTA map...</div>;
  }

  if (error) {
    return <div>Error loading MBTA map: {error.message}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-mono">MBTA Map</h1>
      <h2 className="text-1xl font-mono">Refreshes every 10 seconds</h2>
      <svg ref={svgRef} width={800} height={600} viewBox="100 0 750 550" />
    </div>
  );
}
