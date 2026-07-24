import type { ConfidenceLabel, ForecastResponse, LevelId } from '../../types/forecast.js';
import type { HourlyResponse } from '../../types/hourly.js';
import type { ModelRunsResponse } from '../../types/modelRuns.js';
import { averageConfidenceForPeriod } from './presentation.js';

export type AlertZone = LevelId | 'any';
export type AlertConfidence = 'Baja' | 'Media' | 'Alta';
export type AlertKind =
  | 'snow'
  | 'gust'
  | 'base-rain'
  | 'road-change'
  | 'off-piste-change'
  | 'model-change'
  | 'none';

export interface AlertSettings {
  threshold72hCm: number;
  threshold7dCm: number;
  minConfidence: AlertConfidence;
  zone: AlertZone;
  maxGustKmh: number;
  modelDeltaCm: number;
  notifyBaseRain: boolean;
  notifyRoadChanges: boolean;
  notifyOffPisteChanges: boolean;
  notificationsEnabled: boolean;
}

export interface AlertContext {
  hourly?: HourlyResponse;
  modelRuns?: ModelRunsResponse;
  roadChange?: { fingerprint: string; message: string } | null;
  offPisteChange?: { fingerprint: string; message: string } | null;
}

export interface AlertMatch {
  active: boolean;
  kind: AlertKind;
  zone: LevelId | null;
  zoneName: string | null;
  period: '72h' | '7d' | null;
  accumulationCm: number | null;
  thresholdCm: number | null;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  fingerprint: string | null;
  message: string;
  detail: string | null;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  threshold72hCm: 25,
  threshold7dCm: 40,
  minConfidence: 'Media',
  zone: 'any',
  maxGustKmh: 85,
  modelDeltaCm: 25,
  notifyBaseRain: true,
  notifyRoadChanges: true,
  notifyOffPisteChanges: true,
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

function contextualAlert(
  forecast: ForecastResponse,
  settings: AlertSettings,
  context: AlertContext,
): AlertMatch | null {
  if (settings.notifyRoadChanges && context.roadChange) {
    return {
      active: true,
      kind: 'road-change',
      zone: null,
      zoneName: null,
      period: null,
      accumulationCm: null,
      thresholdCm: null,
      confidenceScore: 100,
      confidenceLabel: 'Alta',
      fingerprint: `road:${context.roadChange.fingerprint}`,
      message: context.roadChange.message,
      detail: 'Cambio detectado respecto de la última consulta guardada en este dispositivo.',
    };
  }

  if (settings.notifyOffPisteChanges && context.offPisteChange) {
    return {
      active: true,
      kind: 'off-piste-change',
      zone: null,
      zoneName: null,
      period: null,
      accumulationCm: null,
      thresholdCm: null,
      confidenceScore: 100,
      confidenceLabel: 'Alta',
      fingerprint: `off-piste:${context.offPisteChange.fingerprint}`,
      message: context.offPisteChange.message,
      detail: 'Cambio del estado oficial guardado localmente.',
    };
  }

  if (settings.notifyBaseRain && context.hourly) {
    const base = context.hourly.levels.find((level) => level.level.id === 'base');
    const point = base?.points.find((item) => (item.rainMm ?? 0) >= 0.2 || ((item.rainMm ?? 0) > 0 && (item.snowfallCm ?? 0) > 0));
    if (point) {
      const confidence = point.precipitationProbability ?? 50;
      return {
        active: true,
        kind: 'base-rain',
        zone: 'base',
        zoneName: 'Base',
        period: null,
        accumulationCm: null,
        thresholdCm: null,
        confidenceScore: confidence,
        confidenceLabel: confidenceLabel(confidence),
        fingerprint: `base-rain:${point.time}:${context.hourly.resort.updatedAt}`,
        message: 'Se pronostica lluvia o mezcla en la Base.',
        detail: `${point.time.slice(0, 16).replace('T', ' ')} · lluvia ${(point.rainMm ?? 0).toFixed(1)} mm · probabilidad ${Math.round(confidence)}%.`,
      };
    }
  }

  if (context.hourly && settings.maxGustKmh > 0) {
    const eligible = new Set(eligibleLevelIds(settings));
    const candidates = context.hourly.levels
      .filter((level) => eligible.has(level.level.id))
      .flatMap((level) => level.points.map((point) => ({ level, point })))
      .filter((item) => (item.point.windGustKmh ?? 0) >= settings.maxGustKmh)
      .sort((left, right) => (right.point.windGustKmh ?? 0) - (left.point.windGustKmh ?? 0));
    const strongest = candidates[0];
    if (strongest?.point.windGustKmh !== null && strongest?.point.windGustKmh !== undefined) {
      const gust = Math.round(strongest.point.windGustKmh);
      return {
        active: true,
        kind: 'gust',
        zone: strongest.level.level.id,
        zoneName: strongest.level.level.name,
        period: null,
        accumulationCm: null,
        thresholdCm: null,
        confidenceScore: 70,
        confidenceLabel: 'Alta',
        fingerprint: `gust:${strongest.level.level.id}:${strongest.point.time}:${gust}:${settings.maxGustKmh}`,
        message: `${strongest.level.level.name}: ráfagas fuertes previstas.`,
        detail: `${gust} km/h frente a un umbral de ${settings.maxGustKmh} km/h.`,
      };
    }
  }

  if (context.modelRuns && settings.modelDeltaCm > 0) {
    const eligible = new Set(eligibleLevelIds(settings));
    const candidates = context.modelRuns.reports.flatMap((report) =>
      (['base', 'mid', 'summit'] as LevelId[])
        .filter((levelId) => eligible.has(levelId))
        .map((levelId) => ({ report, levelId, trend: report.trends[levelId] })),
    )
      .filter((item) => item.trend.delta !== null && Math.abs(item.trend.delta) >= settings.modelDeltaCm)
      .sort((left, right) => Math.abs(right.trend.delta ?? 0) - Math.abs(left.trend.delta ?? 0));
    const strongest = candidates[0];
    if (strongest?.trend.delta !== null && strongest?.trend.delta !== undefined) {
      const delta = strongest.trend.delta;
      const levelName = forecast.levels.find((level) => level.level.id === strongest.levelId)?.level.name ?? strongest.levelId;
      return {
        active: true,
        kind: 'model-change',
        zone: strongest.levelId,
        zoneName: levelName,
        period: '7d',
        accumulationCm: strongest.trend.current,
        thresholdCm: settings.modelDeltaCm,
        confidenceScore: 60,
        confidenceLabel: 'Media',
        fingerprint: `model:${strongest.report.model}:${strongest.levelId}:${context.modelRuns.generatedAt}:${delta}`,
        message: `${strongest.report.shortName} cambió fuertemente su pronóstico para ${levelName}.`,
        detail: `${delta > 0 ? '+' : ''}${delta} cm respecto de la corrida anterior.`,
      };
    }
  }

  return null;
}

export function evaluateAlert(
  forecast: ForecastResponse,
  settings: AlertSettings,
  context: AlertContext = {},
): AlertMatch {
  const contextual = contextualAlert(forecast, settings, context);
  if (contextual) return contextual;

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
      const leftRatio = (left.accumulationCm ?? 0) / Math.max(1, left.thresholdCm);
      const rightRatio = (right.accumulationCm ?? 0) / Math.max(1, right.thresholdCm);
      return rightRatio - leftRatio || right.confidenceScore - left.confidenceScore;
    });

  const best = candidates[0];
  if (!best || best.accumulationCm === null) {
    return {
      active: false,
      kind: 'none',
      zone: null,
      zoneName: null,
      period: null,
      accumulationCm: null,
      thresholdCm: null,
      confidenceScore: 0,
      confidenceLabel: 'Muy baja',
      fingerprint: null,
      message: 'Ningún umbral configurado fue alcanzado con la confianza requerida.',
      detail: null,
    };
  }

  const label = confidenceLabel(best.confidenceScore);
  return {
    active: true,
    kind: 'snow',
    zone: best.level.level.id,
    zoneName: best.level.level.name,
    period: best.period,
    accumulationCm: best.accumulationCm,
    thresholdCm: best.thresholdCm,
    confidenceScore: best.confidenceScore,
    confidenceLabel: label,
    fingerprint: alertFingerprint(forecast, best.level.level.id, best.period),
    message: `${best.level.level.name}: ${best.accumulationCm.toFixed(1)} cm en ${best.period === '72h' ? '72 horas' : '7 días'}, confianza ${label.toLowerCase()}.`,
    detail: `Umbral configurado: ${best.thresholdCm} cm.`,
  };
}
