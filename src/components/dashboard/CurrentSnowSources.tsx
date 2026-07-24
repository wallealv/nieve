import { ExternalLink } from 'lucide-react';
import type {
  CurrentSnowResponse,
  CurrentSnowSourceId,
  ObservationFreshness,
  SnowObservation,
} from '../../types/currentSnow.js';
import { formatCm, formatDateTime } from '../../lib/format.js';
import { Badge } from '../ui/Badge.js';

const SOURCE_URLS: Record<CurrentSnowSourceId, string> = {
  'las-lenas': 'https://laslenas.com/estado-pistas/condiciones-del-tiempo/',
  'snow-forecast': 'https://www.snow-forecast.com/resorts/Las-Lenas/snow-report',
  'skiresort-info': 'https://www.skiresort.info/ski-resort/las-lenas/snow-report/',
  onthesnow: 'https://www.onthesnow.com/argentina/las-lenas/skireport',
};

const FRESHNESS_LABEL: Record<ObservationFreshness, string> = {
  fresh: 'Reciente',
  aging: '24–72 h',
  stale: 'Antiguo',
  unknown: 'Hora desconocida',
};

function freshnessClass(freshness: ObservationFreshness): string {
  if (freshness === 'fresh') return 'badge-success';
  if (freshness === 'aging') return 'badge-warning';
  return 'badge-muted';
}

function observationTime(observation: SnowObservation | undefined): string {
  if (!observation) return 'Sin medición';
  if (observation.reportedAt) return `Reportado ${formatDateTime(observation.reportedAt)}`;
  return `Consultado ${formatDateTime(observation.fetchedAt)}`;
}

function byZone(observations: SnowObservation[], zone: SnowObservation['zone']) {
  return observations.find((observation) => observation.zone === zone);
}

export function CurrentSnowSources({ data }: { data: CurrentSnowResponse }) {
  const allObservations = data.zones.flatMap((zone) => zone.observations);

  return (
    <details className="mt-4 rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-medium text-slate-200">
        Ver mediciones y estado de cada fuente
      </summary>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] text-left text-xs text-slate-300">
          <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="pb-3 pr-5 font-medium">Fuente</th>
              <th className="pb-3 pr-5 font-medium">Base</th>
              <th className="pb-3 pr-5 font-medium">Intermedia</th>
              <th className="pb-3 pr-5 font-medium">Cumbre</th>
              <th className="pb-3 pr-5 font-medium">Actualización</th>
              <th className="pb-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.sourceStatuses.map((status) => {
              const observations = allObservations.filter(
                (observation) => observation.sourceId === status.sourceId,
              );
              const representative = observations[0];
              const quality = observations.find((item) => item.snowQuality)?.snowQuality;
              return (
                <tr key={status.sourceId} className="border-b border-white/6 align-top last:border-0">
                  <td className="py-3 pr-5">
                    <a
                      className="inline-flex items-center gap-1 font-medium text-slate-100 hover:text-cyan-300"
                      href={SOURCE_URLS[status.sourceId]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {status.sourceName}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                    {quality ? <p className="mt-1 max-w-48 text-slate-500">{quality}</p> : null}
                  </td>
                  <td className="py-3 pr-5">{formatCm(byZone(observations, 'base')?.depthCm ?? null, 1)}</td>
                  <td className="py-3 pr-5">{formatCm(byZone(observations, 'mid')?.depthCm ?? null, 1)}</td>
                  <td className="py-3 pr-5">{formatCm(byZone(observations, 'summit')?.depthCm ?? null, 1)}</td>
                  <td className="py-3 pr-5 text-slate-400">{observationTime(representative)}</td>
                  <td className="py-3">
                    {status.status === 'failed' ? (
                      <Badge className="badge-warning">No disponible</Badge>
                    ) : representative ? (
                      <Badge className={freshnessClass(representative.freshness)}>
                        {FRESHNESS_LABEL[representative.freshness]}
                      </Badge>
                    ) : (
                      <Badge className="badge-muted">Sin medición</Badge>
                    )}
                    {status.message ? (
                      <p className="mt-1 max-w-52 text-slate-500">{status.message}</p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
