import { useMemo, useState } from 'react';
import type { RegionalGridResponse, RegionalMapPeriod } from '../../types/regional.js';
import { Card } from '../ui/Card.js';

const PERIODS: RegionalMapPeriod[] = ['6h', '12h', '24h', '48h', '72h'];
const MIN_LAT = -56;
const MAX_LAT = -32;
const MIN_LON = -72.5;
const MAX_LON = -67;

function project(latitude: number, longitude: number, id: string) {
  const baseX = 50 + ((longitude - MIN_LON) / (MAX_LON - MIN_LON)) * 620;
  const x = baseX + (id.endsWith('-base') ? -7 : 7);
  const y = 50 + ((MAX_LAT - latitude) / (MAX_LAT - MIN_LAT)) * 560;
  return { x, y };
}

function phaseLabel(phase: RegionalGridResponse['points'][number]['phase']): string {
  return {
    snow: 'nieve',
    'mixed-risk': 'mezcla posible',
    'rain-risk': 'lluvia posible',
    unknown: 'fase incierta',
  }[phase];
}

function amountLabel(value: number | null): string {
  return value === null ? 'Sin dato' : `${value.toFixed(value % 1 ? 1 : 0)} cm`;
}

export function RegionalSnowMap({ data }: { data: RegionalGridResponse }) {
  const [period, setPeriod] = useState<RegionalMapPeriod>('24h');
  const points = useMemo(
    () => data.points.map((point) => ({ ...point, ...project(point.latitude, point.longitude, point.id) })),
    [data.points],
  );

  return (
    <Card className="p-5 sm:p-6">
      <div>
        <p className="eyebrow">Guía ECMWF · puntos fijos</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Mapa regional de nieve</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
          Visualización esquemática de bases y cumbres. El tamaño indica acumulación; el texto y el contorno indican fase y cantidad.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Horizonte del mapa">
        {PERIODS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={period === item}
            onClick={() => setPeriod(item)}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium ${period === item ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100' : 'border-white/8 text-slate-400 hover:bg-white/5'}`}
          >
            {item.replace('h', ' h')}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-slate-950/45">
        <svg
          viewBox="0 0 720 660"
          role="img"
          aria-label={`Mapa esquemático de nieve prevista a ${period.replace('h', ' horas')}`}
          className="h-auto w-full"
        >
          <path d="M420 20 C350 110 440 190 360 280 C300 350 410 420 330 640" fill="none" stroke="currentColor" strokeWidth="44" className="text-slate-800/55" />
          <path d="M420 20 C350 110 440 190 360 280 C300 350 410 420 330 640" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 9" className="text-slate-600/60" />
          <text x="28" y="32" className="fill-slate-600 text-[14px]">Norte</text>
          <text x="28" y="636" className="fill-slate-600 text-[14px]">Sur</text>
          {points.map((point) => {
            const value = point.snowfallCm[period];
            const radius = value === null ? 7 : Math.min(28, 8 + Math.sqrt(Math.max(0, value)) * 2.2);
            const phaseClass = point.phase === 'rain-risk'
              ? 'fill-amber-300/45 stroke-amber-100'
              : point.phase === 'mixed-risk'
                ? 'fill-violet-300/45 stroke-violet-100'
                : point.phase === 'snow'
                  ? 'fill-sky-300/45 stroke-sky-100'
                  : 'fill-slate-500/40 stroke-slate-300';
            return (
              <g key={point.id}>
                <circle cx={point.x} cy={point.y} r={radius} className={phaseClass} strokeWidth="2" strokeDasharray={point.phase === 'mixed-risk' ? '4 3' : undefined}>
                  <title>{point.name}: {amountLabel(value)}, {phaseLabel(point.phase)}</title>
                </circle>
                <text x={point.x} y={point.y + 4} textAnchor="middle" className="fill-white text-[11px] font-semibold">
                  {value === null ? '—' : Math.round(value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {points.map((point) => (
          <article key={point.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-slate-950/30 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{point.name}</p>
              <p className="mt-0.5 text-xs capitalize text-slate-500">{phaseLabel(point.phase)}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-cyan-100">{amountLabel(point.snowfallCm[period])}</p>
          </article>
        ))}
      </div>

      {data.warning ? <p className="mt-4 text-xs leading-5 text-slate-500">{data.warning}</p> : null}
    </Card>
  );
}
