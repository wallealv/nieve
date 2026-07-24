import { describe, expect, test } from 'vitest';
import { makeForecastFixture } from '../../test/fixtures.js';
import {
  DEFAULT_ALERT_SETTINGS,
  evaluateAlert,
  type AlertSettings,
} from './alerts.js';

describe('evaluateAlert', () => {
  test('activates when a selected zone exceeds a configured threshold with enough confidence', () => {
    const forecast = makeForecastFixture();
    const settings: AlertSettings = {
      ...DEFAULT_ALERT_SETTINGS,
      threshold72hCm: 100,
      threshold7dCm: 25,
      zone: 'summit',
      minConfidence: 'Media',
    };

    const match = evaluateAlert(forecast, settings);

    expect(match.active).toBe(true);
    expect(match.zone).toBe('summit');
    expect(match.period).toBe('7d');
    expect(match.fingerprint).toContain('summit:7d');
  });

  test('does not activate below the configured thresholds', () => {
    const forecast = makeForecastFixture();
    const match = evaluateAlert(forecast, {
      ...DEFAULT_ALERT_SETTINGS,
      threshold72hCm: 100,
      threshold7dCm: 150,
    });

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

    const match = evaluateAlert(forecast, {
      ...DEFAULT_ALERT_SETTINGS,
      threshold72hCm: 1,
      threshold7dCm: 1,
      minConfidence: 'Alta',
    });

    expect(match.active).toBe(false);
  });
});
