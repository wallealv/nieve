import type {
  ConfidenceLabel,
  ForecastResponse,
  LevelId,
} from '../../types/forecast.js';
import { averageConfidenceForPeriod } from './presentation.js';

export type AlertZone = LevelId | 'any';
export type AlertConfidence = 'Baja' | 'Media' | 'Alta';

export interface AlertSettings {
  threshold72hCm: number;
  threshold7dCm: number;
  minConfidence: AlertConfidence;
  zone: AlertZone;
  notificationsEnabled: boolean;
}

export interface AlertMatch {
  active: boolean;
  zone: LevelId | null;
  zoneName: string | null;
  period: '72h' | '7d' | null;
  accumulationCm: number | null;
  thresholdCm: number | null;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  fingerprint: string | null;
  message: string;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  threshold72hCm: 25,
  threshold7dCm: 40,
  minConfidence: 'Media',
  zone: 'any',
  notificationsEnabled: false,
};

const CONFIDENCE_SCORE: Record<AlertConfidence, number> = {
  Baja: 0,
  Media: 45,
  Alta: 70,
};

function eligibleLevelIds(settings: AlertSettings): LevelId[] {
  return settings.zone === 'any' ? ['base', 'mid', 'summit'] : [settings.zone];
}

function confidenceLabel(score: number): ConfidenceLabel {
  if (score >= 70) return 'Alta';
  if (score >= 45) return 'Media';
  if (score >= 25) return 'Baja';
  return 'Muy baja';
}

export function alertFingerprint(
  forecast: ForecastResponse,
  zone: LevelId,
  period: '72h' | '7d',
): string {
  const firstDate = forecast.levels.find((level) => level.level.id === zone)?.daily[0]?.date ?? 'unknown';
  return `${firstDate}:${zone}:${period}:${forecast.resort.updatedAt}`;
}

export function evaluateAlert(
  forecast: ForecastResponse,
  settings: AlertSettings,
): AlertMatch {
  const minimumScore = CONFIDENCE_SCORE[settings.minConfidence];
  const candidates = forecast.levels
    .filter((level) => eligibleLevelIds(settings).includes(level.level.id))
    .flatMap((level) => {
      const confidence72h = averageConfidenceForPeriod(level, '72h');
      const confidence7d = averageConfidenceForPeriod(level, '7d');
      return [
        {
          level,
          period: '72h' as const,
          accumulationCm: level.totals.hours72,
          thresholdCm: settings.threshold72hCm,
          confidenceScore: confidence72h,
        },
        {
          level,
          period: '7d' as const,
          accumulationCm: level.totals.days7,
          thresholdCm: settings.threshold7dCm,
          confidenceScore: confidence7d,
        },
      ];
    })
    .filter(
      (candidate) =>
        candidate.accumulationCm !== null &&
        candidate.accumulationCm >= candidate.thresholdCm &&
        candidate.confidenceScore >= minimumScore,
    )
    .sort((left, right) => {
      const leftRatio = (left.accumulationCm ?? 0) / left.thresholdCm;
      const rightRatio = (right.accumulationCm ?? 0) / right.thresholdCm;
      return rightRatio - leftRatio || right.confidenceScore - left.confidenceScore;
    });

  const best = candidates[0];
  if (!best || best.accumulationCm === null) {
    return {
      active: false,
      zone: null,
      zoneName: null,
      period: null,
      accumulationCm: null,
      thresholdCm: null,
      confidenceScore: 0,
      confidenceLabel: 'Muy baja',
      fingerprint: null,
      message: 'Ningún umbral configurado fue alcanzado con la confianza requerida.',
    };
  }

  const label = confidenceLabel(best.confidenceScore);
  return {
    active: true,
    zone: best.level.level.id,
    zoneName: best.level.level.name,
    period: best.period,
    accumulationCm: best.accumulationCm,
    thresholdCm: best.thresholdCm,
    confidenceScore: best.confidenceScore,
    confidenceLabel: label,
    fingerprint: alertFingerprint(forecast, best.level.level.id, best.period),
    message: `${best.level.level.name}: ${best.accumulationCm.toFixed(1)} cm en ${best.period === '72h' ? '72 horas' : '7 días'}, confianza ${label.toLowerCase()}.`,
  };
}
