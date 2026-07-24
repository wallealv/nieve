import type { CurrentSnowOperations } from '../../types/currentSnow.js';

const URLS = {
  lifts: 'https://laslenas.com/estado-pistas/medios/',
  slopes: 'https://laslenas.com/estado-pistas/',
  offPiste: 'https://laslenas.com/estado-pistas/fuera-de-pista/',
} as const;

type ItemState = 'open' | 'conditional' | 'closed' | 'unknown';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function textFromHtml(html: string): string {
  return normalize(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function rowSignal(row: string): string {
  const attributes = [...row.matchAll(/\b(?:alt|title|src|class)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .join(' ');
  return normalize(`${textFromHtml(row)} ${attributes}`);
}

function stateFromSignal(signal: string): ItemState {
  if (/condicional|conditional/.test(signal)) return 'conditional';
  if (/no[-_ ]?habilitado|inhabilitado|cerrado|closed|disabled/.test(signal)) return 'closed';
  if (/habilitado|abierto|open|enabled/.test(signal)) return 'open';
  return 'unknown';
}

export function parseOperationalRows(html: string): {
  open: number | null;
  conditional: number | null;
  total: number | null;
} {
  const rows = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)]
    .map((match) => match[0])
    .filter((row) => (row.match(/<td\b/gi)?.length ?? 0) >= 2);
  const states = rows
    .map((row) => stateFromSignal(rowSignal(row)))
    .filter((state) => state !== 'unknown');

  if (states.length === 0) {
    return { open: null, conditional: null, total: null };
  }

  return {
    open: states.filter((state) => state === 'open').length,
    conditional: states.filter((state) => state === 'conditional').length,
    total: states.length,
  };
}

function extractObservationNote(text: string): string | null {
  const label = 'observaciones';
  const start = text.indexOf(label);
  if (start < 0) return null;

  const remainder = text.slice(start + label.length);
  const endPositions = [' indice', ' riesgo 1', ' estabilidad', ' probabilidad', ' indicaciones']
    .map((marker) => remainder.indexOf(marker))
    .filter((position) => position >= 0);
  const end = endPositions.length ? Math.min(...endPositions) : remainder.length;
  const note = remainder.slice(0, end).trim();

  if (!note || /^sin observaciones\.?$/.test(note)) return null;
  return note;
}

export function parseOffPiste(html: string): Pick<
  CurrentSnowOperations,
  'avalancheRisk' | 'offPisteStatus' | 'officialNote'
> {
  const text = textFromHtml(html);
  const riskMatch = text.match(/riesgo de avalancha\s*([1-5])/i);
  const statusMatch = text.match(/estado\s+(abierto|cerrado|condicional)/i);

  return {
    avalancheRisk: riskMatch ? Number(riskMatch[1]) : null,
    offPisteStatus: statusMatch?.[1]
      ? statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase()
      : null,
    officialNote: extractObservationNote(text),
  };
}

async function fetchPage(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-AR,es;q=0.9',
      'User-Agent':
        'Mozilla/5.0 (compatible; LasLenasSnowMonitor/2.0; +https://nieve.wallealv.com)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Las Leñas respondió HTTP ${response.status}`);
  return response.text();
}

export async function fetchLasLenasOperations(
  fetchedAt = new Date().toISOString(),
  fetchImpl: typeof fetch = fetch,
): Promise<CurrentSnowOperations> {
  const [liftsResult, slopesResult, offPisteResult] = await Promise.allSettled([
    fetchPage(URLS.lifts, fetchImpl),
    fetchPage(URLS.slopes, fetchImpl),
    fetchPage(URLS.offPiste, fetchImpl),
  ]);

  const lifts =
    liftsResult.status === 'fulfilled'
      ? parseOperationalRows(liftsResult.value)
      : { open: null, conditional: null, total: null };
  const slopes =
    slopesResult.status === 'fulfilled'
      ? parseOperationalRows(slopesResult.value)
      : { open: null, conditional: null, total: null };
  const offPiste =
    offPisteResult.status === 'fulfilled'
      ? parseOffPiste(offPisteResult.value)
      : { avalancheRisk: null, offPisteStatus: null, officialNote: null };

  if (
    lifts.total === null &&
    slopes.total === null &&
    offPiste.avalancheRisk === null &&
    offPiste.offPisteStatus === null
  ) {
    throw new Error('Las Leñas no publicó estados operativos parseables.');
  }

  return {
    liftsOpen: lifts.open,
    liftsConditional: lifts.conditional,
    liftsTotal: lifts.total,
    slopesOpen: slopes.open,
    slopesTotal: slopes.total,
    slopesOpenKm: null,
    slopesTotalKm: null,
    avalancheRisk: offPiste.avalancheRisk,
    offPisteStatus: offPiste.offPisteStatus,
    officialNote: offPiste.officialNote,
    fetchedAt,
  };
}
