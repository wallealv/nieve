import { describe, expect, test } from 'vitest';
import { makeForecastFixture } from '../../test/fixtures.js';
import type { ForecastResponse, LevelDailyForecast } from '../../types/forecast.js';
import { findPrimaryStorm } from './storm.js';

function setSnow(day: LevelDailyForecast, value: number) {
  day.snowfallMedianCm = value;
  day.snowfallMinCm = Math.max(0, value - 2);
  day.snowfallMaxCm = value + 3;
  day.models = day.models.map((model, index) => ({
    ...model,
    snowfallCm: value + index - 1,
  }));
}

function clearFirstWeek(forecast: ForecastResponse) {
  forecast.levels.forEach((level) => {
    level.daily.slice(0, 7).forEach((day) => setSnow(day, 0));
  });
}

describe('findPrimaryStorm', () => {
  test('selects the strongest event inside the next seven days', () => {
    const forecast = structuredClone(makeForecastFixture());
    clearFirstWeek(forecast);

    forecast.levels.forEach((level, levelIndex) => {
      setSnow(level.daily[1]!, 8 + levelIndex * 2);
      setSnow(level.daily[4]!, 22 + levelIndex * 5);
    });

    const event = findPrimaryStorm(forecast.levels);

    expect(event?.startDate).toBe(forecast.levels[2]!.daily[4]!.date);
    expect(event?.intensity).toBe('strong');
    expect(event?.levels.find((level) => level.levelId === 'summit')?.totalCm).toBe(32);
  });

  test('bridges one dry day between snow days', () => {
    const forecast = structuredClone(makeForecastFixture());
    clearFirstWeek(forecast);

    forecast.levels.forEach((level, levelIndex) => {
      setSnow(level.daily[1]!, 7 + levelIndex * 2);
      setSnow(level.daily[3]!, 9 + levelIndex * 2);
    });

    const event = findPrimaryStorm(forecast.levels);

    expect(event?.startDate).toBe(forecast.levels[2]!.daily[1]!.date);
    expect(event?.endDate).toBe(forecast.levels[2]!.daily[3]!.date);
    expect(event?.durationDays).toBe(3);
  });

  test('ignores events below ten centimetres at summit', () => {
    const forecast = structuredClone(makeForecastFixture());
    clearFirstWeek(forecast);
    setSnow(forecast.levels[2]!.daily[2]!, 9);

    expect(findPrimaryStorm(forecast.levels)).toBeNull();
  });
});
