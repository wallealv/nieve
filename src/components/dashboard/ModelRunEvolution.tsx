import { ArrowDownRight, ArrowRight, ArrowUpRight, GitCompareArrows } from 'lucide-react';
import type { LevelId } from '../../types/forecast.js';
import type { ModelRunsResponse, ModelTrendDirection } from '../../types/modelRuns.js';
import { Card } from '../ui/Card.js';

const TREND_COPY: Record<ModelTrendDirection, string> = {
  up: 'Subiendo',
  down: 'Bajando',
  stable: 'Estable',
  insufficient: 'Datos insuficientes',
};

function TrendIcon({ direction }: { direction: ModelTrendDirection }) {
  if (direction === 'up') return <ArrowUpRight className="size-4 text-emerald-300" aria-hidden="true" />;
  if (direction === 'down') return <ArrowDownRight className="size-4 text-amber-300" aria-hidden="true" />;
  return <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />;
}

function convergenceLabel(direction: ModelRunsResponse['convergence']['direction']): string {
  return {
    converging: 'Los modelos están convergiendo.',
    diverging: 'Los modelos están divergiendo.',
    stable: 'La dispersión entre modelos está estable.',
    insufficient: 'No hay suficientes corridas para medir convergencia.',
  }[direction];
}

export function ModelRunEvolution({ data, levelId }: { data: ModelRunsResponse; levelId: LevelId }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-violet-300/15 bg-violet-300/10 p-2.5 text-violet-100">
          <GitCompareArrows className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Últimas tres inicializaciones</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Evolución de corridas</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">Indica si cada modelo consolida o recorta la nieve a siete días.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {data.reports.map((report) => {
          const trend = report.trends[levelId];
          const current = report.runs[0]?.levels[levelId].days7Cm ?? null;
          return (
            <article key={report.model} className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white">{report.shortName}</h3>
                <span className="text-xs text-slate-500">{report.status === 'failed' ? 'Sin archivo' : report.status === 'partial' ? 'Parcial' : '3 corridas'}</span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {current === null ? 'Sin dato' : `${current.toFixed(current % 1 ? 1 : 0)} cm`}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                <TrendIcon direction={trend.direction} />
                <span>{TREND_COPY[trend.direction]}</span>
                {trend.delta !== null ? <span className="font-semibold text-cyan-100">{trend.delta > 0 ? '+' : ''}{trend.delta} cm</span> : null}
              </div>
              <div className="mt-4 flex gap-1.5" aria-label={`Corridas de ${report.shortName}`}>
                {[...report.runs].reverse().map((run, index) => {
                  const value = run.levels[levelId].days7Cm;
                  const max = Math.max(1, ...report.runs.map((item) => item.levels[levelId].days7Cm ?? 0));
                  return (
                    <div key={run.run} className="flex flex-1 flex-col justify-end gap-1">
                      <div className="rounded-sm bg-cyan-300/35" style={{ height: `${Math.max(6, ((value ?? 0) / max) * 52)}px` }} />
                      <span className="text-center text-[10px] text-slate-600">-{2 - index}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {convergenceLabel(data.convergence.direction)}
        {data.convergence.currentSpreadCm !== null ? ` Dispersión actual: ${data.convergence.currentSpreadCm} cm.` : ''}
      </p>
    </Card>
  );
}
