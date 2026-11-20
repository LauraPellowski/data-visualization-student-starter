import { useEffect, useState } from 'react';
import { getFacilitiesForStop, getLiveFacilitiesForIds, type MbtaResource } from './apiService';

export interface StopFacility {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

export interface LiveFacilityStatus {
  facilityId: string | null;
  status: string | null;
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

function getProperties(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeFacilities(resources: MbtaResource[]): StopFacility[] {
  return resources.map((resource) => ({
    id: resource.id,
    type: getString(resource.attributes.type) ?? 'Facility',
    name:
      getString(resource.attributes.long_name) ??
      getString(resource.attributes.short_name) ??
      getString(resource.attributes.name) ??
      getString(resource.attributes.type) ??
      'Station facility',
    properties: getProperties(resource.attributes.properties),
  }));
}

function normalizeLiveFacilities(resources: MbtaResource[]): LiveFacilityStatus[] {
  return resources.map((resource) => {
    const properties = getProperties(resource.attributes.properties);
    const status =
      getString(properties.status) ??
      getString(properties.state) ??
      getString(resource.attributes.status) ??
      (typeof properties.is_operational === 'boolean'
        ? properties.is_operational
          ? 'Operational'
          : 'Out of service'
        : null);
    return {
      facilityId: getRelationshipId(resource, 'facility'),
      status,
      updatedAt: getString(resource.attributes.updated_at),
    };
  });
}

export function useStopFacilityData(stopId: string) {
  const [facilities, setFacilities] = useState<{ stopId: string; data: StopFacility[] }>({
    stopId: '',
    data: [],
  });
  const [liveStatuses, setLiveStatuses] = useState<{
    stopId: string;
    data: LiveFacilityStatus[];
  }>({ stopId: '', data: [] });
  const [facilityResult, setFacilityResult] = useState<{
    key: string;
    error: Error | null;
  } | null>(null);
  const [liveResult, setLiveResult] = useState<{ key: string; error: Error | null } | null>(null);
  const key = stopId;

  useEffect(() => {
    let active = true;
    if (!stopId) {
      return () => {
        active = false;
      };
    }

    getFacilitiesForStop(stopId)
      .then((response) => {
        if (!active) {
          return;
        }
        const normalized = normalizeFacilities(response.data ?? []);
        setFacilities({ stopId, data: normalized });
        setFacilityResult({ key, error: null });

        return getLiveFacilitiesForIds(normalized.map((facility) => facility.id))
          .then((liveResponse) => {
            if (active) {
              setLiveStatuses({
                stopId,
                data: normalizeLiveFacilities(liveResponse.data ?? []),
              });
              setLiveResult({ key, error: null });
            }
          })
          .catch((err: unknown) => {
            if (active) {
              setLiveResult({
                key,
                error:
                  err instanceof Error ? err : new Error('Failed to load live facility status'),
              });
            }
          });
      })
      .catch((err: unknown) => {
        if (active) {
          const error = err instanceof Error ? err : new Error('Failed to load station facilities');
          setFacilityResult({ key, error });
          setLiveResult({ key, error: null });
        }
      });

    return () => {
      active = false;
    };
  }, [stopId, key]);

  const facilitiesAreCurrent = facilityResult?.key === key;
  const liveIsCurrent = liveResult?.key === key;
  return {
    facilities: facilities.stopId === stopId ? facilities.data : [],
    liveStatuses: liveStatuses.stopId === stopId ? liveStatuses.data : [],
    loading: Boolean(stopId) && !facilitiesAreCurrent,
    liveLoading: Boolean(stopId) && facilitiesAreCurrent && !liveIsCurrent,
    error: facilitiesAreCurrent ? facilityResult.error : null,
    liveError: liveIsCurrent ? liveResult.error : null,
  };
}
