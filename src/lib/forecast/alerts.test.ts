import { describe, expect, test } from 'vitest';
import { makeForecastFixture } from '../../test/fixtures.js';
import type { HourlyResponse } from '../../types/hourly.js';
import type { ModelRunsResponse } from '../../types/modelRuns.js';
import {
  DEFAULT_ALERT_SETTINGS,
  evaluateAlert,
  type AlertSettings,
} from './alerts.js';

function settings(overrides: Partial<AlertSettings> = {}): AlertSettings {
  return { ...DEFAULT_ALERT_SETTINGS, ...overrides };
}

function hourly(overrides: Partial<HourlyResponse['levels'][number]['points'][number]> = {}): HourlyResponse {
  return {
    resort: { name: 'Las Leñas', timezone: 'America/Argentina/Mendoza', updatedAt: '2026-07-24T12:00:00Z', source: 'test' },
    models: [], warnings: [],
    levels: [
      {
        level: { id: 'base', name: 'Base', shortName: 'Base', elevationM: 2240, latitude: -35.14, longitude: -70.08 },
        points: [{
          time: '2026-07-25T03:00', snowfallCm: 0, rainMm: 0, precipitationMm: 0,
          precipitationProbability: 80, temperatureC: 1, apparentTemperatureC: -1,
          relativeHumidityPct: 90, dewPointC: 0, windSpeedKmh: 20, windDirectionDeg: 250,
          windGustKmh: 35, visibilityM: 5000, cloudCoverPct: 100, shortwaveRadiationWm2: 0,
          freezingLevelM: 2500, snowDepthCm: 20, isDay: false, weatherCode: 75, ...overrides,
        }],
      },
    ],
  };
}

const modelRuns: ModelRunsResponse = {
  resort: 'Las Leñas', generatedAt: '2026-07-24T12:00:00Z', warnings: [],
  reports: [{
    model: 'ecmwf', name: 'ECMWF', shortName: 'ECMWF', status: 'ok', message: null, runs: [],
    trends: {
      base: { direction: 'up', current: 70, previous: 35, delta: 35 },
      mid: { direction: 'stable', current: 40, previous: 40, delta: 0 },
      summit: { direction: 'up', current: 100, previous: 60, delta: 40 },
    },
  }],
  convergence: { currentSpreadCm: 10, previousSpreadCm: 20, direction: 'converging' },
};

describe('evaluateAlert', () => {
  test('activates when a selected zone exceeds a configured threshold with enough confidence', () => {
    const forecast = makeForecastFixture();
    const match = evaluateAlert(forecast, settings({
      threshold72hCm: 100,
      threshold7dCm: 25,
      zone: 'summit',
      minConfidence: 'Media',
    }));

    expect(match.active).toBe(true);
    expect(match.kind).toBe('snow');
    expect(match.zone).toBe('summit');
    expect(match.period).toBe('7d');
    expect(match.fingerprint).toContain('summit:7d');
  });

  test('does not activate below the configured thresholds', () => {
    const match = evaluateAlert(makeForecastFixture(), settings({ threshold72hCm: 100, threshold7dCm: 150 }));
    expect(match.active).toBe(false);
    expect(match.fingerprint).toBeNull();
  });

  test('respects the minimum confidence', () => {
    const forecast = structuredClone(makeForecastFixture());
    forecast.levels.forEach((level) => {
      level.daily.slice(0, 7).forEach((day) => {
        day.confidenceScore = 30;
        day.confidenceLabel = 'Baja';
      });
    });
    expect(evaluateAlert(forecast, settings({ threshold72hCm: 1, threshold7dCm: 1, minConfidence: 'Alta' })).active).toBe(false);
  });

  test('alerts on a new RP 222 change when enabled', () => {
    const match = evaluateAlert(makeForecastFixture(), settings({ notifyRoadChanges: true }), {
      roadChange: { fingerprint: 'open:closed', message: 'La RP 222 pasó a cerrada.' },
    });
    expect(match.kind).toBe('road-change');
    expect(match.message).toMatch(/RP 222/i);
  });

  test('alerts on rain or mixture at Base', () => {
    const match = evaluateAlert(makeForecastFixture(), settings({ notifyBaseRain: true }), {
      hourly: hourly({ rainMm: 3, precipitationMm: 3, snowfallCm: 0 }),
    });
    expect(match.kind).toBe('base-rain');
    expect(match.zone).toBe('base');
  });

  test('alerts when gust threshold is exceeded', () => {
    const match = evaluateAlert(makeForecastFixture(), settings({ maxGustKmh: 80, notifyBaseRain: false }), {
      hourly: hourly({ windGustKmh: 95 }),
    });
    expect(match.kind).toBe('gust');
    expect(match.detail).toMatch(/95 km\/h/);
  });

  test('alerts on a large model-run change', () => {
    const match = evaluateAlert(makeForecastFixture(), settings({ modelDeltaCm: 30 }), { modelRuns });
    expect(match.kind).toBe('model-change');
    expect(match.detail).toMatch(/40 cm/);
  });

  test('alerts on an off-piste status change', () => {
    const match = evaluateAlert(makeForecastFixture(), settings({ notifyOffPisteChanges: true }), {
      offPisteChange: { fingerprint: 'Cerrado:Abierto', message: 'Fuera de pista pasó de Cerrado a Abierto.' },
    });
    expect(match.kind).toBe('off-piste-change');
  });
});
