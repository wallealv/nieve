import { describe, expect, test, vi } from 'vitest';
import { makeForecastFixture } from '../../test/fixtures.js';
import type { NieveDatabase } from './client.js';
import { rowsFromForecast, saveForecastSnapshots } from './forecastSnapshots.js';

describe('rowsFromForecast', () => {
  test('emits one row per model, level and day with a model value', () => {
    const rows = rowsFromForecast(makeForecastFixture());

    // 3 levels × 15 days × 3 models, minus ICON after day 7 (7 days × 3 levels).
    expect(rows).toHaveLength(3 * 15 * 3 - 7 * 3);
    expect(rows.some((row) => row.model === 'icon' && row.target_date === '2026-08-10')).toBe(false);
    expect(rows).toContainEqual({
      model: 'gfs',
      level: 'mid',
      target_date: '2026-08-02',
      issued_date: '2026-07-23',
      snowfall_cm: 16,
      snow_source: 'estimated',
      fetched_at: '2026-07-23T21:00:00-03:00',
    });
  });

  test('uses the resort-local date of the update as issue date', () => {
    const forecast = makeForecastFixture();
    forecast.resort.updatedAt = '2026-07-24T01:30:00Z';
    expect(new Set(rowsFromForecast(forecast).map((row) => row.issued_date))).toEqual(
      new Set(['2026-07-23']),
    );
  });

  test('skips negative or non-finite values and invalid update times', () => {
    const forecast = makeForecastFixture();
    forecast.levels[0]!.daily[0]!.models[0]!.snowfallCm = -1;
    forecast.levels[0]!.daily[0]!.models[1]!.snowfallCm = Number.NaN;
    expect(rowsFromForecast(forecast)).toHaveLength(3 * 15 * 3 - 7 * 3 - 2);

    forecast.resort.updatedAt = 'not a date';
    expect(rowsFromForecast(forecast)).toEqual([]);
  });
});

describe('saveForecastSnapshots', () => {
  test('is a no-op without a database', async () => {
    await expect(saveForecastSnapshots(null, makeForecastFixture())).resolves.toBe(false);
  });

  test('upserts into forecast_snapshots on the primary key', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ upsert }));
    const client: NieveDatabase = { from, rpc: vi.fn() };

    await expect(saveForecastSnapshots(client, makeForecastFixture())).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('forecast_snapshots');
    expect(upsert).toHaveBeenCalledWith(expect.any(Array), {
      onConflict: 'model,level,target_date,issued_date',
    });
  });
});
