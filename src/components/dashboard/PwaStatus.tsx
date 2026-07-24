import { Download, Share, WifiOff } from 'lucide-react';

export function PwaStatus({
  online,
  standalone,
  canInstall,
  ios,
  onInstall,
}: {
  online: boolean;
  standalone: boolean;
  canInstall: boolean;
  ios: boolean;
  onInstall: () => Promise<boolean>;
}) {
  if (online && (standalone || (!canInstall && !ios))) return null;

  return (
    <aside className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] p-4 text-sm text-slate-300" aria-label="Estado de instalación y conexión">
      {!online ? (
        <p className="flex items-center gap-2 font-medium text-amber-100">
          <WifiOff className="size-4" aria-hidden="true" />
          Sin conexión: se muestran los últimos datos guardados cuando estén disponibles.
        </p>
      ) : null}
      {online && canInstall && !standalone ? (
        <button
          type="button"
          onClick={() => void onInstall()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-medium text-white hover:bg-white/5"
        >
          <Download className="size-4" aria-hidden="true" /> Instalar Snow Monitor
        </button>
      ) : null}
      {online && ios && !standalone && !canInstall ? (
        <p className="flex items-start gap-2 leading-6">
          <Share className="mt-1 size-4 shrink-0 text-sky-200" aria-hidden="true" />
          En iPhone: tocá Compartir y después “Agregar a pantalla de inicio”.
        </p>
      ) : null}
    </aside>
  );
}
