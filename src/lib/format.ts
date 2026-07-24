import type { ConfidenceLabel, ForecastBand } from '../types/forecast.js';

const dayFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
});

const longDayFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function dateFromIsoDay(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

export function formatDay(date: string): string {
  return dayFormatter.format(dateFromIsoDay(date)).replace('.', '');
}

export function formatLongDay(date: string): string {
  return longDayFormatter.format(dateFromIsoDay(date));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatCm(value: number | null, digits = 0): string {
  if (value === null) return '—';
  return `${value.toFixed(digits)} cm`;
}

export function formatTemperature(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}°`;
}

export function formatWind(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)} km/h`;
}

export function formatElevation(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value).toLocaleString('es-AR')} m`;
}

export function bandLabel(band: ForecastBand): string {
  if (band === 'operational') return 'Operativo';
  if (band === 'extended') return 'Tendencia';
  return 'Baja confianza';
}

export function confidenceClass(label: ConfidenceLabel): string {
  if (label === 'Alta') return 'badge-success';
  if (label === 'Media') return 'badge-info';
  if (label === 'Baja') return 'badge-warning';
  return 'badge-muted';
}
