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

export function ScatterplotBasic4() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: plotRef, dimensions } = useDimensions();
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
  const [interactionMode, setInteractionMode] = useState<'inspect' | 'brush'>('inspect');
  const [selectedRange, setSelectedRange] = useState<[Date, Date] | null>(null);

  const availableMonths = Array.from(
    new Map(
      groupedData.map((row) => [row.month_of_service.getTime(), row.month_of_service]),
    ).values(),
  ).sort((first, second) => first.getTime() - second.getTime());
  const firstMonth = availableMonths[0];
  const lastMonth = availableMonths[availableMonths.length - 1];
  const activeRange =
    interactionMode === 'brush' && firstMonth && lastMonth
      ? (selectedRange ?? [firstMonth, lastMonth])
      : null;
  const fromMonth = activeRange ? formatMonthInput(activeRange[0]) : '';
  const toMonth = activeRange ? formatMonthInput(activeRange[1]) : '';
  const averageRidershipByLine = activeRange
    ? Array.from(
        group(
          groupedData.filter(
            (row) =>
              row.month_of_service.getTime() >= activeRange[0].getTime() &&
              row.month_of_service.getTime() <= activeRange[1].getTime(),
          ),
          (row) => row.route_or_line,
        ),
      )
        .map(([route, rows]) => ({
          route,
          average: sum(rows, (row) => row.ridership_total) / rows.length,
        }))
        .sort((first, second) => second.average - first.average)
    : [];
  // Use one stable domain for every bar and every selected range. A window
  // average can never exceed the dataset's maximum monthly line value.
  const barScaleMax = Math.max(1, ...groupedData.map((row) => row.ridership_total));

  const updateMonthRange = (edge: 'start' | 'end', value: string) => {
    if (!value) {
      setSelectedRange(null);
      return;
    }
    const changedDate = parseMonthInput(value);
    if (!changedDate) return;
    const currentStart = selectedRange?.[0] ?? changedDate;
    const currentEnd = selectedRange?.[1] ?? changedDate;
    const start = edge === 'start' ? changedDate : currentStart;
    const end = edge === 'end' ? changedDate : currentEnd;
    setSelectedRange(start > end ? [changedDate, changedDate] : [start, end]);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isFormControl =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName));
      if (!isFormControl && interactionMode === 'inspect' && event.key.toLowerCase() === 'v') {
        setShowVoronoi((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [interactionMode]);

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
      activeRange,
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
      interactionMode,
      selectedRange: activeRange,
      onSelectedRangeChange: setSelectedRange,
    });
  }, [dimensions, groupedData, scales, showVoronoi, interactionMode, selectedRange]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center overflow-hidden px-2 py-1">
      <h1 className="mb-2 font-mono text-2xl">Ridership By MBTA Line</h1>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-4 font-mono">
        <label className="flex items-center gap-2" htmlFor="y-max">
          Y-axis maximum:
          <input
            id="y-max"
            type="range"
            min="0"
            max="30000000"
            step="50000"
            value={yMax}
            onChange={(e) => setYMax(Number(e.target.value))}
          />
        </label>
        <div
          className="inline-flex rounded border border-gray-300 p-0.5"
          role="group"
          aria-label="Chart interaction mode"
        >
          <button
            type="button"
            aria-pressed={interactionMode === 'inspect'}
            onClick={() => {
              setInteractionMode('inspect');
              setSelectedRange(null);
            }}
            className={`rounded px-3 py-1 text-sm ${interactionMode === 'inspect' ? 'bg-slate-800 text-white' : 'hover:bg-gray-100'}`}
          >
            Inspect
          </button>
          <button
            type="button"
            aria-pressed={interactionMode === 'brush'}
            onClick={() => {
              if (!selectedRange && firstMonth && lastMonth) {
                setSelectedRange([firstMonth, lastMonth]);
              }
              setInteractionMode('brush');
            }}
            className={`rounded px-3 py-1 text-sm ${interactionMode === 'brush' ? 'bg-slate-800 text-white' : 'hover:bg-gray-100'}`}
          >
            Brush months
          </button>
        </div>
      </div>

      {interactionMode === 'brush' && (
        <div className="mb-2 flex flex-wrap items-center justify-center gap-3 font-mono text-sm">
          <label className="flex items-center gap-1" htmlFor="week10-range-start">
            Start month
            <input
              id="week10-range-start"
              type="month"
              min={firstMonth ? formatMonthInput(firstMonth) : undefined}
              max={lastMonth ? formatMonthInput(lastMonth) : undefined}
              value={fromMonth}
              disabled={availableMonths.length === 0}
              onChange={(event) => updateMonthRange('start', event.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1" htmlFor="week10-range-end">
            End month
            <input
              id="week10-range-end"
              type="month"
              min={firstMonth ? formatMonthInput(firstMonth) : undefined}
              max={lastMonth ? formatMonthInput(lastMonth) : undefined}
              value={toMonth}
              disabled={availableMonths.length === 0}
              onChange={(event) => updateMonthRange('end', event.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          {activeRange && (
            <button
              type="button"
              onClick={() => setSelectedRange(null)}
              className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
            >
              Clear range
            </button>
          )}
          <span aria-live="polite">Drag across the plot to compare average monthly ridership.</span>
        </div>
      )}

      <div className="flex min-h-0 w-full flex-1 gap-3">
        <div ref={plotRef} className="min-h-0 min-w-0 flex-1">
          <svg
            ref={svgRef}
            className="h-full w-full"
            role="img"
            aria-label="Scatter plot of total ridership per line"
          />
        </div>
        {interactionMode === 'brush' && (
          <AverageRidershipChart data={averageRidershipByLine} scaleMax={barScaleMax} />
        )}
      </div>
    </div>
  );
}

function AverageRidershipChart({
  data,
  scaleMax,
}: {
  data: { route: string; average: number }[];
  scaleMax: number;
}) {
  const numberFormat = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  return (
    <aside className="flex min-h-0 w-64 shrink-0 flex-col overflow-y-auto rounded border border-gray-200 bg-white p-3 font-mono max-sm:w-48">
      <h2 className="text-sm font-semibold">Average monthly ridership</h2>
      <p className="mb-3 text-xs text-gray-600">
        By line in the selected months · shared scale: 0–{numberFormat.format(scaleMax)}
      </p>
      <div className="space-y-1" role="img" aria-label="Average monthly ridership by MBTA line">
        {data.map(({ route, average }) => (
          <div
            key={route}
            title={`${route}: ${Math.round(average).toLocaleString()} average riders`}
          >
            <div className="mb-0.5 flex items-baseline justify-between gap-2 text-[10px]">
              <span className="truncate" title={route}>
                {route}
              </span>
              <span className="shrink-0">{numberFormat.format(average)}</span>
            </div>
            <div className="h-2 w-full rounded-sm bg-gray-100">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.min(100, (average / scaleMax) * 100)}%`,
                  backgroundColor: colorScale(route),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function formatMonthInput(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function parseMonthInput(value: string): Date | null {
  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
