import { buildForecastResponse } from '../src/lib/forecast/service.js';

const CACHE_CONTROL =
  'public, max-age=0, s-maxage=10800, stale-while-revalidate=1800';

type ForecastLoader = () => Promise<unknown>;

export function createForecastHandler(loadForecast: ForecastLoader) {
  return async function handleForecastRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json(
        { error: 'METHOD_NOT_ALLOWED', message: 'Solo se admite GET.' },
        { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } },
      );
    }

    try {
      const data = await loadForecast();
      return Response.json(data, {
        status: 200,
        headers: { 'Cache-Control': CACHE_CONTROL },
      });
    } catch (error) {
      return Response.json(
        {
          error: 'FORECAST_UNAVAILABLE',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo obtener el pronóstico.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}

export const handleForecastRequest = createForecastHandler(buildForecastResponse);

export default {
  fetch: handleForecastRequest,
};
