export function compact(
  values: readonly (number | null | undefined)[],
): number[] {
  return values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
}

export function median(
  values: readonly (number | null | undefined)[],
): number | null {
  const sorted = compact(values).sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function nullableRange(
  values: readonly (number | null | undefined)[],
): { min: number | null; max: number | null } {
  const present = compact(values);
  if (present.length === 0) return { min: null, max: null };
  return { min: Math.min(...present), max: Math.max(...present) };
}

export function sumNullable(
  values: readonly (number | null | undefined)[],
): number | null {
  const present = compact(values);
  return present.length === 0
    ? null
    : present.reduce((total, value) => total + value, 0);
}

export function round(value: number | null, digits = 1): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
