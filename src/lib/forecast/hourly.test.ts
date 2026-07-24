import { describe, expect, test, vi } from 'vitest';
import { FORECAST_MODELS, MOUNTAIN_LEVELS } from '../../config/mountain.js';
import { buildHourlyUrl, fetchHourlyModel } from './hourly.js';

function locationPayload(elevation: number, visibility: number | null = 8000) {
  return {
    timezone: 'America/Argentina/Mendoza',
    elevation,
    hourly: {
      time: ['2026-07-25T00:00', '2026-07-25T01:00'],
      snowfall: [2.4, 1.2],
      rain: [0, 0.4],
      precipitation: [2.4, 1.6],
      precipitation_probability: [90, 85],
      temperature_2m: [-5, -2],
      apparent_temperature: [-10, -6],
      relative_humidity_2m: [88, 91],
      dew_point_2m: [-6, -3],
      wind_speed_10m: [25, 30],
      wind_direction_10m: [250, 260],
      wind_gusts_10m: [55, 62],
      visibility: [visibility, visibility],
      cloud_cover: [95, 100],
      shortwave_radiation: [0, 0],
      freezing_level_height: [1900, 2300],
      snow_depth: [0.42, 0.45],
      is_day: [0, 0],
      weather_code: [75, 85],
    },
  };
}

describe('hourly Open-Meteo adapter', () => {
  test('requests 72 hours and all supported variables for three levels', () => {
    const model = FORECAST_MODELS.find((item) => item.id === 'gfs')!;
    const url = buildHourlyUrl(model, MOUNTAIN_LEVELS);

    expect(url.searchParams.get('forecast_hours')).toBe('72');
    expect(url.searchParams.get('latitude')?.split(',')).toHaveLength(3);
    const variables = url.searchParams.get('hourly') ?? '';
    expect(variables).toContain('snowfall');
    expect(variables).toContain('visibility');
    expect(variables).toContain('snow_depth');
    expect(variables).toContain('is_day');
  });

  test('normalizes one location per level and preserves null values', async () => {
    const model = FORECAST_MODELS.find((item) => item.id === 'gfs')!;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          locationPayload(2240),
          locationPayload(2800, null),
          locationPayload(3430),
        ]),
        { status: 200 },
      ),
    );

    const result = await fetchHourlyModel(model, MOUNTAIN_LEVELS, fetchMock as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.levels.map((level) => level.level.id)).toEqual(['base', 'mid', 'summit']);
    expect(result.levels[0]?.points[0]?.snowfallCm).toBe(2.4);
    expect(result.levels[1]?.points[0]?.visibilityM).toBeNull();
    expect(result.levels[2]?.points[0]?.snowDepthCm).toBe(42);
  });

  test('retries one recoverable response', async () => {
    const model = FORECAST_MODELS.find((item) => item.id === 'icon')!;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: true, reason: 'busy' }), { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOUNTAIN_LEVELS.map((level) => locationPayload(level.elevationM))), {
          status: 200,
        }),
      );

    await fetchHourlyModel(model, MOUNTAIN_LEVELS, fetchMock as typeof fetch, async () => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
