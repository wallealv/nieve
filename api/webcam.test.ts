import { describe, expect, test, vi } from 'vitest';
import { createWebcamHandler } from './webcam.js';

describe('webcam API', () => {
  test('returns cached availability metadata', async () => {
    const loader = vi.fn().mockResolvedValue({ status: 'available' });
    const response = await createWebcamHandler(loader)(new Request('https://example.com/api/webcam'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
  });

  test('rejects non-GET methods', async () => {
    const response = await createWebcamHandler(async () => ({}))(
      new Request('https://example.com/api/webcam', { method: 'POST' }),
    );
    expect(response.status).toBe(405);
  });

  test('still returns metadata when the official page is unavailable', async () => {
    const response = await createWebcamHandler(async () => ({ status: 'unavailable', message: 'HTTP 503' }))(
      new Request('https://example.com/api/webcam'),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'unavailable', message: 'HTTP 503' });
  });
});
