import type {
  CurrentSnowSourceReport,
  ObservationZone,
  SnowObservation,
} from '../../../types/currentSnow.js';
import { classifyFreshness } from '../freshness.js';
import { compactText, htmlToText, parseCm } from '../text.js';

const SOURCE_URL = 'https://laslenas.com/estado-pistas/condiciones-del-tiempo/';

const ZONES: Array<{
  zone: ObservationZone;
  label: string;
  nextLabel: string | null;
  elevationM: number;
}> = [
  { zone: 'base', label: 'BASE', nextLabel: 'INTERMEDIA', elevationM: 2240 },
  { zone: 'mid', label: 'INTERMEDIA', nextLabel: 'CUMBRE', elevationM: 2800 },
  { zone: 'summit', label: 'CUMBRE', nextLabel: null, elevationM: 3430 },
];

const VISIBILITY_PATTERN = /(Excelente|Muy buena|Buena|Regular|Reducida|Nula)/i;

function zoneSegment(text: string, label: string, nextLabel: string | null): string {
  const start = text.search(new RegExp(`\\b${label}\\b`, 'i'));
  if (start < 0) return '';
  const after = text.slice(start + label.length).trim();
  if (!nextLabel) return after;
  const end = after.search(new RegExp(`\\b${nextLabel}\\b`, 'i'));
  return end >= 0 ? after.slice(0, end).trim() : after;
}

function parseZone(
  zone: ObservationZone,
  elevationM: number,
  segment: string,
  fetchedAt: string,
): SnowObservation {
  const depthMatch = segment.match(/^(-|\d+(?:[.,]\d+)?\s*cm)\b/i);
  const depthToken = depthMatch?.[1] ?? null;
  const remaining = depthMatch ? segment.slice(depthMatch[0].length).trim() : segment;
  const newSnowMatch = remaining.match(/(\d+(?:[.,]\d+)?)\s*cm\b/i);
  const visibility = remaining.match(VISIBILITY_PATTERN)?.[1] ?? null;

  return {
    sourceId: 'las-lenas',
    sourceName: 'Las Leñas oficial',
    sourceKind: 'official',
    sourceUrl: SOURCE_URL,
    provenanceGroup: 'las-lenas-official',
    zone,
    elevationM,
    depthCm: depthToken === '-' ? null : parseCm(depthToken),
    newSnow24hCm: parseCm(newSnowMatch?.[1]),
    visibility,
    snowQuality: null,
    reportedAt: null,
    fetchedAt,
    timestampKind: 'retrieved',
    freshness: classifyFreshness(null, new Date(fetchedAt)),
  };
}

export function parseLasLenas(html: string, fetchedAt: string): CurrentSnowSourceReport {
  const text = compactText(htmlToText(html));
  const snowStart = text.search(/NIEVE\s+PISADA\s+PRECIPITADA\s+(?:ÚLTIMAS|ULTIMAS)\s+24H/i);
  if (snowStart < 0) {
    throw new Error('No se encontró la tabla oficial de nieve.');
  }

  const section = text.slice(snowStart);
  const observations = ZONES.map(({ zone, label, nextLabel, elevationM }) =>
    parseZone(zone, elevationM, zoneSegment(section, label, nextLabel), fetchedAt),
  );

  return {
    sourceId: 'las-lenas',
    sourceName: 'Las Leñas oficial',
    sourceKind: 'official',
    sourceUrl: SOURCE_URL,
    provenanceGroup: 'las-lenas-official',
    observations,
  };
}
