import { describe, expect, test, vi } from 'vitest';
import { checkOfficialWebcam } from './service.js';

describe('checkOfficialWebcam', () => {
  test('reports a reachable official page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('', { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    const result = await checkOfficialWebcam('2026-07-24T12:00:00Z', fetchMock as typeof fetch);
    expect(result.status).toBe('available');
    expect(result.officialUrl).toBe('https://laslenas.com/camara-en-vivo/');
    expect(result.embeddable).toBe(true);
  });

  test('marks the page non-embeddable when frame headers prohibit it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('', { status: 200, headers: { 'x-frame-options': 'SAMEORIGIN' } }),
    );
    const result = await checkOfficialWebcam('2026-07-24T12:00:00Z', fetchMock as typeof fetch);
    expect(result.status).toBe('available');
    expect(result.embeddable).toBe(false);
  });

  test('returns unavailable for an HTTP failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const result = await checkOfficialWebcam('2026-07-24T12:00:00Z', fetchMock as typeof fetch);
    expect(result.status).toBe('unavailable');
    expect(result.message).toMatch(/503/);
  });

  test('returns unavailable on timeout or network errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('timeout'));
    const result = await checkOfficialWebcam('2026-07-24T12:00:00Z', fetchMock as typeof fetch);
    expect(result.status).toBe('unavailable');
    expect(result.message).toBe('timeout');
  });
});
