export interface ServiceWorkerRegistrationResult {
  status: 'registered' | 'unsupported' | 'failed';
  registration: ServiceWorkerRegistration | null;
  message?: string;
}

export async function registerServiceWorker(
  navigatorLike: Navigator = navigator,
): Promise<ServiceWorkerRegistrationResult> {
  if (!('serviceWorker' in navigatorLike) || !navigatorLike.serviceWorker) {
    return { status: 'unsupported', registration: null };
  }
  try {
    const registration = await navigatorLike.serviceWorker.register('/sw.js', { scope: '/' });
    return { status: 'registered', registration };
  } catch (error) {
    return {
      status: 'failed',
      registration: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
