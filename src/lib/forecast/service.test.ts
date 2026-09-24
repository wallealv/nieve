import { expect, test } from 'vitest';
import type { ForecastCalibration, LevelId, ModelId } from '../../types/forecast.js';
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

function calibration(
  levels: Partial<Record<LevelId, Partial<Record<ModelId, number>>>>,
): ForecastCalibration {
  return {
    status: 'active',
    windowDays: 60,
    minSamples: 10,
    levels: (['base', 'mid', 'summit'] as const).map((level) => {
      const weights = levels[level];
      return {
        level,
        active: weights !== undefined,
        models: (['ecmwf', 'gfs', 'icon'] as const).map((model) => ({
          model,
          samples: weights ? 12 : 3,
          maeCm: 2,
          biasCm: 0,
          weight: weights?.[model] ?? null,
        })),
      };
    }),
  };
}

function makeLateSnowResult(model: ModelId, levelId: LevelId): NormalizedModelLevel {
  const result = makeResult(model, levelId, model === 'ecmwf' ? 1 : model === 'gfs' ? 2 : 3);
  return {
    ...result,
    daily: result.daily.map((day, dayIndex) =>
      dayIndex === 9 ? { ...day, snowfallCm: model === 'ecmwf' ? 10 : 20 } : day,
    ),
  };
}

const threeModels = async (model: { id: ModelId }, levels: readonly { id: LevelId }[]) =>
  levels.map((level) => makeLateSnowResult(model.id, level.id));

test('reports unavailable calibration and keeps the plain median without calibration', async () => {
  const result = await buildForecastResponse(threeModels, '2026-07-23T02:00:00Z');

  expect(result.calibration).toEqual({
    status: 'unavailable',
    windowDays: 60,
    minSamples: 10,
    levels: [],
  });
  expect(result.levels[0].daily[0].snowfallMedianCm).toBe(48);
  expect(result.levels[0].daily[9].snowfallMedianCm).toBe(15);
  expect(result.levels[0].totals.hours24).toBe(48);
});

test('weights the consensus by model skill on calibrated levels only', async () => {
  const skill = calibration({ base: { ecmwf: 0.5, gfs: 0.3, icon: 0.2 } });
  const result = await buildForecastResponse(threeModels, '2026-07-23T02:00:00Z', skill);
  const [base, mid] = result.levels;

  expect(result.calibration).toBe(skill);
  // 24 × 0.5 + 48 × 0.3 + 72 × 0.2
  expect(base.daily[0].snowfallMedianCm).toBe(40.8);
  expect(base.totals.hours24).toBe(40.8);
  expect(base.totals.hours72).toBe(40.8);
  // ICON has ended by day 9: (10 × 0.5 + 20 × 0.3) / 0.8
  expect(base.daily[9].snowfallMedianCm).toBe(13.8);
  // Range, cumulative and weekly totals keep deriving from the central estimate.
  expect(base.daily[0].snowfallMinCm).toBe(24);
  expect(base.daily[0].snowfallMaxCm).toBe(72);
  expect(base.daily[9].cumulativeMedianCm).toBe(54.6);
  expect(base.totals.days7).toBe(40.8);
  expect(base.totals.days15).toBe(54.6);
  // Uncalibrated levels keep the plain median.
  expect(mid.daily[0].snowfallMedianCm).toBe(48);
  expect(mid.totals.hours24).toBe(48);
  expect(result.dailyConsensus[0].mountainSnowMedianCm).toBe(48);
});

test('ignores inactive levels even when the response status is active', async () => {
  const skill = calibration({ summit: { ecmwf: 0.2, gfs: 0.2, icon: 0.6 } });
  const result = await buildForecastResponse(threeModels, '2026-07-23T02:00:00Z', skill);

  expect(result.levels[0].daily[0].snowfallMedianCm).toBe(48);
  // 24 × 0.2 + 48 × 0.2 + 72 × 0.6
  expect(result.levels[2].daily[0].snowfallMedianCm).toBe(57.6);
});
