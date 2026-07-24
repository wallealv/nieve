import { Mountain, Wind } from 'lucide-react';
import { confidenceLabelForScore } from '../../lib/forecast/confidence.js';
import { confidenceClass, formatCm, formatWind } from '../../lib/format.js';
import {
  averageConfidenceForPeriod,
  getSnowIntensity,
} from '../../lib/forecast/presentation.js';
import { cn } from '../../lib/utils.js';
import type { LevelForecast } from '../../types/forecast.js';
import { Badge } from '../ui/Badge.js';
import { Metric } from '../ui/Metric.js';

interface LevelSummaryCardProps {
  level: LevelForecast;
  selected: boolean;
  onSelect: () => void;
}

export function LevelSummaryCard({ level, selected, onSelect }: LevelSummaryCardProps) {
  const confidence = averageConfidenceForPeriod(level, '7d');
  const confidenceLabel = confidenceLabelForScore(confidence);
  const intensity = getSnowIntensity(level.totals.days7);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'surface group w-full text-left transition duration-300 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-white/[0.075]',
        selected && 'border-sky-300/45 bg-sky-300/[0.08] ring-1 ring-sky-300/15',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{level.level.elevationM.toLocaleString('es-AR')} m</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">
            {level.level.name}
          </h2>
        </div>
        <span
          className={cn(
            'grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-slate-300 transition group-hover:text-sky-200',
            selected && 'border-sky-300/20 bg-sky-300/10 text-sky-200',
          )}
        >
          <Mountain className="size-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
        <Metric label="24 horas" value={formatCm(level.totals.hours24)} />
        <Metric label="72 horas" value={formatCm(level.totals.hours72)} />
        <Metric label="7 días" value={formatCm(level.totals.days7)} />
        <Metric label="15 días" value={formatCm(level.totals.days15)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
        <Badge className={confidenceClass(confidenceLabel)}>
          Confianza {confidence}%
        </Badge>
        <Badge className="badge-muted">Nieve {intensity.label.toLowerCase()}</Badge>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Wind className="size-3.5" aria-hidden="true" />
          {formatWind(level.maxWindKmh)}
        </span>
      </div>
    </button>
  );
}
