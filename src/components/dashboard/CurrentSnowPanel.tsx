import { AlertTriangle, Mountain, Snowflake } from 'lucide-react';
import type {
  CurrentSnowReferenceKind,
  CurrentSnowResponse,
  CurrentSnowZoneSummary,
  ObservationZone,
} from '../../types/currentSnow.js';
import { formatCm, formatDateTime } from '../../lib/format.js';
import { Badge } from '../ui/Badge.js';
import { Card } from '../ui/Card.js';
import { Spinner } from '../ui/Spinner.js';
import { CurrentSnowSources } from './CurrentSnowSources.js';

const ZONE_LABELS: Record<ObservationZone, { name: string; elevation: string }> = {
  base: { name: 'Base', elevation: '2.240 m' },
  mid: { name: 'Intermedia', elevation: '≈ 2.800 m' },
  summit: { name: 'Cumbre', elevation: '3.430 m' },
};

const REFERENCE_LABELS: Record<CurrentSnowReferenceKind, string> = {
  official: 'Dato oficial',
  'external-consensus': 'Consenso externo',
  'single-external': 'Una fuente externa',
  unavailable: 'Sin dato',
};

function referenceBadgeClass(kind: CurrentSnowReferenceKind): string {
  if (kind === 'official') return 'badge-success';
  if (kind === 'external-consensus') return 'badge-info';
  if (kind === 'single-external') return 'badge-warning';
  return 'badge-muted';
}

function externalRange(zone: CurrentSnowZoneSummary): string | null {
  if (
    zone.independentSourceCount < 2 ||
    zone.externalMinCm === null ||
    zone.externalMaxCm === null
  ) {
    return null;
  }
  return `${formatCm(zone.externalMinCm, 1)}–${formatCm(zone.externalMaxCm, 1)}`;
}

function ZoneCard({ zone }: { zone: CurrentSnowZoneSummary }) {
  const label = ZONE_LABELS[zone.zone];
  const range = externalRange(zone);

  return (
    <article className="rounded-2xl border border-white/8 bg-slate-950/40 p-4" aria-label={`Nieve actual en ${label.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{label.elevation}</p>
        </div>
        <Badge className={referenceBadgeClass(zone.referenceKind)}>
          {REFERENCE_LABELS[zone.referenceKind]}
        </Badge>
      </div>

      <div className="mt-5">
        <p className="text-4xl font-semibold tracking-tight text-white">
          {formatCm(zone.referenceDepthCm, zone.referenceDepthCm !== null && zone.referenceDepthCm % 1 !== 0 ? 1 : 0)}
        </p>
        <p className="mt-1 text-xs text-slate-500">Profundidad del manto reportada</p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/8 pt-4 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Nieve nueva 24 h</dt>
          <dd className="mt-1 font-medium text-slate-100">{formatCm(zone.newSnow24hCm, 1)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Fuentes independientes</dt>
          <dd className="mt-1 font-medium text-slate-100">{zone.independentSourceCount}</dd>
        </div>
      </dl>

      {range ? (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          Rango externo reciente: <span className="font-medium text-slate-200">{range}</span>
        </p>
      ) : null}
      {zone.referenceKind === 'single-external' ? (
        <p className="mt-3 text-xs leading-5 text-amber-200/80">
          Referencia orientativa: no hay dos procedencias independientes para formar consenso.
        </p>
      ) : null}
      {zone.referenceKind === 'unavailable' ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Ninguna fuente publicó una medición vigente para esta zona.
        </p>
      ) : null}
    </article>
  );
}

interface CurrentSnowPanelProps {
  data: CurrentSnowResponse | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: Error | null;
}

export function CurrentSnowPanel({
  data,
  isPending,
  isFetching,
  error,
}: CurrentSnowPanelProps) {
  if (isPending && !data) {
    return (
      <Card className="mt-5 flex min-h-40 items-center justify-center gap-3 p-6 text-sm text-slate-300">
        <Spinner />
        Consultando nieve actual reportada…
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="mt-5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-white">Nieve actual no disponible</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {error?.message ?? 'No se pudo consultar ninguna fuente en este momento.'}
              {' '}El pronóstico sigue disponible más abajo.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <section className="mt-5" aria-labelledby="current-snow-title">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/8 p-2.5 text-cyan-200">
              <Snowflake className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">Observaciones, no pronóstico</p>
              <h2 id="current-snow-title" className="mt-1 text-xl font-semibold tracking-tight text-white">
                Nieve actual reportada
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Profundidad informada por Las Leñas y reportes externos recientes. No incluye la nieve futura de los modelos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Mountain className="h-4 w-4" aria-hidden="true" />
            {isFetching ? 'Actualizando…' : `Consultado ${formatDateTime(data.generatedAt)}`}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/6 px-3 py-2 text-xs leading-5 text-amber-100/80">
            La última actualización falló; se conserva el último parte válido: {error.message}
          </div>
        ) : null}

        {data.warnings.length ? (
          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 text-xs leading-5 text-slate-400">
            {data.warnings.join(' ')}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {data.zones.map((zone) => (
            <ZoneCard key={zone.zone} zone={zone} />
          ))}
        </div>

        <CurrentSnowSources data={data} />
      </Card>
    </section>
  );
}
