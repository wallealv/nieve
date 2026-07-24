import { MOUNTAIN_LEVELS } from '../../config/mountain.js';
import type { ClimatologyResponse } from '../../types/climatology.js';
import type { MountainLevelConfig } from '../../types/forecast.js';
import { median, round } from './math.js';

interface ArchivePayload {
  error?: boolean;
  reason?: string;
  daily?: {
    time?: string[];
    snowfall_sum?: Array<number | null>;
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildClimatologyUrl(
  levels: readonly MountainLevelConfig[],
  asOf = new Date(),
  referenceYears = 10,
): URL {
  const lastYear = asOf.getUTCFullYear() - 1;
  const firstYear = lastYear - referenceYears + 1;
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', levels.map((level) => level.latitude).join(','));
  url.searchParams.set('longitude', levels.map((level) => level.longitude).join(','));
  url.searchParams.set('elevation', levels.map((level) => level.elevationM).join(','));
  url.searchParams.set('start_date', `${firstYear}-01-01`);
  url.searchParams.set('end_date', `${lastYear}-12-31`);
  url.searchParams.set('daily', 'snowfall_sum');
  url.searchParams.set('timezone', 'America/Argentina/Mendoza');
  url.searchParams.set('precipitation_unit', 'mm');
  return url;
}

function windowDates(year: number, asOf: Date): string[] {
  const start = new Date(Date.UTC(year, asOf.getUTCMonth(), asOf.getUTCDate()));
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + offset);
    return dateOnly(day);
  });
}

function annualWindows(payload: ArchivePayload, asOf: Date): number[] {
  const times = payload.daily?.time ?? [];
  const values = payload.daily?.snowfall_sum ?? [];
  const byDate = new Map(times.map((time, index) => [time, values[index] ?? null]));
  const years = [...new Set(times.map((time) => Number(time.slice(0, 4))).filter(Number.isFinite))];
  return years.flatMap((year) => {
    const selected = windowDates(year, asOf).map((date) => byDate.get(date) ?? null);
    const valid = selected.filter((value): value is number => value !== null && Number.isFinite(value));
    if (valid.length === 0) return [];
    return [Math.round(valid.reduce((total, value) => total + value, 0) * 10) / 10];
  });
}

export async function fetchClimatology(
  asOf = new Date(),
  referenceYears = 10,
  fetchImpl: typeof fetch = fetch,
): Promise<ClimatologyResponse> {
  const response = await fetchImpl(buildClimatologyUrl(MOUNTAIN_LEVELS, asOf, referenceYears), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json()) as ArchivePayload | ArchivePayload[];
  const locations = Array.isArray(payload) ? payload : [payload];
  const reason = locations.find((item) => item.error)?.reason;
  if (!response.ok || reason) throw new Error(reason || `Open-Meteo histórico respondió HTTP ${response.status}`);
  if (locations.length !== MOUNTAIN_LEVELS.length) {
    throw new Error(`Climatología devolvió ${locations.length} cotas; se esperaban ${MOUNTAIN_LEVELS.length}.`);
  }

  const periodStart = dateOnly(asOf);
  const periodEndDate = new Date(asOf);
  periodEndDate.setUTCDate(periodEndDate.getUTCDate() + 6);

  return {
    generatedAt: new Date().toISOString(),
    periodStart,
    periodEnd: dateOnly(periodEndDate),
    referenceYears,
    source: 'Open-Meteo Historical Weather API · ERA5',
    levels: MOUNTAIN_LEVELS.map((level, index) => {
      const values = annualWindows(locations[index]!, asOf).sort((left, right) => left - right);
      return {
        levelId: level.id,
        elevationM: level.elevationM,
        average7dCm: values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null,
        median7dCm: round(median(values)),
        min7dCm: values[0] ?? null,
        max7dCm: values.at(-1) ?? null,
        sampleYears: values.length,
      };
    }),
    warning: 'Referencia modelada de nieve nueva, no espesor observado. ERA5 puede suavizar microclimas de montaña.',
  };
}
