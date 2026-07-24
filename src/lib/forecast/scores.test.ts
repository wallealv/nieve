import { describe, expect, test } from 'vitest';
import type { ForecastWindow } from '../../types/hourly.js';
import { scoreWindow } from './scores.js';

function window(overrides: Partial<ForecastWindow> = {}): ForecastWindow {
  return {
    startTime: '2026-07-25T06:00',
    endTime: '2026-07-25T09:00',
    snowfallCm: 12,
    rainMm: 0,
    nightSnowfallCm: 12,
    temperatureMinC: -8,
    temperatureMaxC: -4,
    windMaxKmh: 20,
    gustMaxKmh: 35,
    visibilityMinM: 7000,
    shortwaveRadiationMaxWm2: 50,
    phase: 'dry-snow',
    quality: 'dry-powder',
    confidenceScore: 80,
    ...overrides,
  };
}

describe('scoreWindow', () => {
  test('keeps every numeric score between zero and one hundred', () => {
    const result = scoreWindow(window(), {
      observedDepthCm: 40,
      offPisteStatus: 'Abierto',
      avalancheRisk: 2,
      liftsOpenRatio: 0.8,
    });

    expect(result.powder.score).toBeGreaterThanOrEqual(0);
    expect(result.powder.score).toBeLessThanOrEqual(100);
    expect(result.piste.score).toBeGreaterThanOrEqual(0);
    expect(result.piste.score).toBeLessThanOrEqual(100);
    expect(result.freeride.score).toBeGreaterThanOrEqual(0);
    expect(result.freeride.score).toBeLessThanOrEqual(100);
    expect(result.powder.positive.length).toBeGreaterThan(0);
  });

  test('penalizes rain and poor visibility for piste', () => {
    const good = scoreWindow(window(), { observedDepthCm: 40, offPisteStatus: 'Abierto', avalancheRisk: 2, liftsOpenRatio: 1 });
    const bad = scoreWindow(window({ rainMm: 6, phase: 'mixed', visibilityMinM: 400 }), {
      observedDepthCm: 40,
      offPisteStatus: 'Abierto',
      avalancheRisk: 2,
      liftsOpenRatio: 1,
    });
    expect(bad.piste.score).toBeLessThan(good.piste.score);
    expect(bad.piste.negative.length).toBeGreaterThan(0);
  });

  test('blocks freeride when official off-piste status is closed', () => {
    const result = scoreWindow(window({ snowfallCm: 40 }), {
      observedDepthCm: 100,
      offPisteStatus: 'Cerrado',
      avalancheRisk: 2,
      liftsOpenRatio: 1,
    });

    expect(result.freeride).toEqual({
      status: 'blocked',
      score: null,
      positive: [],
      negative: ['Fuera de pista cerrado oficialmente.'],
    });
  });

  test('does not soften high avalanche risk with good snow', () => {
    const result = scoreWindow(window({ snowfallCm: 40 }), {
      observedDepthCm: 100,
      offPisteStatus: 'Abierto',
      avalancheRisk: 5,
      liftsOpenRatio: 1,
    });
    expect(result.freeride.score).toBeLessThanOrEqual(20);
    expect(result.freeride.negative.join(' ')).toMatch(/avalancha/i);
  });
});
