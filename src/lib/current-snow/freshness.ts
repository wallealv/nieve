import type { ObservationFreshness } from '../../types/currentSnow.js';

const HOUR_MS = 60 * 60 * 1000;

export function classifyFreshness(
  reportedAt: string | null,
  now = new Date(),
): ObservationFreshness {
  if (!reportedAt) return 'unknown';

  const reported = new Date(reportedAt);
  if (Number.isNaN(reported.getTime())) return 'unknown';

  const ageHours = Math.max(0, (now.getTime() - reported.getTime()) / HOUR_MS);
  if (ageHours <= 24) return 'fresh';
  if (ageHours <= 72) return 'aging';
  return 'stale';
}

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  ene: 0,
  enero: 0,
  feb: 1,
  february: 1,
  febrero: 1,
  mar: 2,
  march: 2,
  marzo: 2,
  apr: 3,
  april: 3,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  june: 5,
  junio: 5,
  jul: 6,
  july: 6,
  julio: 6,
  aug: 7,
  august: 7,
  ago: 7,
  agosto: 7,
  sep: 8,
  sept: 8,
  september: 8,
  septiembre: 8,
  oct: 9,
  october: 9,
  octubre: 9,
  nov: 10,
  november: 10,
  noviembre: 10,
  dec: 11,
  december: 11,
  dic: 11,
  diciembre: 11,
};

function monthIndex(value: string): number | null {
  return MONTHS[value.toLowerCase().replace('.', '')] ?? null;
}

function isoAtNoon(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

export function parseReportedDate(
  value: string | null,
  fetchedAt: string,
): string | null {
  if (!value) return null;

  const cleaned = value.replace(/\s+/g, ' ').trim();
  const dayFirst = cleaned.match(/(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú.]+)(?:\s+(\d{4}))?/);
  const monthFirst = cleaned.match(/([A-Za-zÁÉÍÓÚáéíóú.]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
  const match = dayFirst ?? monthFirst;
  if (!match) return null;

  const fetched = new Date(fetchedAt);
  const isDayFirst = match === dayFirst;
  const day = Number(isDayFirst ? match[1] : match[2]);
  const month = monthIndex(isDayFirst ? match[2]! : match[1]!);
  if (month === null || !Number.isFinite(day)) return null;

  let year = Number(match[3] ?? fetched.getUTCFullYear());
  let parsed = isoAtNoon(year, month, day);
  if (!parsed) return null;

  if (!match[3]) {
    const parsedDate = new Date(parsed);
    const thirtyDays = 30 * 24 * HOUR_MS;
    if (parsedDate.getTime() - fetched.getTime() > thirtyDays) {
      year -= 1;
      parsed = isoAtNoon(year, month, day);
    }
  }

  return parsed;
}
