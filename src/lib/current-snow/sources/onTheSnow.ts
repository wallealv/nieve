import type {
  CurrentSnowSourceReport,
  ObservationZone,
  SnowObservation,
} from '../../../types/currentSnow.js';
import { classifyFreshness, parseReportedDate } from '../freshness.js';
import { compactText, extractFirst, htmlToText, inchesToCm } from '../text.js';

const SOURCE_URL = 'https://www.onthesnow.com/argentina/las-lenas/skireport';

function observation(
  zone: ObservationZone,
  elevationM: number,
  depthCm: number | null,
  snowQuality: string | null,
  reportedAt: string | null,
  fetchedAt: string,
): SnowObservation {
  return {
    sourceId: 'onthesnow',
    sourceName: 'OnTheSnow',
    sourceKind: 'external',
    sourceUrl: SOURCE_URL,
    provenanceGroup: 'onthesnow-network',
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

export function parseOnTheSnow(
  html: string,
  fetchedAt: string,
): CurrentSnowSourceReport {
  const text = compactText(htmlToText(html));
  const baseInches = extractFirst(text, [
    /\bBase\s+(\d+(?:\.\d+)?)\s*(?:"|in\b)/i,
    /base depth with\s+(\d+(?:\.\d+)?)\s*(?:"|in\b)/i,
  ]);
  const summitInches = extractFirst(text, [
    /\bSummit\s+(\d+(?:\.\d+)?)\s*(?:"|in\b)/i,
  ]);
  const dateLabel = extractFirst(text, [
    /Snow Report Last Updated:\s*([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /snow report for\s+([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
  ]);
  const reportedAt = parseReportedDate(dateLabel, fetchedAt);
  const snowQuality = extractFirst(text, [
    /\bBase\s+\d+(?:\.\d+)?\s*(?:"|in\b)\s+([A-Za-z ]+?)(?:Summit|Depth vs Average|Lifts Open)/i,
  ]);

  if (baseInches === null && summitInches === null) {
    throw new Error('OnTheSnow no publicó profundidades actuales parseables.');
  }

  return {
    sourceId: 'onthesnow',
    sourceName: 'OnTheSnow',
    sourceKind: 'external',
    sourceUrl: SOURCE_URL,
    provenanceGroup: 'onthesnow-network',
    observations: [
      observation('base', 2240, inchesToCm(baseInches), snowQuality, reportedAt, fetchedAt),
      observation('summit', 3430, inchesToCm(summitInches), snowQuality, reportedAt, fetchedAt),
    ],
  };
}
