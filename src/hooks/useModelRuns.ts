import { useQuery } from '@tanstack/react-query';
import type { ModelRunsResponse } from '../types/modelRuns.js';

async function requestModelRuns(signal: AbortSignal): Promise<ModelRunsResponse> {
  const response = await fetch('/api/model-runs', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'No se pudieron cargar las corridas anteriores.');
  }
  return response.json() as Promise<ModelRunsResponse>;
}

export function useModelRuns() {
  return useQuery({
    queryKey: ['las-lenas-model-runs'],
    queryFn: ({ signal }) => requestModelRuns(signal),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: 3 * 60 * 60 * 1000,
    retry: 1,
  });
}
