import { AlertTriangle, ExternalLink, LoaderCircle, Route, Snowflake } from 'lucide-react';
import type { RoadState, RoadStatus } from '../../types/road.js';
import { Card } from '../ui/Card.js';

const STATUS_LABELS: Record<RoadState, string> = {
  open: 'Transitable',
  caution: 'Transitable con precaución',
  'extreme-caution': 'Suma precaución',
  'chains-required': 'Cadenas obligatorias',
  closed: 'Ruta cerrada',
  unknown: 'Sin estado oficial interpretable',
};

export function RoadStatusCard({
  data,
  isPending,
  error,
}: {
  data: RoadStatus | undefined;
  isPending: boolean;
  error: Error | null;
}) {
  return (
    <Card className="mt-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/10 p-2.5 text-amber-100">
            <Route className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Acceso a Las Leñas</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Estado de la RP 222</h2>
            {isPending && !data ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Consultando parte oficial…</p>
            ) : data ? (
              <>
                <p className="mt-2 text-lg font-semibold text-amber-100">{STATUS_LABELS[data.status]}</p>
                {data.statement ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{data.statement}</p> : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No se pudo leer un parte oficial reciente.</p>
            )}
          </div>
        </div>

        {data ? (
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Ver parte oficial <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {data ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-slate-950/35 p-3">
            <p className="text-xs text-slate-500">Cadenas</p>
            <p className="mt-1 font-semibold text-white">{data.chainsRequired === null ? 'Sin dato' : data.chainsRequired ? 'Obligatorias' : 'No indicadas'}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-950/35 p-3">
            <p className="text-xs text-slate-500">Maquinaria vial</p>
            <p className="mt-1 font-semibold text-white">{data.machineryWorking === null ? 'Sin dato' : data.machineryWorking ? 'Máquinas trabajando' : 'No informada'}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-950/35 p-3">
            <p className="text-xs text-slate-500">Riesgos mencionados</p>
            <p className="mt-1 flex items-center gap-2 font-semibold capitalize text-white">
              {data.hazards.includes('nieve') ? <Snowflake className="size-4 text-sky-200" aria-hidden="true" /> : <AlertTriangle className="size-4 text-amber-200" aria-hidden="true" />}
              {data.hazards.length ? data.hazards.join(', ') : 'Sin detalle'}
            </p>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-amber-200">Última consulta fallida: {error.message}</p> : null}
    </Card>
  );
}
