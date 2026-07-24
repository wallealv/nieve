import { describe, expect, test, vi } from 'vitest';
import { createRoadHandler } from './road.js';

describe('road API', () => {
  test('returns cached official status', async () => {
    const loader = vi.fn().mockResolvedValue({ route: 'RP 222', status: 'open' });
    const response = await createRoadHandler(loader)(new Request('https://example.com/api/road'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=1800');
  });

  test('rejects non-GET methods', async () => {
    const response = await createRoadHandler(async () => ({}))(
      new Request('https://example.com/api/road', { method: 'DELETE' }),
    );
    expect(response.status).toBe(405);
  });

  test('returns a structured 503', async () => {
    const response = await createRoadHandler(async () => {
      throw new Error('road source unavailable');
    })(new Request('https://example.com/api/road'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ROAD_STATUS_UNAVAILABLE', message: 'road source unavailable' });
  });
});
