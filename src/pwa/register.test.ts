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

  test('announces an update only when a new worker installs over an active one', async () => {
    const worker = { state: 'installing', addEventListener: vi.fn() };
    const registration = {
      active: null as object | null,
      waiting: null,
      installing: worker,
      addEventListener: vi.fn(),
    };
    const navigatorLike = {
      serviceWorker: { register: vi.fn().mockResolvedValue(registration) },
    } as unknown as Navigator;
    const onUpdate = vi.fn();
    window.addEventListener('snow-monitor:update-available', onUpdate);
    const installWorker = () => {
      registration.addEventListener.mock.lastCall![1]();
      worker.state = 'installed';
      worker.addEventListener.mock.lastCall![1]();
    };

    await registerServiceWorker(navigatorLike);
    expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function));
    installWorker();
    expect(onUpdate).not.toHaveBeenCalled();

    registration.active = {};
    worker.state = 'installing';
    installWorker();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    window.removeEventListener('snow-monitor:update-available', onUpdate);
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
