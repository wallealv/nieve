import type { HourlyPoint, SnowPhase } from '../../types/hourly.js';

export interface SnowPhaseResult {
  phase: SnowPhase;
  confidence: number;
  reasons: string[];
}

function amount(value: number | null): number {
  return value ?? 0;
}

export function classifyPhase(point: HourlyPoint, elevationM: number): SnowPhaseResult {
  const snowfall = amount(point.snowfallCm);
  const rain = amount(point.rainMm);
  const precipitation = amount(point.precipitationMm);
  const temperature = point.temperatureC;
  const freezingLevel = point.freezingLevelM;

  if (precipitation <= 0.05 && snowfall <= 0.05 && rain <= 0.05) {
    return { phase: 'none', confidence: 95, reasons: ['Sin precipitación medible.'] };
  }

  if (snowfall > 0.05 && rain > 0.05) {
    return { phase: 'mixed', confidence: 90, reasons: ['El modelo publica lluvia y nieve en la misma hora.'] };
  }

  if (rain > 0.05 && snowfall <= 0.05) {
    return {
      phase: 'rain',
      confidence: temperature !== null && temperature > 1 ? 90 : 75,
      reasons: ['El componente líquido domina la precipitación.'],
    };
  }

  if (snowfall > 0.05) {
    if (temperature !== null && temperature <= -2) {
      return {
        phase: 'dry-snow',
        confidence: 88,
        reasons: ['Temperatura suficientemente baja para nieve seca.'],
      };
    }

    if (temperature !== null && temperature > 1.5 && freezingLevel === null) {
      return {
        phase: 'uncertain',
        confidence: 40,
        reasons: ['El modelo publica nieve con temperatura marginal y sin cota de congelación.'],
      };
    }

    if (
      temperature !== null &&
      temperature <= 1.2 &&
      (freezingLevel === null || elevationM >= freezingLevel - 250)
    ) {
      return {
        phase: 'wet-snow',
        confidence: 76,
        reasons: ['Nieve prevista cerca del punto de congelación.'],
      };
    }

    return {
      phase: 'uncertain',
      confidence: 45,
      reasons: ['Las variables térmicas y de precipitación no coinciden con claridad.'],
    };
  }

  return {
    phase: 'uncertain',
    confidence: 35,
    reasons: ['Hay precipitación, pero falta separación confiable entre lluvia y nieve.'],
  };
}
