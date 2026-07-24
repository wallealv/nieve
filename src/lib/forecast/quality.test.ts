import { describe, expect, test } from 'vitest';
import type { HourlyPoint } from '../../types/hourly.js';
import type { SnowPhaseResult } from './phase.js';
import { estimateSnowQuality } from './quality.js';

function point(overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time: '2026-07-25T03:00', snowfallCm: 3, rainMm: 0, precipitationMm: 3,
    precipitationProbability: 90, temperatureC: -6, apparentTemperatureC: -10,
    relativeHumidityPct: 85, dewPointC: -7, windSpeedKmh: 15, windDirectionDeg: 240,
    windGustKmh: 25, visibilityM: 5000, cloudCoverPct: 100, shortwaveRadiationWm2: 0,
    freezingLevelM: 1500, snowDepthCm: 40, isDay: false, weatherCode: 75, ...overrides,
  };
}

function phase(value: SnowPhaseResult['phase']): SnowPhaseResult {
  return { phase: value, confidence: 85, reasons: [] };
}

describe('estimateSnowQuality', () => {
  test('identifies dry powder in cold calm snow', () => {
    const result = estimateSnowQuality(point(), phase('dry-snow'));
    expect(result.label).toBe('dry-powder');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('identifies wind-affected snow with strong gusts', () => {
    expect(estimateSnowQuality(point({ windGustKmh: 85 }), phase('dry-snow')).label).toBe('wind-affected');
  });

  test('identifies wet snow close to zero', () => {
    expect(estimateSnowQuality(point({ temperatureC: -0.2 }), phase('wet-snow')).label).toBe('wet-snow');
  });

  test('flags crust or ice after rain and refreeze', () => {
    expect(
      estimateSnowQuality(point({ rainMm: 3, temperatureC: -2, shortwaveRadiationWm2: 0 }), phase('mixed')).label,
    ).toBe('crust-ice-risk');
  });

  test('returns uncertain when phase is uncertain', () => {
    expect(estimateSnowQuality(point(), phase('uncertain')).label).toBe('uncertain');
  });
});
