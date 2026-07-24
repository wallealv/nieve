import { describe, expect, test, vi } from 'vitest';
import { MOUNTAIN_LEVELS } from '../../config/mountain.js';
import { buildClimatologyUrl, fetchClimatology } from './climatology.js';

function payload(elevation: number, multiplier: number) {
  return {
    elevation,
    daily: {
      time: [
        '2024-07-24', '2024-07-25', '2024-07-26', '2024-07-27', '2024-07-28', '2024-07-29', '2024-07-30',
        '2025-07-24', '2025-07-25', '2025-07-26', '2025-07-27', '2025-07-28', '2025-07-29', '2025-07-30',
      ],
      snowfall_sum: Array.from({ length: 14 }, () => multiplier),
    },
  };
}

describe('snowfall climatology', () => {
  test('requests one daily multi-location archive range', () => {
    const url = buildClimatologyUrl(MOUNTAIN_LEVELS, new Date('2026-07-24T12:00:00Z'), 10);
    expect(url.origin).toBe('https://archive-api.open-meteo.com');
    expect(url.searchParams.get('latitude')?.split(',')).toHaveLength(3);
    expect(url.searchParams.get('daily')).toBe('snowfall_sum');
    expect(url.searchParams.get('start_date')).toBe('2016-01-01');
    expect(url.searchParams.get('end_date')).toBe('2025-12-31');
  });

  test('computes seven-day normals and ranges by level', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        payload(2240, 1),
        payload(2800, 2),
        payload(3430, 3),
      ]), { status: 200 }),
    );
    const response = await fetchClimatology(
      new Date('2026-07-24T12:00:00Z'),
      10,
      fetchMock as typeof fetch,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.levels.find((item) => item.levelId === 'base')?.average7dCm).toBe(7);
    expect(response.levels.find((item) => item.levelId === 'summit')?.average7dCm).toBe(21);
    expect(response.levels[0]?.sampleYears).toBe(2);
  });

  test('preserves null when no matching historical window exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(MOUNTAIN_LEVELS.map((level) => ({ elevation: level.elevationM, daily: { time: [], snowfall_sum: [] } }))), { status: 200 }),
    );
    const response = await fetchClimatology(new Date('2026-07-24T12:00:00Z'), 10, fetchMock as typeof fetch);
    expect(response.levels.every((item) => item.average7dCm === null)).toBe(true);
  });
});
