import { fetchRoadStatus } from '../src/lib/road/service.js';

const CACHE_CONTROL = 'public, max-age=0, s-maxage=1800, stale-while-revalidate=1800';
type Loader = () => Promise<unknown>;

export function createRoadHandler(loader: Loader) {
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
          error: 'ROAD_STATUS_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'No se pudo consultar la RP 222.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}

export const handleRoadRequest = createRoadHandler(fetchRoadStatus);
export default { fetch: handleRoadRequest };
