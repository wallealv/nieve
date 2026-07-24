import { Camera, ExternalLink, LoaderCircle } from 'lucide-react';
import type { WebcamStatus } from '../../types/webcam.js';
import { Card } from '../ui/Card.js';

export function WebcamCard({
  data,
  isPending,
  error,
}: {
  data: WebcamStatus | undefined;
  isPending: boolean;
  error: Error | null;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/10 p-2.5 text-cyan-100">
          <Camera className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Validación visual</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Cámara oficial de Las Leñas</h2>
          {isPending && !data ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Comprobando disponibilidad…</p>
          ) : data?.status === 'available' ? (
            <p className="mt-2 text-sm font-medium text-emerald-200">Disponible</p>
          ) : (
            <p className="mt-2 text-sm font-medium text-amber-200">Temporalmente no disponible</p>
          )}
        </div>
      </div>

      {data?.status === 'available' && data.embeddable ? (
        <iframe
          src={data.officialUrl}
          title="Cámara oficial de Las Leñas"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="mt-4 aspect-video w-full rounded-2xl border border-white/8 bg-slate-950"
        />
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-5">
          <p className="text-sm leading-6 text-slate-400">
            La app no copia ni inventa imágenes. Abrí la página oficial para ver la transmisión o imagen vigente.
          </p>
        </div>
      )}

      {data ? (
        <a
          href={data.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
        >
          Abrir cámara oficial <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ) : null}
      {error ? <p className="mt-3 text-xs text-amber-200">{error.message}</p> : data?.message ? <p className="mt-3 text-xs text-slate-500">{data.message}</p> : null}
    </Card>
  );
}
