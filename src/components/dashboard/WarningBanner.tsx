import { TriangleAlert } from 'lucide-react';

export function WarningBanner({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-200/[0.055] px-4 py-3 text-sm text-amber-100/90">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-amber-300" aria-hidden="true" />
        <div>
          <p className="font-medium text-amber-100">Pronóstico degradado</p>
          <ul className="mt-1 space-y-1 text-xs leading-5 text-amber-100/70">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
