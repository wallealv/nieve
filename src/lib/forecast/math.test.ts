import { describe, expect, test } from 'vitest';
import { median, nullableRange, sumNullable } from './math.js';

describe('forecast math', () => {
  test('median ignores null values and handles even counts', () => {
    expect(median([4, null, 10, 8, 6])).toBe(7);
  });

  test('range returns nulls when every value is absent', () => {
    expect(nullableRange([null, null])).toEqual({ min: null, max: null });
  });

  test('sum keeps an all-null series absent', () => {
    expect(sumNullable([null, null])).toBeNull();
  });
});
