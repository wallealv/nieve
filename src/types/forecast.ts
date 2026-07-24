export type LevelId = 'base' | 'mid' | 'summit';
export type ModelId = 'ecmwf' | 'gfs' | 'icon';
export type ForecastBand = 'operational' | 'extended' | 'guidance';
export type ConfidenceLabel = 'Alta' | 'Media' | 'Baja' | 'Muy baja';
export type ModelRunStatus = 'ok' | 'partial' | 'failed';
export type SnowSource = 'direct' | 'estimated';

export interface MountainLevelConfig {
  id: LevelId;
  name: string;
  shortName: string;
  elevationM: number;
  latitude: number;
  longitude: number;
}

export interface ForecastModelConfig {
  id: ModelId;
  name: string;
  shortName: string;
  endpoint: string;
  forecastDays: number;
  expectedThroughDay: number;
}

export interface ModelValue {
  model: ModelId;
  snowfallCm: number | null;
  source: SnowSource;
}

export interface LevelDailyForecast {
  date: string;
  dayIndex: number;
  band: ForecastBand;
  snowfallMedianCm: number | null;
  snowfallMinCm: number | null;
  snowfallMaxCm: number | null;
  cumulativeMedianCm: number | null;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  modelCount: number;
  models: ModelValue[];
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  freezingLevelM: number | null;
  weatherCode: number | null;
}

export interface LevelForecast {
  level: MountainLevelConfig;
  daily: LevelDailyForecast[];
  totals: {
    hours24: number | null;
    hours72: number | null;
    days7: number | null;
    days15: number | null;
  };
  maxWindKmh: number | null;
  maxGustKmh: number | null;
}

export interface ModelStatus {
  id: ModelId;
  name: string;
  shortName: string;
  status: ModelRunStatus;
  availableLevels: number;
  requestedLevels: number;
  forecastThrough: string | null;
  generatedAt: string | null;
  message: string | null;
}

export interface DailyConsensus {
  date: string;
  dayIndex: number;
  band: ForecastBand;
  mountainSnowMedianCm: number | null;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
}

export interface ForecastResponse {
  resort: {
    name: string;
    timezone: string;
    updatedAt: string;
    source: string;
  };
  horizons: {
    operationalThroughDay: number;
    extendedThroughDay: number;
    maximumDay: number;
  };
  models: ModelStatus[];
  levels: LevelForecast[];
  dailyConsensus: DailyConsensus[];
  warnings: string[];
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}
