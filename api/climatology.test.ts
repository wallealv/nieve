import { describe, expect, test, vi } from 'vitest';
import { createClimatologyHandler } from './climatology.js';

describe('climatology API', () => {
  test('returns a daily cached modeled baseline', async () => {
    const loader = vi.fn().mockResolvedValue({ levels: [] });
    const response = await createClimatologyHandler(loader)(new Request('https://example.com/api/climatology'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=86400');
  });

  test('rejects non-GET methods', async () => {
    const response = await createClimatologyHandler(async () => ({}))(
      new Request('https://example.com/api/climatology', { method: 'POST' }),
    );
    expect(response.status).toBe(405);
  });

  test('returns a structured 503', async () => {
    const response = await createClimatologyHandler(async () => { throw new Error('history unavailable'); })(
      new Request('https://example.com/api/climatology'),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'CLIMATOLOGY_UNAVAILABLE', message: 'history unavailable' });
  });
});
