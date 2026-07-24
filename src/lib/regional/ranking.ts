import type { RankedRegionalResort, RegionalResortSummary } from '../../types/regional.js';

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function rankRegionalResorts(
  resorts: RegionalResortSummary[],
): RankedRegionalResort[] {
  const scored = resorts.map((resort): RankedRegionalResort => {
    if (resort.snow72hCm === null && resort.snow7dCm === null) {
      return {
        ...resort,
        rank: null,
        score: null,
        status: 'insufficient',
        reasons: [],
        penalties: ['No hay suficientes datos meteorológicos.'],
      };
    }

    const reasons: string[] = [];
    const penalties: string[] = [];
    let score = 20;
    if (resort.snow72hCm !== null) {
      score += Math.min(45, resort.snow72hCm * 0.7);
      if (resort.snow72hCm >= 30) reasons.push('Acumulación importante en 72 horas.');
    }
    score += resort.confidenceScore * 0.3;
    if (resort.confidenceScore >= 70) reasons.push('Buena coincidencia entre modelos.');

    if ((resort.maxGustKmh ?? 0) >= 90) {
      score -= 28;
      penalties.push('Viento muy fuerte previsto.');
    } else if ((resort.maxGustKmh ?? 0) >= 70) {
      score -= 16;
      penalties.push('Viento fuerte previsto.');
    }

    if (resort.basePhaseRisk === 'rain-risk') {
      score -= 30;
      penalties.push('Riesgo de lluvia en la base.');
    } else if (resort.basePhaseRisk === 'mixed-risk') {
      score -= 15;
      penalties.push('Riesgo de mezcla en la base.');
    }

    if (resort.modelCount < 3) {
      score -= resort.modelCount === 2 ? 5 : 15;
      penalties.push('Consenso basado en menos modelos.');
    }

    return {
      ...resort,
      rank: null,
      score: clamp(score),
      status: 'ranked',
      reasons,
      penalties,
    };
  });

  const ranked = scored
    .filter((item) => item.status === 'ranked')
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || left.name.localeCompare(right.name, 'es'));
  const ranks = new Map(ranked.map((item, index) => [item.id, index + 1]));

  return scored
    .map((item) => ({ ...item, rank: ranks.get(item.id) ?? null }))
    .sort((left, right) => {
      if (left.rank === null && right.rank === null) return left.name.localeCompare(right.name, 'es');
      if (left.rank === null) return 1;
      if (right.rank === null) return -1;
      return left.rank - right.rank;
    });
}
