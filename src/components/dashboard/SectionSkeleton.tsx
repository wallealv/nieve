import { Spinner } from '../ui/Spinner.js';
import { Card } from '../ui/Card.js';

export function SectionSkeleton({ label = 'Cargando sección…' }: { label?: string }) {
  return (
    <Card className="flex min-h-52 items-center justify-center gap-3 p-6 text-sm text-slate-400">
      <Spinner />
      {label}
    </Card>
  );
}
