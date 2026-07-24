export type ObservationZone = 'base' | 'mid' | 'summit';
export type CurrentSnowSourceId =
  | 'las-lenas'
  | 'snow-forecast'
  | 'skiresort-info'
  | 'onthesnow';
export type CurrentSnowSourceKind = 'official' | 'external';
export type ObservationFreshness = 'fresh' | 'aging' | 'stale' | 'unknown';
export type ObservationTimestampKind = 'reported' | 'retrieved';
export type ObservationProvenanceGroup =
  | 'las-lenas-official'
  | 'skiresort-network'
  | 'onthesnow-network'
  | 'independent';
export type CurrentSnowReferenceKind =
  | 'official'
  | 'external-consensus'
  | 'single-external'
  | 'unavailable';
export type CurrentSnowSourceStatus = 'ok' | 'partial' | 'failed';

export interface SnowObservation {
  sourceId: CurrentSnowSourceId;
  sourceName: string;
  sourceKind: CurrentSnowSourceKind;
  sourceUrl: string;
  provenanceGroup: ObservationProvenanceGroup;
  zone: ObservationZone;
  elevationM: number | null;
  depthCm: number | null;
  newSnow24hCm: number | null;
  visibility: string | null;
  snowQuality: string | null;
  reportedAt: string | null;
  fetchedAt: string;
  timestampKind: ObservationTimestampKind;
  freshness: ObservationFreshness;
}

export interface CurrentSnowZoneSummary {
  zone: ObservationZone;
  officialDepthCm: number | null;
  referenceDepthCm: number | null;
  referenceKind: CurrentSnowReferenceKind;
  independentSourceCount: number;
  externalMinCm: number | null;
  externalMaxCm: number | null;
  newSnow24hCm: number | null;
  observations: SnowObservation[];
}

export interface CurrentSnowOperations {
  liftsOpen: number | null;
  liftsConditional: number | null;
  liftsTotal: number | null;
  slopesOpen: number | null;
  slopesTotal: number | null;
  slopesOpenKm: number | null;
  slopesTotalKm: number | null;
  avalancheRisk: number | null;
  offPisteStatus: string | null;
  officialNote: string | null;
  fetchedAt: string | null;
}

export interface CurrentSnowSourceReport {
  sourceId: CurrentSnowSourceId;
  sourceName: string;
  sourceKind: CurrentSnowSourceKind;
  sourceUrl: string;
  provenanceGroup: ObservationProvenanceGroup;
  observations: SnowObservation[];
  operations?: Partial<CurrentSnowOperations>;
}

export interface CurrentSnowSourceStatusEntry {
  sourceId: CurrentSnowSourceId;
  sourceName: string;
  status: CurrentSnowSourceStatus;
  fetchedAt: string;
  message: string | null;
}

export interface CurrentSnowResponse {
  resort: 'Las Leñas';
  generatedAt: string;
  zones: CurrentSnowZoneSummary[];
  operations: CurrentSnowOperations;
  sourceStatuses: CurrentSnowSourceStatusEntry[];
  warnings: string[];
}

export interface CurrentSnowApiErrorResponse {
  error: string;
  message: string;
}
