import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import 'd3-transition';
import { useDimensions } from './useDimensions';

interface DataPoint {
  x: number;
  y: number;
}

const data: DataPoint[] = [
  { x: 132, y: 391 },
  { x: 330, y: 349 },
  { x: 410, y: 192 },
  { x: 527, y: 257 },
  { x: 688, y: 119 },
  { x: 878, y: 55 },
];

const ORIGINAL_WIDTH = 960;
const ORIGINAL_HEIGHT = 500;
const SIDE_LENGTH = 75;

export function ResponsivePseudoScatterPlot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: divRef, dimensions } = useDimensions();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0) return;

    const xScale = scaleLinear().domain([0, ORIGINAL_WIDTH]).range([0, dimensions.width]);

    const yScale = scaleLinear().domain([0, ORIGINAL_HEIGHT]).range([0, dimensions.height]);

    const gradient = select(svg)
      .append('defs')
      .append('linearGradient')
      .attr('id', 'myGradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#37c3de');

    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#ec30f2');

    select(svg)
      .selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', (d: DataPoint) => xScale(d.x))
      .attr('y', (d: DataPoint) => yScale(d.y))
      .attr('width', 0)
      .attr('height', 0)
      .attr('opacity', 0)
      .attr('fill', 'url(#myGradient)')
      .attr('rx', '3')
      .attr('ry', '3')
      .transition()
      .duration(500)
      .delay((_, i) => i * 200)
      .attr('width', SIDE_LENGTH)
      .attr('height', SIDE_LENGTH)
      .attr('opacity', 1);
  }, [dimensions]);

  return (
    <div ref={divRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label="Responsive scatter plot showing 6 data points"
      ></svg>
    </div>
  );
}
