import { FORECAST_MODELS } from '../../config/mountain.js';
import type { ConfidenceLabel, ForecastModelConfig, MountainLevelConfig } from '../../types/forecast.js';
import type {
  RegionalBasePhaseRisk,
  RegionalResponse,
  RegionalResortSummary,
} from '../../types/regional.js';
import { compact, median, nullableRange, round, sumNullable } from '../forecast/math.js';
import type { NormalizedModelLevel } from '../forecast/normalize.js';
import { fetchOpenMeteoModel } from '../forecast/openMeteo.js';
import { rankRegionalResorts } from './ranking.js';
import { flattenRegionalPoints, REGIONAL_RESORTS } from './resorts.js';

export type RegionalModelFetcher = (
  model: ForecastModelConfig,
  points: readonly MountainLevelConfig[],
) => Promise<NormalizedModelLevel[]>;

interface ModelResortMetrics {
  snow72hCm: number | null;
  snow7dCm: number | null;
  maxGustKmh: number | null;
  basePhaseRisk: RegionalBasePhaseRisk;
}

function sumDays(level: NormalizedModelLevel | undefined, count: number): number | null {
  return round(sumNullable(level?.daily.slice(0, count).map((day) => day.snowfallCm) ?? []));
}

function maxDays(level: NormalizedModelLevel | undefined, count: number, key: 'gustMaxKmh' | 'temperatureMaxC'): number | null {
  const values = compact(level?.daily.slice(0, count).map((day) => day[key]) ?? []);
  return values.length ? Math.max(...values) : null;
}

function basePhaseRisk(base: NormalizedModelLevel | undefined, elevationM: number): RegionalBasePhaseRisk {
  if (!base) return 'unknown';
  const temperature = maxDays(base, 3, 'temperatureMaxC');
  const freezingLevels = compact(base.daily.slice(0, 3).map((day) => day.freezingLevelM));
  const freezing = freezingLevels.length ? Math.max(...freezingLevels) : null;
  const snow = sumDays(base, 3);
  if (snow === null || snow <= 0) return 'unknown';
  if ((temperature ?? -10) > 2 && (freezing ?? elevationM) > elevationM + 150) return 'rain-risk';
  if ((temperature ?? -10) > 0 || (freezing ?? elevationM - 1) >= elevationM) return 'mixed-risk';
  return 'snow';
}

function confidenceLabel(score: number): ConfidenceLabel {
  if (score >= 70) return 'Alta';
  if (score >= 45) return 'Media';
  if (score >= 25) return 'Baja';
  return 'Muy baja';
}

function confidence(values: Array<number | null>, modelCount: number): number {
  const numbers = compact(values);
  if (numbers.length === 0 || modelCount === 0) return 0;
  const range = Math.max(...numbers) - Math.min(...numbers);
  const center = median(numbers) ?? 0;
  const relativePenalty = center > 0 ? Math.min(35, (range / center) * 35) : range > 0 ? 30 : 0;
  const base = modelCount === 3 ? 88 : modelCount === 2 ? 62 : 35;
  return Math.max(10, Math.min(100, Math.round(base - relativePenalty)));
}

function worstPhase(values: RegionalBasePhaseRisk[]): RegionalBasePhaseRisk {
  if (values.includes('rain-risk')) return 'rain-risk';
  if (values.includes('mixed-risk')) return 'mixed-risk';
  if (values.includes('snow')) return 'snow';
  return 'unknown';
}

export async function buildRegionalResponse(
  fetcher: RegionalModelFetcher = (model, points) => fetchOpenMeteoModel(model, points),
  generatedAt = new Date().toISOString(),
): Promise<RegionalResponse> {
  const references = flattenRegionalPoints();
  const points = references.map((reference) => reference.point);
  const settled = await Promise.allSettled(FORECAST_MODELS.map((model) => fetcher(model, points)));
  const successful = settled.flatMap((outcome, index) =>
    outcome.status === 'fulfilled' ? [{ model: FORECAST_MODELS[index]!, values: outcome.value }] : [],
  );
  const warnings = settled.flatMap((outcome, index) => {
    if (outcome.status === 'fulfilled') return [];
    const message = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
    return [`${FORECAST_MODELS[index]?.shortName ?? 'Modelo'}: ${message}`];
  });

  if (successful.length === 0) throw new Error('No regional model is available.');

  const summaries: RegionalResortSummary[] = REGIONAL_RESORTS.map((resort, resortIndex) => {
    const metrics: ModelResortMetrics[] = successful.map(({ values }) => {
      const base = values[resortIndex * 2];
      const summit = values[resortIndex * 2 + 1];
      const gustValues = compact([
        maxDays(base, 7, 'gustMaxKmh'),
        maxDays(summit, 7, 'gustMaxKmh'),
      ]);
      return {
        snow72hCm: sumDays(summit, 3),
        snow7dCm: sumDays(summit, 7),
        maxGustKmh: gustValues.length ? Math.max(...gustValues) : null,
        basePhaseRisk: basePhaseRisk(base, resort.base.elevationM),
      };
    });
    const totals7d = metrics.map((item) => item.snow7dCm);
    const range = nullableRange(totals7d);
    const confidenceScore = confidence(totals7d, successful.length);
    return {
      id: resort.id,
      name: resort.name,
      country: resort.country,
      officialUrl: resort.officialUrl,
      representativeLatitude: (resort.base.latitude + resort.summit.latitude) / 2,
      representativeLongitude: (resort.base.longitude + resort.summit.longitude) / 2,
      snow72hCm: round(median(metrics.map((item) => item.snow72hCm))),
      snow7dCm: round(median(totals7d)),
      snowMin7dCm: round(range.min),
      snowMax7dCm: round(range.max),
      confidenceScore,
      confidenceLabel: confidenceLabel(confidenceScore),
      maxGustKmh: round(median(metrics.map((item) => item.maxGustKmh))),
      basePhaseRisk: worstPhase(metrics.map((item) => item.basePhaseRisk)),
      modelCount: successful.length,
      warnings: successful.length < 3 ? ['Comparación basada en menos de tres modelos.'] : [],
    };
  });

  return {
    generatedAt,
    source: 'Open-Meteo · puntos representativos de base y cumbre',
    resorts: rankRegionalResorts(summaries),
    warnings,
  };
}
