import { expect, test, vi } from 'vitest';
import { FORECAST_MODELS, MOUNTAIN_LEVELS } from '../../config/mountain.js';
import {
  buildOpenMeteoUrl,
  fetchOpenMeteoModel,
} from './openMeteo.js';

function payload(elevation: number) {
  return {
    timezone: 'America/Argentina/Mendoza',
    elevation,
    hourly: {
      time: ['2026-08-01T00:00'],
      snowfall: [1],
      temperature_2m: [-5],
      wind_speed_10m: [20],
      wind_gusts_10m: [30],
      freezing_level_height: [1800],
      weather_code: [73],
    },
  };
}

test('requests all elevations in one ECMWF call without unsupported freezing level', () => {
  const model = FORECAST_MODELS.find((candidate) => candidate.id === 'ecmwf')!;
  const url = buildOpenMeteoUrl(model, MOUNTAIN_LEVELS);

  expect(url.pathname).toBe('/v1/ecmwf');
  expect(url.searchParams.get('forecast_hours')).toBe('360');
  expect(url.searchParams.get('hourly')).toContain('snowfall');
  expect(url.searchParams.get('hourly')).not.toContain('freezing_level_height');
  expect(url.searchParams.get('latitude')?.split(',')).toHaveLength(3);
  expect(url.searchParams.get('elevation')).toBe('2240,2800,3430');
});

test('requests freezing level from GFS for all mountain levels', () => {
  const model = FORECAST_MODELS.find((candidate) => candidate.id === 'gfs')!;
  const url = buildOpenMeteoUrl(model, MOUNTAIN_LEVELS);

  expect(url.pathname).toBe('/v1/gfs');
  expect(url.searchParams.get('forecast_hours')).toBe('384');
  expect(url.searchParams.get('hourly')).toContain('freezing_level_height');
});

test('normalizes one response location per requested level', async () => {
  const model = FORECAST_MODELS.find((candidate) => candidate.id === 'gfs')!;
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify(MOUNTAIN_LEVELS.map((level) => payload(level.elevationM))),
      { status: 200 },
    ),
  );

  const results = await fetchOpenMeteoModel(
    model,
    MOUNTAIN_LEVELS,
    fetchMock as typeof fetch,
  );

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(results.map((result) => result.levelId)).toEqual(['base', 'mid', 'summit']);
});

test('retries one transient 429 before succeeding', async () => {
  const model = FORECAST_MODELS.find((candidate) => candidate.id === 'icon')!;
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: true, reason: 'Too many requests' }), {
        status: 429,
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify(MOUNTAIN_LEVELS.map((level) => payload(level.elevationM))),
        { status: 200 },
      ),
    );

  const results = await fetchOpenMeteoModel(
    model,
    MOUNTAIN_LEVELS,
    fetchMock as typeof fetch,
    async () => undefined,
  );

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(results).toHaveLength(3);
});
