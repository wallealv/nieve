import { describe, expect, test, vi } from 'vitest';
import { createCurrentSnowHandler } from '../../api/current-snow.js';

describe('current snow API handler', () => {
  test('returns cached JSON for GET', async () => {
    const loader = vi.fn().mockResolvedValue({ resort: 'Las Leñas' });
    const handler = createCurrentSnowHandler(loader);
    const response = await handler(new Request('https://example.com/api/current-snow'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(await response.json()).toEqual({ resort: 'Las Leñas' });
  });

  test('rejects non-GET methods', async () => {
    const handler = createCurrentSnowHandler(async () => ({}));
    const response = await handler(new Request('https://example.com/api/current-snow', { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });

  test('returns a structured 503 when every source fails', async () => {
    const handler = createCurrentSnowHandler(async () => { throw new Error('all sources unavailable'); });
    const response = await handler(new Request('https://example.com/api/current-snow'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'CURRENT_SNOW_UNAVAILABLE', message: 'all sources unavailable' });
  });
});
