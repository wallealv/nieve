import { fetchClimatology } from '../src/lib/forecast/climatology.js';

const CACHE_CONTROL = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=21600';
type Loader = () => Promise<unknown>;

export function createClimatologyHandler(loader: Loader) {
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
          error: 'CLIMATOLOGY_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'No se pudo obtener la referencia histórica.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}

export const handleClimatologyRequest = createClimatologyHandler(fetchClimatology);
export default { fetch: handleClimatologyRequest };
