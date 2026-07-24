import { LoaderCircle } from 'lucide-react';

export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-300">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}
