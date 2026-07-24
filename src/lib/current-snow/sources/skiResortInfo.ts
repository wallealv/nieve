import type {
  CurrentSnowSourceReport,
  ObservationZone,
  SnowObservation,
} from '../../../types/currentSnow.js';
import { classifyFreshness, parseReportedDate } from '../freshness.js';
import { compactText, extractFirst, htmlToText, parseCm } from '../text.js';

const SOURCE_URL = 'https://www.skiresort.info/ski-resort/las-lenas/snow-report/';

function observation(
  zone: ObservationZone,
  elevationM: number,
  depthCm: number | null,
  snowQuality: string | null,
  reportedAt: string | null,
  fetchedAt: string,
): SnowObservation {
  return {
    sourceId: 'skiresort-info',
    sourceName: 'Skiresort.info',
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

export function parseSkiResortInfo(
  html: string,
  fetchedAt: string,
): CurrentSnowSourceReport {
  const text = compactText(htmlToText(html));
  const mountain = extractFirst(text, [
    /(\d+(?:[.,]\d+)?)\s*cm\s+Mountain\s*\(\s*3430\s*m\s*\)/i,
    /(\d+(?:[.,]\d+)?)\s*cm\s+mountain\b/i,
  ]);
  const base = extractFirst(text, [
    /(\d+(?:[.,]\d+)?)\s*cm\s+Base\s*\(\s*22\d{2}\s*m\s*\)/i,
    /(\d+(?:[.,]\d+)?)\s*cm\s+base\b/i,
  ]);
  const dateLabel = extractFirst(text, [
    /Updated on:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  ]);
  const reportedAt = parseReportedDate(dateLabel, fetchedAt);
  const snowQuality = extractFirst(text, [
    /Snow quality:\s*([^\n]+?)(?:Last snowfall|Snow situation|Open slopes)/i,
  ]);

  if (mountain === null && base === null) {
    throw new Error('Skiresort.info no publicó profundidades actuales parseables.');
  }

  return {
    sourceId: 'skiresort-info',
    sourceName: 'Skiresort.info',
    sourceKind: 'external',
    sourceUrl: SOURCE_URL,
    provenanceGroup: 'skiresort-network',
    observations: [
      observation('base', 2200, parseCm(base), snowQuality, reportedAt, fetchedAt),
      observation('summit', 3430, parseCm(mountain), snowQuality, reportedAt, fetchedAt),
    ],
  };
}
