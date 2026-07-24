import { CloudOff, RefreshCw } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="app-shell grid min-h-screen place-items-center">
      <div className="surface max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-300/10 text-rose-200">
          <CloudOff className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-white">No pudimos cargar el pronóstico</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
        <button type="button" className="button-primary mx-auto mt-6" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </main>
  );
}
