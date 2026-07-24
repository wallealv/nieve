import { Clock3, MountainSnow, RefreshCw } from 'lucide-react';
import { REFRESH_INTERVAL_MS } from '../../config/mountain.js';
import { formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { Badge } from '../ui/Badge.js';

interface HeaderProps {
  updatedAt: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function Header({ updatedAt, isRefreshing, onRefresh }: HeaderProps) {
  const nextRefresh = new Date(new Date(updatedAt).getTime() + REFRESH_INTERVAL_MS);

  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(11,30,49,.94),rgba(7,17,31,.82))] p-5 shadow-2xl shadow-sky-950/30 sm:p-7 lg:p-9">
      <div className="hero-orb hero-orb-one" aria-hidden="true" />
      <div className="hero-orb hero-orb-two" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge className="badge-info">
              <MountainSnow className="size-3.5" aria-hidden="true" />
              Las Leñas · Mendoza
            </Badge>
            <Badge className="badge-muted">2.240–3.430 m</Badge>
            <Badge className="badge-muted">15 días</Badge>
          </div>

          <p className="eyebrow">Pronóstico multimodelo por cota</p>
          <h1 className="mt-2 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
            Las Leñas <span className="text-sky-200">Snow Monitor</span>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-slate-300 sm:text-base">
            Nieve actual, próxima tormenta y consenso entre ECMWF, GFS e ICON para cada nivel de la montaña.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/10 p-2 backdrop-blur-xl">
            <div className="rounded-xl px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <Clock3 className="size-3.5" aria-hidden="true" /> Actualizado
              </p>
              <p className="mt-1 text-xs font-medium text-slate-200">
                {formatDateTime(updatedAt)}
              </p>
            </div>
            <div className="rounded-xl px-3 py-2.5">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Próximo refresco
              </p>
              <p className="mt-1 text-xs font-medium text-slate-200">
                {formatDateTime(nextRefresh.toISOString())}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="button-primary min-h-12"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('size-4', isRefreshing && 'animate-spin')}
              aria-hidden="true"
            />
            {isRefreshing ? 'Actualizando' : 'Actualizar ahora'}
          </button>
        </div>
      </div>
    </header>
  );
}
