import { ExternalLink, Heart, Snowflake, Wind } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RankedRegionalResort, RegionalResponse } from '../../types/regional.js';
import { Card } from '../ui/Card.js';

type SortKey = 'rank' | 'snow72' | 'snow7d' | 'confidence' | 'wind';

const PHASE_COPY = {
  snow: 'Nieve probable en base',
  'mixed-risk': 'Riesgo de mezcla en base',
  'rain-risk': 'Riesgo de lluvia en base',
  unknown: 'Fase en base incierta',
} as const;

function numberLabel(value: number | null, unit: string): string {
  return value === null ? 'Sin dato' : `${value.toFixed(value % 1 ? 1 : 0)} ${unit}`;
}

function sortedResorts(resorts: RankedRegionalResort[], sort: SortKey): RankedRegionalResort[] {
  return [...resorts].sort((left, right) => {
    if (sort === 'rank') return (left.rank ?? 999) - (right.rank ?? 999) || left.name.localeCompare(right.name, 'es');
    if (sort === 'snow72') return (right.snow72hCm ?? -1) - (left.snow72hCm ?? -1) || left.name.localeCompare(right.name, 'es');
    if (sort === 'snow7d') return (right.snow7dCm ?? -1) - (left.snow7dCm ?? -1) || left.name.localeCompare(right.name, 'es');
    if (sort === 'confidence') return right.confidenceScore - left.confidenceScore || left.name.localeCompare(right.name, 'es');
    return (left.maxGustKmh ?? Number.POSITIVE_INFINITY) - (right.maxGustKmh ?? Number.POSITIVE_INFINITY) || left.name.localeCompare(right.name, 'es');
  });
}

export function RegionalComparator({
  data,
  favorites,
  onToggleFavorite,
}: {
  data: RegionalResponse;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>('rank');
  const resorts = useMemo(() => sortedResorts(data.resorts, sort), [data.resorts, sort]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Argentina y Chile</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Comparador regional</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Ranking meteorológico con puntos representativos de base y cumbre; no reemplaza el parte operativo de cada centro.
          </p>
        </div>
        <label className="text-xs font-medium text-slate-400">
          Ordenar centros
          <select
            aria-label="Ordenar centros"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none sm:w-52"
          >
            <option value="rank">Mejor combinación</option>
            <option value="snow72">Más nieve 72 h</option>
            <option value="snow7d">Más nieve 7 días</option>
            <option value="confidence">Mayor confianza</option>
            <option value="wind">Menor viento</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {resorts.map((resort) => {
          const favorite = favorites.includes(resort.id);
          return (
            <article key={resort.id} className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rounded-lg bg-cyan-300/10 px-2 py-1 text-sm font-semibold text-cyan-100">
                    {resort.rank === null ? '—' : `#${resort.rank}`}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-white">{resort.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{resort.country}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`${favorite ? 'Quitar' : 'Agregar'} ${resort.name} ${favorite ? 'de' : 'a'} favoritos`}
                  aria-pressed={favorite}
                  onClick={() => onToggleFavorite(resort.id)}
                  className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/8 text-slate-400 hover:bg-white/5 hover:text-rose-200"
                >
                  <Heart className={`size-4 ${favorite ? 'fill-current text-rose-300' : ''}`} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/[0.025] p-3">
                  <p className="text-xs text-slate-500">Nieve 72 h</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                    <Snowflake className="size-4 text-sky-200" aria-hidden="true" />
                    {numberLabel(resort.snow72hCm, 'cm')}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.025] p-3">
                  <p className="text-xs text-slate-500">Ráfaga máxima</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                    <Wind className="size-4 text-slate-300" aria-hidden="true" />
                    {numberLabel(resort.maxGustKmh, 'km/h')}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs leading-5 text-slate-400">
                <p>7 días: {numberLabel(resort.snow7dCm, 'cm')} · rango {numberLabel(resort.snowMin7dCm, 'cm')}–{numberLabel(resort.snowMax7dCm, 'cm')}</p>
                <p>Confianza {resort.confidenceLabel.toLowerCase()} ({resort.confidenceScore}/100) · {resort.modelCount} modelos</p>
                <p>{PHASE_COPY[resort.basePhaseRisk]}</p>
                {resort.reasons[0] ? <p className="text-emerald-200">{resort.reasons[0]}</p> : null}
                {resort.penalties[0] ? <p className="text-amber-200">{resort.penalties[0]}</p> : null}
              </div>

              <a
                href={resort.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Sitio oficial <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </article>
          );
        })}
      </div>
    </Card>
  );
}
