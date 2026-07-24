import type { ForecastModelConfig, MountainLevelConfig } from '../../types/forecast.js';
import type { HourlyLevelForecast, HourlyPoint, ModelHourlyResult } from '../../types/hourly.js';

const COMMON_FIELDS = [
  'snowfall',
  'rain',
  'precipitation',
  'precipitation_probability',
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'dew_point_2m',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'visibility',
  'cloud_cover',
  'shortwave_radiation',
  'snow_depth',
  'is_day',
  'weather_code',
] as const;

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

type NumericArray = Array<number | null>;

interface HourlyPayload {
  error?: boolean;
  reason?: string;
  timezone?: string;
  elevation?: number;
  generationtime_ms?: number;
  hourly?: {
    time?: string[];
    snowfall?: NumericArray;
    rain?: NumericArray;
    precipitation?: NumericArray;
    precipitation_probability?: NumericArray;
    temperature_2m?: NumericArray;
    apparent_temperature?: NumericArray;
    relative_humidity_2m?: NumericArray;
    dew_point_2m?: NumericArray;
    wind_speed_10m?: NumericArray;
    wind_direction_10m?: NumericArray;
    wind_gusts_10m?: NumericArray;
    visibility?: NumericArray;
    cloud_cover?: NumericArray;
    shortwave_radiation?: NumericArray;
    freezing_level_height?: NumericArray;
    snow_depth?: NumericArray;
    is_day?: NumericArray;
    weather_code?: NumericArray;
  };
}

function fieldsFor(model: ForecastModelConfig): string {
  return model.id === 'ecmwf'
    ? COMMON_FIELDS.join(',')
    : [...COMMON_FIELDS, 'freezing_level_height'].join(',');
}

export function buildHourlyUrl(
  model: ForecastModelConfig,
  levels: readonly MountainLevelConfig[],
): URL {
  if (levels.length === 0) throw new Error('At least one mountain level is required');
  const url = new URL(model.endpoint);
  url.searchParams.set('latitude', levels.map((level) => level.latitude).join(','));
  url.searchParams.set('longitude', levels.map((level) => level.longitude).join(','));
  url.searchParams.set('elevation', levels.map((level) => level.elevationM).join(','));
  url.searchParams.set('hourly', fieldsFor(model));
  url.searchParams.set('timezone', 'America/Argentina/Mendoza');
  url.searchParams.set('forecast_hours', '72');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('precipitation_unit', 'mm');
  url.searchParams.set('cell_selection', 'land');
  return url;
}

function numberAt(values: NumericArray | undefined, index: number): number | null {
  const value = values?.[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function centimetersFromMeters(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1000) / 10;
}

function normalizeLocation(
  level: MountainLevelConfig,
  payload: HourlyPayload,
): HourlyLevelForecast {
  const hourly = payload.hourly;
  const times = hourly?.time ?? [];
  const points: HourlyPoint[] = times.map((time, index) => {
    const isDayValue = numberAt(hourly?.is_day, index);
    return {
      time,
      snowfallCm: numberAt(hourly?.snowfall, index),
      rainMm: numberAt(hourly?.rain, index),
      precipitationMm: numberAt(hourly?.precipitation, index),
      precipitationProbability: numberAt(hourly?.precipitation_probability, index),
      temperatureC: numberAt(hourly?.temperature_2m, index),
      apparentTemperatureC: numberAt(hourly?.apparent_temperature, index),
      relativeHumidityPct: numberAt(hourly?.relative_humidity_2m, index),
      dewPointC: numberAt(hourly?.dew_point_2m, index),
      windSpeedKmh: numberAt(hourly?.wind_speed_10m, index),
      windDirectionDeg: numberAt(hourly?.wind_direction_10m, index),
      windGustKmh: numberAt(hourly?.wind_gusts_10m, index),
      visibilityM: numberAt(hourly?.visibility, index),
      cloudCoverPct: numberAt(hourly?.cloud_cover, index),
      shortwaveRadiationWm2: numberAt(hourly?.shortwave_radiation, index),
      freezingLevelM: numberAt(hourly?.freezing_level_height, index),
      snowDepthCm: centimetersFromMeters(numberAt(hourly?.snow_depth, index)),
      isDay: isDayValue === null ? null : isDayValue === 1,
      weatherCode: numberAt(hourly?.weather_code, index),
    };
  });
  return { level, points };
}

function payloadReason(payload: HourlyPayload | HourlyPayload[]): string | null {
  const values = Array.isArray(payload) ? payload : [payload];
  return values.find((item) => item.error)?.reason ?? null;
}

export async function fetchHourlyModel(
  model: ForecastModelConfig,
  levels: readonly MountainLevelConfig[],
  fetchImpl: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<ModelHourlyResult> {
  const url = buildHourlyUrl(model, levels);
  let attempt = 0;

  while (true) {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    const payload = (await response.json()) as HourlyPayload | HourlyPayload[];
    const reason = payloadReason(payload);

    if (response.ok && !reason) {
      const locations = Array.isArray(payload) ? payload : [payload];
      if (locations.length !== levels.length) {
        throw new Error(`${model.shortName} returned ${locations.length} locations; expected ${levels.length}`);
      }
      return {
        model: model.id,
        generatedAt: new Date().toISOString(),
        levels: locations.map((location, index) => normalizeLocation(levels[index]!, location)),
      };
    }

    if (attempt === 0 && RETRYABLE_STATUSES.has(response.status)) {
      attempt += 1;
      await wait(350);
      continue;
    }

    throw new Error(reason || `Open-Meteo responded ${response.status}`);
  }
}
