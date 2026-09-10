import type { Selection } from 'd3-selection';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import type { TrainRow } from './useTrainDataset';
import { colorScale } from './useScales';
import { axisBottom } from 'd3-axis';

const RADIUS = 3;

export interface RenderCirclesOptions {
  data: TrainRow[];
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  xValue: (row: TrainRow) => Date;
  yValue: (row: TrainRow) => number;
  width: number;
  height: number;
}

export function renderCircles(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  options: RenderCirclesOptions,
) {
  const { data, xScale, yScale, xValue, yValue, width, height } = options;

  selection
    .selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', (d) => xScale(xValue(d)))
    .attr('cy', (d) => yScale(yValue(d)))
    .attr('r', RADIUS)
    .attr('fill', (d) => colorScale(d.route_or_line));

  // Legend
  const legend = selection
    .selectAll('.legend')
    .data([null])
    .join('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width + 20}, 20)`);

  const legendItems = legend
    .selectAll('.legend-item')
    .data(colorScale.domain())
    .join('g')
    .attr('class', 'legend-item')
    .attr('transform', (_, i) => `translate(0, ${i * 25})`);

  legendItems
    .append('circle')
    .attr('r', 6)
    .attr('fill', (d) => colorScale(d));

  legendItems
    .append('text')
    .attr('x', 12)
    .attr('y', 4)
    .style('font-family', 'Courier New')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text((d) => d);

  // axes
  const xAxis = axisBottom(xScale);

  selection
    .selectAll<SVGGElement, null>('.x-axis')
    .data([null])
    .join('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height + 10})`)
    .call(xAxis);

  selection
    .select('.x-axis')
    .selectAll('.tick text')
    .style('font-family', 'Courier New')
    .style('font-size', '12px')
    .style('font-weight', 'bold');
}
