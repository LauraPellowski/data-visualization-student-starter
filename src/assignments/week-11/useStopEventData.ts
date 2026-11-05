import { useEffect, useState } from 'react';
import { getStopEventsForStop, type MbtaResource } from './apiService';
import { getBostonServiceDate } from './useStopTransitData';

export interface StopEvent {
  id: string;
  routeId: string;
  routeName: string;
  routeShortName: string;
  routeColor: string;
  directionName: string;
  destination: string;
  arrivalTime: string | null;
  departureTime: string | null;
  scheduledArrivalTime: string | null;
  scheduledDepartureTime: string | null;
  scheduleId: string | null;
  tripId: string | null;
  stopSequence: number | null;
  updatedAt: string | null;
}

function getRelationshipId(resource: MbtaResource, relationship: string): string | null {
  const relation = resource.relationships?.[relationship];
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

function getString(attributes: Record<string, unknown>, key: string): string | null {
  const value = attributes[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getTodayInBoston(time: string): string | null {
  const timestamp = Date.parse(time);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeStopEvents(resources: MbtaResource[], included: MbtaResource[]): StopEvent[] {
  const routes = new Map(
    included.filter((resource) => resource.type === 'route').map((route) => [route.id, route]),
  );
  const schedules = new Map(
    included
      .filter((resource) => resource.type === 'schedule')
      .map((schedule) => [schedule.id, schedule]),
  );
  const today = getBostonServiceDate();

  return resources
    .map((resource) => {
      const routeId = getRelationshipId(resource, 'route') ?? 'Unknown route';
      const routeAttributes = routes.get(routeId)?.attributes ?? {};
      const directionId = resource.attributes.direction_id;
      const directionNames = routeAttributes.direction_names;
      const destinations = routeAttributes.direction_destinations;
      const arrivalTime =
        getString(resource.attributes, 'arrived') ?? getString(resource.attributes, 'arrival_time');
      const departureTime =
        getString(resource.attributes, 'departed') ??
        getString(resource.attributes, 'departure_time');
      //const eventTime = arrivalTime ?? departureTime;
      const routeName = getString(routeAttributes, 'long_name') ?? routeId;
      const routeShortName = getString(routeAttributes, 'short_name') ?? '';
      const scheduleId = getRelationshipId(resource, 'schedule');
      const scheduleAttributes = scheduleId ? (schedules.get(scheduleId)?.attributes ?? {}) : {};

      return {
        id: resource.id,
        routeId,
        routeName,
        routeShortName,
        routeColor: getString(routeAttributes, 'color') ?? '',
        directionName:
          Array.isArray(directionNames) &&
          typeof directionId === 'number' &&
          typeof directionNames[directionId] === 'string'
            ? directionNames[directionId]
            : typeof directionId === 'number'
              ? `Direction ${directionId}`
              : 'Direction unavailable',
        destination:
          Array.isArray(destinations) &&
          typeof directionId === 'number' &&
          typeof destinations[directionId] === 'string'
            ? destinations[directionId]
            : routeName,
        arrivalTime,
        departureTime,
        scheduledArrivalTime: getString(scheduleAttributes, 'arrival_time'),
        scheduledDepartureTime: getString(scheduleAttributes, 'departure_time'),
        scheduleId,
        tripId: getRelationshipId(resource, 'trip'),
        stopSequence:
          typeof resource.attributes.stop_sequence === 'number'
            ? resource.attributes.stop_sequence
            : null,
        updatedAt: getString(resource.attributes, 'updated_at'),
      };
    })
    .filter((event) => {
      const eventTime = event.arrivalTime ?? event.departureTime;
      return eventTime !== null && getTodayInBoston(eventTime) === today;
    })
    .sort(
      (first, second) =>
        Date.parse(first.arrivalTime ?? first.departureTime ?? '') -
        Date.parse(second.arrivalTime ?? second.departureTime ?? ''),
    );
}

export function useStopEventData(stopId: string) {
  const [events, setEvents] = useState<{ stopId: string; data: StopEvent[] }>({
    stopId: '',
    data: [],
  });
  const [result, setResult] = useState<{ key: string; error: Error | null } | null>(null);
  const serviceDate = getBostonServiceDate();
  const key = `${stopId}:${serviceDate}`;

  useEffect(() => {
    let active = true;
    if (!stopId) {
      return () => {
        active = false;
      };
    }

    getStopEventsForStop(stopId)
      .then((response) => {
        if (active) {
          setEvents({
            stopId,
            data: normalizeStopEvents(response.data ?? [], response.included ?? []),
          });
          setResult({ key, error: null });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setResult({
            key,
            error: err instanceof Error ? err : new Error('Failed to load observed stop events'),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [stopId, key]);

  const isCurrent = result?.key === key;
  return {
    events: events.stopId === stopId ? events.data : [],
    loading: Boolean(stopId) && !isCurrent,
    error: isCurrent ? result.error : null,
    serviceDate,
  };
}
