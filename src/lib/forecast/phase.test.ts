import { describe, expect, test } from 'vitest';
import type { HourlyPoint } from '../../types/hourly.js';
import { classifyPhase } from './phase.js';

function point(overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time: '2026-07-25T03:00',
    snowfallCm: 0,
    rainMm: 0,
    precipitationMm: 0,
    precipitationProbability: 0,
    temperatureC: -2,
    apparentTemperatureC: -5,
    relativeHumidityPct: 85,
    dewPointC: -4,
    windSpeedKmh: 10,
    windDirectionDeg: 250,
    windGustKmh: 20,
    visibilityM: 10000,
    cloudCoverPct: 80,
    shortwaveRadiationWm2: 0,
    freezingLevelM: 1800,
    snowDepthCm: 20,
    isDay: false,
    weatherCode: 71,
    ...overrides,
  };
}

describe('classifyPhase', () => {
  test('returns none without measurable precipitation', () => {
    expect(classifyPhase(point(), 2240).phase).toBe('none');
  });

  test('classifies rain when only rain is present above freezing', () => {
    expect(
      classifyPhase(point({ rainMm: 4, precipitationMm: 4, temperatureC: 2.5, snowfallCm: 0 }), 2240)
        .phase,
    ).toBe('rain');
  });

  test('classifies dry snow when snow falls well below freezing', () => {
    expect(
      classifyPhase(point({ snowfallCm: 3, precipitationMm: 3, temperatureC: -6, freezingLevelM: 1500 }), 3430)
        .phase,
    ).toBe('dry-snow');
  });

  test('classifies wet snow close to zero', () => {
    expect(
      classifyPhase(point({ snowfallCm: 2, precipitationMm: 2, temperatureC: -0.3, freezingLevelM: 3300 }), 3430)
        .phase,
    ).toBe('wet-snow');
  });

  test('classifies mixed precipitation when rain and snow coexist', () => {
    expect(
      classifyPhase(point({ snowfallCm: 1, rainMm: 1.2, precipitationMm: 2.2, temperatureC: 0.4 }), 2240)
        .phase,
    ).toBe('mixed');
  });

  test('returns uncertain for conflicting marginal inputs', () => {
    expect(
      classifyPhase(point({ snowfallCm: 1, rainMm: 0, precipitationMm: 1, temperatureC: 2.2, freezingLevelM: null }), 2240)
        .phase,
    ).toBe('uncertain');
  });
});
