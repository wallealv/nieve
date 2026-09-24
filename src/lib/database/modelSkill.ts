// SERVER-ONLY (see ./client.ts). Reads each model's measured error at Las Leñas and turns it into
// consensus weights.
import {
  FORECAST_CALIBRATION,
  FORECAST_MODELS,
  MOUNTAIN_LEVELS,
} from '../../config/mountain.js';
import type {
  ForecastCalibration,
  LevelCalibration,
  LevelId,
  ModelId,
} from '../../types/forecast.js';
import { warnDatabase, withTimeout, type NieveDatabase } from './client.js';
import { addCalendarDays, resortLocalDate } from './dates.js';

/** A row of `nieve.model_skill(p_since, p_min_lead, p_max_lead)`, with numbers coerced. */
export interface ModelSkillRow {
  model: ModelId;
  level: LevelId;
  samples: number;
  maeCm: number | null;
  biasCm: number | null;
}

const MODEL_IDS: readonly ModelId[] = FORECAST_MODELS.map((model) => model.id);
const LEVEL_IDS: readonly LevelId[] = MOUNTAIN_LEVELS.map((level) => level.id);

function isModelId(value: unknown): value is ModelId {
  return MODEL_IDS.includes(value as ModelId);
}

function isLevelId(value: unknown): value is LevelId {
  return LEVEL_IDS.includes(value as LevelId);
}

/** PostgREST may return `numeric` columns as strings. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseSkillRow(raw: unknown): ModelSkillRow[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const row = raw as Record<string, unknown>;
  if (!isModelId(row.model) || !isLevelId(row.level)) return [];
  return [
    {
      model: row.model,
      level: row.level,
      samples: Math.max(0, Math.trunc(toNumber(row.samples) ?? 0)),
      maeCm: toNumber(row.mae_cm),
      biasCm: toNumber(row.bias_cm),
    },
  ];
}

/** Model skill for target days since `since` (`YYYY-MM-DD`); null (logged) on any failure. */
export async function loadModelSkill(
  client: NieveDatabase,
  since: string,
): Promise<ModelSkillRow[] | null> {
  try {
    const { data, error } = await withTimeout(
      client.rpc('model_skill', { p_since: since }),
      'rpc model_skill',
    );
    if (error) {
      warnDatabase('rpc model_skill', error);
      return null;
    }
    if (!Array.isArray(data)) {
      warnDatabase('rpc model_skill', new Error('unexpected payload'));
      return null;
    }
    return data.flatMap(parseSkillRow);
  } catch (error) {
    warnDatabase('rpc model_skill', error);
    return null;
  }
}

export function unavailableCalibration(): ForecastCalibration {
  return {
    status: 'unavailable',
    windowDays: FORECAST_CALIBRATION.windowDays,
    minSamples: FORECAST_CALIBRATION.minSamples,
    levels: [],
  };
}

/**
 * Per level, weights are active only when EVERY model has at least `minSamples` comparisons;
 * then weight_m = 1 / (MAE_m + 1), normalized to sum 1. Pure.
 */
export function computeModelWeights(
  skill: readonly ModelSkillRow[],
  {
    minSamples = FORECAST_CALIBRATION.minSamples,
    windowDays = FORECAST_CALIBRATION.windowDays,
  }: { minSamples?: number; windowDays?: number } = {},
): ForecastCalibration {
  const levels: LevelCalibration[] = LEVEL_IDS.map((level) => {
    const models = MODEL_IDS.map((model) => {
      const row = skill.find((item) => item.model === model && item.level === level);
      return {
        model,
        samples: row?.samples ?? 0,
        maeCm: row?.maeCm ?? null,
        biasCm: row?.biasCm ?? null,
        weight: null as number | null,
      };
    });
    const active = models.every(
      (model) => model.samples >= minSamples && model.maeCm !== null && model.maeCm >= 0,
    );

    if (active) {
      const inverse = models.map((model) => 1 / ((model.maeCm ?? 0) + 1));
      const total = inverse.reduce((sum, value) => sum + value, 0);
      models.forEach((model, index) => {
        model.weight = inverse[index]! / total;
      });
    }

    return { level, active, models };
  });

  return {
    status: levels.some((level) => level.active) ? 'active' : 'insufficient-data',
    windowDays,
    minSamples,
    levels,
  };
}

/** Skill-based calibration over the last `windowDays`; 'unavailable' without a database. */
export async function loadForecastCalibration(
  client: NieveDatabase | null,
  now = new Date(),
): Promise<ForecastCalibration> {
  if (!client) return unavailableCalibration();
  const today = resortLocalDate(now);
  if (!today) return unavailableCalibration();

  const skill = await loadModelSkill(
    client,
    addCalendarDays(today, -FORECAST_CALIBRATION.windowDays),
  );
  return skill ? computeModelWeights(skill) : unavailableCalibration();
}
