// SERVER-ONLY (see ./client.ts). Persists what each report source said fell and how deep it is.
import type {
  CurrentSnowResponse,
  CurrentSnowSourceId,
  ObservationTimestampKind,
  ObservationZone,
} from '../../types/currentSnow.js';
import { round } from '../forecast/math.js';
import { upsertRows, warnDatabase, type NieveDatabase } from './client.js';
import { resortLocalDate } from './dates.js';

export const SNOW_OBSERVATIONS_TABLE = 'snow_observations';
export const SNOW_OBSERVATIONS_CONFLICT = 'source_id,zone,observed_date';

/** A row of `nieve.snow_observations`. */
export interface SnowObservationRow {
  source_id: CurrentSnowSourceId;
  zone: ObservationZone;
  observed_date: string;
  depth_cm: number | null;
  new_snow_24h_cm: number | null;
  reported_at: string | null;
  timestamp_kind: ObservationTimestampKind;
  fetched_at: string;
}

function measurement(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 ? round(value) : null;
}

function validInstant(value: string | null): string | null {
  return value !== null && !Number.isNaN(new Date(value).getTime()) ? value : null;
}

function time(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * One row per source, zone and local day. `observed_date` is the resort's local date of
 * `reportedAt` when the source states one, otherwise of `fetchedAt` (the official page shows
 * today's report without a date). Observations with neither depth nor new snow are skipped, and
 * duplicates of the same key keep the latest fetch.
 */
export function rowsFromCurrentSnow(response: CurrentSnowResponse): SnowObservationRow[] {
  const rows = new Map<string, SnowObservationRow>();

  response.zones.forEach((zone) => {
    zone.observations.forEach((observation) => {
      const depth = measurement(observation.depthCm);
      const newSnow = measurement(observation.newSnow24hCm);
      if (depth === null && newSnow === null) return;

      const fetchedAt = validInstant(observation.fetchedAt);
      if (!fetchedAt) return;
      const reportedAt = validInstant(observation.reportedAt);
      const observedDate = resortLocalDate(reportedAt ?? fetchedAt);
      if (!observedDate) return;

      const row: SnowObservationRow = {
        source_id: observation.sourceId,
        zone: observation.zone,
        observed_date: observedDate,
        depth_cm: depth,
        new_snow_24h_cm: newSnow,
        reported_at: reportedAt,
        timestamp_kind: observation.timestampKind,
        fetched_at: fetchedAt,
      };
      const key = `${row.source_id}|${row.zone}|${row.observed_date}`;
      const existing = rows.get(key);
      if (!existing || time(row.fetched_at) > time(existing.fetched_at)) {
        rows.set(key, row);
      }
    });
  });

  return [...rows.values()];
}

/** Best effort: returns false (and logs) on any failure or when there is no database. */
export async function saveSnowObservations(
  client: NieveDatabase | null,
  response: CurrentSnowResponse,
): Promise<boolean> {
  if (!client) return false;
  try {
    return await upsertRows(
      client,
      SNOW_OBSERVATIONS_TABLE,
      rowsFromCurrentSnow(response),
      SNOW_OBSERVATIONS_CONFLICT,
    );
  } catch (error) {
    warnDatabase(`save ${SNOW_OBSERVATIONS_TABLE}`, error);
    return false;
  }
}
