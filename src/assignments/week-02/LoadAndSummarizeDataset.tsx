import { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { csv } from 'd3-fetch';

const DATA_URL = `${import.meta.env.BASE_URL}public/data/MBTA_Monthly_Ridership_By_Mode_and_Line.csv`;

export function LoadAndSummarizeDataset() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rows, setRows] = useState(0);
  const [columns, setColumns] = useState(0);

  useEffect(() => {
    csv(DATA_URL).then((data: any) => {
      setRows(data.length);
      setColumns(data.columns.length);
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    select(svg)
      .selectAll('text')
      .data([
        { label: 'Rows', value: rows },
        { label: 'Columns', value: columns },
      ])
      .join('text')
      .attr('x', 90)
      .attr('y', (_, i) => 30 + i * 30)
      .text((d) => `${d.label}: ${d.value}`)
      .attr('font-size', '18px');
  }, [rows, columns]);

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={`Dataset contains ${rows} rows and ${columns} columns`}
    />
  );
}
