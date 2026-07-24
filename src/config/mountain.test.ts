import { expect, test } from 'vitest';
import { FORECAST_MODELS, MOUNTAIN_LEVELS } from './mountain.js';

test('defines three ordered Las Leñas levels', () => {
  expect(MOUNTAIN_LEVELS.map((level) => level.elevationM)).toEqual([
    2240,
    2800,
    3430,
  ]);
});

test('keeps the model horizons explicit', () => {
  expect(
    Object.fromEntries(
      FORECAST_MODELS.map((model) => [model.id, model.expectedThroughDay]),
    ),
  ).toEqual({ ecmwf: 14, gfs: 14, icon: 7 });
});
