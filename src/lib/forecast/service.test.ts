import { expect, test } from 'vitest';
import type { LevelId, ModelId } from '../../types/forecast.js';
import type { NormalizedModelLevel } from './normalize.js';
import { buildForecastResponse } from './service.js';

function makeResult(model: ModelId, levelId: LevelId, snow: number): NormalizedModelLevel {
  return {
    model,
    levelId,
    fetchedAt: '2026-07-23T02:00:00Z',
    timezone: 'America/Argentina/Mendoza',
    hourlySnowfallCm: Array.from({ length: 360 }, (_, index) =>
      index < 24 ? snow : 0,
    ),
    daily: Array.from({ length: model === 'icon' ? 8 : 15 }, (_, dayIndex) => ({
      date: `2026-08-${String(dayIndex + 1).padStart(2, '0')}`,
      snowfallCm: dayIndex === 0 ? snow * 24 : 0,
      temperatureMinC: -5,
      temperatureMaxC: -1,
      windMaxKmh: 20,
      gustMaxKmh: 30,
      freezingLevelM: 1800,
      weatherCode: 73,
      source: 'estimated',
    })),
  };
}

test('continues when one model batch fails and marks it failed', async () => {
  const result = await buildForecastResponse(async (model, levels) => {
    if (model.id === 'icon') throw new Error('ICON unavailable');
    return levels.map((level) =>
      makeResult(model.id, level.id, model.id === 'ecmwf' ? 1 : 2),
    );
  }, '2026-07-23T02:00:00Z');

  expect(result.models.find((model) => model.id === 'icon')?.status).toBe('failed');
  expect(result.levels[0].daily[0].modelCount).toBe(2);
  expect(result.warnings.join(' ')).toMatch(/ICON/i);
  expect(result.levels[0].totals.hours24).toBe(36);
});

test('preserves ICON absence after its horizon', async () => {
  const result = await buildForecastResponse(
    async (model, levels) =>
      levels.map((level) =>
        makeResult(
          model.id,
          level.id,
          model.id === 'ecmwf' ? 1 : model.id === 'gfs' ? 2 : 3,
        ),
      ),
    '2026-07-23T02:00:00Z',
  );

  expect(result.levels[0].daily[0].snowfallMedianCm).toBe(48);
  expect(
    result.levels[0].daily[10].models.find((model) => model.model === 'icon')
      ?.snowfallCm,
  ).toBeNull();
  expect(result.levels[0].daily[12].band).toBe('guidance');
});
