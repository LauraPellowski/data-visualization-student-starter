import type { GeoProjection } from 'd3-geo';
import { select, type Selection } from 'd3-selection';
import type { Stop } from './useStopData';

export function renderStops(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  stops: Stop[],
  projection: GeoProjection,
  onStopSelect: (stopId: string) => void,
) {
  const tooltip = svg
    .selectAll<SVGGElement, unknown>('.stop-tooltip')
    .data([null])
    .join('g')
    .attr('class', 'stop-tooltip')
    .attr('visibility', 'hidden')
    .attr('pointer-events', 'none');

  tooltip
    .selectAll<SVGRectElement, unknown>('.tooltip-background')
    .data([null])
    .join('rect')
    .attr('class', 'tooltip-background')
    .attr('fill', 'white')
    .attr('stroke', 'black')
    .attr('rx', 4);

  const tooltipLines = [
    {
      className: 'tooltip-title',
      getText: (stop: Stop) => getStopName(stop),
      bold: true,
    },
    {
      className: 'tooltip-instruction',
      getText: () => 'Click to see more information',
      bold: false,
    },
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

  const showTooltip = (stop: Stop) => {
    const [x, y] = projectStop(stop, projection);
    tooltip.attr('transform', `translate(${x + 10}, ${y})`).attr('visibility', 'visible');
    tooltip
      .selectAll<SVGTextElement, (typeof tooltipLines)[number]>('text')
      .text((line) => line.getText(stop));

    const textElements = tooltip.selectAll<SVGTextElement, unknown>('text');
    let maxWidth = 0;
    let maxBottom = 0;
    textElements.each(function () {
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
    .selectAll<SVGCircleElement, Stop>('.map-stop')
    .data(stops, (stop) => stop.id)
    .join('circle')
    .attr('class', 'map-stop')
    .attr('cx', (stop) => projectStop(stop, projection)[0])
    .attr('cy', (stop) => projectStop(stop, projection)[1])
    .attr('r', 5)
    .attr('fill', '#ffffff')
    .attr('stroke', (stop) => getStopColor(stop))
    .attr('stroke-width', 2)
    .attr('role', 'button')
    .attr('tabindex', 0)
    .attr('aria-label', (stop) => `View information for ${getStopName(stop)}`)
    .style('cursor', 'pointer')
    .on('mouseover', function (_, stop) {
      select(this).attr('r', 7);
      showTooltip(stop);
    })
    .on('mouseout', function () {
      select(this).attr('r', 5);
      tooltip.attr('visibility', 'hidden');
    })
    .on('focus', function (_, stop) {
      select(this).attr('r', 7);
      showTooltip(stop);
    })
    .on('blur', function () {
      select(this).attr('r', 5);
      tooltip.attr('visibility', 'hidden');
    })
    .on('click', (_, stop) => onStopSelect(stop.id))
    .on('keydown', (event: KeyboardEvent, stop) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onStopSelect(stop.id);
      }
    });

  tooltip.raise();
}

function projectStop(stop: Stop, projection: GeoProjection): [number, number] {
  const latitude = stop.attributes.latitude;
  const longitude = stop.attributes.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return [0, 0];
  }
  return projection([longitude, latitude]) ?? [0, 0];
}

function getStopName(stop: Stop): string {
  const name = stop.attributes.name;
  return typeof name === 'string' && name.trim() ? name : stop.id;
}

function getStopColor(stop: Stop): string {
  const vehicleType = stop.attributes.vehicle_type;
  if (vehicleType === 0) {
    return '#00843D';
  }
  if (vehicleType === 1) {
    return '#003DA5';
  }
  return '#334155';
}
