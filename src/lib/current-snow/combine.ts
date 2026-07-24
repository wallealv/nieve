import type {
  CurrentSnowZoneSummary,
  ObservationFreshness,
  ObservationProvenanceGroup,
  ObservationZone,
  SnowObservation,
} from '../../types/currentSnow.js';
import { compact, median, nullableRange, round } from '../forecast/math.js';

const ZONES: ObservationZone[] = ['base', 'mid', 'summit'];

const FRESHNESS_RANK: Record<ObservationFreshness, number> = {
  fresh: 4,
  aging: 3,
  unknown: 2,
  stale: 1,
};

function completeness(observation: SnowObservation): number {
  return [
    observation.depthCm,
    observation.newSnow24hCm,
    observation.visibility,
    observation.snowQuality,
    observation.reportedAt,
  ].filter((value) => value !== null).length;
}

function timestamp(observation: SnowObservation): number {
  const value = observation.reportedAt ?? observation.fetchedAt;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function chooseRepresentative(observations: SnowObservation[]): SnowObservation {
  return [...observations].sort((left, right) => {
    const freshnessDifference =
      FRESHNESS_RANK[right.freshness] - FRESHNESS_RANK[left.freshness];
    if (freshnessDifference !== 0) return freshnessDifference;

    const timeDifference = timestamp(right) - timestamp(left);
    if (timeDifference !== 0) return timeDifference;

    return completeness(right) - completeness(left);
  })[0]!;
}

function eligibleExternalDepth(observation: SnowObservation): boolean {
  return (
    observation.sourceKind === 'external' &&
    observation.depthCm !== null &&
    (observation.freshness === 'fresh' || observation.freshness === 'aging')
  );
}

function groupRepresentatives(
  observations: SnowObservation[],
): Map<ObservationProvenanceGroup, SnowObservation> {
  const groups = new Map<ObservationProvenanceGroup, SnowObservation[]>();

  observations.filter(eligibleExternalDepth).forEach((observation) => {
    const group = groups.get(observation.provenanceGroup) ?? [];
    group.push(observation);
    groups.set(observation.provenanceGroup, group);
  });

  return new Map(
    [...groups.entries()].map(([group, values]) => [group, chooseRepresentative(values)]),
  );
}

function combineZone(
  zone: ObservationZone,
  observations: SnowObservation[],
): CurrentSnowZoneSummary {
  const zoneObservations = observations.filter((observation) => observation.zone === zone);
  const official = zoneObservations
    .filter(
      (observation) =>
        observation.sourceKind === 'official' && observation.depthCm !== null,
    )
    .sort((left, right) => timestamp(right) - timestamp(left))[0];

  const representatives = [...groupRepresentatives(zoneObservations).values()];
  const externalDepths = representatives.map((observation) => observation.depthCm);
  const range = nullableRange(externalDepths);
  const independentSourceCount = compact(externalDepths).length;

  let referenceDepthCm: number | null = null;
  let referenceKind: CurrentSnowZoneSummary['referenceKind'] = 'unavailable';

  if (official?.depthCm !== null && official?.depthCm !== undefined) {
    referenceDepthCm = official.depthCm;
    referenceKind = 'official';
  } else if (independentSourceCount >= 2) {
    referenceDepthCm = round(median(externalDepths));
    referenceKind = 'external-consensus';
  } else if (independentSourceCount === 1) {
    referenceDepthCm = round(compact(externalDepths)[0] ?? null);
    referenceKind = 'single-external';
  }

  const officialNewSnow = zoneObservations
    .filter(
      (observation) =>
        observation.sourceKind === 'official' && observation.newSnow24hCm !== null,
    )
    .sort((left, right) => timestamp(right) - timestamp(left))[0]?.newSnow24hCm;

  const externalNewSnow = representatives
    .filter((observation) => observation.newSnow24hCm !== null)
    .map((observation) => observation.newSnow24hCm);

  return {
    zone,
    officialDepthCm: official?.depthCm ?? null,
    referenceDepthCm: round(referenceDepthCm),
    referenceKind,
    independentSourceCount,
    externalMinCm: independentSourceCount ? round(range.min) : null,
    externalMaxCm: independentSourceCount ? round(range.max) : null,
    newSnow24hCm:
      officialNewSnow ?? (externalNewSnow.length ? round(median(externalNewSnow)) : null),
    observations: [...zoneObservations].sort((left, right) => {
      if (left.sourceKind !== right.sourceKind) return left.sourceKind === 'official' ? -1 : 1;
      return timestamp(right) - timestamp(left);
    }),
  };
}

export function combineCurrentSnow(
  observations: SnowObservation[],
): CurrentSnowZoneSummary[] {
  return ZONES.map((zone) => combineZone(zone, observations));
}
