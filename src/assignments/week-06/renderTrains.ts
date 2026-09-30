// TODO improve this file: DRY

import type { Selection } from 'd3-selection';
import type { GeoProjection } from 'd3-geo';

import type { Train } from './useTrainData';

export function renderTrains(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  vehicles: Train[],
  projection: GeoProjection,
) {
  const tooltip = svg
    .selectAll<SVGGElement, unknown>('.vehicle-tooltip')
    .data([null])
    .join('g')
    .attr('class', 'vehicle-tooltip')
    .attr('visibility', 'hidden')
    .attr('pointer-events', 'none');

  tooltip.raise();

  // Create the tooltip background if it doesn't already exist.
  tooltip
    .selectAll<SVGRectElement, unknown>('.tooltip-background')
    .data([null])
    .join('rect')
    .attr('class', 'tooltip-background')
    .attr('fill', 'white')
    .attr('stroke', 'black')
    .attr('rx', 4);

  // The tooltip information we want to display.
  const tooltipLines = [
    {
      className: 'tooltip-title',
      getText: (d: Train) => `Train ${d.id}`,
      bold: true,
    },
    {
      className: 'tooltip-route',
      getText: (d: Train) => `Line: ${d.routeId}`,
      bold: false,
    },
    {
      className: 'tooltip-status',
      getText: (d: Train) => `Status: ${d.currentStatus ?? 'Unknown'}`,
      bold: false,
    },
    {
      className: 'tooltip-stop',
      getText: (d: Train) => `Stop: ${d.stopId ?? 'Unknown'}`,
      bold: false,
    },
    {
      className: 'tooltip-speed',
      getText: (d: Train) => `Speed: ${d.speed != null ? `${d.speed} mph` : 'Unknown'}`,
      bold: false,
    },
    {
      className: 'tooltip-bearing',
      getText: (d: Train) => `Bearing: ${d.bearing != null ? `${d.bearing}°` : 'Unknown'}`,
      bold: false,
    },
  ];

  // Create one <text> element for each tooltip line.
  tooltip
    .selectAll<SVGTextElement, (typeof tooltipLines)[number]>('text')
    .data(tooltipLines)
    .join('text')
    .attr('class', (d) => d.className)
    .attr('x', 8)
    .attr('y', (_, i) => 18 + i * 18)
    .attr('font-family', 'monospace')
    .attr('font-size', '14px')
    .attr('font-weight', (d) => (d.bold ? 'bold' : 'normal'));

  // Render the trains.
  svg
    .selectAll<SVGCircleElement, Train>('.vehicle')
    .data(vehicles, (d) => d.id)
    .join('circle')
    .attr('class', 'vehicle')
    .attr('cx', (d) => projection([d.longitude, d.latitude])?.[0] ?? 0)
    .attr('cy', (d) => projection([d.longitude, d.latitude])?.[1] ?? 0)
    .attr('r', 6)
    .attr('fill', (d) => getRouteColor(d.routeId))
    .attr('stroke', 'black')
    .attr('stroke-width', 1.5)
    .on('mouseover', function (_, d) {
      const [x, y] = projection([d.longitude, d.latitude]) ?? [0, 0];

      tooltip.attr('transform', `translate(${x + 10}, ${y})`).attr('visibility', 'visible');

      // Update the text for each tooltip line.
      tooltip
        .selectAll<SVGTextElement, (typeof tooltipLines)[number]>('text')
        .text((line) => line.getText(d));

      // Find the widest line and the bottom of the lowest line.
      const textElements = tooltip.selectAll<SVGTextElement, unknown>('text');

      let maxWidth = 0;
      let maxBottom = 0;

      textElements.each(function () {
        const bbox = this.getBBox();

        maxWidth = Math.max(maxWidth, bbox.width);
        maxBottom = Math.max(maxBottom, bbox.y + bbox.height);
      });

      tooltip
        .select('.tooltip-background')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', maxWidth + 16)
        .attr('height', maxBottom + 8);
    })
    .on('mouseout', function () {
      tooltip.attr('visibility', 'hidden');
    });

    tooltip.raise();
}

function getRouteColor(routeId: string): string {
  switch (routeId) {
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
