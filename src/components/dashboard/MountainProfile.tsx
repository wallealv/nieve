import { Snowflake } from 'lucide-react';
import { confidenceLabelForScore } from '../../lib/forecast/confidence.js';
import { formatCm } from '../../lib/format.js';
import {
  averageConfidenceForPeriod,
  periodLabel,
  totalForPeriod,
  type ForecastPeriod,
} from '../../lib/forecast/presentation.js';
import type { LevelForecast } from '../../types/forecast.js';
import { Badge } from '../ui/Badge.js';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card.js';
import { SegmentedControl } from '../ui/SegmentedControl.js';

const PERIOD_OPTIONS = [
  { value: '24h', label: '24 h' },
  { value: '72h', label: '72 h' },
  { value: '7d', label: '7 días' },
  { value: '15d', label: '15 días' },
] as const;

const POSITIONS = {
  summit: { left: '62%', top: '12%' },
  mid: { left: '42%', top: '43%' },
  base: { left: '20%', top: '72%' },
} as const;

interface MountainProfileProps {
  levels: LevelForecast[];
  period: ForecastPeriod;
  onPeriodChange: (period: ForecastPeriod) => void;
}

export function MountainProfile({
  levels,
  period,
  onPeriodChange,
}: MountainProfileProps) {
  return (
    <Card className="min-h-[32rem] overflow-hidden">
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Perfil vertical de la montaña</CardTitle>
          <CardDescription>
            Acumulación estimada por cota para las próximas {periodLabel(period)}.
          </CardDescription>
        </div>
        <SegmentedControl
          value={period}
          options={PERIOD_OPTIONS}
          onChange={onPeriodChange}
          ariaLabel="Período del perfil de montaña"
        />
      </CardHeader>

      <div className="relative mt-5 h-[25rem] overflow-hidden rounded-[1.5rem] border border-white/8 bg-[radial-gradient(circle_at_70%_10%,rgba(125,211,252,.13),transparent_28%),linear-gradient(180deg,rgba(12,29,46,.7),rgba(5,13,24,.95))]">
        <div className="snow-field" aria-hidden="true" />
        <svg
          className="absolute inset-x-0 bottom-0 h-[88%] w-full"
          viewBox="0 0 640 360"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="mountainFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b9eaff" stopOpacity="0.34" />
              <stop offset="48%" stopColor="#31536a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#101f2e" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="ridgeStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4b7088" />
              <stop offset="58%" stopColor="#d9f6ff" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
          </defs>
          <path
            d="M0 354 L62 300 L118 318 L186 248 L246 270 L332 148 L378 190 L455 54 L505 116 L548 88 L640 220 L640 360 L0 360 Z"
            fill="url(#mountainFill)"
          />
          <path
            d="M0 354 L62 300 L118 318 L186 248 L246 270 L332 148 L378 190 L455 54 L505 116 L548 88 L640 220"
            fill="none"
            stroke="url(#ridgeStroke)"
            strokeWidth="2.2"
            opacity="0.86"
          />
          <path
            d="M455 54 L432 106 L458 96 L476 128 L505 116 L486 84 Z"
            fill="#eefbff"
            opacity="0.74"
          />
          <path
            d="M332 148 L305 196 L336 184 L356 216 L378 190 L354 164 Z"
            fill="#d8f4ff"
            opacity="0.46"
          />
        </svg>

        {levels.map((level) => {
          const total = totalForPeriod(level.totals, period);
          const confidence = averageConfidenceForPeriod(level, period);
          return (
            <div
              key={level.level.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={POSITIONS[level.level.id]}
            >
              <div className="mountain-level-card">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-xl bg-sky-300/10 text-sky-200">
                    <Snowflake className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {level.level.elevationM.toLocaleString('es-AR')} m
                    </p>
                    <p className="text-sm font-semibold text-white">{level.level.shortName}</p>
                  </div>
                </div>
                <p className="mt-2.5 text-2xl font-semibold tabular-nums text-sky-100">
                  {formatCm(total)}
                </p>
                <Badge className="badge-muted mt-2">
                  {confidenceLabelForScore(confidence)} · {confidence}%
                </Badge>
              </div>
            </div>
          );
        })}

        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[0.68rem] text-slate-500">
          <span>Valle</span>
          <span>Alta montaña</span>
        </div>
      </div>
    </Card>
  );
}
