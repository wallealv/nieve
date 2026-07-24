import { AlertTriangle, Mountain } from 'lucide-react';
import type { CurrentSnowOperations } from '../../types/currentSnow.js';
import { Badge } from '../ui/Badge.js';

function metric(value: number | null, total: number | null, suffix = ''): string {
  if (value === null) return '—';
  return total === null ? `${value}${suffix}` : `${value}/${total}${suffix}`;
}

export function OperationsStrip({ operations }: { operations: CurrentSnowOperations }) {
  const hasData = [
    operations.liftsOpen,
    operations.liftsTotal,
    operations.slopesOpen,
    operations.slopesTotal,
    operations.avalancheRisk,
    operations.offPisteStatus,
  ].some((value) => value !== null);

  if (!hasData) return null;

  return (
    <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mountain className="size-4 text-sky-200" aria-hidden="true" />
          <p className="text-sm font-semibold text-white">Operación oficial</p>
        </div>
        {operations.fetchedAt ? <Badge className="badge-muted">Las Leñas</Badge> : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-xl border border-white/7 bg-black/10 p-3">
          <dt className="text-xs text-slate-500">Medios abiertos</dt>
          <dd className="mt-1 font-semibold text-slate-100">
            {metric(operations.liftsOpen, operations.liftsTotal)}
          </dd>
          {operations.liftsConditional ? (
            <p className="mt-1 text-[11px] text-amber-200/80">
              {operations.liftsConditional} condicionales
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-white/7 bg-black/10 p-3">
          <dt className="text-xs text-slate-500">Pistas abiertas</dt>
          <dd className="mt-1 font-semibold text-slate-100">
            {metric(operations.slopesOpen, operations.slopesTotal)}
          </dd>
        </div>
        <div className="rounded-xl border border-white/7 bg-black/10 p-3">
          <dt className="text-xs text-slate-500">Fuera de pista</dt>
          <dd className="mt-1 font-semibold text-slate-100">
            {operations.offPisteStatus ?? '—'}
          </dd>
        </div>
        <div className="rounded-xl border border-white/7 bg-black/10 p-3">
          <dt className="text-xs text-slate-500">Riesgo de avalancha</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-semibold text-slate-100">
            {operations.avalancheRisk !== null ? (
              <>
                <AlertTriangle className="size-3.5 text-amber-300" aria-hidden="true" />
                {operations.avalancheRisk}/5
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      {operations.officialNote ? (
        <p className="mt-3 text-xs leading-5 text-slate-400">{operations.officialNote}</p>
      ) : null}
    </div>
  );
}
