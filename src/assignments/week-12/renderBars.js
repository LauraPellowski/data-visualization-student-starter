import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { max } from 'd3-array';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';
import { axisBottom } from 'd3-axis';

const formatTick = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);
const formatValue = format(',');

const COMMUTER_PURPLE = '#7B2D8E';
const BUS_YELLOW = '#F5C518';

const isCommuterRail = (line, mode) => {
  const m = (mode || '').toLowerCase();
  const l = (line || '').toLowerCase();
  return m.includes('commuter') || l.includes('commuter');
};

const isBus = (line, mode) => {
  const m = (mode || '').toLowerCase();
  const l = (line || '').toLowerCase();
  return m.includes('bus') || l.includes('bus') || l.includes('silver line');
};

const monthMap = (data, month) => {
  const map = new Map();
  if (!month) return map;
  const t = month.getTime();
  for (const d of data) {
    if (d.date.getTime() === t) map.set(d.line, d);
  }
  return map;
};

const ranksFor = (lines, valueOf) => {
  const sorted = [...lines].sort((a, b) => valueOf(b) - valueOf(a) || a.localeCompare(b));
  return new Map(sorted.map((line, i) => [line, i]));
};

export const renderBars = (
  selection,
  { data, months, monthIndex, hoveredLine, onHover, width, height },
) => {
  const margin = { top: 80, right: 120, bottom: 95, left: 130 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  if (!months.length) return;
  const wrapped = ((monthIndex % months.length) + months.length) % months.length;
  const i0 = Math.floor(wrapped);
  const f = wrapped - i0;
  const i1 = (i0 + 1) % months.length;
  const month0 = months[i0];
  const month1 = months[i1];

  const map0 = monthMap(data, month0);
  const map1 = monthMap(data, month1);
  const lines = [...new Set(data.map((d) => d.line))];
  if (lines.length === 0) return;

  const metaByLine = new Map();
  for (const d of data) if (!metaByLine.has(d.line)) metaByLine.set(d.line, d);

  const valueAt = (map, line) => map.get(line)?.average ?? 0;
  const metaOf = (line) => map0.get(line) || map1.get(line) || metaByLine.get(line);
  const r0 = ranksFor(lines, (line) => valueAt(map0, line));
  const r1 = ranksFor(lines, (line) => valueAt(map1, line));

  const rows = lines.map((line) => {
    const meta = metaOf(line);
    return {
      line,
      mode: meta?.mode || '',
      average: valueAt(map0, line) * (1 - f) + valueAt(map1, line) * f,
      rank: r0.get(line) * (1 - f) + r1.get(line) * f,
    };
  });

  const n = rows.length;
  const slot = innerHeight / n;
  const barHeight = Math.max(1, slot * 0.82);

  const xScale = scaleLinear()
    .domain([0, max(data, (d) => d.average) || 1])
    .range([0, innerWidth])
    .nice();

  const color = scaleOrdinal(schemeTableau10).domain([...new Set(data.map((d) => d.line))]);

  const fillFor = (d) => {
    if (isCommuterRail(d.line, d.mode)) return COMMUTER_PURPLE;
    if (isBus(d.line, d.mode)) return BUS_YELLOW;
    return color(d.line);
  };

  const yOf = (d) => d.rank * slot;

  const g = selection
    .selectAll('g.chart')
    .data([null])
    .join('g')
    .attr('class', 'chart')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  g.selectAll('text.title')
    .data([null])
    .join('text')
    .attr('class', 'title')
    .attr('x', 0)
    .attr('y', -45)
    .attr('font-size', 20)
    .attr('font-weight', 'bold')
    .text('MBTA Average Weekday Ridership by Line');

  g.selectAll('text.subtitle')
    .data([null])
    .join('text')
    .attr('class', 'subtitle')
    .attr('x', 0)
    .attr('y', -22)
    .attr('font-size', 14)
    .attr('fill', '#555')
    .text('Ranked by average daily boardings, weekday service');

  g.selectAll('text.month-label')
    .data([null])
    .join('text')
    .attr('class', 'month-label')
    .attr('x', innerWidth)
    .attr('y', -35)
    .attr('text-anchor', 'end')
    .attr('font-size', 28)
    .attr('font-weight', 'bold')
    .attr('fill', '#2c5f8a')
    .text(timeFormat('%B %Y')(month0));

  g.selectAll('g.x-axis')
    .data([null])
    .join('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(axisBottom(xScale).tickFormat(formatTick));

  g.selectAll('text.axis-label')
    .data([null])
    .join('text')
    .attr('class', 'axis-label')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 40)
    .attr('text-anchor', 'middle')
    .attr('font-size', 13)
    .attr('fill', '#555')
    .text('Average Daily Boardings');

  // Direct updates (no month-long transition) so playback stays continuous.
  g.selectAll('rect.bar')
    .data(rows, (d) => d.line)
    .join(
      (enter) =>
        enter
          .append('rect')
          .attr('class', 'bar')
          .attr('x', 0)
          .attr('width', 0)
          .attr('y', yOf)
          .attr('height', barHeight),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr('fill', fillFor)
    .attr('opacity', (d) => (hoveredLine === null || d.line === hoveredLine ? 1 : 0.4))
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => onHover(d.line))
    .on('mouseleave', () => onHover(null))
    .attr('x', 0)
    .attr('width', (d) => xScale(d.average))
    .attr('y', yOf)
    .attr('height', barHeight);

  g.selectAll('text.name-label')
    .data(rows, (d) => d.line)
    .join((enter) =>
      enter
        .append('text')
        .attr('class', 'name-label')
        .attr('x', -10)
        .attr('text-anchor', 'end')
        .attr('font-size', 13)
        .text((d) => d.line),
    )
    .attr('font-weight', (d) => (d.line === hoveredLine ? 'bold' : 'normal'))
    .attr('fill', fillFor)
    .attr('y', (d) => yOf(d) + barHeight / 2 + 4);

  g.selectAll('text.value-label')
    .data(rows, (d) => d.line)
    .join('text')
    .attr('class', 'value-label')
    .attr('font-size', 12)
    .attr('fill', '#333')
    .text((d) => formatValue(Math.round(d.average)))
    .attr('x', (d) => xScale(d.average) + 6)
    .attr('y', (d) => yOf(d) + barHeight / 2 + 4);
};
