import { Eye, Snowflake, Wind } from 'lucide-react';
import { buildThreeHourWindows } from '../../lib/forecast/windows.js';
import type { HourlyLevelForecast } from '../../types/hourly.js';
import { Card } from '../ui/Card.js';

function phaseLabel(phase: ReturnType<typeof buildThreeHourWindows>[number]['phase']): string {
  return {
    rain: 'Lluvia',
    mixed: 'Mezcla',
    'wet-snow': 'Nieve húmeda',
    'dry-snow': 'Nieve seca',
    none: 'Sin precipitación',
    uncertain: 'Fase incierta',
  }[phase];
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Mendoza',
  }).format(new Date(value));
}

export function HourlyTimeline({ level }: { level: HourlyLevelForecast }) {
  const windows = buildThreeHourWindows(level);

  return (
    <Card className="p-5 sm:p-6">
      <div>
        <p className="eyebrow">Detalle horario · {level.level.shortName}</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Próximas 72 horas</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">Bloques de tres horas; los datos originales se conservan por hora.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {windows.slice(0, 12).map((window) => (
          <article key={window.startTime} className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
            <p className="text-xs capitalize text-slate-500">{timeLabel(window.startTime)}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-semibold text-white">{window.snowfallCm.toFixed(window.snowfallCm % 1 ? 1 : 0)} cm</p>
                <p className="mt-1 text-xs text-slate-400">{phaseLabel(window.phase)}</p>
              </div>
              <Snowflake className="size-5 text-sky-200" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <p className="flex items-center gap-2"><Wind className="size-3.5" aria-hidden="true" /> Ráfagas {window.gustMaxKmh === null ? 's/d' : `${Math.round(window.gustMaxKmh)} km/h`}</p>
              <p className="flex items-center gap-2"><Eye className="size-3.5" aria-hidden="true" /> {window.visibilityMinM === null ? 'Visibilidad s/d' : `${(window.visibilityMinM / 1000).toFixed(1)} km`}</p>
            </div>
          </article>
        ))}
      </div>
      {windows.length > 12 ? (
        <details className="mt-4 rounded-xl border border-white/8 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-300">Ver el resto de las 72 horas</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {windows.slice(12).map((window) => (
              <article key={window.startTime} className="rounded-xl bg-white/[0.025] p-3 text-xs text-slate-400">
                <p className="capitalize">{timeLabel(window.startTime)}</p>
                <p className="mt-1 font-semibold text-white">{window.snowfallCm.toFixed(1)} cm · {phaseLabel(window.phase)}</p>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </Card>
  );
}
