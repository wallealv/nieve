import { useQuery } from '@tanstack/react-query';
import type { WebcamStatus } from '../types/webcam.js';

async function requestWebcamStatus(signal: AbortSignal): Promise<WebcamStatus> {
  const response = await fetch('/api/webcam', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'No se pudo consultar la cámara oficial.');
  }
  return response.json() as Promise<WebcamStatus>;
}

export function useWebcamStatus() {
  return useQuery({
    queryKey: ['las-lenas-webcam'],
    queryFn: ({ signal }) => requestWebcamStatus(signal),
    staleTime: 45 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
  });
}
