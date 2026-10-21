import type { Stop } from './useStopData';
import {
  useStopTransitData,
  type StopAlert,
  type StopPrediction,
  type StopSchedule,
} from './useStopTransitData';
import { useRidershipData, type HourlyRidership, type RidershipDayType } from './useRidershipData';

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
  const transit = useStopTransitData(selectedStopId);
  const ridership = useRidershipData(selectedStop ? getParentStationId(selectedStop) : '');
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
          />
          <RidershipInformation
            data={ridership.hourlyRidership}
            dayType={ridership.dayType}
            onDayTypeChange={ridership.setDayType}
            loading={ridership.loading}
            error={ridership.error}
          />
          <TransitInformation
            predictions={transit.predictions}
            schedules={transit.schedules}
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
    <section className="rounded border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Hourly ridership</h3>
          <p className="text-xs text-gray-600">
            Fall 2025 typical-day averages; historical data, not live counts.
          </p>
        </div>
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
    </section>
  );
}

function StopServiceAlerts({
  alerts,
  loading,
  error,
}: {
  alerts: StopAlert[];
  loading: boolean;
  error: Error | null;
}) {
  if (loading) {
    return (
      <p role="status" className="text-sm text-gray-600">
        Checking current service alerts…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-amber-800">
        Could not check station alerts: {error.message}
      </p>
    );
  }
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label="Current service alerts">
      {alerts.map((alert) => {
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
            <h3 className="font-semibold">
              {isClosure ? 'Station closure' : 'Service alert'}
              {alert.serviceEffect ? `: ${alert.serviceEffect}` : ''}
            </h3>
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
    <div className="space-y-5 rounded border border-gray-200 bg-gray-50 p-4">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Next trains</h3>
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

      {alertsLoading && <p className="text-xs text-gray-500">Checking current stop alerts…</p>}
      {alertsError && (
        <p className="text-xs text-amber-800">Alert status is unavailable: {alertsError.message}</p>
      )}
      {!alertsLoading && !alertsError && alerts.length === 0 && (
        <p className="text-xs text-gray-500">No active MBTA alerts were returned for this stop.</p>
      )}

      <section>
        <h3 className="mb-2 text-lg font-semibold">Today’s schedule</h3>
        <p className="mb-2 text-sm text-gray-600">Service date: {serviceDate} (Boston time)</p>
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
              {schedulesHaveMorePages ? ' The timeline shows the first page of results only.' : ''}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

interface ScheduleTimelineGroup {
  id: string;
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
              aria-label={`${group.label} departures over the day`}
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
