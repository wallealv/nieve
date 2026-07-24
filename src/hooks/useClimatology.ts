import { useQuery } from '@tanstack/react-query';
import type { ClimatologyResponse } from '../types/climatology.js';

async function requestClimatology(signal: AbortSignal): Promise<ClimatologyResponse> {
  const response = await fetch('/api/climatology', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'No se pudo cargar la referencia histórica.');
  }
  return response.json() as Promise<ClimatologyResponse>;
}

export function useClimatology() {
  return useQuery({
    queryKey: ['las-lenas-climatology'],
    queryFn: ({ signal }) => requestClimatology(signal),
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchInterval: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
