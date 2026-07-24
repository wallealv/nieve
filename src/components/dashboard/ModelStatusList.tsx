import { CheckCircle2, CloudOff, TriangleAlert } from 'lucide-react';
import { formatLongDay } from '../../lib/format.js';
import type { ModelStatus } from '../../types/forecast.js';
import { Badge } from '../ui/Badge.js';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card.js';

function statusMeta(status: ModelStatus['status']) {
  if (status === 'ok') {
    return { label: 'Disponible', className: 'badge-success', Icon: CheckCircle2 };
  }
  if (status === 'partial') {
    return { label: 'Parcial', className: 'badge-warning', Icon: TriangleAlert };
  }
  return { label: 'Sin datos', className: 'badge-danger', Icon: CloudOff };
}

export function ModelStatusList({ models }: { models: ModelStatus[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Estado de los modelos</CardTitle>
          <CardDescription>
            La app sigue funcionando aunque una fuente falle o termine antes.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="mt-5 space-y-2.5">
        {models.map((model) => {
          const meta = statusMeta(model.status);
          const Icon = meta.Icon;
          return (
            <div
              key={model.id}
              className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/8 bg-black/15 text-slate-300">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{model.name}</p>
                  <Badge className={meta.className}>{meta.label}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {model.availableLevels}/{model.requestedLevels} cotas
                  {model.forecastThrough
                    ? ` · hasta ${formatLongDay(model.forecastThrough)}`
                    : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        ICON tiene menor horizonte. Desde el día 8 el consenso se apoya en ECMWF y GFS.
      </p>
    </Card>
  );
}
