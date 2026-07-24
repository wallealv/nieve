import { FORECAST_MODELS } from '../../config/mountain.js';
import type { MountainLevelConfig } from '../../types/forecast.js';
import type {
  RegionalBasePhaseRisk,
  RegionalGridResponse,
  RegionalMapPeriod,
} from '../../types/regional.js';
import { compact, round, sumNullable } from '../forecast/math.js';
import type { NormalizedModelLevel } from '../forecast/normalize.js';
import { fetchOpenMeteoModel } from '../forecast/openMeteo.js';
import { REGIONAL_RESORTS } from './resorts.js';

interface GridConfig {
  id: string;
  name: string;
  position: 'base' | 'summit';
  point: MountainLevelConfig;
}

export const REGIONAL_GRID: GridConfig[] = REGIONAL_RESORTS.flatMap((resort) => [
  {
    id: `${resort.id}-base`,
    name: `${resort.name} · Base`,
    position: 'base' as const,
    point: {
      id: 'base' as const,
      name: `${resort.name} Base`,
      shortName: 'Base',
      ...resort.base,
    },
  },
  {
    id: `${resort.id}-summit`,
    name: `${resort.name} · Cumbre`,
    position: 'summit' as const,
    point: {
      id: 'summit' as const,
      name: `${resort.name} Cumbre`,
      shortName: 'Cumbre',
      ...resort.summit,
    },
  },
]);

const PERIOD_HOURS: Record<RegionalMapPeriod, number> = {
  '6h': 6,
  '12h': 12,
  '24h': 24,
  '48h': 48,
  '72h': 72,
};

function sumHours(level: NormalizedModelLevel, hours: number): number | null {
  return round(sumNullable(level.hourlySnowfallCm.slice(0, hours)));
}

function phaseFor(level: NormalizedModelLevel, position: GridConfig['position'], elevationM: number): RegionalBasePhaseRisk {
  if (position === 'summit') return 'snow';
  const days = level.daily.slice(0, 3);
  const snowfall = sumNullable(days.map((day) => day.snowfallCm));
  if (snowfall === null || snowfall <= 0) return 'unknown';
  const temperatures = compact(days.map((day) => day.temperatureMaxC));
  const freezingLevels = compact(days.map((day) => day.freezingLevelM));
  const maxTemperature = temperatures.length ? Math.max(...temperatures) : null;
  const maxFreezing = freezingLevels.length ? Math.max(...freezingLevels) : null;
  if ((maxTemperature ?? -10) > 2 && (maxFreezing ?? elevationM) > elevationM + 150) return 'rain-risk';
  if ((maxTemperature ?? -10) > 0 || (maxFreezing ?? elevationM - 1) >= elevationM) return 'mixed-risk';
  return 'snow';
}

export async function buildRegionalGrid(
  fetcher: (
    model: (typeof FORECAST_MODELS)[number],
    points: readonly MountainLevelConfig[],
  ) => Promise<NormalizedModelLevel[]> = (model, points) => fetchOpenMeteoModel(model, points),
  generatedAt = new Date().toISOString(),
): Promise<RegionalGridResponse> {
  const model = FORECAST_MODELS.find((item) => item.id === 'ecmwf') ?? FORECAST_MODELS[0];
  if (!model) throw new Error('ECMWF model configuration is missing.');
  const values = await fetcher(model, REGIONAL_GRID.map((item) => item.point));
  if (values.length !== REGIONAL_GRID.length) {
    throw new Error(`Regional grid returned ${values.length} points; expected ${REGIONAL_GRID.length}.`);
  }

  return {
    generatedAt,
    model: 'ECMWF IFS',
    points: REGIONAL_GRID.map((config, index) => {
      const level = values[index]!;
      const snowfallCm = Object.fromEntries(
        Object.entries(PERIOD_HOURS).map(([period, hours]) => [period, sumHours(level, hours)]),
      ) as Record<RegionalMapPeriod, number | null>;
      return {
        id: config.id,
        name: config.name,
        latitude: config.point.latitude,
        longitude: config.point.longitude,
        elevationM: config.point.elevationM,
        snowfallCm,
        phase: phaseFor(level, config.position, config.point.elevationM),
      };
    }),
    warning: 'Mapa orientativo con puntos fijos y una única guía ECMWF; no representa microclimas entre puntos.',
  };
}
