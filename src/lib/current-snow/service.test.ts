import { describe, expect, test } from 'vitest';
import type {
  CurrentSnowSourceId,
  CurrentSnowSourceReport,
  SnowObservation,
} from '../../types/currentSnow.js';
import { buildCurrentSnowResponse } from './service.js';

function report(
  sourceId: CurrentSnowSourceId,
  observations: SnowObservation[],
): CurrentSnowSourceReport {
  return {
    sourceId,
    sourceName: sourceId,
    sourceKind: sourceId === 'las-lenas' ? 'official' : 'external',
    sourceUrl: 'https://example.com',
    provenanceGroup:
      sourceId === 'las-lenas'
        ? 'las-lenas-official'
        : sourceId === 'onthesnow'
          ? 'onthesnow-network'
          : 'skiresort-network',
    observations,
  };
}

function observation(
  sourceId: CurrentSnowSourceId,
  depthCm: number,
): SnowObservation {
  return {
    sourceId,
    sourceName: sourceId,
    sourceKind: sourceId === 'las-lenas' ? 'official' : 'external',
    sourceUrl: 'https://example.com',
    provenanceGroup:
      sourceId === 'las-lenas'
        ? 'las-lenas-official'
        : sourceId === 'onthesnow'
          ? 'onthesnow-network'
          : 'skiresort-network',
    zone: 'base',
    elevationM: 2240,
    depthCm,
    newSnow24hCm: null,
    visibility: null,
    snowQuality: null,
    reportedAt: '2026-07-24T10:00:00Z',
    fetchedAt: '2026-07-24T12:00:00Z',
    timestampKind: 'reported',
    freshness: 'fresh',
  };
}

describe('buildCurrentSnowResponse', () => {
  test('keeps successful sources when another source fails', async () => {
    const response = await buildCurrentSnowResponse(
      async (source) => {
        if (source.id === 'snow-forecast') throw new Error('blocked');
        if (source.id === 'las-lenas') return report(source.id, [observation(source.id, 30)]);
        if (source.id === 'skiresort-info') return report(source.id, [observation(source.id, 20)]);
        return report(source.id, [observation(source.id, 25)]);
      },
      new Date('2026-07-24T12:00:00Z'),
    );

    expect(response.zones[0]?.referenceDepthCm).toBe(30);
    expect(response.sourceStatuses.find((status) => status.sourceId === 'snow-forecast')).toMatchObject({
      status: 'failed',
      message: 'blocked',
    });
    expect(response.warnings.join(' ')).toMatch(/Snow-Forecast no está disponible/i);
  });

  test('uses external sources and warns when the official source fails', async () => {
    const response = await buildCurrentSnowResponse(
      async (source) => {
        if (source.id === 'las-lenas') throw new Error('official unavailable');
        if (source.id === 'onthesnow') return report(source.id, [observation(source.id, 30)]);
        return report(source.id, [observation(source.id, 20)]);
      },
      new Date('2026-07-24T12:00:00Z'),
    );

    expect(response.zones[0]).toMatchObject({
      referenceKind: 'external-consensus',
      referenceDepthCm: 25,
      independentSourceCount: 2,
    });
    expect(response.warnings[0]).toMatch(/parte oficial no está disponible/i);
  });

  test('throws only when every source fails', async () => {
    await expect(
      buildCurrentSnowResponse(async () => {
        throw new Error('all unavailable');
      }),
    ).rejects.toThrow('all unavailable');
  });
});
