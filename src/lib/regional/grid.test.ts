import { describe, expect, test } from 'vitest';
import { FORECAST_MODELS } from '../../config/mountain.js';
import type { ForecastModelConfig, MountainLevelConfig } from '../../types/forecast.js';
import type { NormalizedModelLevel } from '../forecast/normalize.js';
import { buildRegionalGrid, REGIONAL_GRID } from './grid.js';

function normalized(model: ForecastModelConfig, points: readonly MountainLevelConfig[]): NormalizedModelLevel[] {
  return points.map((point, index) => ({
    model: model.id,
    levelId: point.id,
    fetchedAt: '2026-07-24T12:00:00Z',
    timezone: 'America/Argentina/Mendoza',
    hourlySnowfallCm: Array.from({ length: 72 }, () => index + 1),
    daily: [
      {
        date: '2026-07-24',
        snowfallCm: (index + 1) * 24,
        temperatureMinC: -8,
        temperatureMaxC: point.id === 'base' ? 1.5 : -4,
        windMaxKmh: 20,
        gustMaxKmh: 35,
        freezingLevelM: point.elevationM + (point.id === 'base' ? 200 : -500),
        weatherCode: 75,
        source: 'direct',
      },
    ],
  }));
}

describe('regional map grid', () => {
  test('is fixed, bounded and unique', () => {
    expect(REGIONAL_GRID.length).toBeGreaterThanOrEqual(7);
    expect(REGIONAL_GRID.length).toBeLessThanOrEqual(20);
    expect(new Set(REGIONAL_GRID.map((point) => point.id)).size).toBe(REGIONAL_GRID.length);
  });

  test('uses one ECMWF batch and produces all supported periods', async () => {
    const calls: Array<{ model: string; points: number }> = [];
    const response = await buildRegionalGrid(async (model, points) => {
      calls.push({ model: model.id, points: points.length });
      return normalized(model, points);
    }, '2026-07-24T13:00:00Z');

    expect(calls).toEqual([{ model: FORECAST_MODELS[0]?.id, points: REGIONAL_GRID.length }]);
    expect(response.model).toBe('ECMWF IFS');
    expect(response.points[0]?.snowfallCm['6h']).toBe(6);
    expect(response.points[0]?.snowfallCm['72h']).toBe(72);
  });

  test('preserves null when a point has no hourly snow values', async () => {
    const response = await buildRegionalGrid(async (model, points) => {
      const values = normalized(model, points);
      values[0]!.hourlySnowfallCm = Array.from({ length: 72 }, () => null);
      return values;
    });
    expect(response.points[0]?.snowfallCm['24h']).toBeNull();
  });
});
