export interface ServiceWorkerRegistrationResult {
  status: 'registered' | 'unsupported' | 'failed';
  registration: ServiceWorkerRegistration | null;
  message?: string;
}

function announceUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('snow-monitor:update-available'));
  }
}

function watchForUpdates(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) announceUpdate();
  registration.addEventListener?.('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener?.('statechange', () => {
      if (worker.state === 'installed' && registration.active) announceUpdate();
    });
  });
}

export async function registerServiceWorker(
  navigatorLike: Navigator = navigator,
): Promise<ServiceWorkerRegistrationResult> {
  if (!('serviceWorker' in navigatorLike) || !navigatorLike.serviceWorker) {
    return { status: 'unsupported', registration: null };
  }
  try {
    const registration = await navigatorLike.serviceWorker.register('/sw.js', { scope: '/' });
    watchForUpdates(registration);
    return { status: 'registered', registration };
  } catch (error) {
    return {
      status: 'failed',
      registration: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
