import { describe, expect, test, vi } from 'vitest';
import { createRegionalHandler } from './regional.js';

describe('regional API', () => {
  test('returns a three-hour cached comparison', async () => {
    const loader = vi.fn().mockResolvedValue({ resorts: [] });
    const response = await createRegionalHandler(loader)(new Request('https://example.com/api/regional'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=10800');
  });

  test('rejects non-GET methods', async () => {
    const response = await createRegionalHandler(async () => ({}))(
      new Request('https://example.com/api/regional', { method: 'POST' }),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });

  test('returns a structured failure', async () => {
    const response = await createRegionalHandler(async () => {
      throw new Error('regional unavailable');
    })(new Request('https://example.com/api/regional'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'REGIONAL_FORECAST_UNAVAILABLE', message: 'regional unavailable' });
  });
});
