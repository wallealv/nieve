import { FORECAST_MODELS, MOUNTAIN_LEVELS } from '../../config/mountain.js';
import type { ForecastModelConfig, LevelId, MountainLevelConfig } from '../../types/forecast.js';
import type {
  ModelRunLevelTotal,
  ModelRunReport,
  ModelRunSeries,
  ModelRunsResponse,
  ModelTrendSummary,
} from '../../types/modelRuns.js';

const MODEL_CODES: Record<ForecastModelConfig['id'], string> = {
  ecmwf: 'ecmwf_ifs025',
  gfs: 'gfs_global',
  icon: 'icon_global',
};

interface RunPayload {
  error?: boolean;
  reason?: string;
  hourly?: {
    time?: string[];
    snowfall?: Array<number | null>;
  };
}

function cycleString(date: Date): string {
  return `${date.toISOString().slice(0, 13)}:00`;
}

export function recentRunCycles(now = new Date()): string[] {
  const lagged = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  lagged.setUTCMinutes(0, 0, 0);
  lagged.setUTCHours(Math.floor(lagged.getUTCHours() / 6) * 6);
  return [0, 1, 2].map((offset) => cycleString(new Date(lagged.getTime() - offset * 6 * 60 * 60 * 1000)));
}

export function buildSingleRunUrl(
  model: ForecastModelConfig,
  levels: readonly MountainLevelConfig[],
  run: string,
): URL {
  const url = new URL('https://single-runs-api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', levels.map((level) => level.latitude).join(','));
  url.searchParams.set('longitude', levels.map((level) => level.longitude).join(','));
  url.searchParams.set('elevation', levels.map((level) => level.elevationM).join(','));
  url.searchParams.set('models', MODEL_CODES[model.id]);
  url.searchParams.set('run', run);
  url.searchParams.set('hourly', 'snowfall');
  url.searchParams.set('forecast_days', '8');
  url.searchParams.set('timezone', 'America/Argentina/Mendoza');
  url.searchParams.set('precipitation_unit', 'mm');
  return url;
}

function parseLocalTime(value: string): number {
  const zoned = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}-03:00`;
  return new Date(zoned).getTime();
}

function sumWindow(payload: RunPayload, from: number, durationHours: number): number | null {
  const times = payload.hourly?.time ?? [];
  const snowfall = payload.hourly?.snowfall ?? [];
  const to = from + durationHours * 60 * 60 * 1000;
  const values = times
    .map((time, index) => ({ timestamp: parseLocalTime(time), value: snowfall[index] }))
    .filter((item) => item.timestamp >= from && item.timestamp < to)
    .map((item) => item.value)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (values.length === 0) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) * 10) / 10;
}

function normalizeRun(
  run: string,
  payload: RunPayload | RunPayload[],
  levels: readonly MountainLevelConfig[],
  validFrom: Date,
) {
  const locations = Array.isArray(payload) ? payload : [payload];
  if (locations.length !== levels.length) {
    throw new Error(`Run ${run} returned ${locations.length} locations; expected ${levels.length}`);
  }
  const from = validFrom.getTime();
  const entries = levels.map((level, index) => {
    const location = locations[index]!;
    const value: ModelRunLevelTotal = {
      hours72Cm: sumWindow(location, from, 72),
      days7Cm: sumWindow(location, from, 168),
    };
    return [level.id, value] as const;
  });
  return { run, levels: Object.fromEntries(entries) as Record<LevelId, ModelRunLevelTotal> };
}

export async function fetchRecentModelRuns(
  model: ForecastModelConfig,
  levels: readonly MountainLevelConfig[],
  runs = recentRunCycles(),
  fetchImpl: typeof fetch = fetch,
  validFrom = new Date(),
): Promise<ModelRunSeries> {
  const outcomes = await Promise.all(
    runs.map(async (run) => {
      try {
        const response = await fetchImpl(buildSingleRunUrl(model, levels, run), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15_000),
        });
        const payload = (await response.json()) as RunPayload | RunPayload[];
        const reason = (Array.isArray(payload) ? payload : [payload]).find((item) => item.error)?.reason;
        if (!response.ok || reason) throw new Error(reason || `HTTP ${response.status}`);
        return { run, value: normalizeRun(run, payload, levels, validFrom), error: null };
      } catch (error) {
        return { run, value: null, error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );

  return {
    model: model.id,
    runs: outcomes.flatMap((outcome) => (outcome.value ? [outcome.value] : [])),
    missingRuns: outcomes.flatMap((outcome) => (outcome.value ? [] : [outcome.run])),
  };
}

export function analyzeModelRuns(values: Array<number | null>): ModelTrendSummary {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (valid.length < 3) return { direction: 'insufficient', current: valid.at(-1) ?? null, previous: valid.at(-2) ?? null, delta: null };
  const previous = valid.at(-2)!;
  const current = valid.at(-1)!;
  const delta = Math.round((current - previous) * 10) / 10;
  const overall = current - valid[0]!;
  const tolerance = Math.max(1, Math.abs(current) * 0.05);
  const direction = Math.abs(overall) <= tolerance ? 'stable' : overall > 0 ? 'up' : 'down';
  return { direction, current, previous, delta };
}

function trendFor(series: ModelRunSeries, levelId: LevelId): ModelTrendSummary {
  const chronological = [...series.runs].reverse();
  return analyzeModelRuns(chronological.map((run) => run.levels[levelId].days7Cm));
}

function spread(values: Array<number | null>): number | null {
  const numbers = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return numbers.length >= 2 ? Math.round((Math.max(...numbers) - Math.min(...numbers)) * 10) / 10 : null;
}

export async function buildModelRunsResponse(
  fetcher: (model: ForecastModelConfig) => Promise<ModelRunSeries> = (model) =>
    fetchRecentModelRuns(model, MOUNTAIN_LEVELS),
  generatedAt = new Date().toISOString(),
): Promise<ModelRunsResponse> {
  const settled = await Promise.allSettled(FORECAST_MODELS.map((model) => fetcher(model)));
  const warnings: string[] = [];
  const reports: ModelRunReport[] = FORECAST_MODELS.map((model, index) => {
    const outcome = settled[index];
    if (outcome?.status === 'fulfilled' && outcome.value.runs.length > 0) {
      const series = outcome.value;
      if (series.missingRuns.length) warnings.push(`${model.shortName}: faltan ${series.missingRuns.length} corridas archivadas.`);
      return {
        model: model.id,
        name: model.name,
        shortName: model.shortName,
        status: series.missingRuns.length ? 'partial' : 'ok',
        runs: series.runs,
        trends: {
          base: trendFor(series, 'base'),
          mid: trendFor(series, 'mid'),
          summit: trendFor(series, 'summit'),
        },
        message: series.missingRuns.length ? 'Archivo parcial.' : null,
      };
    }
    const message = outcome?.status === 'rejected'
      ? outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
      : 'No hay corridas disponibles.';
    warnings.push(`${model.shortName}: ${message}`);
    return {
      model: model.id,
      name: model.name,
      shortName: model.shortName,
      status: 'failed',
      runs: [],
      trends: {
        base: analyzeModelRuns([]),
        mid: analyzeModelRuns([]),
        summit: analyzeModelRuns([]),
      },
      message,
    };
  });

  if (reports.every((report) => report.status === 'failed')) throw new Error('No archived model runs are available.');

  const currentSpreadCm = spread(reports.map((report) => report.runs[0]?.levels.summit.days7Cm ?? null));
  const previousSpreadCm = spread(reports.map((report) => report.runs[1]?.levels.summit.days7Cm ?? null));
  const convergenceDirection = currentSpreadCm === null || previousSpreadCm === null
    ? 'insufficient'
    : currentSpreadCm < previousSpreadCm - 1
      ? 'converging'
      : currentSpreadCm > previousSpreadCm + 1
        ? 'diverging'
        : 'stable';

  return {
    resort: 'Las Leñas',
    generatedAt,
    reports,
    convergence: { currentSpreadCm, previousSpreadCm, direction: convergenceDirection },
    warnings,
  };
}
