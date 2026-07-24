import type {
  LevelId,
  ModelId,
  MountainLevelConfig,
  SnowSource,
} from '../../types/forecast.js';
import { compact, median, round, sumNullable } from './math.js';

export interface OpenMeteoHourlyPayload {
  time: string[];
  snowfall?: Array<number | null>;
  precipitation?: Array<number | null>;
  temperature_2m?: Array<number | null>;
  wind_speed_10m?: Array<number | null>;
  wind_gusts_10m?: Array<number | null>;
  freezing_level_height?: Array<number | null>;
  weather_code?: Array<number | null>;
}

export interface OpenMeteoPayload {
  timezone?: string;
  elevation?: number;
  generationtime_ms?: number;
  hourly?: OpenMeteoHourlyPayload;
  error?: boolean;
  reason?: string;
}

export interface NormalizedDailyModel {
  date: string;
  snowfallCm: number | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  freezingLevelM: number | null;
  weatherCode: number | null;
  source: SnowSource;
}

export interface NormalizedModelLevel {
  model: ModelId;
  levelId: LevelId;
  fetchedAt: string;
  timezone: string;
  hourlySnowfallCm: Array<number | null>;
  daily: NormalizedDailyModel[];
}

interface DailyBucket {
  snowfall: Array<number | null>;
  temperatures: Array<number | null>;
  winds: Array<number | null>;
  gusts: Array<number | null>;
  freezingLevels: Array<number | null>;
  weatherCodes: Array<number | null>;
}

function valueAt(
  values: Array<number | null> | undefined,
  index: number,
): number | null {
  const value = values?.[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function minNullable(values: Array<number | null>): number | null {
  const present = compact(values);
  return present.length ? Math.min(...present) : null;
}

function maxNullable(values: Array<number | null>): number | null {
  const present = compact(values);
  return present.length ? Math.max(...present) : null;
}

export function normalizeModelLevel(
  model: ModelId,
  level: MountainLevelConfig,
  payload: OpenMeteoPayload,
  fetchedAt = new Date().toISOString(),
): NormalizedModelLevel {
  const hourly = payload.hourly;
  if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) {
    throw new Error('Open-Meteo returned no hourly timeline');
  }

  const buckets = new Map<string, DailyBucket>();
  const hourlySnowfallCm: Array<number | null> = [];

  hourly.time.forEach((time, index) => {
    const date = time.slice(0, 10);
    const snowfall = valueAt(hourly.snowfall, index);
    hourlySnowfallCm.push(snowfall);

    const bucket = buckets.get(date) ?? {
      snowfall: [],
      temperatures: [],
      winds: [],
      gusts: [],
      freezingLevels: [],
      weatherCodes: [],
    };

    bucket.snowfall.push(snowfall);
    bucket.temperatures.push(valueAt(hourly.temperature_2m, index));
    bucket.winds.push(valueAt(hourly.wind_speed_10m, index));
    bucket.gusts.push(valueAt(hourly.wind_gusts_10m, index));
    bucket.freezingLevels.push(valueAt(hourly.freezing_level_height, index));
    bucket.weatherCodes.push(valueAt(hourly.weather_code, index));
    buckets.set(date, bucket);
  });

  const daily = [...buckets.entries()].map(([date, bucket]) => ({
    date,
    snowfallCm: round(sumNullable(bucket.snowfall)),
    temperatureMinC: round(minNullable(bucket.temperatures)),
    temperatureMaxC: round(maxNullable(bucket.temperatures)),
    windMaxKmh: round(maxNullable(bucket.winds)),
    gustMaxKmh: round(maxNullable(bucket.gusts)),
    freezingLevelM: round(median(bucket.freezingLevels), 0),
    weatherCode: round(maxNullable(bucket.weatherCodes), 0),
    source: 'direct' as const,
  }));

  return {
    model,
    levelId: level.id,
    fetchedAt,
    timezone: payload.timezone ?? 'America/Argentina/Mendoza',
    hourlySnowfallCm,
    daily,
  };
}
