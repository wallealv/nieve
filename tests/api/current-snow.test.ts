import { afterEach, describe, expect, test, vi } from 'vitest';
import { createCurrentSnowHandler, createCurrentSnowLoader } from '../../api/current-snow.js';
import type { CurrentSnowResponse } from '../../src/types/currentSnow.js';

describe('current snow API handler', () => {
  test('returns cached JSON for GET', async () => {
    const loader = vi.fn().mockResolvedValue({ resort: 'Las Leñas' });
    const handler = createCurrentSnowHandler(loader);
    const response = await handler(new Request('https://example.com/api/current-snow'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(await response.json()).toEqual({ resort: 'Las Leñas' });
  });

  test('rejects non-GET methods', async () => {
    const handler = createCurrentSnowHandler(async () => ({}));
    const response = await handler(new Request('https://example.com/api/current-snow', { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });

  test('returns a structured 503 when every source fails', async () => {
    const handler = createCurrentSnowHandler(async () => { throw new Error('all sources unavailable'); });
    const response = await handler(new Request('https://example.com/api/current-snow'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'CURRENT_SNOW_UNAVAILABLE', message: 'all sources unavailable' });
  });
});

describe('default current snow loader', () => {
  const currentSnow = {
    resort: 'Las Leñas',
    generatedAt: '2026-07-24T12:00:00Z',
    zones: [],
    operations: {
      liftsOpen: null, liftsConditional: null, liftsTotal: null, slopesOpen: null,
      slopesTotal: null, slopesOpenKm: null, slopesTotalKm: null, avalancheRisk: null,
      offPisteStatus: null, officialNote: null, fetchedAt: null,
    },
    sourceStatuses: [],
    warnings: [],
  } satisfies CurrentSnowResponse;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test('builds, saves the observations and returns the response', async () => {
    const calls: string[] = [];
    const buildCurrentSnow = vi.fn(async () => {
      calls.push('build');
      return currentSnow;
    });
    const saveObservations = vi.fn(async () => {
      calls.push('save');
      return true;
    });

    const handler = createCurrentSnowHandler(
      createCurrentSnowLoader({ buildCurrentSnow, saveObservations }),
    );
    const response = await handler(new Request('https://example.com/api/current-snow'));

    expect(response.status).toBe(200);
    expect(calls).toEqual(['build', 'save']);
    expect(saveObservations).toHaveBeenCalledWith(currentSnow);
    expect(await response.json()).toEqual(currentSnow);
  });

  test('persistence failures never change the response', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const saveObservations of [
      async () => false,
      async () => {
        throw new Error('database down');
      },
    ]) {
      const handler = createCurrentSnowHandler(
        createCurrentSnowLoader({ buildCurrentSnow: async () => currentSnow, saveObservations }),
      );
      const response = await handler(new Request('https://example.com/api/current-snow'));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(currentSnow);
    }
  });

  test('does not save when every source fails', async () => {
    const saveObservations = vi.fn(async () => true);
    const handler = createCurrentSnowHandler(
      createCurrentSnowLoader({
        buildCurrentSnow: async () => {
          throw new Error('all sources unavailable');
        },
        saveObservations,
      }),
    );
    const response = await handler(new Request('https://example.com/api/current-snow'));
    expect(response.status).toBe(503);
    expect(saveObservations).not.toHaveBeenCalled();
  });

  test('without database env vars saving is a silent no-op', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      createCurrentSnowLoader({ buildCurrentSnow: async () => currentSnow })(),
    ).resolves.toBe(currentSnow);
    expect(warn).not.toHaveBeenCalled();
  });
});
