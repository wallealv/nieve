import { lazy, Suspense, useState } from 'react';
import { Map, X } from 'lucide-react';
import { SectionSkeleton } from '../dashboard/SectionSkeleton.js';
import { useRegionalGrid } from '../../hooks/useRegionalGrid.js';

const RegionalSnowMap = lazy(() =>
  import('./RegionalSnowMap.js').then((module) => ({ default: module.RegionalSnowMap })),
);

export function RegionalSnowMapLoader() {
  const [opened, setOpened] = useState(false);
  const grid = useRegionalGrid(opened);

  if (!opened) {
    return (
      <section className="mt-5 rounded-2xl border border-white/8 bg-white/[0.018] p-5 text-center sm:p-6" aria-label="Mapa regional opcional">
        <Map className="mx-auto size-8 text-sky-200" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-white">Mapa regional bajo demanda</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Se carga únicamente al abrirlo para ahorrar datos, JavaScript y consultas meteorológicas.
        </p>
        <button type="button" onClick={() => setOpened(true)} className="button-primary mt-4 min-h-11">
          <Map className="size-4" aria-hidden="true" /> Abrir mapa regional
        </button>
      </section>
    );
  }

  return (
    <section className="mt-5" aria-label="Mapa regional abierto">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setOpened(false)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/8 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
        >
          <X className="size-4" aria-hidden="true" /> Cerrar mapa
        </button>
      </div>
      {grid.isPending ? (
        <SectionSkeleton label="Cargando mapa regional…" />
      ) : grid.data ? (
        <Suspense fallback={<SectionSkeleton label="Preparando visualización regional…" />}>
          <RegionalSnowMap data={grid.data} />
        </Suspense>
      ) : (
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-5 text-sm text-amber-100">
          {grid.error instanceof Error ? grid.error.message : 'El mapa regional no está disponible.'}
        </div>
      )}
    </section>
  );
}
