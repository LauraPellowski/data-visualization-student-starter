import { geoPath, type GeoProjection } from 'd3-geo';
import { pointer, select, type Selection } from 'd3-selection';
import type { RouteShape } from './useRouteData';
import { lines } from './apiService';

export function renderRoutes(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  routes: RouteShape[],
  projection: GeoProjection,
  interactive = false,
  onLineSelect?: (lineName: string) => void,
) {
  const pathGenerator = geoPath().projection(projection);

  const tooltip = svg
    .selectAll<SVGGElement, null>('.route-tooltip')
    .data([null])
    .join('g')
    .attr('class', 'route-tooltip')
    .attr('visibility', 'hidden')
    .attr('pointer-events', 'none');

  tooltip
    .selectAll<SVGRectElement, null>('.tooltip-background')
    .data([null])
    .join('rect')
    .attr('class', 'tooltip-background')
    .attr('fill', 'white')
    .attr('stroke', 'black')
    .attr('rx', 4);

  const tooltipLines = [
    { className: 'tooltip-title', bold: true },
    { className: 'tooltip-instruction', bold: false },
  ];
  tooltip
    .selectAll<SVGTextElement, (typeof tooltipLines)[number]>('text')
    .data(tooltipLines)
    .join('text')
    .attr('class', (line) => line.className)
    .attr('x', 8)
    .attr('y', (_, index) => 18 + index * 18)
    .attr('font-family', 'monospace')
    .attr('font-size', '14px')
    .attr('font-weight', (line) => (line.bold ? 'bold' : 'normal'));

  const showTooltip = (x: number, y: number, label: string) => {
    tooltip.attr('transform', `translate(${x + 10}, ${y + 10})`).attr('visibility', 'visible');
    tooltip.select('.tooltip-title').text(label);
    tooltip.select('.tooltip-instruction').text('Click to see ridership information');
    let maxWidth = 0;
    let maxBottom = 0;
    tooltip.selectAll<SVGTextElement, unknown>('text').each(function () {
      const box = this.getBBox();
      maxWidth = Math.max(maxWidth, box.width);
      maxBottom = Math.max(maxBottom, box.y + box.height);
    });
    tooltip
      .select('.tooltip-background')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', maxWidth + 16)
      .attr('height', maxBottom + 8);
    tooltip.raise();
  };

  svg
    .selectAll<SVGPathElement, RouteShape>('.route')
    .data(routes, (d) => d.id)
    .join('path')
    .attr('class', 'route')
    .attr('data-route-id', (d) => lines[d.routeId])
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
    .attr('stroke-linejoin', 'round')
    .attr('role', interactive ? 'button' : null)
    .attr('tabindex', interactive ? 0 : null)
    .attr('aria-label', (d) => `View ridership for ${getRidershipLineName(lines[d.routeId])}`)
    .style('cursor', interactive ? 'pointer' : 'default')
    .on('mouseover', function (_event: MouseEvent, route) {
      if (!interactive) return;
      const [x, y] = pointer(_event, svg.node()!);
      select(this).attr('stroke-width', 8);
      showTooltip(x, y, getRidershipLineName(lines[route.routeId]));
    })
    .on('mousemove', function (event: MouseEvent, route) {
      if (!interactive) return;
      const [x, y] = pointer(event, svg.node()!);
      showTooltip(x, y, getRidershipLineName(lines[route.routeId]));
    })
    .on('mouseout', function () {
      select(this).attr('stroke-width', 5);
      tooltip.attr('visibility', 'hidden');
    })
    .on('focus', function (_, route) {
      if (!interactive) return;
      const [x, y] = projectionCenter(route, projection);
      select(this).attr('stroke-width', 8);
      showTooltip(x, y, getRidershipLineName(lines[route.routeId]));
    })
    .on('blur', function () {
      select(this).attr('stroke-width', 5);
      tooltip.attr('visibility', 'hidden');
    })
    .on('click', (_, route) => {
      if (interactive && onLineSelect) {
        onLineSelect(getRidershipLineName(lines[route.routeId]));
      }
    })
    .on('keydown', (event: KeyboardEvent, route) => {
      if (interactive && onLineSelect && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onLineSelect(getRidershipLineName(lines[route.routeId]));
      }
    });

  tooltip.raise();
}

function projectionCenter(route: RouteShape, projection: GeoProjection): [number, number] {
  const coordinates = route.coordinates;
  const midpoint = coordinates[Math.floor(coordinates.length / 2)] ?? [0, 0];
  return projection(midpoint) ?? [0, 0];
}

function getRidershipLineName(routeName: string | undefined): string {
  if (!routeName) return 'MBTA Line';
  if (routeName.startsWith('Green-')) return 'Green Line';
  return routeName === 'Mattapan' ? 'Mattapan Line' : `${routeName} Line`;
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
