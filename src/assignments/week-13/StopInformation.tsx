import type { Stop } from './useStopData';
import {
  useStopTransitData,
  type StopAlert,
  type StopPrediction,
  type StopSchedule,
} from './useStopTransitData';
import { useRidershipData, type HourlyRidership, type RidershipDayType } from './useRidershipData';
import { useStopEventData, type StopEvent } from './useStopEventData';
import {
  useStopFacilityData,
  type LiveFacilityStatus,
  type StopFacility,
} from './useStopFacilityData';

interface StopInformationProps {
  stops: Stop[];
  selectedStopId: string;
  loading: boolean;
  error: Error | null;
  onStopChange: (stopId: string) => void;
}

export function StopInformation({
  stops,
  selectedStopId,
  loading,
  error,
  onStopChange,
}: StopInformationProps) {
  const selectedStop = stops.find((stop) => stop.id === selectedStopId);
  const stationId = selectedStop ? getParentStationId(selectedStop) : '';
  const transit = useStopTransitData(selectedStopId);
  const observedEvents = useStopEventData(stationId);
  const stationFacilities = useStopFacilityData(stationId);
  const ridership = useRidershipData(stationId);
  const sortedStops = [...stops].sort((first, second) =>
    getStopName(first).localeCompare(getStopName(second)),
  );

  return (
    <section className="mx-auto w-full max-w-4xl font-mono">
      <h1 className="mb-2 text-3xl font-semibold">Stop Information</h1>
      <p className="mb-6 text-sm text-gray-600">
        Choose a subway or light-rail stop to view the information provided by the MBTA.
      </p>

      <label className="mb-2 block font-medium" htmlFor="mbta-stop-select">
        Select a stop
      </label>
      <select
        id="mbta-stop-select"
        className="mb-6 w-full max-w-xl rounded border border-gray-300 bg-white px-3 py-2"
        value={selectedStopId}
        onChange={(event) => onStopChange(event.target.value)}
        disabled={loading || stops.length === 0}
      >
        <option value="">Choose a stop</option>
        {sortedStops.map((stop) => (
          <option key={stop.id} value={stop.id}>
            {getStopName(stop)}
          </option>
        ))}
      </select>

      {loading && <p role="status">Loading MBTA stops...</p>}
      {error && <p role="alert">Could not load MBTA stops: {error.message}</p>}
      {!loading && !error && stops.length === 0 && (
        <p>No stops were returned for these rail lines.</p>
      )}

      {selectedStop && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">{getStopName(selectedStop)}</h2>
          <StopServiceAlerts
            alerts={transit.alerts}
            loading={transit.alertsLoading}
            error={transit.alertsError}
            stopName={getStopName(selectedStop)}
          />
          <TransitInformation
            predictions={transit.predictions}
            schedules={transit.schedules}
            stopEvents={observedEvents.events}
            eventsLoading={observedEvents.loading}
            eventsError={observedEvents.error}
            alerts={transit.alerts}
            alertsLoading={transit.alertsLoading}
            alertsError={transit.alertsError}
            schedulesHaveMorePages={transit.schedulesHaveMorePages}
            predictionsLoading={transit.predictionsLoading}
            schedulesLoading={transit.schedulesLoading}
            predictionsError={transit.predictionsError}
            schedulesError={transit.schedulesError}
            serviceDate={transit.serviceDate}
            onRefreshPredictions={transit.refreshPredictions}
          />
          <RidershipInformation
            data={ridership.hourlyRidership}
            dayType={ridership.dayType}
            onDayTypeChange={ridership.setDayType}
            loading={ridership.loading}
            error={ridership.error}
          />
          <StopFacilitiesInformation
            facilities={stationFacilities.facilities}
            liveStatuses={stationFacilities.liveStatuses}
            loading={stationFacilities.loading}
            liveLoading={stationFacilities.liveLoading}
            error={stationFacilities.error}
            liveError={stationFacilities.liveError}
          />
        </div>
      )}
    </section>
  );
}

function RidershipInformation({
  data,
  dayType,
  onDayTypeChange,
  loading,
  error,
}: {
  data: HourlyRidership[];
  dayType: RidershipDayType;
  onDayTypeChange: (dayType: RidershipDayType) => void;
  loading: boolean;
  error: Error | null;
}) {
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.averageOns, item.averageOffs]));

  return (
    <details className="rounded border border-gray-200 bg-white p-4">
      <summary className="cursor-pointer">
        <h3 className="inline-block align-middle text-lg font-semibold">Hourly ridership</h3>
        <p className="ml-5 text-xs text-gray-600">
          Fall 2025 typical-day averages; historical data, not live counts.
        </p>
      </summary>

      <div className="mt-3">
        <div className="mb-3 flex justify-end">
          <label className="flex items-center gap-2 text-sm" htmlFor="ridership-day-type">
            Day type
            <select
              id="ridership-day-type"
              className="rounded border border-gray-300 bg-white px-2 py-1"
              value={dayType}
              onChange={(event) => onDayTypeChange(event.target.value as RidershipDayType)}
            >
              <option>Weekday</option>
              <option>Saturday</option>
              <option>Sunday</option>
            </select>
          </label>
        </div>
        {loading && <p role="status">Loading historical ridership…</p>}
        {error && <p role="alert">Could not load ridership: {error.message}</p>}
        {!loading && !error && data.length === 0 && (
          <p className="text-sm text-gray-600">
            No hourly ridership data was found for this stop and day type.
          </p>
        )}
        {!loading && !error && data.length > 0 && (
          <>
            <div className="mb-2 flex gap-4 text-xs" aria-label="Chart legend">
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 bg-blue-700" />
                Boardings
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 bg-amber-500" />
                Alightings
              </span>
            </div>
            <div className="w-full overflow-hidden">
              <div
                className="grid w-full gap-0.5"
                style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                role="img"
                aria-label={`Average hourly boardings and alightings at this stop for a typical ${dayType.toLowerCase()} in Fall 2025`}
              >
                {data.map((item) => (
                  <div className="flex min-w-0 flex-col items-center" key={item.hour}>
                    <div className="flex h-24 w-full items-end justify-center gap-px border-b border-gray-300">
                      <span
                        className="w-1/3 bg-blue-700 sm:w-2"
                        style={{ height: `${Math.max(2, (item.averageOns / maxValue) * 100)}%` }}
                        title={`Boardings: ${Math.round(item.averageOns)}`}
                      />
                      <span
                        className="w-1/3 bg-amber-500 sm:w-2"
                        style={{ height: `${Math.max(2, (item.averageOffs / maxValue) * 100)}%` }}
                        title={`Alightings: ${Math.round(item.averageOffs)}`}
                      />
                    </div>
                    <span className="mt-1 whitespace-nowrap text-[8px] sm:text-[10px]">
                      {formatHour(item.hour)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Bars and labels show average boardings/alightings by hour across the Fall 2025 rating.
              Holidays are excluded.
            </p>
          </>
        )}
      </div>
    </details>
  );
}

function StopServiceAlerts({
  alerts,
  loading,
  error,
  stopName,
}: {
  alerts: StopAlert[];
  loading: boolean;
  error: Error | null;
  stopName: string;
}) {
  return (
    <section
      className="space-y-3 rounded border border-gray-200 bg-white p-4"
      aria-label="Current service alerts"
    >
      <div>
        <h3 className="text-lg font-semibold">Service alerts</h3>
        <p className="text-xs text-gray-600">For {stopName}</p>
      </div>
      {loading && (
        <p role="status" className="text-sm text-gray-600">
          Checking current service alerts…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-amber-800">
          Could not check alerts for {stopName}: {error.message}
        </p>
      )}
      {!loading && !error && alerts.length === 0 && (
        <p className="text-sm text-gray-600">
          No current MBTA service alerts were returned for {stopName}.
        </p>
      )}
      {!loading &&
        !error &&
        alerts.map((alert) => {
          const isClosure = isStopClosureEffect(alert.effect);
          return (
            <article
              className={`rounded border p-4 ${
                isClosure
                  ? 'border-red-300 bg-red-50 text-red-950'
                  : 'border-amber-300 bg-amber-50 text-amber-950'
              }`}
              key={alert.id}
              role={isClosure ? 'alert' : 'status'}
            >
              <h4 className="font-semibold">
                {isClosure ? 'Station closure' : 'Service alert'}
                {alert.serviceEffect ? `: ${alert.serviceEffect}` : ''}
              </h4>
              {alert.header && <p className="mt-1 font-medium">{alert.header}</p>}
              {alert.description && (
                <p className="mt-2 whitespace-pre-line text-sm">{alert.description}</p>
              )}
              {alert.timeframe && <p className="mt-2 text-xs">Timing: {alert.timeframe}</p>}
            </article>
          );
        })}
    </section>
  );
}

function isStopClosureEffect(effect: string | null): boolean {
  return (
    effect !== null &&
    ['STATION_CLOSURE', 'STOP_CLOSURE', 'NO_SERVICE', 'SUSPENSION'].includes(effect)
  );
}

function getPredictionStatus(
  prediction: StopPrediction,
  alerts: StopAlert[],
  alertsLoading: boolean,
  alertsError: Error | null,
): string {
  if (prediction.scheduleRelationship === 'SKIPPED') {
    return 'This stop is skipped for this trip';
  }
  if (prediction.status) {
    return prediction.status;
  }
  if (alerts.some((alert) => isStopClosureEffect(alert.effect))) {
    return 'Live status unavailable; see station closure alert above';
  }
  if (alertsLoading) {
    return 'Live status not provided; checking station alerts';
  }
  if (alertsError) {
    return 'Live status not provided; alert check failed';
  }
  return 'Live status not provided by the prediction feed';
}

function getParentStationId(stop: Stop): string {
  const parentStation = stop.relationships?.parent_station;
  if (parentStation && typeof parentStation === 'object') {
    const data = (parentStation as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      const id = (data as { id?: unknown }).id;
      if (typeof id === 'string') {
        return id;
      }
    }
  }
  return stop.id;
}

function StopFacilitiesInformation({
  facilities,
  liveStatuses,
  loading,
  liveLoading,
  error,
  liveError,
}: {
  facilities: StopFacility[];
  liveStatuses: LiveFacilityStatus[];
  loading: boolean;
  liveLoading: boolean;
  error: Error | null;
  liveError: Error | null;
}) {
  const facilitiesByType = new Map<string, StopFacility[]>();
  for (const facility of facilities) {
    const typeFacilities = facilitiesByType.get(facility.type) ?? [];
    typeFacilities.push(facility);
    facilitiesByType.set(facility.type, typeFacilities);
  }

  return (
    <details
      className="rounded border border-emerald-200 bg-emerald-50/40 p-4"
      aria-labelledby="station-facilities-heading"
    >
      <summary className="cursor-pointer">
        <h3
          id="station-facilities-heading"
          className="inline-block align-middle text-lg font-semibold"
        >
          Station facilities &amp; accessibility
        </h3>
        <p className="ml-5 text-xs text-gray-600">
          Facility information is static unless a separate live update is available.
        </p>
      </summary>
      <div className="mt-3">
        {loading && (
          <p role="status" className="text-sm text-gray-600">
            Loading station facilities…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-amber-800">
            Could not load station facilities: {error.message}
          </p>
        )}
        {!loading && !error && facilities.length === 0 && (
          <p className="text-sm text-gray-600">
            No facility records were returned for this station.
          </p>
        )}
        {!loading && !error && facilities.length > 0 && (
          <div className="divide-y divide-emerald-100 rounded border border-emerald-100 bg-white">
            {[...facilitiesByType.entries()].map(([type, typeFacilities]) => {
              const statuses = typeFacilities
                .map((facility) => liveStatuses.find((status) => status.facilityId === facility.id))
                .filter((status): status is LiveFacilityStatus => status !== undefined);
              const liveStatusLabels = [
                ...new Set(statuses.map((status) => status.status).filter(Boolean)),
              ];
              const examples = typeFacilities.slice(0, 2).map((facility) => facility.name);
              return (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,40%)] items-start gap-3 px-3 py-3"
                  key={type}
                >
                  <div className="min-w-0 break-words">
                    <p className="font-semibold">
                      {type.replaceAll('_', ' ')} · {typeFacilities.length}
                    </p>
                    <p className="text-xs text-gray-600">
                      {examples.join(' · ')}
                      {typeFacilities.length > examples.length
                        ? ` · +${typeFacilities.length - examples.length} more`
                        : ''}
                    </p>
                  </div>
                  <div className="min-w-0 max-w-full justify-self-end text-right text-xs">
                    <p className="break-words font-medium">
                      {liveLoading
                        ? 'Checking live status…'
                        : liveError
                          ? 'Live status unavailable'
                          : liveStatusLabels.length > 0
                            ? liveStatusLabels.join(', ')
                            : statuses.length > 0
                              ? 'Live update available; status not provided'
                              : 'Live status unavailable'}
                    </p>
                    {!liveLoading &&
                      !liveError &&
                      statuses.find((status) => status.updatedAt)?.updatedAt && (
                        <p className="text-gray-500">
                          Updated{' '}
                          {formatScheduleTime(
                            statuses.find((status) => status.updatedAt)?.updatedAt ?? null,
                          )}
                        </p>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {liveError && !loading && !error && (
          <p role="status" className="mt-2 text-xs text-amber-800">
            Live facility updates could not be retrieved: {liveError.message}. Static facility
            information remains available.
          </p>
        )}
      </div>
    </details>
  );
}

function formatHour(hour: string): string {
  const [hourString] = hour.split(':');
  const hourNumber = Number(hourString);
  if (!Number.isInteger(hourNumber)) {
    return hour;
  }
  const suffix = hourNumber >= 12 ? 'p' : 'a';
  const displayHour = hourNumber % 12 || 12;
  return `${displayHour}${suffix}`;
}

function TransitInformation({
  predictions,
  schedules,
  stopEvents,
  eventsLoading,
  eventsError,
  alerts,
  alertsLoading,
  alertsError,
  schedulesHaveMorePages,
  predictionsLoading,
  schedulesLoading,
  predictionsError,
  schedulesError,
  serviceDate,
  onRefreshPredictions,
}: {
  predictions: StopPrediction[];
  schedules: StopSchedule[];
  stopEvents: StopEvent[];
  eventsLoading: boolean;
  eventsError: Error | null;
  alerts: StopAlert[];
  alertsLoading: boolean;
  alertsError: Error | null;
  schedulesHaveMorePages: boolean;
  predictionsLoading: boolean;
  schedulesLoading: boolean;
  predictionsError: Error | null;
  schedulesError: Error | null;
  serviceDate: string;
  onRefreshPredictions: () => void;
}) {
  const nextPredictions = getNextPredictions(predictions);
  const predictionKeys = new Set(
    nextPredictions.map(
      (prediction) => `${prediction.routeId}:${prediction.directionId ?? prediction.destination}`,
    ),
  );
  const scheduledFallbacks = getNextScheduledFallbacks(schedules, predictionKeys);
  const displayedArrivals = [...nextPredictions, ...scheduledFallbacks].sort(
    (first, second) => getPredictionTimestamp(first) - getPredictionTimestamp(second),
  );
  const scheduleTimeline = getScheduleTimeline(schedules);

  return (
    <div className="space-y-6">
      <section
        className="rounded border border-blue-200 bg-blue-50/50 p-4"
        aria-labelledby="next-trains-heading"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="next-trains-heading" className="text-lg font-semibold">
            Next trains
          </h3>
          <button
            type="button"
            onClick={onRefreshPredictions}
            disabled={predictionsLoading}
            className="rounded border border-gray-400 bg-white px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60"
          >
            {predictionsLoading ? 'Refreshing…' : 'Refresh arrivals'}
          </button>
        </div>
        {predictionsLoading && <p role="status">Loading live predictions…</p>}
        {predictionsError && (
          <p role="alert">Could not load predictions: {predictionsError.message}</p>
        )}
        {!predictionsLoading && !predictionsError && displayedArrivals.length === 0 && (
          <p>No upcoming predictions are currently available for this stop.</p>
        )}
        {displayedArrivals.length > 0 && (
          <div className="space-y-4">
            {groupPredictionsByRoute(displayedArrivals).map(([routeId, routePredictions]) => {
              const line = getLineDisplay(routePredictions[0]);
              return (
                <section
                  className="overflow-hidden rounded border border-gray-200 bg-white"
                  key={routeId}
                  aria-label={`${line.name} arrivals`}
                >
                  <h4 className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 font-semibold">
                    <span
                      aria-hidden="true"
                      className="inline-block h-4 w-1.5 rounded-sm"
                      style={{ backgroundColor: line.color }}
                    />
                    {line.name}
                  </h4>
                  <ul className="divide-y divide-gray-100">
                    {routePredictions.map((prediction) => (
                      <li
                        className="grid gap-1 px-3 py-3 sm:grid-cols-[1fr_auto]"
                        key={prediction.id}
                      >
                        <div>
                          <p className="font-semibold">{prediction.destination}</p>
                          <p className="text-sm text-gray-600">
                            {prediction.directionName}
                            {prediction.tripHeadsign &&
                            prediction.tripHeadsign !== prediction.destination
                              ? ` · ${prediction.tripHeadsign}`
                              : ''}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold">
                            {getCountdown(prediction.arrivalTime ?? prediction.departureTime)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {getPredictionStatus(prediction, alerts, alertsLoading, alertsError)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </section>

      <details className="rounded border border-gray-300 bg-white p-4">
        <summary className="cursor-pointer" aria-labelledby="today-schedule-heading">
          <h3
            id="today-schedule-heading"
            className="inline-block align-middle text-lg font-semibold"
          >
            Today’s schedule
          </h3>
          <p className="ml-5 text-sm text-gray-600">
            Planned service for {serviceDate} (Boston time)
          </p>
        </summary>
        <div className="mt-3">
          {schedulesLoading && <p role="status">Loading scheduled departures…</p>}
          {schedulesError && <p role="alert">Could not load schedules: {schedulesError.message}</p>}
          {!schedulesLoading && !schedulesError && (
            <>
              {scheduleTimeline.length > 0 ? (
                <ScheduleTimeline groups={scheduleTimeline} />
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  No scheduled departures were found in the returned page.
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                This is scheduled service, not a count of trains actually operated.
                {schedulesHaveMorePages
                  ? ' The timeline shows the first page of results only.'
                  : ''}
              </p>
            </>
          )}
        </div>
      </details>

      <details className="rounded border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer" aria-labelledby="observed-events-heading">
          <h3
            id="observed-events-heading"
            className="inline-block align-middle text-lg font-semibold"
          >
            Observed arrivals
          </h3>
          <p className="ml-5 text-xs text-gray-600">
            Actual arrivals returned for {serviceDate} in Boston time. The feed may be incomplete;
            charts follow the line and direction order above.
          </p>
        </summary>
        <div className="mt-3">
          {eventsLoading && (
            <p role="status" className="text-sm text-gray-600">
              Loading actual arrivals…
            </p>
          )}
          {eventsError && (
            <p role="alert" className="text-sm text-amber-800">
              Could not load actual arrivals: {eventsError.message}
            </p>
          )}
          {!eventsLoading && !eventsError && stopEvents.length === 0 && (
            <p className="text-sm text-gray-600">
              No observed arrivals were returned for this service date.
            </p>
          )}
          {!eventsLoading && !eventsError && stopEvents.length > 0 && (
            <ObservedEventChart events={stopEvents} scheduleGroups={scheduleTimeline} />
          )}
        </div>
      </details>
    </div>
  );
}

interface EventDeviationPoint {
  id: string;
  eventId: string;
  routeId: string;
  lineName: string;
  color: string;
  eventLabel: string;
  destination: string;
  directionName: string;
  actualTime: string;
  deviationMinutes: number;
}

function getEventDeviationPoints(events: StopEvent[]): EventDeviationPoint[] {
  const points: EventDeviationPoint[] = [];

  for (const event of events) {
    const actualTime = event.arrivalTime;
    const scheduledTime = event.scheduledArrivalTime;
    if (!actualTime || !scheduledTime) {
      continue;
    }
    const line = getLineDisplay({
      ...event,
      routeType: null,
      directionId: null,
      status: null,
      scheduleRelationship: null,
      tripHeadsign: null,
    });
    const actualTimestamp = Date.parse(actualTime);
    const scheduledTimestamp = Date.parse(scheduledTime);
    if (Number.isNaN(actualTimestamp) || Number.isNaN(scheduledTimestamp)) {
      continue;
    }
    points.push({
      id: `${event.id}:arrival`,
      eventId: event.id,
      routeId: event.routeId,
      lineName: line.name,
      color: line.color,
      eventLabel: 'Arrival',
      destination: event.destination,
      directionName: event.directionName,
      actualTime,
      deviationMinutes: (actualTimestamp - scheduledTimestamp) / 60_000,
    });
  }

  return points.sort(
    (first, second) => Date.parse(first.actualTime) - Date.parse(second.actualTime),
  );
}

function getBostonHour(time: string): number | null {
  const timestamp = Date.parse(time);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour + minute / 60 : null;
}

function formatDeviation(value: number): string {
  if (Math.abs(value) < 0.5) {
    return 'On time';
  }
  const minutes = Math.round(Math.abs(value));
  return `${minutes} min ${value < 0 ? 'early' : 'late'}`;
}

function ObservedEventChart({
  events,
  scheduleGroups,
}: {
  events: StopEvent[];
  scheduleGroups: ScheduleTimelineGroup[];
}) {
  const points = getEventDeviationPoints(events);
  const arrivalEvents = events.filter((event) => event.arrivalTime !== null);
  const groups = new Map<string, EventDeviationPoint[]>();
  for (const point of points) {
    const key = `${point.routeId}:${point.directionName}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  const scheduleOrder = new Map(
    scheduleGroups.map((group, index) => [`${group.routeId}:${group.directionName}`, index]),
  );
  const orderedGroups = [...groups.entries()].sort(([firstKey], [secondKey]) => {
    const firstOrder = scheduleOrder.get(firstKey) ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = scheduleOrder.get(secondKey) ?? Number.MAX_SAFE_INTEGER;
    return firstOrder - secondOrder || firstKey.localeCompare(secondKey);
  });

  if (points.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        {arrivalEvents.length === 0
          ? 'No observed arrivals were returned for this line and direction.'
          : 'Observed arrivals were returned, but none had a linked scheduled arrival time for calculating deviation.'}
      </p>
    );
  }

  const width = 760;
  const height = 340;
  const margin = { top: 16, right: 20, bottom: 42, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxDeviation = Math.max(...points.map((point) => Math.abs(point.deviationMinutes)));
  const yExtent = Math.max(10, Math.ceil(maxDeviation / 5) * 5);
  const yTicks = [-yExtent, -yExtent / 2, 0, yExtent / 2, yExtent];
  const x = (hour: number) => margin.left + (hour / 24) * plotWidth;
  const y = (minutes: number) => margin.top + ((yExtent - minutes) / (2 * yExtent)) * plotHeight;
  const timeTicks = [0, 6, 12, 18, 24];
  const unmatchedCount = arrivalEvents.length - new Set(points.map((point) => point.eventId)).size;

  return (
    <div>
      <div className="grid gap-4 grid-cols-1">
        {orderedGroups.map(([key, groupPoints]) => {
          const firstPoint = groupPoints[0];
          return (
            <section className="min-w-0 rounded border border-gray-200 bg-white p-3" key={key}>
              <h5 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-1.5 rounded-sm"
                  style={{ backgroundColor: firstPoint.color }}
                />
                {firstPoint.lineName} · {firstPoint.directionName}
              </h5>
              <p className="mb-1 text-[11px] text-gray-500">
                {groupPoints.length} observed point{groupPoints.length === 1 ? '' : 's'}
              </p>
              <div className="w-full overflow-x-auto">
                <svg
                  className="min-w-[420px] w-full"
                  viewBox={`0 0 ${width} ${height}`}
                  role="img"
                  aria-label={`${firstPoint.lineName}, ${firstPoint.directionName}: observed arrivals by Boston time and minutes early or late`}
                >
                  <title>
                    {firstPoint.lineName} · {firstPoint.directionName}
                  </title>
                  <desc>
                    Points below zero were early, points on zero were on time, and points above zero
                    were late.
                  </desc>
                  {yTicks.map((tick) => (
                    <g key={tick}>
                      <line
                        x1={margin.left}
                        x2={width - margin.right}
                        y1={y(tick)}
                        y2={y(tick)}
                        stroke={tick === 0 ? '#374151' : '#E5E7EB'}
                        strokeWidth={tick === 0 ? 2 : 1}
                      />
                      <text
                        x={margin.left - 8}
                        y={y(tick) + 4}
                        textAnchor="end"
                        className="fill-gray-600 text-[11px]"
                      >
                        {tick > 0 ? `+${tick}` : tick}
                      </text>
                    </g>
                  ))}
                  {timeTicks.map((tick) => (
                    <g key={tick}>
                      <line
                        x1={x(tick)}
                        x2={x(tick)}
                        y1={margin.top}
                        y2={height - margin.bottom}
                        stroke="#F3F4F6"
                      />
                      <text
                        x={x(tick)}
                        y={height - margin.bottom + 18}
                        textAnchor="middle"
                        className="fill-gray-600 text-[11px]"
                      >
                        {tick === 0 || tick === 24
                          ? '12a'
                          : tick === 12
                            ? '12p'
                            : tick < 12
                              ? `${tick}a`
                              : `${tick - 12}p`}
                      </text>
                    </g>
                  ))}
                  <text
                    transform={`translate(16 ${margin.top + plotHeight / 2}) rotate(-90)`}
                    textAnchor="middle"
                    className="fill-gray-700 text-xs"
                  >
                    Minutes late / early
                  </text>
                  <text
                    x={margin.left + plotWidth / 2}
                    y={height - 4}
                    textAnchor="middle"
                    className="fill-gray-700 text-xs"
                  >
                    Time of day (Boston)
                  </text>
                  {groupPoints.map((point) => {
                    const hour = getBostonHour(point.actualTime);
                    if (hour === null) {
                      return null;
                    }
                    const deviation = Math.max(-yExtent, Math.min(yExtent, point.deviationMinutes));
                    return (
                      <circle
                        key={point.id}
                        cx={x(hour)}
                        cy={y(deviation)}
                        r={4.5}
                        fill={point.color}
                        stroke="white"
                        strokeWidth={1.5}
                      >
                        <title>
                          {`${point.lineName} · ${point.directionName} · ${point.eventLabel} · ${point.destination} · ${formatScheduleTime(point.actualTime)} · ${formatDeviation(point.deviationMinutes)}`}
                        </title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-gray-600">
        Each chart shows arrivals for one line and direction compared with their linked scheduled
        arrival times: early below 0, on time at 0, and late above 0. Departures are not plotted.
        Hover a dot for details. All charts use the same vertical scale.
        {unmatchedCount > 0
          ? ` ${unmatchedCount} arrival${unmatchedCount === 1 ? ' was' : 's were'} not plotted because no scheduled arrival was linked.`
          : ''}
      </p>
    </div>
  );
}

interface ScheduleTimelineGroup {
  id: string;
  routeId: string;
  directionName: string;
  label: string;
  destination: string;
  color: string;
  departuresByHalfHour: number[];
}

function ScheduleTimeline({ groups }: { groups: ScheduleTimelineGroup[] }) {
  const maximumAcrossAllLines = Math.max(
    1,
    ...groups.flatMap((group) => group.departuresByHalfHour),
  );

  return (
    <div className="mt-4 space-y-4" aria-label="Scheduled departures by time of day">
      {groups.map((group) => (
        <div className="grid gap-2 sm:grid-cols-[minmax(9rem,0.3fr)_1fr]" key={group.id}>
          <div className="min-w-0 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-1.5 shrink-0 rounded-sm"
                style={{ backgroundColor: group.color }}
              />
              <span className="truncate">{group.label}</span>
            </p>
            <p className="truncate pl-3.5 text-xs text-gray-600">{group.destination}</p>
          </div>
          <div>
            <div
              className="flex h-14 items-end gap-px border-b border-gray-300"
              role="img"
              aria-label={`${group.label} scheduled departures over the day`}
            >
              {group.departuresByHalfHour.map((count, index) => (
                <div
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
                  key={index}
                  title={`${formatHalfHour(index)}: ${count} scheduled departure${count === 1 ? '' : 's'}`}
                >
                  {count > 0 && (
                    <span
                      className="w-full max-w-2 rounded-t-sm"
                      style={{
                        height: `${(count / maximumAcrossAllLines) * 100}%`,
                        backgroundColor: group.color,
                        opacity: 0.82,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="relative mt-1 flex justify-between text-[9px] text-gray-500">
              <span>12a</span>
              <span>6a</span>
              <span>12p</span>
              <span>6p</span>
              <span>12a</span>
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-500">
        Each bar represents scheduled departures in a 30-minute interval. Hover or focus a bar for
        its count.
      </p>
    </div>
  );
}

function getScheduleTimeline(schedules: StopSchedule[]): ScheduleTimelineGroup[] {
  const groups = new Map<string, ScheduleTimelineGroup>();
  for (const schedule of schedules) {
    const time = schedule.arrivalTime ?? schedule.departureTime;
    if (!time || Number.isNaN(Date.parse(time))) {
      continue;
    }
    const key = `${schedule.routeId}:${schedule.directionId ?? 'unknown'}`;
    let group = groups.get(key);
    if (!group) {
      const line = getLineDisplay({
        ...schedule,
        status: null,
        scheduleRelationship: null,
        tripHeadsign: null,
      });
      group = {
        id: key,
        routeId: schedule.routeId,
        directionName: schedule.directionName,
        label: `${line.name} · ${schedule.directionName}`,
        destination: schedule.destination,
        color: line.color,
        departuresByHalfHour: Array<number>(48).fill(0),
      };
      groups.set(key, group);
    }
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(time));
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
    const bucket = Math.min(47, Math.max(0, hour * 2 + (minute >= 30 ? 1 : 0)));
    group.departuresByHalfHour[bucket] += 1;
  }
  return [...groups.values()].sort((first, second) => first.label.localeCompare(second.label));
}

function formatHalfHour(index: number): string {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return formatScheduleTime(`2000-01-01T${String(hour).padStart(2, '0')}:${minute}:00-05:00`);
}

function getNextPredictions(predictions: StopPrediction[]): StopPrediction[] {
  const now = Date.now();
  const upcoming = predictions
    .filter((prediction) => {
      const time = prediction.arrivalTime ?? prediction.departureTime;
      return time !== null && Date.parse(time) >= now;
    })
    .sort((first, second) => getPredictionTimestamp(first) - getPredictionTimestamp(second));
  const nextByDirection = new Map<string, StopPrediction>();

  for (const prediction of upcoming) {
    const key = `${prediction.routeId}:${prediction.directionId ?? prediction.destination}`;
    if (!nextByDirection.has(key)) {
      nextByDirection.set(key, prediction);
    }
  }
  return [...nextByDirection.values()];
}

function groupPredictionsByRoute(predictions: StopPrediction[]): Array<[string, StopPrediction[]]> {
  const grouped = new Map<string, StopPrediction[]>();
  for (const prediction of predictions) {
    const routePredictions = grouped.get(prediction.routeId) ?? [];
    routePredictions.push(prediction);
    grouped.set(prediction.routeId, routePredictions);
  }
  return [...grouped.entries()].sort(([, first], [, second]) =>
    getLineDisplay(first[0]).name.localeCompare(getLineDisplay(second[0]).name),
  );
}

function getNextScheduledFallbacks(
  schedules: StopSchedule[],
  existingPredictionKeys: Set<string>,
): StopPrediction[] {
  const fallbacks = new Map<string, StopPrediction>();
  for (const schedule of getUpcomingSchedules(schedules)) {
    const key = `${schedule.routeId}:${schedule.directionId ?? schedule.destination}`;
    if (existingPredictionKeys.has(key) || fallbacks.has(key)) {
      continue;
    }
    fallbacks.set(key, {
      id: `scheduled:${schedule.id}`,
      routeId: schedule.routeId,
      routeName: schedule.routeName,
      routeShortName: schedule.routeShortName,
      routeType: schedule.routeType,
      routeColor: schedule.routeColor,
      directionId: schedule.directionId,
      directionName: schedule.directionName,
      destination: schedule.destination,
      arrivalTime: schedule.arrivalTime,
      departureTime: schedule.departureTime,
      status: 'Scheduled time; live status unavailable',
      scheduleRelationship: null,
      tripHeadsign: null,
    });
  }
  return [...fallbacks.values()];
}

function getLineDisplay(prediction: StopPrediction): { name: string; color: string } {
  const routeType = prediction.routeType;
  const routeColor = prediction.routeColor ? `#${prediction.routeColor.replace(/^#/, '')}` : '';
  if (routeType === 2 || prediction.routeId.startsWith('CR-')) {
    return { name: prediction.routeName || 'Commuter Rail', color: '#80276C' };
  }
  if (routeType === 3) {
    const number = prediction.routeShortName || prediction.routeId;
    return { name: `Bus ${number}`, color: '#FFC72C' };
  }
  const defaultColors: Record<string, string> = {
    Red: '#DA291C',
    Orange: '#ED8B00',
    Blue: '#003DA5',
    'Green-B': '#00843D',
    'Green-C': '#00843D',
    'Green-D': '#00843D',
    'Green-E': '#00843D',
    Mattapan: '#DA291C',
  };
  const fallbackName = prediction.routeId.startsWith('Green-')
    ? 'Green Line'
    : prediction.routeId === 'Mattapan'
      ? 'Mattapan Line'
      : `${prediction.routeId} Line`;
  return {
    name: prediction.routeName || fallbackName,
    color: routeColor || defaultColors[prediction.routeId] || '#6B7280',
  };
}

function getPredictionTimestamp(prediction: StopPrediction): number {
  return Date.parse(prediction.arrivalTime ?? prediction.departureTime ?? '');
}

function getCountdown(time: string | null): string {
  if (!time) {
    return 'Time unavailable';
  }
  const minutes = Math.ceil((Date.parse(time) - Date.now()) / 60_000);
  return minutes <= 0 ? 'Arriving now' : `In ${minutes} min (${formatScheduleTime(time)})`;
}

function getUpcomingSchedules(schedules: StopSchedule[]): StopSchedule[] {
  const now = Date.now();
  return schedules
    .filter((schedule) => {
      const time = schedule.arrivalTime ?? schedule.departureTime;
      return time !== null && Date.parse(time) >= now;
    })
    .sort(
      (first, second) =>
        Date.parse(first.arrivalTime ?? first.departureTime ?? '') -
        Date.parse(second.arrivalTime ?? second.departureTime ?? ''),
    );
}

function formatScheduleTime(time: string | null): string {
  if (!time || Number.isNaN(Date.parse(time))) {
    return 'Time unavailable';
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(time));
}

function getStopName(stop: Stop): string {
  const name = stop.attributes.name;
  return typeof name === 'string' && name.trim() ? name : stop.id;
}
