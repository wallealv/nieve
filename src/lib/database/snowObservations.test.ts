import { describe, expect, test, vi } from 'vitest';
import type {
  CurrentSnowResponse,
  CurrentSnowSourceId,
  ObservationZone,
  SnowObservation,
} from '../../types/currentSnow.js';
import type { NieveDatabase } from './client.js';
import { rowsFromCurrentSnow, saveSnowObservations } from './snowObservations.js';

function observation(
  sourceId: CurrentSnowSourceId,
  zone: ObservationZone,
  overrides: Partial<SnowObservation> = {},
): SnowObservation {
  return {
    sourceId,
    sourceName: sourceId,
    sourceKind: sourceId === 'las-lenas' ? 'official' : 'external',
    sourceUrl: 'https://example.com',
    provenanceGroup: sourceId === 'las-lenas' ? 'las-lenas-official' : 'independent',
    zone,
    elevationM: null,
    depthCm: 40,
    newSnow24hCm: 5,
    visibility: null,
    snowQuality: null,
    reportedAt: null,
    fetchedAt: '2026-07-24T12:00:00Z',
    timestampKind: 'retrieved',
    freshness: 'fresh',
    ...overrides,
  };
}

function response(observations: SnowObservation[]): CurrentSnowResponse {
  return {
    resort: 'Las Leñas',
    generatedAt: '2026-07-24T12:00:00Z',
    zones: (['base', 'mid', 'summit'] as const).map((zone) => ({
      zone,
      officialDepthCm: null,
      referenceDepthCm: null,
      referenceKind: 'unavailable',
      independentSourceCount: 0,
      externalMinCm: null,
      externalMaxCm: null,
      newSnow24hCm: null,
      observations: observations.filter((item) => item.zone === zone),
    })),
    operations: {
      liftsOpen: null,
      liftsConditional: null,
      liftsTotal: null,
      slopesOpen: null,
      slopesTotal: null,
      slopesOpenKm: null,
      slopesTotalKm: null,
      avalancheRisk: null,
      offPisteStatus: null,
      officialNote: null,
      fetchedAt: null,
    },
    sourceStatuses: [],
    warnings: [],
  };
}

describe('rowsFromCurrentSnow', () => {
  test('dates official reports by fetch time and external ones by reported time', () => {
    const rows = rowsFromCurrentSnow(
      response([
        observation('las-lenas', 'base', { depthCm: 35, newSnow24hCm: 8 }),
        observation('onthesnow', 'summit', {
          depthCm: 90,
          newSnow24hCm: null,
          reportedAt: '2026-07-24T02:00:00Z',
          timestampKind: 'reported',
        }),
      ]),
    );

    expect(rows).toEqual([
      {
        source_id: 'las-lenas',
        zone: 'base',
        observed_date: '2026-07-24',
        depth_cm: 35,
        new_snow_24h_cm: 8,
        reported_at: null,
        timestamp_kind: 'retrieved',
        fetched_at: '2026-07-24T12:00:00Z',
      },
      {
        source_id: 'onthesnow',
        zone: 'summit',
        observed_date: '2026-07-23',
        depth_cm: 90,
        new_snow_24h_cm: null,
        reported_at: '2026-07-24T02:00:00Z',
        timestamp_kind: 'reported',
        fetched_at: '2026-07-24T12:00:00Z',
      },
    ]);
  });

  test('skips observations without depth or new snow', () => {
    const rows = rowsFromCurrentSnow(
      response([
        observation('snow-forecast', 'mid', { depthCm: null, newSnow24hCm: null }),
        observation('skiresort-info', 'mid', { depthCm: -3, newSnow24hCm: null }),
      ]),
    );
    expect(rows).toEqual([]);
  });

  test('keeps the latest fetch for duplicated keys', () => {
    const rows = rowsFromCurrentSnow(
      response([
        observation('las-lenas', 'mid', { depthCm: 50, fetchedAt: '2026-07-24T11:00:00Z' }),
        observation('las-lenas', 'mid', { depthCm: 52, fetchedAt: '2026-07-24T13:00:00Z' }),
        observation('las-lenas', 'mid', { depthCm: 51, fetchedAt: '2026-07-24T12:00:00Z' }),
      ]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ depth_cm: 52, fetched_at: '2026-07-24T13:00:00Z' });
  });
});

describe('saveSnowObservations', () => {
  test('is a no-op without a database', async () => {
    await expect(
      saveSnowObservations(null, response([observation('las-lenas', 'base')])),
    ).resolves.toBe(false);
  });

  test('upserts into snow_observations on the primary key', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ upsert }));
    const client: NieveDatabase = { from, rpc: vi.fn() };

    await expect(
      saveSnowObservations(client, response([observation('las-lenas', 'base')])),
    ).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('snow_observations');
    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ source_id: 'las-lenas' })], {
      onConflict: 'source_id,zone,observed_date',
    });
  });
});
