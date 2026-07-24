import { Download, RefreshCw, Share, WifiOff } from 'lucide-react';

export function PwaStatus({
  online,
  standalone,
  canInstall,
  ios,
  updateAvailable,
  onInstall,
  onReload,
}: {
  online: boolean;
  standalone: boolean;
  canInstall: boolean;
  ios: boolean;
  updateAvailable: boolean;
  onInstall: () => Promise<boolean>;
  onReload: () => void;
}) {
  if (online && !updateAvailable && (standalone || (!canInstall && !ios))) return null;

  return (
    <aside className="mt-4 flex flex-col gap-3 rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] p-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between" aria-label="Estado de instalación y conexión">
      <div>
        {!online ? (
          <p className="flex items-center gap-2 font-medium text-amber-100">
            <WifiOff className="size-4" aria-hidden="true" />
            Sin conexión: se muestran los últimos datos guardados cuando estén disponibles.
          </p>
        ) : null}
        {updateAvailable ? <p className="font-medium text-cyan-100">Hay una versión nueva de Snow Monitor disponible.</p> : null}
        {online && ios && !standalone && !canInstall && !updateAvailable ? (
          <p className="flex items-start gap-2 leading-6">
            <Share className="mt-1 size-4 shrink-0 text-sky-200" aria-hidden="true" />
            En iPhone: tocá Compartir y después “Agregar a pantalla de inicio”.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {updateAvailable ? (
          <button type="button" onClick={onReload} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/20 px-4 py-2 font-medium text-cyan-100 hover:bg-cyan-300/5">
            <RefreshCw className="size-4" aria-hidden="true" /> Actualizar aplicación
          </button>
        ) : null}
        {online && canInstall && !standalone ? (
          <button type="button" onClick={() => void onInstall()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-medium text-white hover:bg-white/5">
            <Download className="size-4" aria-hidden="true" /> Instalar Snow Monitor
          </button>
        ) : null}
      </div>
    </aside>
  );
}
