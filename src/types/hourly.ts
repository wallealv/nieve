import type { MountainLevelConfig, ModelId } from './forecast.js';

export type SnowPhase = 'rain' | 'mixed' | 'wet-snow' | 'dry-snow' | 'none' | 'uncertain';
export type SnowQualityLabel =
  | 'dry-powder'
  | 'dense-powder'
  | 'wet-snow'
  | 'wind-affected'
  | 'compaction-risk'
  | 'crust-ice-risk'
  | 'corn-possible'
  | 'uncertain';

export interface HourlyPoint {
  time: string;
  snowfallCm: number | null;
  rainMm: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  dewPointC: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windGustKmh: number | null;
  visibilityM: number | null;
  cloudCoverPct: number | null;
  shortwaveRadiationWm2: number | null;
  freezingLevelM: number | null;
  snowDepthCm: number | null;
  isDay: boolean | null;
  weatherCode: number | null;
}

export interface HourlyLevelForecast {
  level: MountainLevelConfig;
  points: HourlyPoint[];
}

export interface ModelHourlyResult {
  model: ModelId;
  generatedAt: string;
  levels: HourlyLevelForecast[];
}

export interface HourlyModelStatus {
  id: ModelId;
  name: string;
  shortName: string;
  status: 'ok' | 'failed';
  generatedAt: string | null;
  message: string | null;
}

export interface HourlyResponse {
  resort: {
    name: string;
    timezone: string;
    updatedAt: string;
    source: string;
  };
  models: HourlyModelStatus[];
  levels: HourlyLevelForecast[];
  warnings: string[];
}

export interface ForecastWindow {
  startTime: string;
  endTime: string;
  snowfallCm: number;
  rainMm: number;
  nightSnowfallCm: number;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  visibilityMinM: number | null;
  shortwaveRadiationMaxWm2: number | null;
  phase: SnowPhase;
  quality: SnowQualityLabel;
  confidenceScore: number;
}

export interface ActivityScore {
  status: 'scored' | 'blocked';
  score: number | null;
  positive: string[];
  negative: string[];
}

export interface ActivityScores {
  powder: ActivityScore;
  piste: ActivityScore;
  freeride: ActivityScore;
}

export interface BestScoredWindow extends ForecastWindow {
  levelId: MountainLevelConfig['id'];
  score: number;
}

export interface BestWindowSummary {
  powder: BestScoredWindow | null;
  piste: BestScoredWindow | null;
  freeride: BestScoredWindow | null;
  bestDay: { date: string; score: number } | null;
}
