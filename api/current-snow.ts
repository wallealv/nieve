import { buildCurrentSnowResponse } from '../src/lib/current-snow/service.js';

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

export const handleCurrentSnowRequest = createCurrentSnowHandler(
  buildCurrentSnowResponse,
);

export default {
  fetch: handleCurrentSnowRequest,
};
