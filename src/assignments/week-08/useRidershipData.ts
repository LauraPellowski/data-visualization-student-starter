import { useEffect, useState } from 'react';
import { getRailRidershipCsv } from './apiService';

export type RidershipDayType = 'Weekday' | 'Saturday' | 'Sunday';

export interface HourlyRidership {
  hour: string;
  averageOns: number;
  averageOffs: number;
}

interface RidershipRow {
  parent_station: string;
  day_type_name: RidershipDayType;
  hour_of_service: string;
  average_ons: string;
  average_offs: string;
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function parseRidershipCsv(csv: string): RidershipRow[] {
  const lines = csv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) {
    return [];
  }
  const headers = parseCsvRow(lines[0]).map((header) => header.trim());
  const required = [
    'parent_station',
    'day_type_name',
    'hour_of_service',
    'average_ons',
    'average_offs',
  ];
  if (!required.every((header) => headers.includes(header))) {
    throw new Error('The ridership dataset did not contain the expected columns.');
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    return {
      parent_station: String(row.parent_station ?? ''),
      day_type_name: String(row.day_type_name ?? '') as RidershipDayType,
      hour_of_service: String(row.hour_of_service ?? ''),
      average_ons: String(row.average_ons ?? ''),
      average_offs: String(row.average_offs ?? ''),
    };
  });
}

let parsedRidershipRequest: Promise<RidershipRow[]> | null = null;

function loadRidershipRows(): Promise<RidershipRow[]> {
  if (!parsedRidershipRequest) {
    parsedRidershipRequest = getRailRidershipCsv()
      .then(parseRidershipCsv)
      .catch((error: unknown) => {
        parsedRidershipRequest = null;
        throw error;
      });
  }
  return parsedRidershipRequest;
}

export function useRidershipData(parentStationId: string) {
  const [dayType, setDayType] = useState<RidershipDayType>('Weekday');
  const [result, setResult] = useState<{
    key: string;
    data: HourlyRidership[];
    error: Error | null;
  } | null>(null);
  const key = `${parentStationId}:${dayType}`;

  useEffect(() => {
    let active = true;

    if (!parentStationId) {
      return () => {
        active = false;
      };
    }

    void Promise.resolve()
      .then(loadRidershipRows)
      .then((rows) => {
        if (!active) {
          return;
        }
        const totals = new Map<string, { ons: number; offs: number }>();
        for (const row of rows) {
          if (row.parent_station !== parentStationId || row.day_type_name !== dayType) {
            continue;
          }
          const current = totals.get(row.hour_of_service) ?? { ons: 0, offs: 0 };
          current.ons += Number(row.average_ons) || 0;
          current.offs += Number(row.average_offs) || 0;
          totals.set(row.hour_of_service, current);
        }
        const data = [...totals.entries()]
          .map(([hour, values]) => ({
            hour,
            averageOns: values.ons,
            averageOffs: values.offs,
          }))
          .sort((first, second) => first.hour.localeCompare(second.hour));
        setResult({ key, data, error: null });
      })
      .catch((err: unknown) => {
        if (active) {
          setResult({
            key,
            data: [],
            error:
              err instanceof Error ? err : new Error('Failed to load historical ridership data'),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [parentStationId, dayType, key]);

  const isCurrent = result?.key === key;
  return {
    hourlyRidership: isCurrent ? result.data : [],
    dayType,
    setDayType,
    loading: Boolean(parentStationId) && !isCurrent,
    error: isCurrent ? result.error : null,
  };
}
