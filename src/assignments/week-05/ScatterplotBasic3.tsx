import { useEffect, useRef, useState } from 'react';
import { useTrainDataset } from './useTrainDataset';
import type { TrainRow } from './useTrainDataset';
import { useScales, colorScale } from './useScales';
import { useDimensions } from '../week-01/useDimensions';
import { renderCircles } from './renderCircles';
import { select } from 'd3-selection';
import { group, sum } from 'd3-array';
import { renderLines } from './renderLines';

// Accessors
const xValue = (row: TrainRow) => row.month_of_service;
const yValue = (row: TrainRow) => row.ridership_total;

const margins = {
  top: 20,
  right: 180,
  bottom: 140,
  left: 90,
};

export function ScatterplotBasic3() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: divRef, dimensions } = useDimensions();
  const data = useTrainDataset();

  // What the y-axis should go up to (make smaller to "zoom" in on bottom of the plot)
  const [yMax, setYMax] = useState(30000000);

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
    width: dimensions.width,
    height: dimensions.height,
    xValue,
    yValue,
    margins,
    yMax,
  });

  const [showVoronoi, setShowVoronoi] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'v') {
        setShowVoronoi((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0 || !groupedData || !scales)
      return;

    renderLines(
      select(svg),
      groupedData,
      scales.xScale,
      scales.yScale,
      colorScale,
      xValue,
      yValue,
      margins,
    );

    renderCircles(select(svg), {
      data: groupedData,
      xScale: scales.xScale,
      yScale: scales.yScale,
      xValue,
      yValue,
      width: dimensions.width,
      height: dimensions.height,
      margins,
      showVoronoi,
    });
  }, [dimensions, groupedData, scales]);

  return (
    <div ref={divRef} className="w-full h-full flex flex-col items-center">
      <h1 className="text-4xl font-mono mb-4">Ridership By MBTA Line</h1>
      <div className="flex items-center mb-2">
        <label className="font-mono">Y-axis maximum:</label>
        <input
          id="y-max"
          type="range"
          min="0"
          max="30000000"
          step="50000"
          value={yMax}
          onChange={(e) => setYMax(Number(e.target.value))}
        />
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full"
        role="img"
        aria-label="Scatter plot of total ridership per line"
      ></svg>
    </div>
  );
}
