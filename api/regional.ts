import { buildRegionalResponse } from '../src/lib/regional/service.js';

const CACHE_CONTROL = 'public, max-age=0, s-maxage=10800, stale-while-revalidate=3600';
type Loader = () => Promise<unknown>;

export function createRegionalHandler(loader: Loader) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json(
        { error: 'METHOD_NOT_ALLOWED', message: 'Solo se admite GET.' },
        { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } },
      );
    }
    try {
      return Response.json(await loader(), { headers: { 'Cache-Control': CACHE_CONTROL } });
    } catch (error) {
      return Response.json(
        {
          error: 'REGIONAL_FORECAST_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'No se pudo comparar la región.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}

export const handleRegionalRequest = createRegionalHandler(buildRegionalResponse);
export default { fetch: handleRegionalRequest };
