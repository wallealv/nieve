import { useEffect, useState } from 'react';
import { getBrowserStorageAdapter } from '../lib/persistence/storage.js';

export interface OffPisteChange {
  previous: string;
  current: string;
  fingerprint: string;
  message: string;
}

interface LastValidOperationalState {
  offPisteStatus?: string | null;
}

export function useOffPisteChange(status: string | null | undefined): OffPisteChange | null {
  const [change, setChange] = useState<OffPisteChange | null>(null);

  useEffect(() => {
    if (!status) return;
    let active = true;
    const adapter = getBrowserStorageAdapter();
    void adapter?.get<LastValidOperationalState>('last-valid-responses').then(async (saved) => {
      if (!active) return;
      const previous = saved?.offPisteStatus ?? null;
      setChange(
        previous && previous !== status
          ? {
              previous,
              current: status,
              fingerprint: `${previous}:${status}`,
              message: `Fuera de pista pasó de ${previous} a ${status}.`,
            }
          : null,
      );
      await adapter.set('last-valid-responses', { ...(saved ?? {}), offPisteStatus: status });
    });
    return () => {
      active = false;
    };
  }, [status]);

  return change;
}
