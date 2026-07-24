import type { RoadStatus } from '../../types/road.js';
import { parseRoadReport } from './parser.js';

const ROAD_SOURCES = [
  'https://prensa.mendoza.gob.ar/estado-de-las-rutas-en-mendoza-2/',
  'https://www.mendoza.gov.ar/prensa/estado-de-rutas-provinciales-para-hoy/',
] as const;

async function fetchPage(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-AR,es;q=0.9',
      'User-Agent': 'Mozilla/5.0 (compatible; LasLenasSnowMonitor/3.0; +https://nieve.wallealv.com)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Gobierno de Mendoza respondió HTTP ${response.status}`);
  return response.text();
}

export async function fetchRoadStatus(
  fetchedAt = new Date().toISOString(),
  fetchImpl: typeof fetch = fetch,
): Promise<RoadStatus> {
  const errors: string[] = [];
  let unknown: RoadStatus | null = null;

  for (const sourceUrl of ROAD_SOURCES) {
    try {
      const status = parseRoadReport(await fetchPage(sourceUrl, fetchImpl), sourceUrl, fetchedAt);
      if (status.status !== 'unknown') return status;
      unknown = status;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (unknown) return unknown;
  throw new Error(errors.join(' · ') || 'No se pudo consultar el estado oficial de la RP 222.');
}
