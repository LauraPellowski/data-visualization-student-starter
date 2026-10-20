import { useCallback, useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { geoMercator } from 'd3-geo';

import { useRouteData } from './useRouteData';
import { renderRoutes } from './renderRoutes';
import { useTrainData } from './useTrainData';
import { renderTrains } from './renderTrains';
import { renderStops } from './renderStops';
import { StopInformation } from './StopInformation';
import { useStopData, type Stop } from './useStopData';

const width = 800;
const height = 520;

export function MapView2() {
  const [activeTab, setActiveTab] = useState<'map' | 'stops'>('map');
  const [selectedStopId, setSelectedStopId] = useState('');
  const { stops, loading: stopsLoading, error: stopsError } = useStopData();
  const handleMapStopSelect = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
    setActiveTab('stops');
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
          <LiveMapView stops={stops} onStopSelect={handleMapStopSelect} />
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
      </div>
    </div>
  );
}

function LiveMapView({
  stops,
  onStopSelect,
}: {
  stops: Stop[];
  onStopSelect: (stopId: string) => void;
}) {
  const [mapLayer, setMapLayer] = useState<'trains' | 'stops'>('trains');
  const svgRef = useRef<SVGSVGElement>(null);
  const { shapes, loading, error } = useRouteData();
  const { vehicles } = useTrainData();

  useEffect(() => {
    if (!svgRef.current || shapes.length === 0) {
      return;
    }
    const svg = select(svgRef.current);
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
    renderRoutes(svg, shapes, projection);
    renderTrains(svg, vehicles, projection, mapLayer === 'trains');
    renderStops(svg, mapLayer === 'stops' ? stops : [], projection, onStopSelect);
  }, [shapes, vehicles, stops, mapLayer, onStopSelect]);

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
          </div>
          <p className="text-xs text-gray-600">
            {mapLayer === 'trains'
              ? 'Train locations refresh every 10 seconds'
              : 'Select a stop for its information'}
          </p>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="block w-full max-w-[800px]"
        style={{ height: 'auto', maxHeight: 'calc(100vh - 190px)' }}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Live map of MBTA subway and light-rail routes and vehicles"
      />
    </div>
  );
}
