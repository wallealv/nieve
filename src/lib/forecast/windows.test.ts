import { describe, expect, test } from 'vitest';
import type { HourlyLevelForecast, HourlyPoint } from '../../types/hourly.js';
import { buildThreeHourWindows, findBestWindows } from './windows.js';

function point(hour: number, overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time: `2026-07-25T${String(hour).padStart(2, '0')}:00`,
    snowfallCm: 2,
    rainMm: 0,
    precipitationMm: 2,
    precipitationProbability: 90,
    temperatureC: -5,
    apparentTemperatureC: -9,
    relativeHumidityPct: 85,
    dewPointC: -6,
    windSpeedKmh: 15,
    windDirectionDeg: 250,
    windGustKmh: 30,
    visibilityM: 8000,
    cloudCoverPct: 90,
    shortwaveRadiationWm2: 0,
    freezingLevelM: 1700,
    snowDepthCm: 30,
    isDay: false,
    weatherCode: 75,
    ...overrides,
  };
}

function level(id: 'base' | 'mid' | 'summit', points: HourlyPoint[]): HourlyLevelForecast {
  const elevationM = id === 'base' ? 2240 : id === 'mid' ? 2800 : 3430;
  return {
    level: {
      id,
      name: id === 'base' ? 'Base' : id === 'mid' ? 'Montaña media' : 'Alta montaña',
      shortName: id === 'base' ? 'Base' : id === 'mid' ? 'Media' : 'Alta',
      elevationM,
      latitude: -35.14,
      longitude: -70.09,
    },
    points,
  };
}

describe('three-hour windows', () => {
  test('sums snowfall and preserves worst wind and visibility', () => {
    const windows = buildThreeHourWindows(
      level('summit', [
        point(0, { snowfallCm: 2, visibilityM: 5000, windGustKmh: 30 }),
        point(1, { snowfallCm: 3, visibilityM: 1200, windGustKmh: 55 }),
        point(2, { snowfallCm: 4, visibilityM: 3000, windGustKmh: 40 }),
      ]),
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({ snowfallCm: 9, visibilityMinM: 1200, gustMaxKmh: 55 });
  });

  test('keeps nighttime snowfall separate from daytime snowfall', () => {
    const windows = buildThreeHourWindows(
      level('mid', [point(6, { isDay: false }), point(7, { isDay: true }), point(8, { isDay: true })]),
    );
    expect(windows[0]?.snowfallCm).toBe(6);
    expect(windows[0]?.nightSnowfallCm).toBe(2);
  });

  test('selects the best activity windows and earliest deterministic tie', () => {
    const levels = [
      level('base', [point(0), point(1), point(2), point(3), point(4), point(5)]),
      level('mid', [point(0), point(1), point(2), point(3), point(4), point(5)]),
      level('summit', [point(0), point(1), point(2), point(3), point(4), point(5)]),
    ];

    const result = findBestWindows(levels, {
      observedDepthByLevel: { base: 20, mid: null, summit: 35 },
      offPisteStatus: 'Abierto',
      avalancheRisk: 2,
      liftsOpenRatio: 0.8,
    });

    expect(result.powder?.startTime).toBe('2026-07-25T00:00');
    expect(result.piste).not.toBeNull();
    expect(result.bestDay?.date).toBe('2026-07-25');
  });
});
