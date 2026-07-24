import type {
  ConfidenceLabel,
  LevelDailyForecast,
  LevelForecast,
  LevelId,
} from '../../types/forecast.js';
import { confidenceLabelForScore } from './confidence.js';
import { compact, round, sumNullable } from './math.js';

export type StormIntensity = 'moderate' | 'strong' | 'extreme';

export interface StormLevelTotal {
  levelId: LevelId;
  name: string;
  elevationM: number;
  totalCm: number | null;
  minCm: number | null;
  maxCm: number | null;
}

export interface StormEvent {
  startDate: string;
  endDate: string;
  peakDate: string;
  peakSnowCm: number | null;
  durationDays: number;
  intensity: StormIntensity;
  intensityLabel: string;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  freezingLevelMinM: number | null;
  freezingLevelMaxM: number | null;
  levels: StormLevelTotal[];
}

function maxNullable(values: Array<number | null>): number | null {
  const present = compact(values);
  return present.length ? Math.max(...present) : null;
}

function minNullable(values: Array<number | null>): number | null {
  const present = compact(values);
  return present.length ? Math.min(...present) : null;
}

function intensityFor(totalCm: number): Pick<StormEvent, 'intensity' | 'intensityLabel'> {
  if (totalCm >= 50) return { intensity: 'extreme', intensityLabel: 'Nevada muy fuerte' };
  if (totalCm >= 25) return { intensity: 'strong', intensityLabel: 'Nevada fuerte' };
  return { intensity: 'moderate', intensityLabel: 'Nevada moderada' };
}

function eventGroups(days: LevelDailyForecast[]): Array<{ start: number; end: number }> {
  const active = days
    .map((day, index) => ({ index, snow: day.snowfallMedianCm ?? 0 }))
    .filter((item) => item.snow >= 1)
    .map((item) => item.index);

  if (active.length === 0) return [];
  const groups: Array<{ start: number; end: number }> = [];
  let start = active[0]!;
  let previous = start;

  active.slice(1).forEach((index) => {
    if (index - previous <= 2) {
      previous = index;
      return;
    }
    groups.push({ start, end: previous });
    start = index;
    previous = index;
  });
  groups.push({ start, end: previous });
  return groups;
}

function totalForRange(level: LevelForecast, start: number, end: number): StormLevelTotal {
  const days = level.daily.slice(start, end + 1);
  return {
    levelId: level.level.id,
    name: level.level.name,
    elevationM: level.level.elevationM,
    totalCm: round(sumNullable(days.map((day) => day.snowfallMedianCm))),
    minCm: round(sumNullable(days.map((day) => day.snowfallMinCm))),
    maxCm: round(sumNullable(days.map((day) => day.snowfallMaxCm))),
  };
}

function buildEvent(
  levels: LevelForecast[],
  summit: LevelForecast,
  start: number,
  end: number,
): StormEvent | null {
  const summitDays = summit.daily.slice(start, end + 1);
  const summitTotal = round(sumNullable(summitDays.map((day) => day.snowfallMedianCm)));
  if (summitTotal === null || summitTotal < 10) return null;

  const peak = summitDays.reduce<LevelDailyForecast | null>((best, day) => {
    if (!best) return day;
    return (day.snowfallMedianCm ?? 0) > (best.snowfallMedianCm ?? 0) ? day : best;
  }, null);
  const scores = summitDays.map((day) => day.confidenceScore);
  const confidenceScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
  const intensity = intensityFor(summitTotal);

  return {
    startDate: summit.daily[start]!.date,
    endDate: summit.daily[end]!.date,
    peakDate: peak?.date ?? summit.daily[start]!.date,
    peakSnowCm: peak?.snowfallMedianCm ?? null,
    durationDays: end - start + 1,
    ...intensity,
    confidenceScore,
    confidenceLabel: confidenceLabelForScore(confidenceScore),
    windMaxKmh: round(maxNullable(summitDays.map((day) => day.windMaxKmh))),
    gustMaxKmh: round(maxNullable(summitDays.map((day) => day.gustMaxKmh))),
    freezingLevelMinM: round(
      minNullable(summitDays.map((day) => day.freezingLevelM)),
      0,
    ),
    freezingLevelMaxM: round(
      maxNullable(summitDays.map((day) => day.freezingLevelM)),
      0,
    ),
    levels: levels.map((level) => totalForRange(level, start, end)),
  };
}

export function findPrimaryStorm(levels: LevelForecast[]): StormEvent | null {
  const summit = levels.find((level) => level.level.id === 'summit');
  if (!summit) return null;

  const firstSevenDays = summit.daily.slice(0, 7);
  return eventGroups(firstSevenDays)
    .map(({ start, end }) => buildEvent(levels, summit, start, end))
    .filter((event): event is StormEvent => event !== null)
    .sort((left, right) => {
      const leftTotal = left.levels.find((level) => level.levelId === 'summit')?.totalCm ?? 0;
      const rightTotal = right.levels.find((level) => level.levelId === 'summit')?.totalCm ?? 0;
      return rightTotal - leftTotal;
    })[0] ?? null;
}
