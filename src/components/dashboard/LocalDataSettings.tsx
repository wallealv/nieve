import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getBrowserStorageAdapter } from '../../lib/persistence/storage.js';
import { Card } from '../ui/Card.js';

function downloadJson(value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `snow-monitor-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LocalDataSettings() {
  const [message, setMessage] = useState<string | null>(null);

  const exportData = async () => {
    const adapter = getBrowserStorageAdapter();
    if (!adapter) {
      setMessage('El almacenamiento local no está disponible.');
      return;
    }
    downloadJson(await adapter.exportAll());
    setMessage('Datos locales exportados.');
  };

  const eraseData = async () => {
    if (!window.confirm('¿Borrar el historial, preferencias y alertas guardadas por Snow Monitor en este dispositivo?')) return;
    const adapter = getBrowserStorageAdapter();
    await adapter?.clearAll();
    setMessage('Datos locales borrados. Recargá la página para reiniciar la vista.');
  };

  return (
    <Card className="p-5 sm:p-6">
      <p className="eyebrow">Privacidad local</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Datos guardados en este dispositivo</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Historial, preferencias y alertas no se sincronizan ni se envían a una base remota.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void exportData()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
        >
          <Download className="size-4" aria-hidden="true" /> Exportar JSON
        </button>
        <button
          type="button"
          onClick={() => void eraseData()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300/15 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-300/5"
        >
          <Trash2 className="size-4" aria-hidden="true" /> Borrar datos locales
        </button>
      </div>
      {message ? <p className="mt-3 text-xs text-slate-500" role="status">{message}</p> : null}
    </Card>
  );
}
