import type { ComponentType } from 'react';
import { ResponsivePseudoScatterPlot } from './week-01/ResponsivePseudoScatterPlot';
import { LoadAndSummarizeDataset } from './week-02/LoadAndSummarizeDataset';
import { ScatterplotBasic } from './week-03/ScatterplotBasic';
import { ScatterplotBasic2 } from './week-04/ScatterplotBasic2';

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
];

export const assignmentsMap = new Map(assignments.map((ex) => [ex.id, ex]));

export const defaultAssignment = '1';
