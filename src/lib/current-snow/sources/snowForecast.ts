import type {
  CurrentSnowSourceReport,
  ObservationZone,
  SnowObservation,
} from '../../../types/currentSnow.js';
import { classifyFreshness, parseReportedDate } from '../freshness.js';
import { compactText, extractFirst, htmlToText, parseCm } from '../text.js';

const SOURCE_URL = 'https://www.snow-forecast.com/resorts/Las-Lenas/snow-report';
const TABLE_GAP = '[^\\d]{0,32}';

function observation(
  zone: ObservationZone,
  elevationM: number,
  depthCm: number | null,
  snowQuality: string | null,
  reportedAt: string | null,
  fetchedAt: string,
): SnowObservation {
  return {
    sourceId: 'snow-forecast',
    sourceName: 'Snow-Forecast',
    sourceKind: 'external',
    sourceUrl: SOURCE_URL,
    provenanceGroup: 'skiresort-network',
    zone,
    elevationM,
    depthCm,
    newSnow24hCm: null,
    visibility: null,
    snowQuality,
    reportedAt,
    fetchedAt,
    timestampKind: reportedAt ? 'reported' : 'retrieved',
    freshness: classifyFreshness(reportedAt, new Date(fetchedAt)),
  };
}

function depthPattern(label: string): RegExp {
  return new RegExp(`${label}:?\\s*${TABLE_GAP}(\\d+(?:[.,]\\d+)?)\\s*cm`, 'i');
}

export function parseSnowForecast(
  html: string,
  fetchedAt: string,
): CurrentSnowSourceReport {
  const text = compactText(htmlToText(html));
  const upper = extractFirst(text, [
    depthPattern('Upper snow depth'),
    depthPattern('Profundidad de Nieve Arriba'),
  ]);
  const lower = extractFirst(text, [
    depthPattern('Lower snow depth'),
    depthPattern('Profundidad de Nieve abajo'),
  ]);
  const dateLabel = extractFirst(text, [
    /snow depths:\s*updated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    /Profundidad de la nieve[^:]*:\s*Actualizado el\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    /latest Las Leñas snow report[^.]*updated on\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  ]);
  const reportedAt = parseReportedDate(dateLabel, fetchedAt);
  const snowQuality = extractFirst(text, [
    /Piste snow condition:\s*([^|]+?)(?:Off Piste|Next snowfall|Season closes)/i,
    /Estado de la nieve en las pistas:\s*([^|]+?)(?:Estado fuera|Próxima nevada|Fin de Temporada)/i,
  ]);

  if (upper === null && lower === null) {
    throw new Error('Snow-Forecast no publicó profundidades actuales parseables.');
  }

  return {
    sourceId: 'snow-forecast',
    sourceName: 'Snow-Forecast',
    sourceKind: 'external',
    sourceUrl: SOURCE_URL,
    provenanceGroup: 'skiresort-network',
    observations: [
      observation('base', 2240, parseCm(lower), snowQuality, reportedAt, fetchedAt),
      observation('summit', 3430, parseCm(upper), snowQuality, reportedAt, fetchedAt),
    ],
  };
}
