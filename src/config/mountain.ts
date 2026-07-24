import type { ForecastModelConfig, MountainLevelConfig } from '../types/forecast';

export const RESORT = {
  name: 'Las Leñas',
  timezone: 'America/Argentina/Mendoza',
} as const;

export const MOUNTAIN_LEVELS = [
  {
    id: 'base',
    name: 'Base',
    shortName: 'Base',
    elevationM: 2240,
    latitude: -35.1486,
    longitude: -70.0811,
  },
  {
    id: 'mid',
    name: 'Montaña media',
    shortName: 'Media',
    elevationM: 2800,
    latitude: -35.1437,
    longitude: -70.0961,
  },
  {
    id: 'summit',
    name: 'Alta montaña',
    shortName: 'Alta',
    elevationM: 3430,
    latitude: -35.1376,
    longitude: -70.1118,
  },
] as const satisfies readonly MountainLevelConfig[];

export const FORECAST_MODELS = [
  {
    id: 'ecmwf',
    name: 'ECMWF IFS',
    shortName: 'ECMWF',
    endpoint: 'https://api.open-meteo.com/v1/ecmwf',
    forecastDays: 15,
    expectedThroughDay: 14,
  },
  {
    id: 'gfs',
    name: 'NOAA GFS',
    shortName: 'GFS',
    endpoint: 'https://api.open-meteo.com/v1/gfs',
    forecastDays: 16,
    expectedThroughDay: 14,
  },
  {
    id: 'icon',
    name: 'DWD ICON Global',
    shortName: 'ICON',
    endpoint: 'https://api.open-meteo.com/v1/dwd-icon',
    forecastDays: 8,
    expectedThroughDay: 7,
  },
] as const satisfies readonly ForecastModelConfig[];

export const FORECAST_HORIZONS = {
  operationalThroughDay: 7,
  extendedThroughDay: 10,
  maximumDay: 14,
} as const;

export const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
