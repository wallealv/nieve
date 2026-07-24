import { describe, expect, test, vi } from 'vitest';
import { FORECAST_MODELS, MOUNTAIN_LEVELS } from '../../config/mountain.js';
import { analyzeModelRuns, buildSingleRunUrl, fetchRecentModelRuns, recentRunCycles } from './runs.js';

function payload(value: number) {
  return MOUNTAIN_LEVELS.map((level) => ({
    timezone: 'America/Argentina/Mendoza',
    elevation: level.elevationM,
    hourly: {
      time: ['2026-07-25T00:00', '2026-07-26T00:00', '2026-07-27T00:00'],
      snowfall: [value, value, value],
    },
  }));
}

describe('single model runs', () => {
  test('selects the latest three fully distributed six-hour cycles', () => {
    expect(recentRunCycles(new Date('2026-07-24T14:30:00Z'))).toEqual([
      '2026-07-24T06:00',
      '2026-07-24T00:00',
      '2026-07-23T18:00',
    ]);
  });

  test('builds a fixed Single Runs API request for all mountain levels', () => {
    const model = FORECAST_MODELS.find((item) => item.id === 'ecmwf')!;
    const url = buildSingleRunUrl(model, MOUNTAIN_LEVELS, '2026-07-24T06:00');
    expect(url.origin).toBe('https://single-runs-api.open-meteo.com');
    expect(url.searchParams.get('run')).toBe('2026-07-24T06:00');
    expect(url.searchParams.get('models')).toBe('ecmwf_ifs025');
    expect(url.searchParams.get('latitude')?.split(',')).toHaveLength(3);
  });

  test('keeps available runs when one archive is missing', async () => {
    const model = FORECAST_MODELS.find((item) => item.id === 'gfs')!;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload(3)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: true, reason: 'not found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload(1)), { status: 200 }));

    const result = await fetchRecentModelRuns(
      model,
      MOUNTAIN_LEVELS,
      ['2026-07-24T06:00', '2026-07-24T00:00', '2026-07-23T18:00'],
      fetchMock as typeof fetch,
      new Date('2026-07-24T12:00:00Z'),
    );

    expect(result.runs).toHaveLength(2);
    expect(result.missingRuns).toEqual(['2026-07-24T00:00']);
    expect(result.runs[0]?.levels.summit.days7Cm).toBe(9);
  });

  test('labels rising, falling and stable totals', () => {
    expect(analyzeModelRuns([10, 20, 30]).direction).toBe('up');
    expect(analyzeModelRuns([30, 20, 10]).direction).toBe('down');
    expect(analyzeModelRuns([20, 20.2, 20.4]).direction).toBe('stable');
    expect(analyzeModelRuns([null, 20]).direction).toBe('insufficient');
  });
});
