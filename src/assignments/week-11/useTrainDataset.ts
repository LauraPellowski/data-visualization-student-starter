import { useEffect, useState } from 'react';
import { csv } from 'd3-fetch';

export interface TrainRow {
  month_of_service: Date;
  daytype: string;
  daycount: number;
  route_or_line: string;
  ridership_total: number;
  ridership_average: number;
}

const DATA_URL = `${import.meta.env.BASE_URL}data/MBTA_Monthly_Ridership_By_Mode_and_Line.csv`;

export function useTrainDataset() {
  const [data, setData] = useState<TrainRow[] | null>(null);

  useEffect(() => {
    csv<TrainRow>(DATA_URL, (rawRow): TrainRow => ({
      month_of_service: new Date(rawRow.month_of_service),
      daytype: rawRow.daytype,
      daycount: Number(rawRow.daycount),
      route_or_line: rawRow.route_or_line,
      ridership_total: Number(rawRow.ridership_total),
      ridership_average: Number(rawRow.ridership_average),
    }))
      .then((rows) => {
        setData(rows);
      })
      .catch((error) => {
        console.error('Failed to load data', error);
      });
  }, []);

  return data;
}
