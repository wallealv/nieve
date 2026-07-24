import { useQuery } from '@tanstack/react-query';
import type { HourlyResponse } from '../types/hourly.js';

async function requestHourlyForecast(signal: AbortSignal): Promise<HourlyResponse> {
  const response = await fetch('/api/hourly', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'No se pudo cargar el pronóstico horario.');
  }
  return response.json() as Promise<HourlyResponse>;
}

export function useHourlyForecast() {
  return useQuery({
    queryKey: ['las-lenas-hourly'],
    queryFn: ({ signal }) => requestHourlyForecast(signal),
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 2,
  });
}
