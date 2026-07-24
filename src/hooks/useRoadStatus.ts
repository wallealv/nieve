import { useQuery } from '@tanstack/react-query';
import type { RoadStatus } from '../types/road.js';

async function requestRoadStatus(signal: AbortSignal): Promise<RoadStatus> {
  const response = await fetch('/api/road', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'No se pudo cargar el estado de la RP 222.');
  }
  return response.json() as Promise<RoadStatus>;
}

export function useRoadStatus() {
  return useQuery({
    queryKey: ['rp222-road-status'],
    queryFn: ({ signal }) => requestRoadStatus(signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
  });
}
