import type { LevelForecast } from '../../types/forecast.js';

export type ForecastPeriod = '24h' | '72h' | '7d' | '15d';
export type SnowIntensityTone = 'none' | 'light' | 'moderate' | 'strong' | 'extreme';

export function getSnowIntensity(value: number | null): {
  label: string;
  tone: SnowIntensityTone;
} {
  if (value === null || value < 1) return { label: 'Sin señal', tone: 'none' };
  if (value < 5) return { label: 'Leve', tone: 'light' };
  if (value < 15) return { label: 'Moderada', tone: 'moderate' };
  if (value < 30) return { label: 'Fuerte', tone: 'strong' };
  return { label: 'Muy fuerte', tone: 'extreme' };
}

export function periodDayCount(period: ForecastPeriod): number {
  if (period === '24h') return 1;
  if (period === '72h') return 3;
  if (period === '7d') return 7;
  return 15;
}

export function totalForPeriod(
  totals: LevelForecast['totals'],
  period: ForecastPeriod,
): number | null {
  if (period === '24h') return totals.hours24;
  if (period === '72h') return totals.hours72;
  if (period === '7d') return totals.days7;
  return totals.days15;
}

export function periodLabel(period: ForecastPeriod): string {
  if (period === '24h') return '24 horas';
  if (period === '72h') return '72 horas';
  if (period === '7d') return '7 días';
  return '15 días';
}

export function averageConfidenceForPeriod(
  level: LevelForecast,
  period: ForecastPeriod,
): number {
  const scores = level.daily
    .slice(0, periodDayCount(period))
    .map((day) => day.confidenceScore);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function nextSnowEvent(level: LevelForecast) {
  const next = level.daily.find((day) => (day.snowfallMedianCm ?? 0) >= 1);
  if (!next) return null;
  return {
    date: next.date,
    snowfallCm: next.snowfallMedianCm,
    intensity: getSnowIntensity(next.snowfallMedianCm),
    confidenceLabel: next.confidenceLabel,
  };
}

export type NextSnowEvent = ReturnType<typeof nextSnowEvent>;
