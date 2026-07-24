import { Clock3, TrendingDown, TrendingUp } from 'lucide-react';
import {
  forecastTrend,
  forecastVerification,
  type ForecastSnapshot,
} from '../../lib/forecast/history.js';
import { formatCm, formatDateTime } from '../../lib/format.js';
import type { LevelId } from '../../types/forecast.js';
import { Badge } from '../ui/Badge.js';
import { Card } from '../ui/Card.js';

const LEVEL_LABELS: Record<LevelId, string> = {
  base: 'Base',
  mid: 'Montaña media',
  summit: 'Alta montaña',
};

export function ForecastHistory({
  history,
  levelId,
}: {
  history: ForecastSnapshot[];
  levelId: LevelId;
}) {
  const trend = forecastTrend(history, levelId);
  const verification = forecastVerification(history, levelId);
  const maxValue = Math.max(1, ...trend.points.map((point) => point.value));

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Evolución de corridas</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Tendencia en {LEVEL_LABELS[levelId]}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Historial guardado únicamente en este dispositivo.
          </p>
        </div>
        {trend.delta !== null ? (
          <Badge
            className={
              trend.direction === 'up'
                ? 'badge-info'
                : trend.direction === 'down'
                  ? 'badge-warning'
                  : 'badge-muted'
            }
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="size-3" aria-hidden="true" />
            ) : trend.direction === 'down' ? (
              <TrendingDown className="size-3" aria-hidden="true" />
            ) : null}
            {trend.delta > 0 ? '+' : ''}{formatCm(trend.delta, 1)} desde la corrida anterior
          </Badge>
        ) : (
          <Badge className="badge-muted">Esperando otra corrida</Badge>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/35 p-4">
        <div className="flex items-end gap-2" aria-label="Acumulado previsto a siete días por corrida">
          {trend.points.length ? (
            trend.points.map((point) => (
              <div key={point.updatedAt} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-slate-500">{Math.round(point.value)}</span>
                <div className="flex h-24 w-full items-end rounded-lg bg-white/[0.025] p-1">
                  <div
                    className="w-full rounded-md bg-sky-300/35"
                    style={{ height: `${Math.max(5, (point.value / maxValue) * 100)}%` }}
                  />
                </div>
                <span className="truncate text-[9px] text-slate-600">
                  {new Date(point.updatedAt).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-slate-500">Todavía no hay corridas guardadas.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Acumulado actual a 7 días: {formatCm(trend.current, 1)}.
        </p>
      </div>

      {verification ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-sm">
          <div className="flex items-center gap-2 text-slate-200">
            <Clock3 className="size-4 text-sky-200" aria-hidden="true" />
            Verificación orientativa del {verification.date}
          </div>
          <p className="mt-2 leading-6 text-slate-400">
            La corrida anterior estimaba {formatCm(verification.forecastCm, 1)} y el parte más
            reciente informó {formatCm(verification.observedCm, 1)} de nieve nueva en 24 h.
            Diferencia: {verification.differenceCm > 0 ? '+' : ''}
            {formatCm(verification.differenceCm, 1)}.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Las cotas y métodos de medición pueden no coincidir exactamente.
          </p>
        </div>
      ) : null}

      {history.length ? (
        <p className="mt-3 text-xs text-slate-600">
          Último registro local: {formatDateTime(history.at(-1)!.savedAt)} · {history.length}/30
          snapshots.
        </p>
      ) : null}
    </Card>
  );
}
