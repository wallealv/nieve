import { MountainSnow, Route, Sparkles } from 'lucide-react';
import type { BestScoredWindow, BestWindowSummary } from '../../types/hourly.js';
import { Card } from '../ui/Card.js';

const LEVEL_NAMES = { base: 'Base', mid: 'Montaña media', summit: 'Alta montaña' } as const;

function formatWindow(window: BestScoredWindow): string {
  const start = new Date(window.startTime);
  const end = new Date(window.endTime);
  const date = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'short' }).format(start);
  const startTime = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(start);
  const endTime = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(end);
  return `${date}, ${startTime}–${endTime}`;
}

function WindowCard({
  label,
  window,
  icon: Icon,
}: {
  label: string;
  window: BestScoredWindow | null;
  icon: typeof Sparkles;
}) {
  return (
    <article className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-sky-200" aria-hidden="true" />
          <h3 className="font-semibold text-white">{label}</h3>
        </div>
        {window ? <span className="text-sm font-semibold text-cyan-100">{window.score}/100</span> : null}
      </div>
      {window ? (
        <>
          <p className="mt-3 text-sm font-medium text-slate-100">{LEVEL_NAMES[window.levelId]}</p>
          <p className="mt-1 text-xs capitalize leading-5 text-slate-400">{formatWindow(window)}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {window.snowfallCm.toFixed(1)} cm · ráfagas {window.gustMaxKmh === null ? 's/d' : `${Math.round(window.gustMaxKmh)} km/h`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-400">Sin ventana habilitada o con datos suficientes.</p>
      )}
    </article>
  );
}

export function BestWindows({ summary }: { summary: BestWindowSummary | null }) {
  return (
    <Card className="mt-5 p-5 sm:p-6">
      <div>
        <p className="eyebrow">Decisión rápida</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Mejores ventanas para esquiar</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Puntajes estimados con nieve, fase, viento, visibilidad y estado oficial disponible.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <WindowCard label="Powder" window={summary?.powder ?? null} icon={Sparkles} />
        <WindowCard label="Pista" window={summary?.piste ?? null} icon={Route} />
        <WindowCard label="Freeride" window={summary?.freeride ?? null} icon={MountainSnow} />
      </div>
      {summary?.bestDay ? (
        <p className="mt-4 text-xs text-slate-500">
          Mejor día general: {new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Mendoza' }).format(new Date(`${summary.bestDay.date}T12:00:00-03:00`))} ({summary.bestDay.score}/100).
        </p>
      ) : null}
    </Card>
  );
}
