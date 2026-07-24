import { describe, expect, test, vi } from 'vitest';
import { createModelRunsHandler } from '../../api/model-runs.js';

describe('model runs API', () => {
  test('returns cached JSON', async () => {
    const loader = vi.fn().mockResolvedValue({ reports: [] });
    const response = await createModelRunsHandler(loader)(new Request('https://example.com/api/model-runs'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=10800');
  });

  test('rejects non-GET methods', async () => {
    const response = await createModelRunsHandler(async () => ({}))(new Request('https://example.com/api/model-runs', { method: 'POST' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });

  test('returns a structured 503', async () => {
    const response = await createModelRunsHandler(async () => { throw new Error('archives unavailable'); })(new Request('https://example.com/api/model-runs'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'MODEL_RUNS_UNAVAILABLE', message: 'archives unavailable' });
  });
});
