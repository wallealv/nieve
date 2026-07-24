import { expect, test } from 'vitest';
import { MOUNTAIN_LEVELS } from '../../config/mountain.js';
import { normalizeModelLevel } from './normalize.js';

const payload = {
  timezone: 'America/Argentina/Mendoza',
  hourly: {
    time: ['2026-07-23T00:00', '2026-07-23T01:00', '2026-07-24T00:00'],
    snowfall: [1.2, 0.8, null],
    temperature_2m: [-4, -3, 1],
    wind_speed_10m: [18, 22, 10],
    wind_gusts_10m: [30, 36, 14],
    freezing_level_height: [1800, 1900, 2500],
    weather_code: [73, 75, 3],
  },
};

test('normalizes hourly model data into daily values', () => {
  const result = normalizeModelLevel(
    'gfs',
    MOUNTAIN_LEVELS[0],
    payload,
    '2026-07-23T02:00:00Z',
  );
  expect(result.daily[0]).toMatchObject({
    date: '2026-07-23',
    snowfallCm: 2,
    temperatureMinC: -4,
    temperatureMaxC: -3,
    windMaxKmh: 22,
    gustMaxKmh: 36,
    freezingLevelM: 1850,
    weatherCode: 75,
    source: 'direct',
  });
  expect(result.daily[1].snowfallCm).toBeNull();
});
