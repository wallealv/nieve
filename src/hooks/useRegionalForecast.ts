import { useQuery } from '@tanstack/react-query';
import type { RegionalResponse } from '../types/regional.js';

async function requestRegionalForecast(signal: AbortSignal): Promise<RegionalResponse> {
  const response = await fetch('/api/regional', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'No se pudo cargar la comparación regional.');
  }
  return response.json() as Promise<RegionalResponse>;
}

export function useRegionalForecast() {
  return useQuery({
    queryKey: ['regional-ski-forecast'],
    queryFn: ({ signal }) => requestRegionalForecast(signal),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: 3 * 60 * 60 * 1000,
    retry: 1,
  });
}
