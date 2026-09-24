// SERVER-ONLY (see ./client.ts). Dates stored in schema `nieve` are local to the resort.
import { RESORT } from '../../config/mountain.js';

const resortDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: RESORT.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` of an instant in America/Argentina/Mendoza, or null for an invalid date. */
export function resortLocalDate(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = Object.fromEntries(
    resortDateFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Adds (or subtracts) whole days to a `YYYY-MM-DD` calendar date. */
export function addCalendarDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
