import { describe, expect, test } from 'vitest';
import { FORECAST_MODELS, MOUNTAIN_LEVELS } from '../../config/mountain.js';
import type { ModelHourlyResult } from '../../types/hourly.js';
import { buildHourlyResponse } from './hourlyService.js';

function result(model: ModelHourlyResult['model'], snowfallCm: number, visibilityM: number | null): ModelHourlyResult {
  return {
    model,
    generatedAt: '2026-07-24T12:00:00Z',
    levels: MOUNTAIN_LEVELS.map((level) => ({
      level,
      points: [
        {
          time: '2026-07-25T00:00',
          snowfallCm,
          rainMm: 0,
          precipitationMm: snowfallCm,
          precipitationProbability: 80,
          temperatureC: -5,
          apparentTemperatureC: -9,
          relativeHumidityPct: 85,
          dewPointC: -6,
          windSpeedKmh: 20,
          windDirectionDeg: 250,
          windGustKmh: 35,
          visibilityM,
          cloudCoverPct: 90,
          shortwaveRadiationWm2: 0,
          freezingLevelM: 1800,
          snowDepthCm: 30,
          isDay: false,
          weatherCode: 75,
        },
      ],
    })),
  };
}

describe('buildHourlyResponse', () => {
  test('uses the median across three models', async () => {
    const values = { ecmwf: result('ecmwf', 1, 1000), gfs: result('gfs', 3, 3000), icon: result('icon', 5, 5000) };
    const response = await buildHourlyResponse(async (model) => values[model.id], '2026-07-24T13:00:00Z');

    expect(response.levels[0]?.points[0]?.snowfallCm).toBe(3);
    expect(response.levels[0]?.points[0]?.visibilityM).toBe(3000);
    expect(response.models.every((model) => model.status === 'ok')).toBe(true);
  });

  test('returns a partial response when one model fails', async () => {
    const response = await buildHourlyResponse(async (model) => {
      if (model.id === 'icon') throw new Error('ICON unavailable');
      return result(model.id, model.id === 'ecmwf' ? 2 : 4, model.id === 'ecmwf' ? 2000 : null);
    });

    expect(response.levels[0]?.points[0]?.snowfallCm).toBe(3);
    expect(response.models.find((model) => model.id === 'icon')?.status).toBe('failed');
    expect(response.warnings.join(' ')).toMatch(/ICON/i);
  });

  test('throws when all models fail', async () => {
    await expect(
      buildHourlyResponse(async (model) => {
        throw new Error(`${model.id} failed`);
      }),
    ).rejects.toThrow(/No hourly model/i);
  });

  test('requests exactly the configured models', async () => {
    const requested: string[] = [];
    await buildHourlyResponse(async (model) => {
      requested.push(model.id);
      return result(model.id, 1, 5000);
    });
    expect(requested).toEqual(FORECAST_MODELS.map((model) => model.id));
  });
});
