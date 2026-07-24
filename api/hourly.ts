import { buildHourlyResponse } from '../src/lib/forecast/hourlyService.js';

const CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=900';
type HourlyLoader = () => Promise<unknown>;

export function createHourlyHandler(loadHourly: HourlyLoader) {
  return async function handleHourlyRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json(
        { error: 'METHOD_NOT_ALLOWED', message: 'Solo se admite GET.' },
        { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } },
      );
    }

    try {
      const data = await loadHourly();
      return Response.json(data, {
        status: 200,
        headers: { 'Cache-Control': CACHE_CONTROL },
      });
    } catch (error) {
      return Response.json(
        {
          error: 'HOURLY_FORECAST_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'No se pudo obtener el pronóstico horario.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}

export const handleHourlyRequest = createHourlyHandler(buildHourlyResponse);

export default {
  fetch: handleHourlyRequest,
};
