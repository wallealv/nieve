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

function hourlyFields(model: ForecastModelConfig): string {
  return model.id === 'ecmwf'
    ? COMMON_FIELDS.join(',')
    : [...COMMON_FIELDS, 'freezing_level_height'].join(',');
}

export function buildOpenMeteoUrl(
  model: ForecastModelConfig,
  level: MountainLevelConfig,
): URL {
  const url = new URL(model.endpoint);
  url.searchParams.set('latitude', String(level.latitude));
  url.searchParams.set('longitude', String(level.longitude));
  url.searchParams.set('elevation', String(level.elevationM));
  url.searchParams.set('hourly', hourlyFields(model));
  url.searchParams.set('timezone', 'America/Argentina/Mendoza');
  url.searchParams.set('forecast_hours', String(model.forecastDays * 24));
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('precipitation_unit', 'mm');
  url.searchParams.set('cell_selection', 'land');
  return url;
}

export async function fetchOpenMeteoLevel(
  model: ForecastModelConfig,
  level: MountainLevelConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<NormalizedModelLevel> {
  const fetchedAt = new Date().toISOString();
  const response = await fetchImpl(buildOpenMeteoUrl(model, level), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });

  const payload = (await response.json()) as OpenMeteoPayload;
  if (!response.ok || payload.error) {
    throw new Error(payload.reason || `Open-Meteo responded ${response.status}`);
  }

  return normalizeModelLevel(model.id, level, payload, fetchedAt);
}
