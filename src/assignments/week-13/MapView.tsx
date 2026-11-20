import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { select, type Selection } from 'd3-selection';
import { geoMercator, type GeoProjection } from 'd3-geo';

import { useRouteData } from './useRouteData';
import { renderRoutes } from './renderRoutes';
import { useTrainData } from './useTrainData';
import { renderTrains } from './renderTrains';
import { renderStops } from './renderStops';
import { StopInformation } from './StopInformation';
import { useStopData, type Stop } from './useStopData';
import { ScatterplotBasic6 } from './ScatterplotBasic6';

const width = 800;
const height = 520;
const tileSize = 256;
const maxTileLatitude = 85.05112878;
const minZoomLevel = -2;
const maxZoomLevel = 6;

export function MapView4() {
  const [activeTab, setActiveTab] = useState<'map' | 'stops' | 'ridership'>('map');
  const [selectedStopId, setSelectedStopId] = useState('');
  const [selectedRidershipLine, setSelectedRidershipLine] = useState<string | null>(null);
  const { stops, loading: stopsLoading, error: stopsError } = useStopData();
  const handleMapStopSelect = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
    setActiveTab('stops');
  }, []);
  const handleMapLineSelect = useCallback((lineName: string) => {
    setSelectedRidershipLine(lineName);
    setActiveTab('ridership');
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white font-mono text-gray-900">
      <nav
        className="flex shrink-0 gap-2 border-b border-gray-200 px-4 pt-2"
        role="tablist"
        aria-label="MBTA views"
      >
        <button
          id="mbta-map-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'map'}
          aria-controls="mbta-map-panel"
          onClick={() => setActiveTab('map')}
          className={`border-b-2 px-4 py-3 text-sm font-medium ${
            activeTab === 'map'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Live MBTA Map
        </button>
        <button
          id="mbta-stops-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'stops'}
          aria-controls="mbta-stops-panel"
          onClick={() => setActiveTab('stops')}
          className={`border-b-2 px-4 py-3 text-sm font-medium ${
            activeTab === 'stops'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Stop Information
        </button>
        <button
          id="mbta-ridership-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'ridership'}
          aria-controls="mbta-ridership-panel"
          onClick={() => setActiveTab('ridership')}
          className={`border-b-2 px-4 py-3 text-sm font-medium ${
            activeTab === 'ridership'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Ridership Data
        </button>
      </nav>

      <div
        className={`min-h-0 flex-1 p-3 ${activeTab === 'map' ? 'overflow-hidden' : 'overflow-auto'}`}
      >
        <section
          id="mbta-map-panel"
          role="tabpanel"
          aria-labelledby="mbta-map-tab"
          hidden={activeTab !== 'map'}
          className="h-full min-h-0 w-full overflow-hidden"
        >
          <LiveMapView
            stops={stops}
            onStopSelect={handleMapStopSelect}
            onLineSelect={handleMapLineSelect}
          />
        </section>
        <section
          id="mbta-stops-panel"
          role="tabpanel"
          aria-labelledby="mbta-stops-tab"
          hidden={activeTab !== 'stops'}
        >
          <StopInformation
            stops={stops}
            selectedStopId={selectedStopId}
            loading={stopsLoading}
            error={stopsError}
            onStopChange={setSelectedStopId}
          />
        </section>
        <section
          id="mbta-ridership-panel"
          role="tabpanel"
          aria-labelledby="mbta-ridership-tab"
          hidden={activeTab !== 'ridership'}
          className="h-full min-h-0 w-full"
        >
          {activeTab === 'ridership' && <ScatterplotBasic6 selectedLine={selectedRidershipLine} />}
        </section>
      </div>
    </div>
  );
}

function LiveMapView({
  stops,
  onStopSelect,
  onLineSelect,
}: {
  stops: Stop[];
  onStopSelect: (stopId: string) => void;
  onLineSelect: (lineName: string) => void;
}) {
  const [mapLayer, setMapLayer] = useState<'trains' | 'stops' | 'lines'>('trains');
  const [showGeographicMap, setShowGeographicMap] = useState(true);
  const [basemapError, setBasemapError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const geographicMapEnabledRef = useRef(showGeographicMap);
  const zoomFactorRef = useRef(1);
  const panOffsetRef = useRef(panOffset);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    startZoomFactor: number;
  } | null>(null);
  const draggedRef = useRef(false);
  const { shapes, loading, error } = useRouteData();
  const { vehicles } = useTrainData();

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }
    const svg = select(svgRef.current);
    if (shapes.length === 0) {
      svg.selectAll('.basemap-layer, .map-interaction-surface').remove();
      return;
    }

    // autosize to svg?
    const geoJson = {
      type: 'FeatureCollection' as const,
      features: shapes.map((shape) => ({
        type: 'Feature' as const,
        properties: {
          routeId: shape.routeId,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: shape.coordinates,
        },
      })),
    };
    const projection = geoMercator().fitExtent(
      [
        [24, 24],
        [width - 24, height - 24],
      ],
      geoJson,
    );
    const zoomFactor = showGeographicMap ? 2 ** (zoomLevel / 2) : 1;
    const panX = showGeographicMap ? panOffset.x * zoomFactor : 0;
    const panY = showGeographicMap ? panOffset.y * zoomFactor : 0;
    const [translateX, translateY] = projection.translate();
    projection
      .scale(projection.scale() * zoomFactor)
      .translate([
        width / 2 + (translateX - width / 2) * zoomFactor + panX,
        height / 2 + (translateY - height / 2) * zoomFactor + panY,
      ]);
    if (showGeographicMap) {
      svg
        .selectAll<SVGRectElement, null>('.map-interaction-surface')
        .data([null])
        .join((enter) => enter.insert('rect', ':first-child'))
        .attr('class', 'map-interaction-surface')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all');
      renderGeographicTiles(svg, projection, () => setBasemapError(true));
    } else {
      svg.selectAll('.basemap-layer, .map-interaction-surface').remove();
    }
    renderRoutes(svg, shapes, projection, mapLayer === 'lines', onLineSelect);
    renderTrains(svg, vehicles, projection, mapLayer === 'trains');
    renderStops(svg, mapLayer === 'stops' ? stops : [], projection, onStopSelect);
  }, [
    shapes,
    vehicles,
    stops,
    mapLayer,
    showGeographicMap,
    zoomLevel,
    panOffset,
    onStopSelect,
    onLineSelect,
  ]);

  useEffect(() => {
    const handleWindowPointerDown = (event: PointerEvent) => {
      const svg = svgRef.current;
      if (
        !geographicMapEnabledRef.current ||
        event.button !== 0 ||
        !svg ||
        !(event.target instanceof Node) ||
        !svg.contains(event.target)
      ) {
        return;
      }

      const point = getSvgPoint(svg, event.clientX, event.clientY);
      if (!point) {
        return;
      }

      dragRef.current = {
        pointerId: event.pointerId,
        startX: point[0],
        startY: point[1],
        startPanX: panOffsetRef.current.x,
        startPanY: panOffsetRef.current.y,
        startZoomFactor: zoomFactorRef.current,
      };
      draggedRef.current = false;
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const svg = svgRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !svg) {
        return;
      }

      const point = getSvgPoint(svg, event.clientX, event.clientY);
      if (!point) {
        return;
      }

      const deltaX = point[0] - drag.startX;
      const deltaY = point[1] - drag.startY;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        draggedRef.current = true;
        setIsDragging(true);
      }
      const nextPanOffset = {
        x: drag.startPanX + deltaX / drag.startZoomFactor,
        y: drag.startPanY + deltaY / drag.startZoomFactor,
      };
      panOffsetRef.current = nextPanOffset;
      setPanOffset(nextPanOffset);
    };

    const handleWindowPointerEnd = (event: PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) {
        return;
      }
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, []);

  const handleMapClickCapture = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (draggedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      draggedRef.current = false;
    }
  };

  if (loading) {
    return <div>Loading MBTA map...</div>;
  }

  if (error) {
    return <div>Error loading MBTA map: {error.message}</div>;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden">
      <div className="mb-1 w-full max-w-[800px] shrink-0 px-2">
        <h1 className="text-xl font-semibold">MBTA Map</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded border border-gray-300 p-0.5"
            role="group"
            aria-label="Map layer"
          >
            <button
              type="button"
              aria-pressed={mapLayer === 'trains'}
              onClick={() => setMapLayer('trains')}
              className={`rounded px-3 py-1 text-sm ${
                mapLayer === 'trains'
                  ? 'bg-slate-800 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Live Trains
            </button>
            <button
              type="button"
              aria-pressed={mapLayer === 'stops'}
              onClick={() => setMapLayer('stops')}
              className={`rounded px-3 py-1 text-sm ${
                mapLayer === 'stops' ? 'bg-slate-800 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Stops
            </button>
            <button
              type="button"
              aria-pressed={mapLayer === 'lines'}
              onClick={() => setMapLayer('lines')}
              className={`rounded px-3 py-1 text-sm ${
                mapLayer === 'lines' ? 'bg-slate-800 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Lines
            </button>
          </div>
          <button
            type="button"
            aria-pressed={showGeographicMap}
            onClick={() => {
              setBasemapError(false);
              const nextVisibility = !showGeographicMap;
              geographicMapEnabledRef.current = nextVisibility;
              setShowGeographicMap(nextVisibility);
            }}
            className={`rounded border px-3 py-1 text-sm ${
              showGeographicMap
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Geographic map
          </button>
          {showGeographicMap && (
            <div className="inline-flex items-center gap-2">
              <div
                className="inline-flex items-center rounded border border-gray-300"
                role="group"
                aria-label="Map zoom"
              >
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoomLevel <= minZoomLevel}
                  onClick={() => {
                    const nextLevel = Math.max(minZoomLevel, zoomLevel - 1);
                    zoomFactorRef.current = 2 ** (nextLevel / 2);
                    setZoomLevel(nextLevel);
                  }}
                  className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span
                  className="min-w-12 px-2 text-center text-xs text-gray-600"
                  aria-live="polite"
                >
                  {Math.round(100 * 2 ** (zoomLevel / 2))}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoomLevel >= maxZoomLevel}
                  onClick={() => {
                    const nextLevel = Math.min(maxZoomLevel, zoomLevel + 1);
                    zoomFactorRef.current = 2 ** (nextLevel / 2);
                    setZoomLevel(nextLevel);
                  }}
                  className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                aria-label="Reset map view"
                onClick={() => {
                  setZoomLevel(0);
                  zoomFactorRef.current = 1;
                  const resetPan = { x: 0, y: 0 };
                  panOffsetRef.current = resetPan;
                  setPanOffset(resetPan);
                }}
                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                Reset view
              </button>
            </div>
          )}
          <p className="text-xs text-gray-600">
            {showGeographicMap
              ? 'Drag the map to pan'
              : mapLayer === 'trains'
                ? 'Train locations refresh every 10 seconds'
                : mapLayer === 'stops'
                  ? 'Select a stop for its information'
                  : 'Hover over and select a line to view its ridership data'}
          </p>
        </div>
      </div>
      <svg
        ref={svgRef}
        style={{ height: 'auto', maxHeight: 'calc(100vh - 190px)' }}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        className={`block w-full max-w-[800px] ${
          showGeographicMap
            ? isDragging
              ? 'cursor-grabbing touch-none bg-gray-200'
              : 'cursor-grab touch-none bg-gray-200'
            : ''
        }`}
        aria-label={`Live map of MBTA subway and light-rail routes and vehicles${
          showGeographicMap ? ' over an OpenStreetMap basemap' : ''
        }`}
        onClickCapture={handleMapClickCapture}
      />
      {showGeographicMap && (
        <div className="w-full max-w-[800px] px-2 text-right text-xs text-gray-600">
          {basemapError && (
            <p role="status">Some map tiles failed to load. Check your internet connection.</p>
          )}
          <p>
            Map data ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-gray-900"
            >
              OpenStreetMap contributors
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

interface MapTile {
  key: string;
  urlX: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

function renderGeographicTiles(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  projection: GeoProjection,
  onTileError: () => void,
) {
  const tileLayer = svg
    .selectAll<SVGGElement, null>('.basemap-layer')
    .data([null])
    .join((enter) => enter.insert('g', ':first-child'))
    .attr('class', 'basemap-layer');
  const zoom = Math.max(
    0,
    Math.min(19, Math.round(Math.log2((projection.scale() * 2 * Math.PI) / tileSize))),
  );
  const tileCount = 2 ** zoom;
  const topLeft = projection.invert?.([0, 0]);
  const bottomRight = projection.invert?.([width, height]);
  if (!topLeft || !bottomRight) {
    tileLayer.selectAll('.basemap-tile').remove();
    return;
  }

  const minX = Math.max(0, Math.floor(longitudeToTileX(topLeft[0], tileCount)));
  const maxX = Math.min(tileCount - 1, Math.floor(longitudeToTileX(bottomRight[0], tileCount)));
  const minY = Math.max(0, Math.floor(latitudeToTileY(topLeft[1], tileCount)));
  const maxY = Math.min(tileCount - 1, Math.floor(latitudeToTileY(bottomRight[1], tileCount)));
  const tiles: MapTile[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const northWest = projection([tileXToLongitude(x, tileCount), tileYToLatitude(y, tileCount)]);
      const southEast = projection([
        tileXToLongitude(x + 1, tileCount),
        tileYToLatitude(y + 1, tileCount),
      ]);
      if (!northWest || !southEast) {
        continue;
      }

      tiles.push({
        key: `${zoom}/${x}/${y}`,
        urlX: x,
        y,
        left: northWest[0],
        top: northWest[1],
        width: southEast[0] - northWest[0],
        height: southEast[1] - northWest[1],
      });
    }
  }

  tileLayer
    .selectAll<SVGImageElement, MapTile>('.basemap-tile')
    .data(tiles, (tile) => tile.key)
    .join('image')
    .attr('class', 'basemap-tile')
    .attr('href', (tile) => `https://tile.openstreetmap.org/${zoom}/${tile.urlX}/${tile.y}.png`)
    .attr('x', (tile) => tile.left)
    .attr('y', (tile) => tile.top)
    .attr('width', (tile) => tile.width)
    .attr('height', (tile) => tile.height)
    .attr('preserveAspectRatio', 'none')
    .on('error', onTileError);
}

function longitudeToTileX(longitude: number, tileCount: number): number {
  return ((longitude + 180) / 360) * tileCount;
}

function latitudeToTileY(latitude: number, tileCount: number): number {
  const clampedLatitude = Math.max(-maxTileLatitude, Math.min(maxTileLatitude, latitude));
  const latitudeRadians = (clampedLatitude * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2) * tileCount;
}

function tileXToLongitude(x: number, tileCount: number): number {
  return (x / tileCount) * 360 - 180;
}

function tileYToLatitude(y: number, tileCount: number): number {
  return (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / tileCount))) * 180) / Math.PI;
}

function getSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): [number, number] | null {
  const screenMatrix = svg.getScreenCTM();
  if (!screenMatrix) {
    return null;
  }

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const svgPoint = point.matrixTransform(screenMatrix.inverse());
  return [svgPoint.x, svgPoint.y];
}
