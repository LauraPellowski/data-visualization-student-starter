import type { Selection } from 'd3-selection';
import type { ScaleLinear, ScaleOrdinal, ScaleTime } from 'd3-scale';
import type { TrainRow } from './useTrainDataset';
import type { Margins } from './useScales';

import { ascending, group } from 'd3-array';
import { line } from 'd3-shape';

export function renderLines(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  data: TrainRow[],
  xScale: ScaleTime<number, number>,
  yScale: ScaleLinear<number, number>,
  colorScale: ScaleOrdinal<string, string, string>,
  xValue: (row: TrainRow) => Date,
  yValue: (row: TrainRow) => number,
  margins: Margins,
): void {
  const grouped = group(data, (d) => d.route_or_line);

  // Use the same chart group as renderCircles
  const chart = svg
    .selectAll<SVGGElement, null>('.chart')
    .data([null])
    .join('g')
    .attr('class', 'chart')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  // Remove old lines before redrawing
  chart.selectAll('.ridership-line').remove();

  const lineGenerator = line<TrainRow>()
    .x((d) => xScale(xValue(d)))
    .y((d) => yScale(yValue(d)));

  grouped.forEach((lineData, lineName) => {
    lineData.sort((a, b) =>
      ascending(new Date(a.month_of_service).getTime(), new Date(b.month_of_service).getTime()),
    );

    chart
      .append('path')
      .datum(lineData)
      .attr('class', `ridership-line line-${lineName.replace(/\s+/g, '-')}`)
      .attr('fill', 'none')
      .attr('stroke', colorScale(lineName))
      .attr('stroke-width', 2)
      .attr('d', lineGenerator);
  });
}
