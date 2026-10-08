import type { ComponentType } from 'react';
import { ResponsivePseudoScatterPlot } from './week-01/ResponsivePseudoScatterPlot';
import { LoadAndSummarizeDataset } from './week-02/LoadAndSummarizeDataset';
import { ScatterplotBasic } from './week-03/ScatterplotBasic';
import { ScatterplotBasic2 } from './week-04/ScatterplotBasic2';
import { ScatterplotBasic3 } from './week-05/ScatterplotBasic3';
import { MapView } from './week-06/MapView';
import { LloydRelaxation } from './week-07/LloydRelaxation';

export interface Assignment {
  id: string;
  name: string;
  component: ComponentType;
}

export const assignments: Assignment[] = [
  {
    id: '1',
    name: 'Week 1',
    component: ResponsivePseudoScatterPlot,
  },
  {
    id: '2',
    name: 'Week 2',
    component: LoadAndSummarizeDataset,
  },
  {
    id: '3',
    name: 'Week 3',
    component: ScatterplotBasic,
  },
  {
    id: '4',
    name: 'Week 4',
    component: ScatterplotBasic2,
  },
  {
    id: '5',
    name: 'Week 5',
    component: ScatterplotBasic3,
  },
  {
    id: '6',
    name: 'Week 6',
    component: MapView,
  },
  {
    id: '7',
    name: 'Week 7',
    component: LloydRelaxation,
  },
];

export const assignmentsMap = new Map(assignments.map((ex) => [ex.id, ex]));

export const defaultAssignment = '1';
