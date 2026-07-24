import { describe, expect, test } from 'vitest';
import type { ForecastSnapshot } from './history.js';
import {
  appendForecastSnapshot,
  forecastTrend,
  forecastVerification,
} from './history.js';

function snapshot(index: number, overrides: Partial<ForecastSnapshot> = {}): ForecastSnapshot {
  const day = String((index % 28) + 1).padStart(2, '0');
  const baseLevel = {
    firstDayDate: '2026-08-01',
    firstDayCm: 10 + index,
    hours72: 20 + index,
    days7: 30 + index,
    modelDays7: { ecmwf: 30 + index, gfs: 35 + index, icon: 28 + index },
    observedDepthCm: 20,
    observedNewSnow24hCm: null,
  };
  return {
    updatedAt: `2026-07-${day}T12:00:00Z-${index}`,
    savedAt: `2026-07-${day}T12:00:00Z`,
    levels: {
      base: { ...baseLevel },
      mid: { ...baseLevel, days7: 40 + index },
      summit: { ...baseLevel, days7: 50 + index },
    },
    storm: null,
    ...overrides,
  };
}

describe('forecast history', () => {
  test('deduplicates runs and caps storage at thirty snapshots', () => {
    let history: ForecastSnapshot[] = [];
    for (let index = 0; index < 35; index += 1) {
      const item = snapshot(index, {
        savedAt: new Date(Date.UTC(2026, 6, 1 + index)).toISOString(),
      });
      history = appendForecastSnapshot(history, item, new Date('2026-08-10T12:00:00Z'));
    }

    expect(history).toHaveLength(30);
    const duplicate = { ...history.at(-1)!, savedAt: '2026-08-10T13:00:00Z' };
    const next = appendForecastSnapshot(history, duplicate, new Date('2026-08-10T13:00:00Z'));
    expect(next).toHaveLength(30);
    expect(next.filter((item) => item.updatedAt === duplicate.updatedAt)).toHaveLength(1);
  });

  test('reports the delta against the previous run', () => {
    const history = [snapshot(0), snapshot(1), snapshot(2)];
    const trend = forecastTrend(history, 'summit');

    expect(trend.current).toBe(52);
    expect(trend.previous).toBe(51);
    expect(trend.delta).toBe(1);
    expect(trend.direction).toBe('up');
  });

  test('compares a prior first-day forecast with the latest observed snowfall', () => {
    const previous = snapshot(0);
    previous.levels.base.firstDayDate = '2026-08-01';
    previous.levels.base.firstDayCm = 12;
    const latest = snapshot(1);
    latest.levels.base.firstDayDate = '2026-08-01';
    latest.levels.base.observedNewSnow24hCm = 15;

    expect(forecastVerification([previous, latest], 'base')).toEqual({
      date: '2026-08-01',
      forecastCm: 12,
      observedCm: 15,
      differenceCm: 3,
    });
  });
});
