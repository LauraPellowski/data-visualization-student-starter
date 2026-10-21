import { geoPath, type GeoProjection } from 'd3-geo';
import type { Selection } from 'd3-selection';
import type { RouteShape } from './useRouteData';
import { lines } from './apiService';

export function renderRoutes(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  routes: RouteShape[],
  projection: GeoProjection,
) {
  const pathGenerator = geoPath().projection(projection);

  svg
    .selectAll<SVGPathElement, RouteShape>('.route')
    .data(routes, (d) => d.id)
    .join('path')
    .attr('class', 'route')
    .attr('d', (d) => {
      return pathGenerator({
        type: 'LineString',
        coordinates: d.coordinates,
      });
    })
    .attr('fill', 'none')
    .attr('stroke', (d) => getRouteColor(d.routeId))
    .attr('stroke-width', 5)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round');
}

function getRouteColor(routeId: number): string {
  const line = lines[routeId];

  switch (line) {
    case 'Red':
      return 'red';

    case 'Orange':
      return 'orange';

    case 'Blue':
      return 'blue';

    case 'Green-B':
    case 'Green-C':
    case 'Green-D':
    case 'Green-E':
      return 'green';

    case 'Mattapan':
      return 'red';

    default:
      return 'gray';
  }
}
