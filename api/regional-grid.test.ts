import { describe, expect, test, vi } from 'vitest';
import { createRegionalGridHandler } from './regional-grid.js';

describe('regional grid API', () => {
  test('returns a cached fixed grid', async () => {
    const loader = vi.fn().mockResolvedValue({ points: [] });
    const response = await createRegionalGridHandler(loader)(new Request('https://example.com/api/regional-grid'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=10800');
  });

  test('does not accept arbitrary coordinates or methods', async () => {
    const handler = createRegionalGridHandler(async () => ({}));
    const response = await handler(
      new Request('https://example.com/api/regional-grid?latitude=0&longitude=0', { method: 'POST' }),
    );
    expect(response.status).toBe(405);
  });

  test('returns a structured 503', async () => {
    const response = await createRegionalGridHandler(async () => {
      throw new Error('grid unavailable');
    })(new Request('https://example.com/api/regional-grid'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'REGIONAL_GRID_UNAVAILABLE', message: 'grid unavailable' });
  });
});
