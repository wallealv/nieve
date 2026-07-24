import { useQuery } from '@tanstack/react-query';
import type { RegionalGridResponse } from '../types/regional.js';

async function requestRegionalGrid(signal: AbortSignal): Promise<RegionalGridResponse> {
  const response = await fetch('/api/regional-grid', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'No se pudo cargar el mapa regional.');
  }
  return response.json() as Promise<RegionalGridResponse>;
}

export function useRegionalGrid(enabled: boolean) {
  return useQuery({
    queryKey: ['regional-snow-grid'],
    queryFn: ({ signal }) => requestRegionalGrid(signal),
    enabled,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
