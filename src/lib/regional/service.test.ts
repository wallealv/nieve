import { describe, expect, test } from 'vitest';
import { FORECAST_MODELS } from '../../config/mountain.js';
import type { ForecastModelConfig, MountainLevelConfig } from '../../types/forecast.js';
import type { NormalizedModelLevel } from '../forecast/normalize.js';
import { REGIONAL_RESORTS } from './resorts.js';
import { buildRegionalResponse } from './service.js';

function normalized(model: ForecastModelConfig, points: readonly MountainLevelConfig[]): NormalizedModelLevel[] {
  return points.map((point, index) => ({
    model: model.id,
    levelId: point.id,
    fetchedAt: '2026-07-24T12:00:00Z',
    timezone: 'America/Argentina/Mendoza',
    hourlySnowfallCm: [],
    daily: Array.from({ length: 8 }, (_, day) => ({
      date: `2026-07-${String(24 + day).padStart(2, '0')}`,
      snowfallCm: model.id === 'ecmwf' ? index + 1 : model.id === 'gfs' ? index + 3 : index + 2,
      temperatureMinC: -8,
      temperatureMaxC: point.id === 'base' ? 1.2 : -3,
      windMaxKmh: 25,
      gustMaxKmh: model.id === 'gfs' ? 75 : 45,
      freezingLevelM: point.id === 'base' ? point.elevationM + 250 : point.elevationM - 500,
      weatherCode: 75,
      source: 'direct' as const,
    })),
  }));
}

describe('regional resort forecasts', () => {
  test('defines exactly seven unique resorts with base and summit points', () => {
    expect(REGIONAL_RESORTS).toHaveLength(7);
    expect(new Set(REGIONAL_RESORTS.map((item) => item.id)).size).toBe(7);
    for (const resort of REGIONAL_RESORTS) {
      expect(resort.base.elevationM).toBeLessThan(resort.summit.elevationM);
      expect(Math.abs(resort.base.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(resort.base.longitude)).toBeLessThanOrEqual(180);
      expect(resort.officialUrl).toMatch(/^https:\/\//);
    }
  });

  test('uses three batched model calls and returns every resort', async () => {
    const calls: Array<{ model: string; points: number }> = [];
    const response = await buildRegionalResponse(async (model, points) => {
      calls.push({ model: model.id, points: points.length });
      return normalized(model, points);
    }, '2026-07-24T13:00:00Z');

    expect(calls).toEqual(FORECAST_MODELS.map((model) => ({ model: model.id, points: 14 })));
    expect(response.resorts).toHaveLength(7);
    expect(response.resorts[0]?.snow72hCm).not.toBeNull();
    expect(response.resorts[0]?.modelCount).toBe(3);
  });

  test('preserves a partial result when one model fails', async () => {
    const response = await buildRegionalResponse(async (model, points) => {
      if (model.id === 'icon') throw new Error('ICON unavailable');
      return normalized(model, points);
    });
    expect(response.resorts.every((item) => item.modelCount === 2)).toBe(true);
    expect(response.warnings.join(' ')).toMatch(/ICON/i);
  });

  test('throws when all regional models fail', async () => {
    await expect(buildRegionalResponse(async () => { throw new Error('down'); })).rejects.toThrow(/regional model/i);
  });
});
