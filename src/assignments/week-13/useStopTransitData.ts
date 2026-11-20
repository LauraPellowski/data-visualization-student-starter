import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAlertsForStop,
  getPredictionsForStop,
  getSchedulesForStop,
  type MbtaRoute,
  type MbtaResource,
} from './apiService';

export interface StopPrediction {
  id: string;
  routeId: string;
  routeName: string;
  routeShortName: string;
  routeType: number | null;
  routeColor: string;
  directionId: number | null;
  directionName: string;
  destination: string;
  arrivalTime: string | null;
  departureTime: string | null;
  status: string | null;
  scheduleRelationship: string | null;
  tripHeadsign: string | null;
}

export interface StopSchedule {
  id: string;
  routeId: string;
  routeName: string;
  routeShortName: string;
  routeType: number | null;
  routeColor: string;
  directionId: number | null;
  directionName: string;
  destination: string;
  arrivalTime: string | null;
  departureTime: string | null;
}

export interface StopAlert {
  id: string;
  effect: string | null;
  serviceEffect: string | null;
  header: string | null;
  description: string | null;
  timeframe: string | null;
  severity: number | null;
}

interface TransitState {
  stopId: string;
  serviceDate: string;
  predictions: StopPrediction[];
  schedules: StopSchedule[];
  alerts: StopAlert[];
  schedulesHaveMorePages: boolean;
  routes: MbtaRoute[];
}

const emptyTransitState: TransitState = {
  stopId: '',
  serviceDate: '',
  predictions: [],
  schedules: [],
  alerts: [],
  schedulesHaveMorePages: false,
  routes: [],
};

function getRelationshipId(resource: MbtaResource, relationship: string): string | null {
  const relationships = resource.relationships;
  if (!relationships || typeof relationships !== 'object') {
    return null;
  }
  const relation = relationships[relationship];
  if (!relation || typeof relation !== 'object') {
    return null;
  }
  const data = (relation as { data?: unknown }).data;
  if (!data || typeof data !== 'object') {
    return null;
  }
  const id = (data as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function getString(attributes: Record<string, unknown>, field: string): string | null {
  const value = attributes[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getDirectionId(attributes: Record<string, unknown>): number | null {
  const value = attributes.direction_id;
  return typeof value === 'number' ? value : null;
}

function normalizePredictions(
  resources: MbtaResource[],
  included: MbtaResource[],
  routes: MbtaRoute[],
): StopPrediction[] {
  const routesById = new Map(
    [...routes, ...included.filter((resource) => resource.type === 'route')].map((route) => [
      route.id,
      route,
    ]),
  );

  return resources.map((resource) => {
    const routeId = getRelationshipId(resource, 'route') ?? 'Unknown route';
    const route = routesById.get(routeId);
    const routeAttributes = route?.attributes ?? {};
    const directionId = getDirectionId(resource.attributes);
    const destinations = routeAttributes.direction_destinations;
    const directionNames = routeAttributes.direction_names;
    const destination =
      Array.isArray(destinations) &&
      directionId !== null &&
      typeof destinations[directionId] === 'string'
        ? destinations[directionId]
        : (getString(resource.attributes, 'trip_headsign') ?? 'Direction unavailable');
    const directionName =
      Array.isArray(directionNames) &&
      directionId !== null &&
      typeof directionNames[directionId] === 'string'
        ? directionNames[directionId]
        : directionId === null
          ? 'Direction unavailable'
          : `Direction ${directionId}`;

    return {
      id: resource.id,
      routeId,
      routeName: getString(routeAttributes, 'long_name') ?? routeId,
      routeShortName: getString(routeAttributes, 'short_name') ?? '',
      routeType: typeof routeAttributes.type === 'number' ? routeAttributes.type : null,
      routeColor: getString(routeAttributes, 'color') ?? '',
      directionId,
      directionName,
      destination,
      arrivalTime: getString(resource.attributes, 'arrival_time'),
      departureTime: getString(resource.attributes, 'departure_time'),
      status: getString(resource.attributes, 'status'),
      scheduleRelationship: getString(resource.attributes, 'schedule_relationship'),
      tripHeadsign: getString(resource.attributes, 'trip_headsign'),
    };
  });
}

function normalizeSchedules(resources: MbtaResource[], included: MbtaResource[]): StopSchedule[] {
  const routes = included.filter((resource): resource is MbtaRoute => resource.type === 'route');
  const routesById = new Map(routes.map((route) => [route.id, route]));
  return resources.map((resource) => {
    const routeId = getRelationshipId(resource, 'route') ?? 'Unknown route';
    const routeAttributes = routesById.get(routeId)?.attributes ?? {};
    const directionId = getDirectionId(resource.attributes);
    const directionNames = routeAttributes.direction_names;
    const destinations = routeAttributes.direction_destinations;
    return {
      id: resource.id,
      routeId,
      routeName: getString(routeAttributes, 'long_name') ?? routeId,
      routeShortName: getString(routeAttributes, 'short_name') ?? '',
      routeType: typeof routeAttributes.type === 'number' ? routeAttributes.type : null,
      routeColor: getString(routeAttributes, 'color') ?? '',
      directionId,
      directionName:
        Array.isArray(directionNames) &&
        directionId !== null &&
        typeof directionNames[directionId] === 'string'
          ? directionNames[directionId]
          : directionId === null
            ? 'Direction unavailable'
            : `Direction ${directionId}`,
      destination:
        Array.isArray(destinations) &&
        directionId !== null &&
        typeof destinations[directionId] === 'string'
          ? destinations[directionId]
          : routeId,
      arrivalTime: getString(resource.attributes, 'arrival_time'),
      departureTime: getString(resource.attributes, 'departure_time'),
    };
  });
}

function normalizeAlerts(resources: MbtaResource[]): StopAlert[] {
  return resources.map((resource) => ({
    id: resource.id,
    effect: getString(resource.attributes, 'effect'),
    serviceEffect: getString(resource.attributes, 'service_effect'),
    header:
      getString(resource.attributes, 'header') ?? getString(resource.attributes, 'short_header'),
    description: getString(resource.attributes, 'description'),
    timeframe: getString(resource.attributes, 'timeframe'),
    severity:
      typeof resource.attributes.severity === 'number' ? resource.attributes.severity : null,
  }));
}

export function getBostonServiceDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function useStopTransitData(stopId: string) {
  const [transit, setTransit] = useState<TransitState>(emptyTransitState);
  const [predictionsResult, setPredictionsResult] = useState<{
    key: string;
    error: Error | null;
  } | null>(null);
  const [schedulesResult, setSchedulesResult] = useState<{
    key: string;
    error: Error | null;
  } | null>(null);
  const [alertsResult, setAlertsResult] = useState<{
    key: string;
    error: Error | null;
  } | null>(null);
  const serviceDate = getBostonServiceDate();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const forcePredictionRefresh = useRef(false);
  const predictionsKey = `${stopId}:${refreshVersion}`;
  const schedulesKey = `${stopId}:${serviceDate}`;
  const alertsKey = `${stopId}:${refreshVersion}`;

  useEffect(() => {
    let active = true;
    const forceRefresh = forcePredictionRefresh.current;
    forcePredictionRefresh.current = false;

    if (!stopId) {
      return () => {
        active = false;
      };
    }

    void Promise.resolve()
      .then(() => {
        if (!active) {
          return;
        }
        return getPredictionsForStop(stopId, forceRefresh);
      })
      .then((responses) => {
        if (active && responses) {
          const response = responses;
          const routes = (response.included ?? []).filter(
            (resource): resource is MbtaRoute => resource.type === 'route',
          );
          setTransit((current) => ({
            ...(current.stopId === stopId && current.serviceDate === serviceDate
              ? current
              : emptyTransitState),
            stopId,
            serviceDate,
            routes,
            predictions: normalizePredictions(response.data ?? [], response.included ?? [], routes),
          }));
          setPredictionsResult({ key: predictionsKey, error: null });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setPredictionsResult({
            key: predictionsKey,
            error: err instanceof Error ? err : new Error('Failed to load predictions'),
          });
        }
      });

    void Promise.resolve()
      .then(() => {
        if (!active) {
          return;
        }
        return getAlertsForStop(stopId, forceRefresh);
      })
      .then((response) => {
        if (active && response) {
          setTransit((current) => ({
            ...(current.stopId === stopId && current.serviceDate === serviceDate
              ? current
              : emptyTransitState),
            stopId,
            serviceDate,
            alerts: normalizeAlerts(response.data ?? []),
          }));
          setAlertsResult({ key: alertsKey, error: null });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setAlertsResult({
            key: alertsKey,
            error: err instanceof Error ? err : new Error('Failed to load stop alerts'),
          });
        }
      });

    void Promise.resolve()
      .then(() => {
        if (!active) {
          return;
        }
        return getSchedulesForStop(stopId, serviceDate);
      })
      .then((response) => {
        if (active && response) {
          setTransit((current) => ({
            ...(current.stopId === stopId && current.serviceDate === serviceDate
              ? current
              : emptyTransitState),
            stopId,
            serviceDate,
            schedules: normalizeSchedules(response.data ?? [], response.included ?? []),
            schedulesHaveMorePages: Boolean(response.links?.next),
          }));
          setSchedulesResult({ key: schedulesKey, error: null });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setSchedulesResult({
            key: schedulesKey,
            error: err instanceof Error ? err : new Error('Failed to load schedules'),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [stopId, serviceDate, refreshVersion, predictionsKey, schedulesKey, alertsKey]);

  const refreshPredictions = useCallback(() => {
    if (stopId) {
      forcePredictionRefresh.current = true;
      setRefreshVersion((version) => version + 1);
    }
  }, [stopId]);

  const predictionsAreCurrent = predictionsResult?.key === predictionsKey;
  const schedulesAreCurrent = schedulesResult?.key === schedulesKey;
  const alertsAreCurrent = alertsResult?.key === alertsKey;
  const dataIsCurrent = transit.stopId === stopId && transit.serviceDate === serviceDate;

  return {
    predictions: dataIsCurrent ? transit.predictions : [],
    schedules: dataIsCurrent ? transit.schedules : [],
    alerts: dataIsCurrent ? transit.alerts : [],
    schedulesHaveMorePages: dataIsCurrent && transit.schedulesHaveMorePages,
    routes: dataIsCurrent ? transit.routes : [],
    predictionsLoading: Boolean(stopId) && !predictionsAreCurrent,
    schedulesLoading: Boolean(stopId) && !schedulesAreCurrent,
    predictionsError: predictionsAreCurrent ? predictionsResult.error : null,
    schedulesError: schedulesAreCurrent ? schedulesResult.error : null,
    alertsLoading: Boolean(stopId) && !alertsAreCurrent,
    alertsError: alertsAreCurrent ? alertsResult.error : null,
    serviceDate,
    refreshPredictions,
  };
}
