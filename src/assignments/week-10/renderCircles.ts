import type { Selection } from 'd3-selection';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import type { TrainRow } from './useTrainDataset';
import { colorScale } from './useScales';
import { axisBottom, axisLeft } from 'd3-axis';
import type { Margins } from './useScales';
import { Delaunay } from 'd3-delaunay';
import { pointer } from 'd3-selection';

const RADIUS = 3;
const TRANSITION_DURATION = 200;

const highlightLine = (
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  line: string,
  selectedRange: [Date, Date] | null,
) => {
  // Fade all data points
  selection
    .selectAll<SVGCircleElement, TrainRow>('.data-point')
    .transition()
    .duration(TRANSITION_DURATION)
    .style('opacity', (d) => (isInRange(d, selectedRange) ? 0.2 : 0.08));

  // Highlight points for this line
  selection
    .selectAll<SVGCircleElement, TrainRow>(`[data-line="${line}"]`)
    .transition()
    .duration(TRANSITION_DURATION)
    .attr('r', 6)
    .style('opacity', (d) => (isInRange(d, selectedRange) ? 1 : 0.2));

  // Highlight legend circle
  selection
    .select(`[data-legend-line="${line}"]`)
    .transition()
    .duration(TRANSITION_DURATION)
    .select('circle')
    .attr('r', 9);
};

const resetHighlight = (
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  selectedRange: [Date, Date] | null,
) => {
  // Restore all data points
  selection
    .selectAll<SVGCircleElement, TrainRow>('.data-point')
    .attr('r', RADIUS)
    .transition()
    .duration(TRANSITION_DURATION)
    .style('opacity', (d) => (isInRange(d, selectedRange) ? 1 : 0.14));

  // Restore all legend circles
  selection
    .selectAll('.legend-item circle')
    .transition()
    .duration(TRANSITION_DURATION)
    .attr('r', 6);
};

function isInRange(row: TrainRow, range: [Date, Date] | null): boolean {
  if (!range) return true;
  const month = row.month_of_service.getTime();
  return month >= range[0].getTime() && month <= range[1].getTime();
}

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
  interactionMode: 'inspect' | 'brush';
  selectedRange: [Date, Date] | null;
  onSelectedRangeChange: (range: [Date, Date] | null) => void;
}

export function renderCircles(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  options: RenderCirclesOptions,
) {
  const {
    data,
    xScale,
    yScale,
    xValue,
    yValue,
    width,
    height,
    margins,
    showVoronoi,
    interactionMode,
    selectedRange,
    onSelectedRangeChange,
  } = options;

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
    .attr('fill', (d) => colorScale(d.route_or_line))
    .style('opacity', (d) => (isInRange(d, selectedRange) ? 1 : 0.14));

  // Create Voronoi regions around the data points for Inspect mode.
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
    .attr('pointer-events', interactionMode === 'inspect' ? 'all' : 'none')
    .on('mouseover', function (_, d) {
      highlightLine(selection, d.route_or_line, selectedRange);
    })
    .on('mouseout', function () {
      resetHighlight(selection, selectedRange);
    });

  const brushLayer = chart
    .selectAll<SVGGElement, null>('.month-brush')
    .data([null])
    .join('g')
    .attr('class', 'month-brush');

  const brushSelection = brushLayer
    .selectAll<SVGRectElement, null>('.month-brush-selection')
    .data([null])
    .join('rect')
    .attr('class', 'month-brush-selection')
    .attr('y', 0)
    .attr('height', chartHeight)
    .attr('fill', '#0f172a')
    .attr('fill-opacity', 0.12)
    .attr('stroke', '#0f172a')
    .attr('stroke-width', 1)
    .attr('pointer-events', 'none');

  if (selectedRange) {
    const startX = xScale(selectedRange[0]);
    const endX = xScale(selectedRange[1]);
    const left = Math.min(startX, endX);
    const width = Math.max(2, Math.abs(endX - startX));
    brushSelection
      .attr('x', left - (endX === startX ? 1 : 0))
      .attr('width', width)
      .attr('display', null);
  } else {
    brushSelection.attr('display', 'none');
  }

  const uniqueMonths = Array.from(
    new Map(data.map((row) => [row.month_of_service.getTime(), row.month_of_service])).values(),
  ).sort((first, second) => first.getTime() - second.getTime());
  let dragStart: number | null = null;

  const updateBrushRect = (start: number, end: number) => {
    const left = Math.min(start, end);
    brushSelection
      .attr('x', left)
      .attr('width', Math.max(1, Math.abs(end - start)))
      .attr('display', null);
  };

  brushLayer
    .selectAll<SVGRectElement, null>('.month-brush-overlay')
    .data([null])
    .join('rect')
    .attr('class', 'month-brush-overlay')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', chartWidth)
    .attr('height', chartHeight)
    .attr('fill', 'transparent')
    .attr('pointer-events', interactionMode === 'brush' ? 'all' : 'none')
    .style('cursor', interactionMode === 'brush' ? 'crosshair' : 'default')
    .on('pointerdown', function (event: PointerEvent) {
      if (interactionMode !== 'brush' || uniqueMonths.length === 0) return;
      event.preventDefault();
      const [x] = pointer(event, chart.node()!);
      dragStart = Math.max(0, Math.min(chartWidth, x));
      updateBrushRect(dragStart, dragStart);
      this.setPointerCapture(event.pointerId);
    })
    .on('pointermove', function (event: PointerEvent) {
      if (dragStart === null) return;
      const [x] = pointer(event, chart.node()!);
      updateBrushRect(dragStart, Math.max(0, Math.min(chartWidth, x)));
    })
    .on('pointerup', function (event: PointerEvent) {
      if (dragStart === null) return;
      const [x] = pointer(event, chart.node()!);
      const startDate = xScale.invert(Math.max(0, Math.min(chartWidth, dragStart)));
      const endDate = xScale.invert(Math.max(0, Math.min(chartWidth, x)));
      const nearestMonth = (date: Date) =>
        uniqueMonths.reduce((closest, candidate) =>
          Math.abs(candidate.getTime() - date.getTime()) <
          Math.abs(closest.getTime() - date.getTime())
            ? candidate
            : closest,
        );
      const snappedStart = nearestMonth(startDate);
      const snappedEnd = nearestMonth(endDate);
      onSelectedRangeChange(
        snappedStart <= snappedEnd ? [snappedStart, snappedEnd] : [snappedEnd, snappedStart],
      );
      dragStart = null;
      if (this.hasPointerCapture(event.pointerId)) this.releasePointerCapture(event.pointerId);
    })
    .on('pointercancel', function (event: PointerEvent) {
      if (dragStart === null) return;
      dragStart = null;
      if (selectedRange) {
        const startX = xScale(selectedRange[0]);
        const endX = xScale(selectedRange[1]);
        const left = Math.min(startX, endX);
        brushSelection
          .attr('x', left - (endX === startX ? 1 : 0))
          .attr('width', Math.max(2, Math.abs(endX - startX)))
          .attr('display', null);
      } else {
        brushSelection.attr('display', 'none');
      }
      if (this.hasPointerCapture(event.pointerId)) this.releasePointerCapture(event.pointerId);
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
      highlightLine(selection, line, selectedRange);
    })
    .on('mouseout', function () {
      resetHighlight(selection, selectedRange);
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
