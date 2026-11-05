import { useMemo } from 'react';
import { extent } from 'd3-array';
import { scaleLinear, scaleTime, scaleOrdinal } from 'd3-scale';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import type { TrainRow } from './useTrainDataset';

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface NumberAccessor {
  (row: TrainRow): number;
}

export interface DateAccessor {
  (row: TrainRow): Date;
}

export interface UseScalesOptions {
  data: TrainRow[] | null;
  width: number;
  height: number;
  xValue: DateAccessor;
  yValue: NumberAccessor;
  margins: Margins;
  yMax: number;
}

export interface Scales {
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
}

export function useScales({
  data,
  width,
  height,
  xValue,
  yValue,
  margins,
  yMax,
}: UseScalesOptions): Scales | null {
  return useMemo(() => {
    // No data yet, so no scales can be constructed.
    if (!data || data.length === 0) return null;

    const chartWidth = width - margins.left - margins.right;
    const chartHeight = height - margins.top - margins.bottom;

    return {
      // The domain maps data space, and the range maps to screen space.
      xScale: scaleTime()
        // `extent` returns the min and max of the data for the domain.
        .domain(extent(data, xValue) as [Date, Date])
        .range([0, chartWidth]),
      yScale: scaleLinear()
        .domain([0, yMax])
        // Flip the y range so that larger values appear higher on the screen.
        .range([chartHeight, 0]),
    };
  }, [data, width, height, xValue, yValue, margins, yMax]);
}

export const colorScale = scaleOrdinal<string, string>()
  .domain([
    'Red Line',
    'Mattapan Line',
    'Orange Line',
    'Blue Line',
    'Green Line',
    'Silver Line',
    'Bus',
    'All Bus',
    'Commuter Rail',
    'The RIDE',
    'Ferry',
    'Heavy Rail',
    'Light Rail',
  ])
  .range([
    'Red',
    'Maroon',
    'Orange',
    'Blue',
    'Green',
    'Grey',
    'Plum',
    'Gold',
    'Purple',
    'LightSteelBlue',
    'Cyan',
    'Magenta',
    'BlueViolet',
  ])
  .unknown('Black');
