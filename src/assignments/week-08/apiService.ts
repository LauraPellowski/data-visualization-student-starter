export const lines = ['Red', 'Orange', 'Blue', 'Green-B', 'Green-C', 'Green-D', 'Green-E'];

const apiBaseUrl = 'https://api-v3.mbta.com';

export interface MbtaResource<
  TAttributes extends Record<string, unknown> = Record<string, unknown>,
  TRelationships extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  type?: string;
  attributes: TAttributes;
  relationships?: TRelationships;
  links?: Record<string, unknown>;
}

export interface MbtaCollection<TResource> {
  data: TResource[];
  links?: Record<string, unknown> & { next?: string };
  included?: MbtaResource[];
}

export interface MbtaRouteAttributes extends Record<string, unknown> {
  color?: string;
  type?: number;
  short_name?: string;
  long_name?: string;
  direction_names?: unknown[];
  direction_destinations?: unknown[];
}

export type MbtaRoute = MbtaResource<MbtaRouteAttributes>;
export type MbtaTransitResource = MbtaResource;
export type MbtaTransitCollection = MbtaCollection<MbtaTransitResource>;

interface VehicleRelationships extends Record<string, unknown> {
  route?: { data?: { id: string } | null };
  stop?: { data?: { id: string } | null };
}

interface VehicleAttributes extends Record<string, unknown> {
  latitude: number | null;
  longitude: number | null;
  bearing: number | null;
  speed: number | null;
  current_status: string | null;
}

interface ShapeAttributes extends Record<string, unknown> {
  polyline: string;
}

type VehicleResource = MbtaResource<VehicleAttributes, VehicleRelationships>;
type ShapeResource = MbtaResource<ShapeAttributes>;

async function fetchMbtaJson<T>(url: URL): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MBTA API request failed (${response.status} ${response.statusText})`);
  }
  return response.json() as Promise<T>;
}

function createApiUrl(resource: string, filters?: Record<string, string>): URL {
  const url = new URL(`/${resource}`, apiBaseUrl);
  for (const [key, value] of Object.entries(filters ?? {})) {
    url.searchParams.set(`filter[${key}]`, value);
  }
  return url;
}

function createStopTransitUrl(
  resource: 'predictions' | 'schedules',
  stopId: string,
  date?: string,
): URL {
  const url = createApiUrl(resource, {
    stop: stopId,
    ...(date ? { date } : {}),
  });
  url.searchParams.set('sort', 'time');
  url.searchParams.set('page[limit]', resource === 'predictions' ? '100' : '1000');
  url.searchParams.set('include', 'route');
  return url;
}

export async function getAllVehicles(): Promise<MbtaCollection<VehicleResource>> {
  return fetchMbtaJson(createApiUrl('vehicles'));
}

export async function getAllTrains(): Promise<MbtaCollection<VehicleResource>> {
  return fetchMbtaJson(createApiUrl('vehicles', { route: lines.join(',') }));
}

export async function getVehiclesByLine(line: string): Promise<MbtaCollection<VehicleResource>> {
  return fetchMbtaJson(createApiUrl('vehicles', { route: line }));
}

export async function getRouteMapByLine(line: string): Promise<MbtaCollection<ShapeResource>> {
  return fetchMbtaJson(createApiUrl('shapes', { route: line }));
}

let railStopsRequest: Promise<MbtaCollection<MbtaResource>> | null = null;

export function getRailStops(): Promise<MbtaCollection<MbtaResource>> {
  if (!railStopsRequest) {
    const url = createApiUrl('stops', { route: lines.join(',') });
    // Ask for a large first page, but intentionally do not follow the next-page link.
    url.searchParams.set('page[limit]', '1000');
    railStopsRequest = fetchMbtaJson<MbtaCollection<MbtaResource>>(url).catch((error: unknown) => {
      railStopsRequest = null;
      throw error;
    });
  }
  return railStopsRequest;
}

const predictionRequests = new Map<string, Promise<MbtaCollection<MbtaResource>>>();
const scheduleRequests = new Map<string, Promise<MbtaCollection<MbtaResource>>>();

export function getPredictionsForStop(
  stopId: string,
  refresh = false,
): Promise<MbtaCollection<MbtaResource>> {
  if (refresh) {
    predictionRequests.delete(stopId);
  }
  const cachedRequest = predictionRequests.get(stopId);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = fetchMbtaJson<MbtaTransitCollection>(
    createStopTransitUrl('predictions', stopId),
  ).catch((error: unknown) => {
    predictionRequests.delete(stopId);
    throw error;
  });
  predictionRequests.set(stopId, request);
  return request;
}

export function getSchedulesForStop(
  stopId: string,
  date: string,
): Promise<MbtaCollection<MbtaResource>> {
  const cacheKey = `${stopId}:${date}`;
  const cachedRequest = scheduleRequests.get(cacheKey);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = fetchMbtaJson<MbtaTransitCollection>(
    createStopTransitUrl('schedules', stopId, date),
  ).catch((error: unknown) => {
    scheduleRequests.delete(cacheKey);
    throw error;
  });
  scheduleRequests.set(cacheKey, request);
  return request;
}

const stopAlertRequests = new Map<string, Promise<MbtaTransitCollection>>();

export function getAlertsForStop(stopId: string, refresh = false): Promise<MbtaTransitCollection> {
  if (refresh) {
    stopAlertRequests.delete(stopId);
  }
  const cachedRequest = stopAlertRequests.get(stopId);
  if (cachedRequest) {
    return cachedRequest;
  }

  const url = createApiUrl('alerts', { stop: stopId, datetime: 'NOW' });
  url.searchParams.set('page[limit]', '20');
  const request = fetchMbtaJson<MbtaTransitCollection>(url).catch((error: unknown) => {
    stopAlertRequests.delete(stopId);
    throw error;
  });
  stopAlertRequests.set(stopId, request);
  return request;
}

const railRidershipUrl =
  'https://www.arcgis.com/sharing/rest/content/items/6494749a29c648018820d0e49636205c/data';
let railRidershipRequest: Promise<string> | null = null;

export function getRailRidershipCsv(): Promise<string> {
  if (!railRidershipRequest) {
    railRidershipRequest = fetch(railRidershipUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Ridership data request failed (${response.status} ${response.statusText})`,
          );
        }
        return response.text();
      })
      .catch((error: unknown) => {
        railRidershipRequest = null;
        throw error;
      });
  }
  return railRidershipRequest;
}
