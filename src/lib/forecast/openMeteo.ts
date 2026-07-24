import type {
  ForecastModelConfig,
  MountainLevelConfig,
} from '../../types/forecast.js';
import {
  normalizeModelLevel,
  type NormalizedModelLevel,
  type OpenMeteoPayload,
} from './normalize.js';

const COMMON_FIELDS = [
  'snowfall',
  'temperature_2m',
  'wind_speed_10m',
  'wind_gusts_10m',
  'weather_code',
];

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function hourlyFields(model: ForecastModelConfig): string {
  return model.id === 'ecmwf'
    ? COMMON_FIELDS.join(',')
    : [...COMMON_FIELDS, 'freezing_level_height'].join(',');
}

export function buildOpenMeteoUrl(
  model: ForecastModelConfig,
  levels: readonly MountainLevelConfig[],
): URL {
  if (levels.length === 0) throw new Error('At least one mountain level is required');

  const url = new URL(model.endpoint);
  url.searchParams.set('latitude', levels.map((level) => level.latitude).join(','));
  url.searchParams.set('longitude', levels.map((level) => level.longitude).join(','));
  url.searchParams.set('elevation', levels.map((level) => level.elevationM).join(','));
  url.searchParams.set('hourly', hourlyFields(model));
  url.searchParams.set('timezone', 'America/Argentina/Mendoza');
  url.searchParams.set('forecast_hours', String(model.forecastDays * 24));
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('precipitation_unit', 'mm');
  url.searchParams.set('cell_selection', 'land');
  return url;
}

async function requestPayload(
  url: URL,
  fetchImpl: typeof fetch,
): Promise<{ response: Response; payload: OpenMeteoPayload | OpenMeteoPayload[] }> {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = (await response.json()) as OpenMeteoPayload | OpenMeteoPayload[];
  return { response, payload };
}

function payloadError(payload: OpenMeteoPayload | OpenMeteoPayload[]): string | null {
  if (Array.isArray(payload)) {
    const failed = payload.find((item) => item.error);
    return failed?.reason ?? null;
  }
  return payload.error ? payload.reason ?? 'Open-Meteo returned an error' : null;
}

export async function fetchOpenMeteoModel(
  model: ForecastModelConfig,
  levels: readonly MountainLevelConfig[],
  fetchImpl: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<NormalizedModelLevel[]> {
  const url = buildOpenMeteoUrl(model, levels);
  let attempt = 0;

  while (true) {
    const { response, payload } = await requestPayload(url, fetchImpl);
    const reason = payloadError(payload);

    if (response.ok && !reason) {
      const locations = Array.isArray(payload) ? payload : [payload];
      if (locations.length !== levels.length) {
        throw new Error(
          `${model.shortName} returned ${locations.length} locations; expected ${levels.length}`,
        );
      }
      const fetchedAt = new Date().toISOString();
      return locations.map((location, index) =>
        normalizeModelLevel(model.id, levels[index]!, location, fetchedAt),
      );
    }

    if (attempt === 0 && RETRYABLE_STATUSES.has(response.status)) {
      attempt += 1;
      await wait(350);
      continue;
    }

    throw new Error(reason || `Open-Meteo responded ${response.status}`);
  }
}

export async function fetchOpenMeteoLevel(
  model: ForecastModelConfig,
  level: MountainLevelConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<NormalizedModelLevel> {
  const [result] = await fetchOpenMeteoModel(model, [level], fetchImpl);
  if (!result) throw new Error(`${model.shortName} returned no data for ${level.name}`);
  return result;
}
