import type { CurrentSnowResponse } from '../../types/currentSnow.js';
import type {
  ForecastResponse,
  LevelId,
  ModelId,
} from '../../types/forecast.js';
import { round, sumNullable } from './math.js';
import type { StormEvent } from './storm.js';

export const FORECAST_HISTORY_KEY = 'las-lenas:forecast-history:v1';
const MAX_SNAPSHOTS = 30;
const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

export interface ForecastSnapshotLevel {
  firstDayDate: string | null;
  firstDayCm: number | null;
  hours72: number | null;
  days7: number | null;
  modelDays7: Partial<Record<ModelId, number | null>>;
  observedDepthCm: number | null;
  observedNewSnow24hCm: number | null;
}

export interface ForecastSnapshot {
  updatedAt: string;
  savedAt: string;
  levels: Record<LevelId, ForecastSnapshotLevel>;
  storm: {
    startDate: string;
    endDate: string;
    summitTotalCm: number | null;
    confidenceScore: number;
  } | null;
}

export interface ForecastTrend {
  current: number | null;
  previous: number | null;
  delta: number | null;
  direction: 'up' | 'down' | 'flat' | 'unknown';
  points: Array<{ updatedAt: string; value: number }>;
}

export interface ForecastVerification {
  date: string;
  forecastCm: number;
  observedCm: number;
  differenceCm: number;
}

function modelTotal(
  forecast: ForecastResponse,
  levelId: LevelId,
  modelId: ModelId,
): number | null {
  const level = forecast.levels.find((item) => item.level.id === levelId);
  if (!level) return null;
  return round(
    sumNullable(
      level.daily.slice(0, 7).map(
        (day) => day.models.find((model) => model.model === modelId)?.snowfallCm ?? null,
      ),
    ),
  );
}

export function buildForecastSnapshot(
  forecast: ForecastResponse,
  currentSnow: CurrentSnowResponse | undefined,
  storm: StormEvent | null,
  savedAt = new Date().toISOString(),
): ForecastSnapshot {
  const levelIds: LevelId[] = ['base', 'mid', 'summit'];
  const levels = Object.fromEntries(
    levelIds.map((levelId) => {
      const forecastLevel = forecast.levels.find((item) => item.level.id === levelId);
      const firstDay = forecastLevel?.daily[0];
      const observed = currentSnow?.zones.find((zone) => zone.zone === levelId);
      return [
        levelId,
        {
          firstDayDate: firstDay?.date ?? null,
          firstDayCm: firstDay?.snowfallMedianCm ?? null,
          hours72: forecastLevel?.totals.hours72 ?? null,
          days7: forecastLevel?.totals.days7 ?? null,
          modelDays7: {
            ecmwf: modelTotal(forecast, levelId, 'ecmwf'),
            gfs: modelTotal(forecast, levelId, 'gfs'),
            icon: modelTotal(forecast, levelId, 'icon'),
          },
          observedDepthCm: observed?.referenceDepthCm ?? null,
          observedNewSnow24hCm: observed?.newSnow24hCm ?? null,
        },
      ];
    }),
  ) as Record<LevelId, ForecastSnapshotLevel>;
  const summitStorm = storm?.levels.find((level) => level.levelId === 'summit');

  return {
    updatedAt: forecast.resort.updatedAt,
    savedAt,
    levels,
    storm: storm
      ? {
          startDate: storm.startDate,
          endDate: storm.endDate,
          summitTotalCm: summitStorm?.totalCm ?? null,
          confidenceScore: storm.confidenceScore,
        }
      : null,
  };
}

export function appendForecastSnapshot(
  history: ForecastSnapshot[],
  snapshot: ForecastSnapshot,
  now = new Date(snapshot.savedAt),
): ForecastSnapshot[] {
  const threshold = now.getTime() - MAX_AGE_MS;
  const retained = history.filter(
    (item) =>
      item.updatedAt !== snapshot.updatedAt &&
      Number.isFinite(new Date(item.savedAt).getTime()) &&
      new Date(item.savedAt).getTime() >= threshold,
  );
  return [...retained, snapshot]
    .sort((left, right) => left.savedAt.localeCompare(right.savedAt))
    .slice(-MAX_SNAPSHOTS);
}

export function forecastTrend(
  history: ForecastSnapshot[],
  levelId: LevelId,
): ForecastTrend {
  const points = history
    .map((snapshot) => ({
      updatedAt: snapshot.updatedAt,
      value: snapshot.levels[levelId]?.days7 ?? null,
    }))
    .filter((point): point is { updatedAt: string; value: number } => point.value !== null)
    .slice(-8);
  const current = points.at(-1)?.value ?? null;
  const previous = points.at(-2)?.value ?? null;
  const delta = current !== null && previous !== null ? round(current - previous) : null;
  const direction =
    delta === null ? 'unknown' : delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';

  return { current, previous, delta, direction, points };
}

export function forecastVerification(
  history: ForecastSnapshot[],
  levelId: LevelId,
): ForecastVerification | null {
  const latest = history.at(-1);
  const observed = latest?.levels[levelId]?.observedNewSnow24hCm ?? null;
  const targetDate = latest?.levels[levelId]?.firstDayDate ?? null;
  if (observed === null || targetDate === null) return null;

  const prior = [...history]
    .slice(0, -1)
    .reverse()
    .find((snapshot) => {
      const level = snapshot.levels[levelId];
      return level?.firstDayDate === targetDate && level.firstDayCm !== null;
    });
  const forecastCm = prior?.levels[levelId]?.firstDayCm ?? null;
  if (forecastCm === null) return null;

  return {
    date: targetDate,
    forecastCm,
    observedCm: observed,
    differenceCm: round(observed - forecastCm) ?? 0,
  };
}

export function loadForecastHistory(storage: Storage | null): ForecastSnapshot[] {
  if (!storage) return [];
  try {
    const value = storage.getItem(FORECAST_HISTORY_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as ForecastSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveForecastHistory(
  storage: Storage | null,
  history: ForecastSnapshot[],
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(FORECAST_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}
