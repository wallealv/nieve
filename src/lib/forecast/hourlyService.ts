import { FORECAST_MODELS, MOUNTAIN_LEVELS, RESORT } from '../../config/mountain.js';
import type { ForecastModelConfig } from '../../types/forecast.js';
import type {
  HourlyLevelForecast,
  HourlyPoint,
  HourlyResponse,
  ModelHourlyResult,
} from '../../types/hourly.js';
import { fetchHourlyModel } from './hourly.js';

export type HourlyModelFetcher = (
  model: ForecastModelConfig,
) => Promise<ModelHourlyResult>;

function median(values: Array<number | null>): number | null {
  const numbers = values
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  if (numbers.length % 2 === 1) return numbers[middle] ?? null;
  const left = numbers[middle - 1];
  const right = numbers[middle];
  return left === undefined || right === undefined ? null : (left + right) / 2;
}

function majority(values: Array<boolean | null>): boolean | null {
  const booleans = values.filter((value): value is boolean => value !== null);
  if (booleans.length === 0) return null;
  const truthy = booleans.filter(Boolean).length;
  return truthy >= Math.ceil(booleans.length / 2);
}

function pointFor(
  result: ModelHourlyResult,
  levelId: HourlyLevelForecast['level']['id'],
  time: string,
): HourlyPoint | null {
  return result.levels
    .find((level) => level.level.id === levelId)
    ?.points.find((point) => point.time === time) ?? null;
}

function mergePoint(points: HourlyPoint[], time: string): HourlyPoint {
  const numeric = <K extends keyof HourlyPoint>(key: K): number | null =>
    median(points.map((point) => (typeof point[key] === 'number' ? (point[key] as number) : null)));

  return {
    time,
    snowfallCm: numeric('snowfallCm'),
    rainMm: numeric('rainMm'),
    precipitationMm: numeric('precipitationMm'),
    precipitationProbability: numeric('precipitationProbability'),
    temperatureC: numeric('temperatureC'),
    apparentTemperatureC: numeric('apparentTemperatureC'),
    relativeHumidityPct: numeric('relativeHumidityPct'),
    dewPointC: numeric('dewPointC'),
    windSpeedKmh: numeric('windSpeedKmh'),
    windDirectionDeg: numeric('windDirectionDeg'),
    windGustKmh: numeric('windGustKmh'),
    visibilityM: numeric('visibilityM'),
    cloudCoverPct: numeric('cloudCoverPct'),
    shortwaveRadiationWm2: numeric('shortwaveRadiationWm2'),
    freezingLevelM: numeric('freezingLevelM'),
    snowDepthCm: numeric('snowDepthCm'),
    isDay: majority(points.map((point) => point.isDay)),
    weatherCode: numeric('weatherCode'),
  };
}

function mergeLevels(results: ModelHourlyResult[]): HourlyLevelForecast[] {
  return MOUNTAIN_LEVELS.map((level) => {
    const times = [...new Set(
      results.flatMap(
        (result) => result.levels.find((candidate) => candidate.level.id === level.id)?.points.map((point) => point.time) ?? [],
      ),
    )].sort();

    return {
      level,
      points: times.map((time) => {
        const points = results
          .map((result) => pointFor(result, level.id, time))
          .filter((point): point is HourlyPoint => point !== null);
        return mergePoint(points, time);
      }),
    };
  });
}

export async function buildHourlyResponse(
  fetcher: HourlyModelFetcher = (model) => fetchHourlyModel(model, MOUNTAIN_LEVELS),
  updatedAt = new Date().toISOString(),
): Promise<HourlyResponse> {
  const settled = await Promise.allSettled(FORECAST_MODELS.map((model) => fetcher(model)));
  const successful: ModelHourlyResult[] = [];
  const warnings: string[] = [];

  const models = FORECAST_MODELS.map((model, index) => {
    const outcome = settled[index];
    if (outcome?.status === 'fulfilled') {
      successful.push(outcome.value);
      return {
        id: model.id,
        name: model.name,
        shortName: model.shortName,
        status: 'ok' as const,
        generatedAt: outcome.value.generatedAt,
        message: null,
      };
    }
    const message = outcome?.status === 'rejected'
      ? outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason)
      : 'No response';
    warnings.push(`${model.shortName}: ${message}`);
    return {
      id: model.id,
      name: model.name,
      shortName: model.shortName,
      status: 'failed' as const,
      generatedAt: null,
      message,
    };
  });

  if (successful.length === 0) {
    throw new Error('No hourly model is available.');
  }

  return {
    resort: {
      name: RESORT.name,
      timezone: RESORT.timezone,
      updatedAt,
      source: 'Open-Meteo · ECMWF IFS · NOAA GFS · DWD ICON',
    },
    models,
    levels: mergeLevels(successful),
    warnings,
  };
}
