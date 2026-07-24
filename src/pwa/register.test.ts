import { describe, expect, test, vi } from 'vitest';
import { registerServiceWorker } from './register.js';

describe('registerServiceWorker', () => {
  test('returns unsupported when service workers are unavailable', async () => {
    expect(await registerServiceWorker({} as Navigator)).toEqual({ status: 'unsupported', registration: null });
  });

  test('registers the app service worker', async () => {
    const registration = { update: vi.fn() } as unknown as ServiceWorkerRegistration;
    const navigatorLike = {
      serviceWorker: { register: vi.fn().mockResolvedValue(registration) },
    } as unknown as Navigator;
    const result = await registerServiceWorker(navigatorLike);
    expect(navigatorLike.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(result).toEqual({ status: 'registered', registration });
  });

  test('returns failed instead of throwing', async () => {
    const navigatorLike = {
      serviceWorker: { register: vi.fn().mockRejectedValue(new Error('blocked')) },
    } as unknown as Navigator;
    const result = await registerServiceWorker(navigatorLike);
    expect(result.status).toBe('failed');
    expect(result.registration).toBeNull();
    expect(result.message).toBe('blocked');
  });
});
