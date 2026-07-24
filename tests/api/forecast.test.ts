import { expect, test } from 'vitest';
import { createForecastHandler } from '../../api/forecast.js';

test('returns cached JSON for GET', async () => {
  const handler = createForecastHandler(async () => ({ ok: true }));
  const response = await handler(new Request('http://localhost/api/forecast'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=10800, stale-while-revalidate=1800');
  await expect(response.json()).resolves.toEqual({ ok: true });
});

test('rejects non-GET methods', async () => {
  const handler = createForecastHandler(async () => ({ ok: true }));
  const response = await handler(new Request('http://localhost/api/forecast', { method: 'POST' }));
  expect(response.status).toBe(405);
});

test('returns structured 503 when all sources fail', async () => {
  const handler = createForecastHandler(async () => { throw new Error('upstream down'); });
  const response = await handler(new Request('http://localhost/api/forecast'));
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: 'FORECAST_UNAVAILABLE', message: 'upstream down' });
});
