import { afterEach, describe, expect, test, vi } from 'vitest';
import { createForecastHandler, createForecastLoader } from '../../api/forecast.js';
import { makeForecastFixture } from '../../src/test/fixtures.js';
import type { ForecastCalibration } from '../../src/types/forecast.js';

test('returns cached JSON for GET', async () => {
  const handler = createForecastHandler(async () => ({ ok: true }));
  const response = await handler(new Request('http://localhost/api/forecast'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=10800, stale-while-revalidate=1800');
  await expect(response.json()).resolves.toEqual({ ok: true });
});

test('rejects non-GET methods', async () => {
  const handler = createForecastHandler(async () => ({ ok: true }));
  const response = await handler(new Request('http://localhost/api/forecast', { method: 'POST' }));
  expect(response.status).toBe(405);
});

test('returns structured 503 when all sources fail', async () => {
  const handler = createForecastHandler(async () => { throw new Error('upstream down'); });
  const response = await handler(new Request('http://localhost/api/forecast'));
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: 'FORECAST_UNAVAILABLE', message: 'upstream down' });
});

describe('default forecast loader', () => {
  const activeCalibration: ForecastCalibration = {
    status: 'active',
    windowDays: 60,
    minSamples: 10,
    levels: [],
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test('loads skill, builds the weighted forecast, saves snapshots and returns it', async () => {
    const forecast = makeForecastFixture();
    const calls: string[] = [];
    const loadCalibration = vi.fn(async () => {
      calls.push('calibration');
      return activeCalibration;
    });
    const buildForecast = vi.fn(async () => {
      calls.push('build');
      return forecast;
    });
    const saveSnapshots = vi.fn(async () => {
      calls.push('save');
      return true;
    });

    const handler = createForecastHandler(
      createForecastLoader({ loadCalibration, buildForecast, saveSnapshots }),
    );
    const response = await handler(new Request('http://localhost/api/forecast'));

    expect(response.status).toBe(200);
    expect(calls).toEqual(['calibration', 'build', 'save']);
    expect(buildForecast).toHaveBeenCalledWith(activeCalibration);
    expect(saveSnapshots).toHaveBeenCalledWith(forecast);
    await expect(response.json()).resolves.toEqual(JSON.parse(JSON.stringify(forecast)));
  });

  test('persistence failures never change the response', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const forecast = makeForecastFixture();
    const expected = JSON.parse(JSON.stringify(forecast));

    for (const saveSnapshots of [
      async () => false,
      async () => {
        throw new Error('database down');
      },
    ]) {
      const handler = createForecastHandler(
        createForecastLoader({
          loadCalibration: async () => activeCalibration,
          buildForecast: async () => forecast,
          saveSnapshots,
        }),
      );
      const response = await handler(new Request('http://localhost/api/forecast'));
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toContain('s-maxage=10800');
      await expect(response.json()).resolves.toEqual(expected);
    }
  });

  test('falls back to an unavailable calibration when loading skill throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const buildForecast = vi.fn(async () => makeForecastFixture());
    const loader = createForecastLoader({
      loadCalibration: async () => {
        throw new Error('timeout');
      },
      buildForecast,
      saveSnapshots: async () => true,
    });

    await loader();
    expect(buildForecast).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unavailable', levels: [] }),
    );
  });

  test('does not save when the forecast cannot be built', async () => {
    const saveSnapshots = vi.fn(async () => true);
    const handler = createForecastHandler(
      createForecastLoader({
        loadCalibration: async () => activeCalibration,
        buildForecast: async () => {
          throw new Error('upstream down');
        },
        saveSnapshots,
      }),
    );
    const response = await handler(new Request('http://localhost/api/forecast'));
    expect(response.status).toBe(503);
    expect(saveSnapshots).not.toHaveBeenCalled();
  });

  test('without database env vars the default steps are silent no-ops', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const forecast = makeForecastFixture();
    const buildForecast = vi.fn(async () => forecast);

    await expect(createForecastLoader({ buildForecast })()).resolves.toBe(forecast);
    expect(buildForecast).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unavailable' }),
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
