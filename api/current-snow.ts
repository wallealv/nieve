import { buildCurrentSnowResponse } from '../src/lib/current-snow/service.js';
import { getDatabaseClient, runSafely } from '../src/lib/database/client.js';
import { saveSnowObservations } from '../src/lib/database/snowObservations.js';
import type { CurrentSnowResponse } from '../src/types/currentSnow.js';

const CACHE_CONTROL =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=10800';

type CurrentSnowLoader = () => Promise<unknown>;

export function createCurrentSnowHandler(loadCurrentSnow: CurrentSnowLoader) {
  return async function handleCurrentSnowRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json(
        { error: 'METHOD_NOT_ALLOWED', message: 'Solo se admite GET.' },
        { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } },
      );
    }

    try {
      const data = await loadCurrentSnow();
      return Response.json(data, {
        status: 200,
        headers: { 'Cache-Control': CACHE_CONTROL },
      });
    } catch (error) {
      return Response.json(
        {
          error: 'CURRENT_SNOW_UNAVAILABLE',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo obtener la nieve actual.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}

export interface CurrentSnowLoaderDependencies {
  buildCurrentSnow: () => Promise<CurrentSnowResponse>;
  saveObservations: (currentSnow: CurrentSnowResponse) => Promise<boolean>;
}

const defaultCurrentSnowDependencies: CurrentSnowLoaderDependencies = {
  buildCurrentSnow: () => buildCurrentSnowResponse(),
  saveObservations: (currentSnow) =>
    saveSnowObservations(getDatabaseClient(), currentSnow),
};

/**
 * Current snow → observations saved (they are the ground truth for model skill) → response.
 * Saving is best effort and never changes the HTTP response.
 */
export function createCurrentSnowLoader(
  overrides: Partial<CurrentSnowLoaderDependencies> = {},
) {
  const { buildCurrentSnow, saveObservations } = {
    ...defaultCurrentSnowDependencies,
    ...overrides,
  };

  return async function loadCurrentSnow(): Promise<CurrentSnowResponse> {
    const currentSnow = await buildCurrentSnow();
    await runSafely(
      'save snow observations',
      () => saveObservations(currentSnow),
      false,
    );
    return currentSnow;
  };
}

export const handleCurrentSnowRequest = createCurrentSnowHandler(
  createCurrentSnowLoader(),
);

export default {
  fetch: handleCurrentSnowRequest,
};
