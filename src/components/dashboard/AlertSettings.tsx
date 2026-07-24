import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import type {
  AlertConfidence,
  AlertMatch,
  AlertSettings as AlertSettingsValue,
  AlertZone,
} from '../../lib/forecast/alerts.js';
import { formatCm } from '../../lib/format.js';
import { Badge } from '../ui/Badge.js';
import { Card } from '../ui/Card.js';

const ZONES: Array<{ value: AlertZone; label: string }> = [
  { value: 'any', label: 'Cualquier cota' },
  { value: 'base', label: 'Base' },
  { value: 'mid', label: 'Montaña media' },
  { value: 'summit', label: 'Alta montaña' },
];

const CONFIDENCES: AlertConfidence[] = ['Baja', 'Media', 'Alta'];

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export function AlertSettings({
  settings,
  match,
  notificationPermission,
  onChange,
  onRequestNotifications,
}: {
  settings: AlertSettingsValue;
  match: AlertMatch | null;
  notificationPermission: NotificationPermission | 'unsupported';
  onChange: (settings: AlertSettingsValue) => void;
  onRequestNotifications: () => Promise<NotificationPermission | 'unsupported'>;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Alertas en este dispositivo</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Umbrales de nieve</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
            Se evalúan al abrir o actualizar la app. No funcionan en segundo plano con la página cerrada.
          </p>
        </div>
        {match?.active ? (
          <Badge className="badge-danger">
            <Bell className="size-3" aria-hidden="true" /> Alerta activa
          </Badge>
        ) : (
          <Badge className="badge-muted">
            <BellOff className="size-3" aria-hidden="true" /> Sin umbral alcanzado
          </Badge>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          <span className="block text-xs font-medium text-slate-500">Umbral en 72 horas</span>
          <div className="mt-2 flex min-h-11 items-center rounded-xl border border-white/10 bg-slate-950/45 px-3">
            <input
              className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none"
              type="number"
              min="0"
              step="1"
              value={settings.threshold72hCm}
              onChange={(event) =>
                onChange({
                  ...settings,
                  threshold72hCm: numberValue(event.target.value, settings.threshold72hCm),
                })
              }
            />
            <span className="text-xs text-slate-500">cm</span>
          </div>
        </label>

        <label className="text-sm text-slate-300">
          <span className="block text-xs font-medium text-slate-500">Umbral en 7 días</span>
          <div className="mt-2 flex min-h-11 items-center rounded-xl border border-white/10 bg-slate-950/45 px-3">
            <input
              className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none"
              type="number"
              min="0"
              step="1"
              value={settings.threshold7dCm}
              onChange={(event) =>
                onChange({
                  ...settings,
                  threshold7dCm: numberValue(event.target.value, settings.threshold7dCm),
                })
              }
            />
            <span className="text-xs text-slate-500">cm</span>
          </div>
        </label>

        <label className="text-sm text-slate-300">
          <span className="block text-xs font-medium text-slate-500">Cota</span>
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 px-3 text-slate-100 outline-none"
            value={settings.zone}
            onChange={(event) =>
              onChange({ ...settings, zone: event.target.value as AlertZone })
            }
          >
            {ZONES.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="block text-xs font-medium text-slate-500">Confianza mínima</span>
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/45 px-3 text-slate-100 outline-none"
            value={settings.minConfidence}
            onChange={(event) =>
              onChange({
                ...settings,
                minConfidence: event.target.value as AlertConfidence,
              })
            }
          >
            {CONFIDENCES.map((confidence) => (
              <option key={confidence} value={confidence}>
                {confidence}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/35 p-4">
        {match?.active ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-rose-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-white">{match.message}</p>
              <p className="mt-1 text-xs text-slate-500">
                Umbral: {formatCm(match.thresholdCm, 0)} · Confianza {match.confidenceLabel.toLowerCase()} ({match.confidenceScore}/100).
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            {match?.message ?? 'Esperando el pronóstico para evaluar los umbrales.'}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="button-primary min-h-11"
          onClick={() => void onRequestNotifications()}
          disabled={notificationPermission === 'denied' || notificationPermission === 'unsupported'}
        >
          <Bell className="size-4" aria-hidden="true" />
          {notificationPermission === 'granted'
            ? 'Notificaciones habilitadas'
            : notificationPermission === 'denied'
              ? 'Permiso bloqueado'
              : notificationPermission === 'unsupported'
                ? 'No compatible'
                : 'Habilitar notificaciones'}
        </button>
        <p className="text-xs text-slate-600">
          La preferencia y los umbrales se guardan solo en este navegador.
        </p>
      </div>
    </Card>
  );
}
