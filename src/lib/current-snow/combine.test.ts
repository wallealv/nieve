import { describe, expect, test } from 'vitest';
import type { SnowObservation } from '../../types/currentSnow.js';
import { combineCurrentSnow } from './combine.js';

function observation(
  overrides: Partial<SnowObservation> & Pick<SnowObservation, 'sourceId' | 'zone'>,
): SnowObservation {
  return {
    sourceName: overrides.sourceId,
    sourceKind: 'external',
    sourceUrl: 'https://example.com',
    provenanceGroup: 'independent',
    elevationM: null,
    depthCm: null,
    newSnow24hCm: null,
    visibility: null,
    snowQuality: null,
    reportedAt: '2026-07-24T10:00:00Z',
    fetchedAt: '2026-07-24T12:00:00Z',
    timestampKind: 'reported',
    freshness: 'fresh',
    ...overrides,
    sourceId: overrides.sourceId,
    zone: overrides.zone,
  };
}

describe('combineCurrentSnow', () => {
  test('keeps the official value as reference while exposing external range', () => {
    const result = combineCurrentSnow([
      observation({
        sourceId: 'las-lenas',
        sourceKind: 'official',
        provenanceGroup: 'las-lenas-official',
        zone: 'base',
        depthCm: 28,
        newSnow24hCm: 3,
        reportedAt: null,
        timestampKind: 'retrieved',
        freshness: 'unknown',
      }),
      observation({
        sourceId: 'snow-forecast',
        provenanceGroup: 'skiresort-network',
        zone: 'base',
        depthCm: 20,
      }),
      observation({
        sourceId: 'onthesnow',
        provenanceGroup: 'onthesnow-network',
        zone: 'base',
        depthCm: 25,
      }),
    ]);

    expect(result[0]).toMatchObject({
      referenceDepthCm: 28,
      referenceKind: 'official',
      officialDepthCm: 28,
      newSnow24hCm: 3,
      independentSourceCount: 2,
      externalMinCm: 20,
      externalMaxCm: 25,
    });
  });

  test('uses the median of independent external provenance groups', () => {
    const result = combineCurrentSnow([
      observation({
        sourceId: 'snow-forecast',
        provenanceGroup: 'skiresort-network',
        zone: 'summit',
        depthCm: 35,
      }),
      observation({
        sourceId: 'onthesnow',
        provenanceGroup: 'onthesnow-network',
        zone: 'summit',
        depthCm: 30.5,
      }),
    ]);

    expect(result[2]).toMatchObject({
      referenceDepthCm: 32.8,
      referenceKind: 'external-consensus',
      independentSourceCount: 2,
    });
  });

  test('counts Snow-Forecast and Skiresort.info once because they share provenance', () => {
    const result = combineCurrentSnow([
      observation({
        sourceId: 'snow-forecast',
        provenanceGroup: 'skiresort-network',
        zone: 'base',
        depthCm: 20,
        reportedAt: '2026-07-23T10:00:00Z',
      }),
      observation({
        sourceId: 'skiresort-info',
        provenanceGroup: 'skiresort-network',
        zone: 'base',
        depthCm: 22,
        reportedAt: '2026-07-24T10:00:00Z',
      }),
    ]);

    expect(result[0]).toMatchObject({
      referenceDepthCm: 22,
      referenceKind: 'single-external',
      independentSourceCount: 1,
    });
  });

  test('excludes stale and unknown external reports from the reference', () => {
    const result = combineCurrentSnow([
      observation({
        sourceId: 'snow-forecast',
        zone: 'base',
        depthCm: 20,
        freshness: 'stale',
      }),
      observation({
        sourceId: 'onthesnow',
        zone: 'base',
        depthCm: 25,
        freshness: 'unknown',
      }),
    ]);

    expect(result[0]).toMatchObject({
      referenceDepthCm: null,
      referenceKind: 'unavailable',
      independentSourceCount: 0,
    });
  });

  test('never infers a mid-mountain value from base and summit', () => {
    const result = combineCurrentSnow([
      observation({ sourceId: 'onthesnow', zone: 'base', depthCm: 20 }),
      observation({ sourceId: 'onthesnow', zone: 'summit', depthCm: 35 }),
    ]);

    expect(result[1]).toMatchObject({
      zone: 'mid',
      referenceDepthCm: null,
      referenceKind: 'unavailable',
    });
  });
});
