import { expect, test } from 'vitest';
import { FORECAST_MODELS, MOUNTAIN_LEVELS } from '../../config/mountain.js';
import { buildOpenMeteoUrl } from './openMeteo.js';

test('requests 15 ECMWF days without an unsupported freezing-level field', () => {
  const model = FORECAST_MODELS.find((candidate) => candidate.id === 'ecmwf')!;
  const url = buildOpenMeteoUrl(model, MOUNTAIN_LEVELS[0]);

  expect(url.pathname).toBe('/v1/ecmwf');
  expect(url.searchParams.get('forecast_hours')).toBe('360');
  expect(url.searchParams.get('hourly')).toContain('snowfall');
  expect(url.searchParams.get('hourly')).not.toContain('freezing_level_height');
});

test('requests freezing level from GFS', () => {
  const model = FORECAST_MODELS.find((candidate) => candidate.id === 'gfs')!;
  const url = buildOpenMeteoUrl(model, MOUNTAIN_LEVELS[2]);

  expect(url.pathname).toBe('/v1/gfs');
  expect(url.searchParams.get('forecast_hours')).toBe('384');
  expect(url.searchParams.get('hourly')).toContain('freezing_level_height');
  expect(url.searchParams.get('elevation')).toBe('3430');
});
