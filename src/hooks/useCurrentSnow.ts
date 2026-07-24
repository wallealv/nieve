import { useQuery } from '@tanstack/react-query';
import type {
  CurrentSnowApiErrorResponse,
  CurrentSnowResponse,
} from '../types/currentSnow.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12 * 1000;

async function requestCurrentSnow(signal: AbortSignal): Promise<CurrentSnowResponse> {
  const controller = new AbortController();
  const abortFromQuery = () => controller.abort();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  signal.addEventListener('abort', abortFromQuery, { once: true });

  try {
    const response = await fetch('/api/current-snow', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => null)) as CurrentSnowApiErrorResponse | null;
      throw new Error(payload?.message ?? 'No se pudo cargar la nieve actual.');
    }

    return response.json() as Promise<CurrentSnowResponse>;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abortFromQuery);
  }
}

export function useCurrentSnow() {
  return useQuery({
    queryKey: ['las-lenas-current-snow'],
    queryFn: ({ signal }) => requestCurrentSnow(signal),
    refetchInterval: ONE_HOUR_MS,
    staleTime: ONE_HOUR_MS,
    gcTime: 24 * ONE_HOUR_MS,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
}
