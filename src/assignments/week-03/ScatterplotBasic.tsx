import { useEffect, useRef } from 'react';
import { useTrainDataset } from './useTrainDataset';
import type { TrainRow } from './useTrainDataset';
import { useScales } from './useScales';
import { useDimensions } from '../week-01/useDimensions';
import { renderCircles } from './renderCircles';
import { select } from 'd3-selection';
import { group, sum } from 'd3-array';

// Accessors
const xValue = (row: TrainRow) => row.month_of_service;
const yValue = (row: TrainRow) => row.ridership_total;

const SCALE_FACTOR = 0.85;

export function ScatterplotBasic() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: divRef, dimensions } = useDimensions();
  const data = useTrainDataset();

  // Improvement for grouping by line and month. Some fields become unnessesary/unusable.
  const groupedData: TrainRow[] = data
    ? Array.from(
        group(
          data,
          (d) => d.month_of_service,
          (d) => d.route_or_line,
        ),
      ).flatMap(([month_of_service, lineGroups]) =>
        Array.from(lineGroups, ([route_or_line, rows]) => ({
          month_of_service,
          daytype: 'N/A', //don't use this
          daycount: sum(rows, (d) => d.daycount), //probably don't need this anyway
          route_or_line,
          ridership_total: sum(rows, (d) => d.ridership_total),
          ridership_average: 0, //don't use this
        })),
      )
    : [];
  const scales = useScales({
    data: groupedData,
    width: dimensions.width * SCALE_FACTOR,
    height: dimensions.height * SCALE_FACTOR,
    xValue,
    yValue,
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0 || !groupedData || !scales)
      return;

    renderCircles(select(svg), {
      data: groupedData,
      xScale: scales.xScale,
      yScale: scales.yScale,
      xValue,
      yValue,
      width: dimensions.width * SCALE_FACTOR,
      height: dimensions.height * SCALE_FACTOR,
    });
  }, [dimensions, groupedData, scales]);

  return (
    <div ref={divRef} className="relative w-full h-full">
      <h1 className="flex justify-center text-4xl font-mono">Ridership By MBTA Line</h1>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label="Scatter plot of total ridership per line"
      ></svg>
    </div>
  );
}
