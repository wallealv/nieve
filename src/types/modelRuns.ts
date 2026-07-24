import type { LevelId, ModelId } from './forecast.js';

export interface ModelRunLevelTotal {
  hours72Cm: number | null;
  days7Cm: number | null;
}

export interface ModelRunSnapshot {
  run: string;
  levels: Record<LevelId, ModelRunLevelTotal>;
}

export interface ModelRunSeries {
  model: ModelId;
  runs: ModelRunSnapshot[];
  missingRuns: string[];
}

export type ModelTrendDirection = 'up' | 'down' | 'stable' | 'insufficient';

export interface ModelTrendSummary {
  direction: ModelTrendDirection;
  current: number | null;
  previous: number | null;
  delta: number | null;
}

export interface ModelRunReport {
  model: ModelId;
  name: string;
  shortName: string;
  status: 'ok' | 'partial' | 'failed';
  runs: ModelRunSnapshot[];
  trends: Record<LevelId, ModelTrendSummary>;
  message: string | null;
}

export interface ModelRunsResponse {
  resort: 'Las Leñas';
  generatedAt: string;
  reports: ModelRunReport[];
  convergence: {
    currentSpreadCm: number | null;
    previousSpreadCm: number | null;
    direction: 'converging' | 'diverging' | 'stable' | 'insufficient';
  };
  warnings: string[];
}
