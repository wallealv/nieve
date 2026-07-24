import { describe, expect, test } from 'vitest';
import { bandForDay, calculateConfidence } from './confidence.js';

describe('forecast confidence', () => {
  test.each([
    [0, 'operational'],
    [7, 'operational'],
    [8, 'extended'],
    [10, 'extended'],
    [11, 'guidance'],
    [14, 'guidance'],
  ] as const)('classifies day %i as %s', (day, band) => {
    expect(bandForDay(day)).toBe(band);
  });

  test('penalizes dispersion, horizon and missing models', () => {
    const strong = calculateConfidence({
      values: [20, 21, 22],
      dayIndex: 1,
      expectedModels: 3,
    });
    const weak = calculateConfidence({
      values: [5, 20],
      dayIndex: 12,
      expectedModels: 3,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.label).toBe('Alta');
  });
});
