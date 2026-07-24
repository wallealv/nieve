import type { HourlyPoint, SnowQualityLabel } from '../../types/hourly.js';
import type { SnowPhaseResult } from './phase.js';

export interface SnowQualityResult {
  label: SnowQualityLabel;
  confidence: number;
  reasons: string[];
}

export function estimateSnowQuality(
  point: HourlyPoint,
  phase: SnowPhaseResult,
): SnowQualityResult {
  const temperature = point.temperatureC;
  const gust = point.windGustKmh ?? 0;
  const wind = point.windSpeedKmh ?? 0;
  const rain = point.rainMm ?? 0;
  const radiation = point.shortwaveRadiationWm2 ?? 0;

  if (phase.phase === 'uncertain' || phase.phase === 'none' || phase.phase === 'rain') {
    return {
      label: 'uncertain',
      confidence: phase.confidence,
      reasons: ['No hay una señal suficientemente clara de nieve acumulable.'],
    };
  }

  if (rain > 0.1 && temperature !== null && temperature < 0) {
    return {
      label: 'crust-ice-risk',
      confidence: 82,
      reasons: ['Lluvia o mezcla seguida por temperatura bajo cero.'],
    };
  }

  if (gust >= 70 || wind >= 45) {
    return {
      label: 'wind-affected',
      confidence: 84,
      reasons: ['El viento puede transportar y compactar la nieve nueva.'],
    };
  }

  if (phase.phase === 'wet-snow' || (temperature !== null && temperature > -1)) {
    return {
      label: 'wet-snow',
      confidence: 82,
      reasons: ['La temperatura está cerca del punto de fusión.'],
    };
  }

  if (
    phase.phase === 'dry-snow' &&
    temperature !== null &&
    temperature <= -4 &&
    gust < 45
  ) {
    return {
      label: 'dry-powder',
      confidence: 88,
      reasons: ['Nieve con temperatura baja y viento limitado.'],
    };
  }

  if (radiation >= 500 && temperature !== null && temperature >= 0) {
    return {
      label: 'corn-possible',
      confidence: 65,
      reasons: ['Radiación y temperatura favorables a transformación primaveral.'],
    };
  }

  if (phase.phase === 'dry-snow') {
    return {
      label: 'dense-powder',
      confidence: 72,
      reasons: ['Nieve sólida, pero sin condiciones suficientes para polvo muy seco.'],
    };
  }

  return {
    label: 'compaction-risk',
    confidence: 60,
    reasons: ['Temperatura, humedad o viento favorecen compactación.'],
  };
}
