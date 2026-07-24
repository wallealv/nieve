import { Droplets, Info, Snowflake } from 'lucide-react';
import { buildThreeHourWindows } from '../../lib/forecast/windows.js';
import type { HourlyLevelForecast, SnowPhase, SnowQualityLabel } from '../../types/hourly.js';
import { Card } from '../ui/Card.js';

const PHASE_LABELS: Record<SnowPhase, string> = {
  rain: 'Lluvia',
  mixed: 'Lluvia y nieve mezcladas',
  'wet-snow': 'Nieve húmeda',
  'dry-snow': 'Nieve seca',
  none: 'Sin precipitación',
  uncertain: 'Fase incierta',
};

const QUALITY_LABELS: Record<SnowQualityLabel, string> = {
  'dry-powder': 'Polvo seco',
  'dense-powder': 'Polvo más denso',
  'wet-snow': 'Nieve húmeda',
  'wind-affected': 'Nieve venteada',
  'compaction-risk': 'Compactación probable',
  'crust-ice-risk': 'Costra o hielo probable',
  'corn-possible': 'Nieve primavera posible',
  uncertain: 'Calidad incierta',
};

export function SnowPhaseQuality({ level }: { level: HourlyLevelForecast }) {
  const windows = buildThreeHourWindows(level).slice(0, 8);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-sky-300/15 bg-sky-300/10 p-2.5 text-sky-100">
          <Droplets className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Tipo de precipitación · {level.level.shortName}</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Fase y calidad estimada</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Es una estimación meteorológica, no una observación del estado real de la pista.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {windows.map((window) => (
          <article key={window.startTime} className="grid gap-2 rounded-xl border border-white/8 bg-slate-950/30 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium text-white">
                {new Intl.DateTimeFormat('es-AR', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }).format(new Date(window.startTime))}
              </p>
              <p className="mt-1 text-xs text-slate-500">{window.snowfallCm.toFixed(1)} cm en el bloque</p>
            </div>
            <p className="flex items-center gap-2 text-sm text-slate-300"><Snowflake className="size-4 text-sky-200" aria-hidden="true" /> {PHASE_LABELS[window.phase]}</p>
            <p className="text-sm font-medium text-cyan-100">{QUALITY_LABELS[window.quality]}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Viento, radiación y cambios térmicos pueden transformar la nieve rápidamente después de caer.
      </p>
    </Card>
  );
}
