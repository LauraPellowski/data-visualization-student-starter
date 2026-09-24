import type { Selection } from 'd3-selection';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import type { TrainRow } from './useTrainDataset';
import { colorScale } from './useScales';
import { axisBottom, axisLeft } from 'd3-axis';
import type { Margins } from './useScales';
import { Delaunay } from 'd3-delaunay';

const RADIUS = 3;
const TRANSITION_DURATION = 200;

const highlightLine = (
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  line: string,
) => {
  // Fade all data points
  selection
    .selectAll('.data-point')
    .transition()
    .duration(TRANSITION_DURATION)
    .style('opacity', 0.2);

  // Highlight points for this line
  selection
    .selectAll(`[data-line="${line}"]`)
    .transition()
    .duration(TRANSITION_DURATION)
    .attr('r', 6)
    .style('opacity', 1);

  // Highlight legend circle
  selection
    .select(`[data-legend-line="${line}"]`)
    .transition()
    .duration(TRANSITION_DURATION)
    .select('circle')
    .attr('r', 9);
};

const resetHighlight = (selection: Selection<SVGSVGElement, unknown, null, undefined>) => {
  // Restore all data points
  selection
    .selectAll('.data-point')
    .attr('r', RADIUS)
    .transition()
    .duration(TRANSITION_DURATION)
    .style('opacity', 1);

  // Restore all legend circles
  selection
    .selectAll('.legend-item circle')
    .transition()
    .duration(TRANSITION_DURATION)
    .attr('r', 6);
};

export interface RenderCirclesOptions {
  data: TrainRow[];
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  xValue: (row: TrainRow) => Date;
  yValue: (row: TrainRow) => number;
  width: number;
  height: number;
  margins: Margins;
  showVoronoi: boolean;
}

export function renderCircles(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  options: RenderCirclesOptions,
) {
  const { data, xScale, yScale, xValue, yValue, width, height, margins, showVoronoi } = options;

  const chartWidth = width - margins.left - margins.right;
  const chartHeight = height - margins.top - margins.bottom;

  const chart = selection
    .selectAll<SVGGElement, null>('.chart')
    .data([null])
    .join('g')
    .attr('class', 'chart')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  chart
    .selectAll('.data-point')
    .data(data)
    .join('circle')
    .attr('class', 'data-point')
    .attr('data-line', (d) => d.route_or_line)
    .attr('cx', (d) => xScale(xValue(d)))
    .attr('cy', (d) => yScale(yValue(d)))
    .attr('r', RADIUS)
    .attr('fill', (d) => colorScale(d.route_or_line));

  // Create Voronoi regions around the data points
  const delaunay = Delaunay.from(
    data,
    (d: TrainRow) => xScale(xValue(d)),
    (d: TrainRow) => yScale(yValue(d)),
  );

  const voronoi = delaunay.voronoi([0, 0, chartWidth, chartHeight]);

  chart
    .selectAll('.voronoi-cell')
    .data(data)
    .join('path')
    .attr('class', 'voronoi-cell')
    .attr('d', (_, i) => voronoi.renderCell(i))
    .attr('fill', 'none')
    .attr('stroke', showVoronoi ? 'black' : 'none')
    .attr('stroke-width', showVoronoi ? 0.5 : 0)
    .attr('pointer-events', 'all')
    .on('mouseover', function (_, d) {
      highlightLine(selection, d.route_or_line);
    })
    .on('mouseout', function () {
      resetHighlight(selection);
    });

  // Legend
  const legend = selection
    .selectAll('.legend')
    .data([null])
    .join('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width - margins.right + 20}, ${margins.top})`);

  const legendItems = legend
    .selectAll('.legend-item')
    .data(colorScale.domain())
    .join('g')
    .attr('class', (d) => `legend-item legend-${d.replace(/\s+/g, '-')}`)
    .attr('data-legend-line', (d) => d)
    .attr('transform', (_, i) => `translate(0, ${i * 25})`);

  legendItems
    .on('mouseover', function (_, line) {
      highlightLine(selection, line);
    })
    .on('mouseout', function () {
      resetHighlight(selection);
    });

  legendItems
    .selectAll('circle')
    .data((d) => [d])
    .join('circle')
    .attr('r', 6)
    .attr('fill', (d) => colorScale(d));

  legendItems
    .selectAll('text')
    .data((d) => [d])
    .join('text')
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
    .attr('transform', `translate(${margins.left}, ${margins.top + chartHeight})`)
    .call(xAxis);

  selection
    .select('.x-axis')
    .selectAll('.tick text')
    .style('font-family', 'Courier New')
    .style('font-size', '12px')
    .style('font-weight', 'bold');

  const yAxis = axisLeft(yScale);

  selection
    .selectAll<SVGGElement, null>('.y-axis')
    .data([null])
    .join('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`)
    .attr('class', 'y-axis')
    .call(yAxis);

  selection
    .select('.y-axis')
    .selectAll('.tick text')
    .style('font-family', 'Courier New')
    .style('font-size', '12px')
    .style('font-weight', 'bold');
}
