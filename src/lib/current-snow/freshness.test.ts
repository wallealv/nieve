import { describe, expect, test } from 'vitest';
import { classifyFreshness, parseReportedDate } from './freshness.js';

describe('classifyFreshness', () => {
  const now = new Date('2026-07-24T20:00:00Z');

  test('classifies fresh, aging, stale and unknown observations', () => {
    expect(classifyFreshness('2026-07-24T10:00:00Z', now)).toBe('fresh');
    expect(classifyFreshness('2026-07-22T10:00:00Z', now)).toBe('aging');
    expect(classifyFreshness('2026-07-20T10:00:00Z', now)).toBe('stale');
    expect(classifyFreshness(null, now)).toBe('unknown');
  });

  test('does not mark future timestamps stale', () => {
    expect(classifyFreshness('2026-07-25T10:00:00Z', now)).toBe('fresh');
  });
});

describe('parseReportedDate', () => {
  const fetchedAt = '2026-07-24T20:00:00Z';

  test('parses day-first and month-first dates', () => {
    expect(parseReportedDate('20 Jul 2026', fetchedAt)).toBe('2026-07-20T12:00:00.000Z');
    expect(parseReportedDate('Jul 20', fetchedAt)).toBe('2026-07-20T12:00:00.000Z');
    expect(parseReportedDate('20 julio 2026', fetchedAt)).toBe('2026-07-20T12:00:00.000Z');
  });

  test('uses the prior year when a yearless date would be far in the future', () => {
    expect(parseReportedDate('Dec 20', '2026-01-05T12:00:00Z')).toBe(
      '2025-12-20T12:00:00.000Z',
    );
  });

  test('returns null for unsupported text', () => {
    expect(parseReportedDate('actualizado recientemente', fetchedAt)).toBeNull();
  });
});
