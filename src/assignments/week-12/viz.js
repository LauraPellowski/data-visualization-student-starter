import { renderBars } from './renderBars.js';

export const viz = (svg, { data, months, monthIndex, hoveredLine, onHover, width, height }) => {
  svg.attr('width', width).attr('height', height);
  renderBars(svg, {
    data,
    months,
    monthIndex,
    hoveredLine,
    onHover,
    width,
    height,
  });
};
