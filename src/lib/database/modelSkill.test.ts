import { afterEach, describe, expect, test, vi } from 'vitest';
import type { LevelId, ModelId } from '../../types/forecast.js';
import type { NieveDatabase } from './client.js';
import {
  computeModelWeights,
  loadForecastCalibration,
  loadModelSkill,
  type ModelSkillRow,
} from './modelSkill.js';

function rpcClient(rpc: NieveDatabase['rpc']): NieveDatabase {
  return { from: vi.fn(), rpc };
}

function skill(level: LevelId, samples: Record<ModelId, number>, mae: Record<ModelId, number>) {
  return (['ecmwf', 'gfs', 'icon'] as const).map(
    (model): ModelSkillRow => ({
      model,
      level,
      samples: samples[model],
      maeCm: mae[model],
      biasCm: 0.5,
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadModelSkill', () => {
  test('calls model_skill and coerces numeric strings', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { model: 'ecmwf', level: 'mid', samples: 12, mae_cm: '2.50', bias_cm: '-0.75' },
        { model: 'gfs', level: 'mid', samples: '11', mae_cm: 3, bias_cm: null },
        { model: 'other', level: 'mid', samples: 50, mae_cm: 1, bias_cm: 0 },
      ],
      error: null,
    }));

    await expect(loadModelSkill(rpcClient(rpc), '2026-07-25')).resolves.toEqual([
      { model: 'ecmwf', level: 'mid', samples: 12, maeCm: 2.5, biasCm: -0.75 },
      { model: 'gfs', level: 'mid', samples: 11, maeCm: 3, biasCm: null },
    ]);
    expect(rpc).toHaveBeenCalledWith('model_skill', { p_since: '2026-07-25' });
  });

  test('returns null and logs on errors or unexpected payloads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      loadModelSkill(
        rpcClient(async () => ({ data: null, error: { message: 'function not found' } })),
        '2026-07-25',
      ),
    ).resolves.toBeNull();
    await expect(
      loadModelSkill(rpcClient(async () => ({ data: { rows: [] }, error: null })), '2026-07-25'),
    ).resolves.toBeNull();
    await expect(
      loadModelSkill(
        rpcClient(async () => {
          throw new Error('network down');
        }),
        '2026-07-25',
      ),
    ).resolves.toBeNull();
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe('computeModelWeights', () => {
  test('activates a level only when every model has enough samples', () => {
    const calibration = computeModelWeights([
      ...skill('mid', { ecmwf: 10, gfs: 14, icon: 12 }, { ecmwf: 1, gfs: 3, icon: 1 }),
      ...skill('base', { ecmwf: 20, gfs: 9, icon: 20 }, { ecmwf: 1, gfs: 1, icon: 1 }),
    ]);

    expect(calibration.status).toBe('active');
    expect(calibration.windowDays).toBe(60);
    expect(calibration.minSamples).toBe(10);
    expect(calibration.levels.map((level) => [level.level, level.active])).toEqual([
      ['base', false],
      ['mid', true],
      ['summit', false],
    ]);

    const mid = calibration.levels.find((level) => level.level === 'mid')!;
    // 1 / (MAE + 1) = 0.5, 0.25, 0.5 → normalized 0.4, 0.2, 0.4
    expect(mid.models.map((model) => model.weight)).toEqual([0.4, 0.2, 0.4]);
    expect(mid.models[1]).toEqual({ model: 'gfs', samples: 14, maeCm: 3, biasCm: 0.5, weight: 0.2 });

    const base = calibration.levels.find((level) => level.level === 'base')!;
    expect(base.models.every((model) => model.weight === null)).toBe(true);
    const summit = calibration.levels.find((level) => level.level === 'summit')!;
    expect(summit.models[0]).toEqual({ model: 'ecmwf', samples: 0, maeCm: null, biasCm: null, weight: null });
  });

  test('weights sum to one and favor the smaller error', () => {
    const calibration = computeModelWeights(
      skill('summit', { ecmwf: 30, gfs: 30, icon: 30 }, { ecmwf: 2.2, gfs: 5.9, icon: 3.4 }),
    );
    const weights = calibration.levels.find((level) => level.level === 'summit')!.models.map(
      (model) => model.weight!,
    );
    expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 10);
    expect(weights[0]).toBeGreaterThan(weights[2]!);
    expect(weights[2]).toBeGreaterThan(weights[1]!);
  });

  test('reports insufficient data while no level is active', () => {
    expect(computeModelWeights([]).status).toBe('insufficient-data');
    expect(
      computeModelWeights(
        skill('mid', { ecmwf: 12, gfs: 12, icon: 12 }, { ecmwf: 1, gfs: 1, icon: 1 }),
        { minSamples: 20 },
      ).status,
    ).toBe('insufficient-data');
  });
});

describe('loadForecastCalibration', () => {
  test('is unavailable without a database', async () => {
    await expect(loadForecastCalibration(null)).resolves.toEqual({
      status: 'unavailable',
      windowDays: 60,
      minSamples: 10,
      levels: [],
    });
  });

  test('loads the last 60 resort-local days of skill', async () => {
    const rpc = vi.fn(async () => ({
      data: skill('mid', { ecmwf: 10, gfs: 10, icon: 10 }, { ecmwf: 1, gfs: 1, icon: 1 }).map(
        (row) => ({
          model: row.model,
          level: row.level,
          samples: row.samples,
          mae_cm: String(row.maeCm),
          bias_cm: String(row.biasCm),
        }),
      ),
      error: null,
    }));

    const calibration = await loadForecastCalibration(
      rpcClient(rpc),
      new Date('2026-09-24T02:00:00Z'),
    );
    // 23:00 on 2026-09-23 in Mendoza, minus 60 days.
    expect(rpc).toHaveBeenCalledWith('model_skill', { p_since: '2026-07-25' });
    expect(calibration.status).toBe('active');
  });

  test('is unavailable when the skill cannot be loaded', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const calibration = await loadForecastCalibration(
      rpcClient(async () => ({ data: null, error: { message: 'permission denied' } })),
    );
    expect(calibration.status).toBe('unavailable');
  });
});
