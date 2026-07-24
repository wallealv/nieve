import { cn } from '../../lib/utils.js';

interface MetricProps {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
}

export function Metric({ label, value, className, compact = false }: MetricProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 tabular-nums text-slate-100',
          compact ? 'text-sm font-semibold' : 'text-xl font-semibold',
        )}
      >
        {value}
      </p>
    </div>
  );
}
