import type { RoadState, RoadStatus } from '../../types/road.js';

function decode(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&deg;/gi, '°');
}

function textFromHtml(html: string): string {
  return decode(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/li>|<\/div>|<\/section>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim();
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractStatement(text: string): string | null {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const direct = lines.find((line) => /\b(?:rp|ruta provincial)\s*(?:n[°º]?\s*)?222\b/i.test(line));
  if (direct) return direct;
  const match = text.match(/(?:rp|ruta provincial)\s*(?:n[°º]?\s*)?222[^\n]{0,420}/i);
  return match?.[0]?.trim() ?? null;
}

function stateFor(statement: string): RoadState {
  const value = normalize(statement);
  if (/intransitable|interrumpid[ao]|cerrad[ao]|corte total|no transitable/.test(value)) return 'closed';
  if (/portacion obligatoria de cadenas|uso obligatorio de cadenas|cadenas obligatorias/.test(value)) return 'chains-required';
  if (/extrema precaucion|suma precaucion/.test(value)) return 'extreme-caution';
  if (/precaucion|parcialmente transitable|transitable con restricciones/.test(value)) return 'caution';
  if (/transitable|habilitad[ao]|despejad[ao]/.test(value)) return 'open';
  return 'unknown';
}

function reportedAtFromHtml(html: string): string | null {
  const match = html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

export function parseRoadReport(
  html: string,
  sourceUrl: string,
  fetchedAt = new Date().toISOString(),
): RoadStatus {
  const text = textFromHtml(html);
  const statement = extractStatement(text);
  const normalized = statement ? normalize(statement) : '';
  const hazards: RoadStatus['hazards'] = [];
  if (/nieve/.test(normalized)) hazards.push('nieve');
  if (/hielo/.test(normalized)) hazards.push('hielo');
  if (/barro/.test(normalized)) hazards.push('barro');
  if (/agua|anegad/.test(normalized)) hazards.push('agua');
  if (/derrumbe|desprendimiento|aridos/.test(normalized)) hazards.push('derrumbes');

  return {
    route: 'RP 222',
    destination: 'Las Leñas',
    status: statement ? stateFor(statement) : 'unknown',
    statement,
    chainsRequired: statement
      ? /portacion (?:obligatoria )?de cadenas|uso obligatorio de cadenas|cadenas obligatorias/.test(normalized)
      : null,
    machineryWorking: statement
      ? /maquinas? (?:viales )?(?:trabajando|en operaciones|operando)|maquinistas?/.test(normalized)
      : null,
    hazards,
    reportedAt: reportedAtFromHtml(html),
    fetchedAt,
    sourceName: 'Gobierno de Mendoza',
    sourceUrl,
  };
}
