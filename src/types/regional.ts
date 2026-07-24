import type { ConfidenceLabel } from './forecast.js';

export type RegionalResortId =
  | 'las-lenas'
  | 'catedral'
  | 'chapelco'
  | 'cerro-castor'
  | 'valle-nevado'
  | 'la-parva'
  | 'el-colorado';

export interface RegionalPointConfig {
  latitude: number;
  longitude: number;
  elevationM: number;
}

export interface RegionalResortConfig {
  id: RegionalResortId;
  name: string;
  country: 'Argentina' | 'Chile';
  timezone: string;
  officialUrl: string;
  base: RegionalPointConfig;
  summit: RegionalPointConfig;
}

export type RegionalBasePhaseRisk = 'snow' | 'mixed-risk' | 'rain-risk' | 'unknown';

export interface RegionalResortSummary {
  id: string;
  name: string;
  country: string;
  officialUrl: string;
  representativeLatitude: number;
  representativeLongitude: number;
  snow72hCm: number | null;
  snow7dCm: number | null;
  snowMin7dCm: number | null;
  snowMax7dCm: number | null;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  maxGustKmh: number | null;
  basePhaseRisk: RegionalBasePhaseRisk;
  modelCount: number;
  warnings: string[];
}

export interface RankedRegionalResort extends RegionalResortSummary {
  rank: number | null;
  score: number | null;
  status: 'ranked' | 'insufficient';
  reasons: string[];
  penalties: string[];
}

export interface RegionalResponse {
  generatedAt: string;
  source: string;
  resorts: RankedRegionalResort[];
  warnings: string[];
}

export type RegionalMapPeriod = '6h' | '12h' | '24h' | '48h' | '72h';

export interface RegionalGridPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  snowfallCm: Record<RegionalMapPeriod, number | null>;
  phase: RegionalBasePhaseRisk;
}

export interface RegionalGridResponse {
  generatedAt: string;
  model: 'ECMWF IFS';
  points: RegionalGridPoint[];
  warning: string | null;
}
