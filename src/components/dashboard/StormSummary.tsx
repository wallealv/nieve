import { MountainSnow, Snowflake, Wind } from 'lucide-react';
import type { StormEvent } from '../../lib/forecast/storm.js';
import {
  formatCm,
  formatElevation,
  formatLongDay,
  formatWind,
} from '../../lib/format.js';
import { Badge } from '../ui/Badge.js';
import { Card } from '../ui/Card.js';

const INTENSITY_CLASS: Record<StormEvent['intensity'], string> = {
  moderate: 'badge-info',
  strong: 'badge-warning',
  extreme: 'badge-danger',
};

function eventDate(event: StormEvent): string {
  if (event.startDate === event.endDate) return formatLongDay(event.startDate);
  return `${formatLongDay(event.startDate)} al ${formatLongDay(event.endDate)}`;
}

export function StormSummary({ event }: { event: StormEvent | null }) {
  if (!event) {
    return (
      <Card className="mt-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5 text-slate-300">
            <Snowflake className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Próximos 7 días</p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Sin nevada significativa prevista
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              No aparece un evento continuo de al menos 10 cm en alta montaña.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-5 overflow-hidden p-0">
      <div className="border-b border-white/8 bg-[linear-gradient(120deg,rgba(14,116,144,.18),rgba(15,23,42,.05))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-100">
              <MountainSnow className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow">Tormenta principal</p>
                <Badge className={INTENSITY_CLASS[event.intensity]}>
                  {event.intensityLabel}
                </Badge>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {eventDate(event)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Pico estimado {formatLongDay(event.peakDate)} con {formatCm(event.peakSnowCm, 1)}.
                Confianza {event.confidenceLabel.toLowerCase()} ({event.confidenceScore}/100).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-72">
            <div className="rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-slate-500">Viento máximo</p>
              <p className="mt-1 font-semibold text-slate-100">{formatWind(event.windMaxKmh)}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-slate-500">Ráfagas</p>
              <p className="mt-1 font-semibold text-slate-100">{formatWind(event.gustMaxKmh)}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-slate-500">Cota de congelación durante el evento</p>
              <p className="mt-1 font-semibold text-slate-100">
                {formatElevation(event.freezingLevelMinM)}–{formatElevation(event.freezingLevelMaxM)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        {event.levels.map((level) => (
          <article key={level.levelId} className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{level.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{formatElevation(level.elevationM)}</p>
              </div>
              <Snowflake className="size-4 text-sky-200" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {formatCm(level.totalCm, 1)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Rango entre modelos: {formatCm(level.minCm, 1)}–{formatCm(level.maxCm, 1)}
            </p>
          </article>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-white/8 px-5 py-3 text-xs text-slate-500 sm:px-6">
        <Wind className="size-3.5" aria-hidden="true" />
        Evento derivado del consenso diario; los extremos corresponden al rango de modelos.
      </div>
    </Card>
  );
}
