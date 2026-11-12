import React, { useRef, useState, useEffect } from 'react';
import './styles.css';
import { useContainerDimensions } from './useContainerDimensions.js';
import { select } from 'd3-selection';
import { csv } from 'd3-fetch';
import { timeFormat } from 'd3-time-format';
import { viz } from './viz.js';

const excludedAggregates = new Set(['Heavy Rail', 'Light Rail', 'Bus', 'All Bus', 'Silver Line']);

// Months of animation per second while playing (no hold between months).
const MONTHS_PER_SECOND = 1.15;

export const App = () => {
  const divRef = useRef(null);
  const svgRef = useRef(null);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [data, setData] = useState([]);
  // Fractional index: integer part is the month, fraction is blend toward the next.
  const [monthIndex, setMonthIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const dimensions = useContainerDimensions(divRef);

  const DATA_URL = `${import.meta.env.BASE_URL}data/MBTA_Monthly_Ridership_By_Mode_and_Line.csv`;

  useEffect(() => {
    csv(DATA_URL).then((loadedData) => {
      const parsed = loadedData
        .filter((d) => d.daytype === 'Weekday' && !excludedAggregates.has(d.route_or_line))
        .map((d) => ({
          date: new Date(d.month_of_service),
          line: d.route_or_line,
          mode: d.mode || d.Mode || '',
          average: +d.ridership_average,
        }))
        .filter((d) => !isNaN(d.date) && Number.isFinite(d.average));
      setData(parsed);
    });
  }, []);

  // Distinct months, chronological
  const months = [...new Set(data.map((d) => d.date.getTime()))]
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  useEffect(() => {
    if (!playing || months.length === 0) return;
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(100, now - last);
      last = now;
      setMonthIndex((i) => (i + (dt / 1000) * MONTHS_PER_SECOND) % months.length);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, months.length]);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    if (data.length === 0 || months.length === 0) return;
    const wrapped = ((monthIndex % months.length) + months.length) % months.length;

    viz(select(svgRef.current), {
      data,
      months,
      monthIndex: wrapped,
      hoveredLine,
      onHover: setHoveredLine,
      width: dimensions.width,
      height: dimensions.height,
    });
  }, [hoveredLine, dimensions, data, monthIndex, months]);

  const formatDate = timeFormat('%B %Y');
  const safeLength = Math.max(1, months.length);
  const wrappedIndex =
    months.length === 0 ? 0 : ((monthIndex % months.length) + months.length) % months.length;
  const labelMonth = months[Math.floor(wrappedIndex)];

  return (
    <div
      ref={divRef}
      className="week12-root"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <svg
        ref={svgRef}
        className="week12-svg"
        style={{ display: 'block', width: '100%', height: '100%' }}
      ></svg>
      <div className="week12-controls">
        <button onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <input
          type="range"
          min="0"
          max={Math.max(0, months.length - 1)}
          step="1"
          value={Math.min(Math.floor(wrappedIndex), Math.max(0, months.length - 1))}
          onChange={(e) => {
            setPlaying(false);
            setMonthIndex(+e.target.value);
          }}
        />
        <span className="week12-month-label">{labelMonth ? formatDate(labelMonth) : ''}</span>
      </div>
    </div>
  );
};
