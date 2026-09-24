import {
  FORECAST_CALIBRATION,
  FORECAST_HORIZONS,
  FORECAST_MODELS,
  MOUNTAIN_LEVELS,
  RESORT,
} from '../../config/mountain.js';
import type {
  ForecastCalibration,
  ForecastModelConfig,
  ForecastResponse,
  LevelDailyForecast,
  LevelForecast,
  LevelId,
  ModelId,
  ModelStatus,
  MountainLevelConfig,
  ModelValue,
} from '../../types/forecast.js';
import {
  bandForDay,
  calculateConfidence,
  confidenceLabelForScore,
} from './confidence.js';
import { compact, median, nullableRange, round, sumNullable } from './math.js';
import type { NormalizedModelLevel } from './normalize.js';
import { fetchOpenMeteoModel } from './openMeteo.js';

export type ForecastFetcher = (
  model: ForecastModelConfig,
  levels: readonly MountainLevelConfig[],
) => Promise<NormalizedModelLevel[]>;

type LevelWeights = ReadonlyMap<ModelId, number>;

interface SettledEntry {
  model: ForecastModelConfig;
  level: MountainLevelConfig;
  result: PromiseSettledResult<NormalizedModelLevel>;
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function expectedModelsForDay(dayIndex: number): number {
  return dayIndex <= 7 ? 3 : 2;
}

function maxNullable(values: readonly (number | null | undefined)[]): number | null {
  const present = compact(values);
  return present.length ? Math.max(...present) : null;
}

function findDaily(result: NormalizedModelLevel | undefined, date: string) {
  return result?.daily.find((day) => day.date === date);
}

function totalForHours(
  result: NormalizedModelLevel | undefined,
  hours: number,
): number | null {
  if (!result) return null;
  return round(sumNullable(result.hourlySnowfallCm.slice(0, hours)));
}

function levelWeights(
  calibration: ForecastCalibration,
  levelId: LevelId,
): LevelWeights | null {
  const level = calibration.levels.find((item) => item.level === levelId);
  if (!level?.active) return null;
  const weights = new Map<ModelId, number>();
  level.models.forEach((model) => {
    if (model.weight !== null && Number.isFinite(model.weight) && model.weight > 0) {
      weights.set(model.model, model.weight);
    }
  });
  return weights.size > 0 ? weights : null;
}

/**
 * The multimodel central estimate: the plain median, or — when the level is calibrated — the
 * mean weighted by each model's measured skill, renormalized over the models that have a value
 * (e.g. once ICON's horizon has ended only ECMWF and GFS share the weight).
 */
function centralEstimate(
  values: ReadonlyArray<{ model: ModelId; value: number | null }>,
  weights: LevelWeights | null,
): number | null {
  if (!weights) return median(values.map((item) => item.value));

  let weightedTotal = 0;
  let weightSum = 0;
  values.forEach(({ model, value }) => {
    const weight = weights.get(model);
    if (value === null || !Number.isFinite(value) || weight === undefined) return;
    weightedTotal += value * weight;
    weightSum += weight;
  });
  return weightSum > 0
    ? weightedTotal / weightSum
    : median(values.map((item) => item.value));
}

function unavailableCalibration(): ForecastCalibration {
  return {
    status: 'unavailable',
    windowDays: FORECAST_CALIBRATION.windowDays,
    minSamples: FORECAST_CALIBRATION.minSamples,
    levels: [],
  };
}

function statusForModel(
  model: ForecastModelConfig,
  entries: SettledEntry[],
): ModelStatus {
  const modelEntries = entries.filter((entry) => entry.model.id === model.id);
  const fulfilled = modelEntries.filter(
    (entry): entry is SettledEntry & { result: PromiseFulfilledResult<NormalizedModelLevel> } =>
      entry.result.status === 'fulfilled',
  );
  const rejected = modelEntries.filter(
    (entry): entry is SettledEntry & { result: PromiseRejectedResult } =>
      entry.result.status === 'rejected',
  );
  const status =
    fulfilled.length === 0
      ? 'failed'
      : fulfilled.length === modelEntries.length
        ? 'ok'
        : 'partial';
  const forecastThrough =
    fulfilled
      .flatMap((entry) => entry.result.value.daily.map((day) => day.date))
      .sort()
      .at(-1) ?? null;
  const generatedAt =
    fulfilled
      .map((entry) => entry.result.value.fetchedAt)
      .sort()
      .at(-1) ?? null;
  const message = rejected.length
    ? [
        ...new Set(
          rejected.map((entry) =>
            entry.result.reason instanceof Error
              ? entry.result.reason.message
              : String(entry.result.reason),
          ),
        ),
      ].join(' · ')
    : null;

  return {
    id: model.id,
    name: model.name,
    shortName: model.shortName,
    status,
    availableLevels: fulfilled.length,
    requestedLevels: modelEntries.length,
    forecastThrough,
    generatedAt,
    message,
  };
}

function buildLevelForecast(
  level: MountainLevelConfig,
  dates: string[],
  successful: Map<string, NormalizedModelLevel>,
  weights: LevelWeights | null,
): LevelForecast {
  let cumulative = 0;
  let hasCumulative = false;

  const daily: LevelDailyForecast[] = dates.map((date, dayIndex) => {
    const modelValues: ModelValue[] = FORECAST_MODELS.map((model) => {
      const day = findDaily(successful.get(`${model.id}:${level.id}`), date);
      return {
        model: model.id,
        snowfallCm: day?.snowfallCm ?? null,
        source: day?.source ?? 'estimated',
      };
    });
    const snowfallValues = modelValues.map((value) => value.snowfallCm);
    const range = nullableRange(snowfallValues);
    const snowfallMedianCm = round(
      centralEstimate(
        modelValues.map((value) => ({ model: value.model, value: value.snowfallCm })),
        weights,
      ),
    );
    const confidence = calculateConfidence({
      values: snowfallValues,
      dayIndex,
      expectedModels: expectedModelsForDay(dayIndex),
    });
    const modelDays = FORECAST_MODELS.map((model) =>
      findDaily(successful.get(`${model.id}:${level.id}`), date),
    );

    if (snowfallMedianCm !== null) {
      cumulative += snowfallMedianCm;
      hasCumulative = true;
    }

    return {
      date,
      dayIndex,
      band: bandForDay(dayIndex),
      snowfallMedianCm,
      snowfallMinCm: round(range.min),
      snowfallMaxCm: round(range.max),
      cumulativeMedianCm: hasCumulative ? round(cumulative) : null,
      confidenceScore: confidence.score,
      confidenceLabel: confidence.label,
      modelCount: compact(snowfallValues).length,
      models: modelValues,
      temperatureMinC: round(
        median(modelDays.map((day) => day?.temperatureMinC ?? null)),
      ),
      temperatureMaxC: round(
        median(modelDays.map((day) => day?.temperatureMaxC ?? null)),
      ),
      windMaxKmh: round(maxNullable(modelDays.map((day) => day?.windMaxKmh ?? null))),
      gustMaxKmh: round(maxNullable(modelDays.map((day) => day?.gustMaxKmh ?? null))),
      freezingLevelM: round(
        median(modelDays.map((day) => day?.freezingLevelM ?? null)),
        0,
      ),
      weatherCode: round(maxNullable(modelDays.map((day) => day?.weatherCode ?? null)), 0),
    };
  });

  const results = FORECAST_MODELS.map((model) =>
    successful.get(`${model.id}:${level.id}`),
  );
  const totalsFor = (hours: number) =>
    round(
      centralEstimate(
        FORECAST_MODELS.map((model, index) => ({
          model: model.id,
          value: totalForHours(results[index], hours),
        })),
        weights,
      ),
    );
  const hours24 = totalsFor(24);
  const hours72 = totalsFor(72);

  return {
    level,
    daily,
    totals: {
      hours24,
      hours72,
      days7: round(sumNullable(daily.slice(0, 7).map((day) => day.snowfallMedianCm))),
      days15: round(sumNullable(daily.slice(0, 15).map((day) => day.snowfallMedianCm))),
    },
    maxWindKmh: round(maxNullable(daily.map((day) => day.windMaxKmh))),
    maxGustKmh: round(maxNullable(daily.map((day) => day.gustMaxKmh))),
  };
}

function buildDates(successful: Map<string, NormalizedModelLevel>): string[] {
  const available = [...successful.values()]
    .flatMap((result) => result.daily.map((day) => day.date))
    .sort();
  const start = available[0];
  if (!start) throw new Error('No forecast dates were returned');
  return Array.from({ length: 15 }, (_, index) => addDays(start, index));
}

function buildDailyConsensus(levels: LevelForecast[]) {
  const firstLevel = levels[0];
  if (!firstLevel) return [];

  return firstLevel.daily.map((day, dayIndex) => {
    const levelDays = levels
      .map((level) => level.daily[dayIndex])
      .filter((value): value is LevelDailyForecast => value !== undefined);
    const score = Math.round(median(levelDays.map((value) => value.confidenceScore)) ?? 0);
    return {
      date: day.date,
      dayIndex,
      band: day.band,
      mountainSnowMedianCm: round(
        median(levelDays.map((value) => value.snowfallMedianCm)),
      ),
      confidenceScore: score,
      confidenceLabel: confidenceLabelForScore(score),
    };
  });
}

function entriesFromBatch(
  model: ForecastModelConfig,
  result: PromiseSettledResult<NormalizedModelLevel[]>,
): SettledEntry[] {
  if (result.status === 'rejected') {
    return MOUNTAIN_LEVELS.map((level) => ({
      model,
      level,
      result: { status: 'rejected', reason: result.reason },
    }));
  }

  const byLevel = new Map(result.value.map((item) => [item.levelId, item]));
  return MOUNTAIN_LEVELS.map((level) => {
    const value = byLevel.get(level.id);
    return value
      ? { model, level, result: { status: 'fulfilled', value } }
      : {
          model,
          level,
          result: {
            status: 'rejected',
            reason: new Error(`${model.shortName} returned no data for ${level.name}`),
          },
        };
  });
}

/**
 * `calibration` (skill per model and level, loaded server-side from the database) switches the
 * levels it marks active from the plain multimodel median to a skill-weighted mean. Without it
 * the numbers are exactly the plain-median ones and the response reports 'unavailable'.
 */
export async function buildForecastResponse(
  fetcher: ForecastFetcher = fetchOpenMeteoModel,
  updatedAt = new Date().toISOString(),
  calibration: ForecastCalibration = unavailableCalibration(),
): Promise<ForecastResponse> {
  const results = await Promise.allSettled(
    FORECAST_MODELS.map((model) => fetcher(model, MOUNTAIN_LEVELS)),
  );
  const entries = FORECAST_MODELS.flatMap((model, index) =>
    entriesFromBatch(model, results[index]!),
  );
  const successful = new Map<string, NormalizedModelLevel>();
  entries.forEach((entry) => {
    if (entry.result.status === 'fulfilled') {
      successful.set(`${entry.model.id}:${entry.level.id}`, entry.result.value);
    }
  });

  if (successful.size === 0) {
    const firstError = entries.find((entry) => entry.result.status === 'rejected');
    const message =
      firstError?.result.status === 'rejected'
        ? firstError.result.reason instanceof Error
          ? firstError.result.reason.message
          : String(firstError.result.reason)
        : 'All forecast sources failed';
    throw new Error(message);
  }

  const models = FORECAST_MODELS.map((model) => statusForModel(model, entries));
  const warnings = models
    .filter((model) => model.status !== 'ok')
    .map((model) =>
      model.status === 'failed'
        ? `${model.shortName} no está disponible; el consenso usa los otros modelos.`
        : `${model.shortName} tiene datos parciales; la confianza fue reducida.`,
    );
  const dates = buildDates(successful);
  const levels = MOUNTAIN_LEVELS.map((level) =>
    buildLevelForecast(level, dates, successful, levelWeights(calibration, level.id)),
  );

  return {
    resort: {
      name: RESORT.name,
      timezone: RESORT.timezone,
      updatedAt,
      source: 'Open-Meteo · ECMWF IFS · NOAA GFS · DWD ICON',
    },
    horizons: FORECAST_HORIZONS,
    models,
    levels,
    dailyConsensus: buildDailyConsensus(levels),
    calibration,
    warnings,
  };
}
