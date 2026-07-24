import type { LevelId } from './forecast.js';

export interface ClimatologyLevel {
  levelId: LevelId;
  elevationM: number;
  average7dCm: number | null;
  median7dCm: number | null;
  min7dCm: number | null;
  max7dCm: number | null;
  sampleYears: number;
}

export interface ClimatologyResponse {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  referenceYears: number;
  source: 'Open-Meteo Historical Weather API · ERA5';
  levels: ClimatologyLevel[];
  warning: string;
}
