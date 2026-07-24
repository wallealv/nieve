import type {
  ConfidenceLabel,
  ForecastBand,
} from '../../types/forecast.js';
import { compact, median } from './math.js';

export function bandForDay(dayIndex: number): ForecastBand {
  if (dayIndex <= 7) return 'operational';
  if (dayIndex <= 10) return 'extended';
  return 'guidance';
}

export function confidenceLabelForScore(score: number): ConfidenceLabel {
  if (score >= 75) return 'Alta';
  if (score >= 50) return 'Media';
  if (score >= 25) return 'Baja';
  return 'Muy baja';
}

export function calculateConfidence(input: {
  values: readonly (number | null)[];
  dayIndex: number;
  expectedModels: number;
}): { score: number; label: ConfidenceLabel } {
  const values = compact(input.values);
  if (values.length === 0) return { score: 0, label: 'Muy baja' };

  const center = median(values) ?? 0;
  const spread = Math.max(...values) - Math.min(...values);
  const dispersionPenalty =
    center > 1
      ? Math.min(45, (spread / center) * 30)
      : Math.min(25, spread * 4);
  const horizonPenalty = input.dayIndex <= 7 ? 0 : input.dayIndex <= 10 ? 15 : 30;
  const coveragePenalty =
    Math.max(0, input.expectedModels - values.length) * 12;
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 - dispersionPenalty - horizonPenalty - coveragePenalty,
      ),
    ),
  );

  return { score, label: confidenceLabelForScore(score) };
}
