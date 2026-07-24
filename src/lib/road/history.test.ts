import { describe, expect, test } from 'vitest';
import type { RoadStatus } from '../../types/road.js';
import { compareRoadStatus } from './history.js';

function road(overrides: Partial<RoadStatus> = {}): RoadStatus {
  return {
    route: 'RP 222', destination: 'Las Leñas', status: 'open', statement: 'Transitable.',
    chainsRequired: false, machineryWorking: false, hazards: [], reportedAt: '2026-07-24T08:00:00-03:00',
    fetchedAt: '2026-07-24T12:00:00Z', sourceName: 'Gobierno de Mendoza', sourceUrl: 'https://example.com',
    ...overrides,
  };
}

describe('compareRoadStatus', () => {
  test('returns null for the first snapshot or identical states', () => {
    expect(compareRoadStatus(null, road())).toBeNull();
    expect(compareRoadStatus(road(), road({ fetchedAt: '2026-07-24T13:00:00Z' }))).toBeNull();
  });

  test('detects closure and chains changes', () => {
    const change = compareRoadStatus(
      road(),
      road({ status: 'closed', chainsRequired: true, statement: 'Intransitable; cadenas obligatorias.' }),
    );
    expect(change?.changedFields).toEqual(expect.arrayContaining(['status', 'chainsRequired']));
    expect(change?.message).toMatch(/cerrada/i);
    expect(change?.fingerprint).toContain('open:closed');
  });

  test('detects machinery activation without inventing a status change', () => {
    const change = compareRoadStatus(road(), road({ machineryWorking: true }));
    expect(change?.changedFields).toEqual(['machineryWorking']);
    expect(change?.message).toMatch(/maquinaria/i);
  });
});
