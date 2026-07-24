import { useQuery } from '@tanstack/react-query';
import { REFRESH_INTERVAL_MS } from '../config/mountain.js';
import type { ApiErrorResponse, ForecastResponse } from '../types/forecast.js';

async function requestForecast(signal: AbortSignal): Promise<ForecastResponse> {
  const response = await fetch('/api/forecast', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(payload?.message ?? 'No se pudo cargar el pronóstico.');
  }

  return response.json() as Promise<ForecastResponse>;
}

export function useForecast() {
  return useQuery({
    queryKey: ['las-lenas-forecast'],
    queryFn: ({ signal }) => requestForecast(signal),
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });
}
