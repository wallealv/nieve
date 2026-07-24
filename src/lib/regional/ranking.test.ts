import { describe, expect, test } from 'vitest';
import type { RegionalResortSummary } from '../../types/regional.js';
import { rankRegionalResorts } from './ranking.js';

function resort(overrides: Partial<RegionalResortSummary> = {}): RegionalResortSummary {
  return {
    id: 'las-lenas',
    name: 'Las Leñas',
    country: 'Argentina',
    officialUrl: 'https://laslenas.com/',
    representativeLatitude: -35.14,
    representativeLongitude: -70.09,
    snow72hCm: 45,
    snow7dCm: 80,
    snowMin7dCm: 65,
    snowMax7dCm: 95,
    confidenceScore: 75,
    confidenceLabel: 'Alta',
    maxGustKmh: 45,
    basePhaseRisk: 'snow',
    modelCount: 3,
    warnings: [],
    ...overrides,
  };
}

describe('rankRegionalResorts', () => {
  test('rewards snow and confidence while penalizing wind and rain at base', () => {
    const ranked = rankRegionalResorts([
      resort({ id: 'snowy', name: 'Snowy', snow72hCm: 60, confidenceScore: 85 }),
      resort({ id: 'windy', name: 'Windy', snow72hCm: 70, maxGustKmh: 110 }),
      resort({ id: 'rainy', name: 'Rainy', snow72hCm: 75, basePhaseRisk: 'rain-risk' }),
    ]);
    expect(ranked[0]?.id).toBe('snowy');
    expect(ranked.find((item) => item.id === 'windy')?.penalties.join(' ')).toMatch(/viento/i);
    expect(ranked.find((item) => item.id === 'rainy')?.penalties.join(' ')).toMatch(/lluvia/i);
  });

  test('uses deterministic alphabetical ties', () => {
    const ranked = rankRegionalResorts([
      resort({ id: 'b', name: 'Beta' }),
      resort({ id: 'a', name: 'Alfa' }),
    ]);
    expect(ranked.map((item) => item.name)).toEqual(['Alfa', 'Beta']);
  });

  test('marks insufficient data without inventing a score', () => {
    const [item] = rankRegionalResorts([
      resort({ snow72hCm: null, snow7dCm: null, confidenceScore: 0, modelCount: 0 }),
    ]);
    expect(item?.score).toBeNull();
    expect(item?.status).toBe('insufficient');
  });
});
