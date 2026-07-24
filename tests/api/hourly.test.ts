import { describe, expect, test, vi } from 'vitest';
import { createHourlyHandler } from '../../api/hourly.js';

describe('hourly API handler', () => {
  test('returns cached JSON for GET', async () => {
    const loader = vi.fn().mockResolvedValue({ resort: { name: 'Las Leñas' } });
    const handler = createHourlyHandler(loader);
    const response = await handler(new Request('https://example.com/api/hourly'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(await response.json()).toEqual({ resort: { name: 'Las Leñas' } });
  });

  test('rejects non-GET methods', async () => {
    const handler = createHourlyHandler(async () => ({}));
    const response = await handler(new Request('https://example.com/api/hourly', { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });

  test('returns a structured 503 when every model fails', async () => {
    const handler = createHourlyHandler(async () => { throw new Error('all hourly models unavailable'); });
    const response = await handler(new Request('https://example.com/api/hourly'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'HOURLY_FORECAST_UNAVAILABLE', message: 'all hourly models unavailable' });
  });
});
