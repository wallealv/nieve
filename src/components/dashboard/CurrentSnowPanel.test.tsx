import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { CurrentSnowResponse, SnowObservation } from '../../types/currentSnow.js';
import { CurrentSnowPanel } from './CurrentSnowPanel.js';

function observation(overrides: Partial<SnowObservation>): SnowObservation {
  return {
    sourceId: 'las-lenas',
    sourceName: 'Las Leñas oficial',
    sourceKind: 'official',
    sourceUrl: 'https://laslenas.com',
    provenanceGroup: 'las-lenas-official',
    zone: 'base',
    elevationM: 2240,
    depthCm: 28,
    newSnow24hCm: 3,
    visibility: 'Buena',
    snowQuality: null,
    reportedAt: null,
    fetchedAt: '2026-07-24T12:00:00Z',
    timestampKind: 'retrieved',
    freshness: 'unknown',
    ...overrides,
  };
}

const officialBase = observation({});
const snowForecastBase = observation({
  sourceId: 'snow-forecast',
  sourceName: 'Snow-Forecast',
  sourceKind: 'external',
  provenanceGroup: 'skiresort-network',
  depthCm: 20,
  newSnow24hCm: null,
  reportedAt: '2026-07-24T08:00:00Z',
  timestampKind: 'reported',
  freshness: 'fresh',
});
const onTheSnowBase = observation({
  sourceId: 'onthesnow',
  sourceName: 'OnTheSnow',
  sourceKind: 'external',
  provenanceGroup: 'onthesnow-network',
  depthCm: 25,
  newSnow24hCm: null,
  reportedAt: '2026-07-24T09:00:00Z',
  timestampKind: 'reported',
  freshness: 'fresh',
});

const data: CurrentSnowResponse = {
  resort: 'Las Leñas',
  generatedAt: '2026-07-24T12:00:00Z',
  zones: [
    {
      zone: 'base',
      officialDepthCm: 28,
      referenceDepthCm: 28,
      referenceKind: 'official',
      independentSourceCount: 2,
      externalMinCm: 20,
      externalMaxCm: 25,
      newSnow24hCm: 3,
      observations: [officialBase, snowForecastBase, onTheSnowBase],
    },
    {
      zone: 'mid',
      officialDepthCm: null,
      referenceDepthCm: null,
      referenceKind: 'unavailable',
      independentSourceCount: 0,
      externalMinCm: null,
      externalMaxCm: null,
      newSnow24hCm: null,
      observations: [],
    },
    {
      zone: 'summit',
      officialDepthCm: null,
      referenceDepthCm: 32.8,
      referenceKind: 'external-consensus',
      independentSourceCount: 2,
      externalMinCm: 30.5,
      externalMaxCm: 35,
      newSnow24hCm: null,
      observations: [],
    },
  ],
  operations: {
    liftsOpen: null,
    liftsTotal: null,
    slopesOpenKm: null,
    slopesTotalKm: null,
    avalancheRisk: null,
  },
  sourceStatuses: [
    {
      sourceId: 'las-lenas',
      sourceName: 'Las Leñas oficial',
      status: 'ok',
      fetchedAt: '2026-07-24T12:00:00Z',
      message: null,
    },
    {
      sourceId: 'snow-forecast',
      sourceName: 'Snow-Forecast',
      status: 'ok',
      fetchedAt: '2026-07-24T12:00:00Z',
      message: null,
    },
    {
      sourceId: 'skiresort-info',
      sourceName: 'Skiresort.info',
      status: 'failed',
      fetchedAt: '2026-07-24T12:00:00Z',
      message: 'HTTP 403',
    },
    {
      sourceId: 'onthesnow',
      sourceName: 'OnTheSnow',
      status: 'ok',
      fetchedAt: '2026-07-24T12:00:00Z',
      message: null,
    },
  ],
  warnings: ['Skiresort.info no está disponible; se muestran las demás fuentes.'],
};

describe('CurrentSnowPanel', () => {
  test('shows official, consensus, unavailable and source-detail states', () => {
    render(<CurrentSnowPanel data={data} isPending={false} isFetching={false} error={null} />);

    expect(screen.getByRole('heading', { name: /Nieve actual reportada/i })).toBeInTheDocument();

    const base = screen.getByLabelText('Nieve actual en Base');
    expect(within(base).getByText('28 cm')).toBeInTheDocument();
    expect(within(base).getByText('Dato oficial')).toBeInTheDocument();
    expect(within(base).getByText(/20.0 cm–25.0 cm/)).toBeInTheDocument();

    const summit = screen.getByLabelText('Nieve actual en Cumbre');
    expect(within(summit).getByText('32.8 cm')).toBeInTheDocument();
    expect(within(summit).getByText('Consenso externo')).toBeInTheDocument();

    const mid = screen.getByLabelText('Nieve actual en Intermedia');
    expect(within(mid).getByText('Sin dato')).toBeInTheDocument();
    expect(within(mid).getByText(/Ninguna fuente publicó/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Las Leñas oficial/i })).toHaveAttribute(
      'href',
      expect.stringContaining('laslenas.com'),
    );
    expect(screen.getByText('HTTP 403')).toBeInTheDocument();
  });

  test('keeps a stale successful response visible after a refresh error', () => {
    render(
      <CurrentSnowPanel
        data={data}
        isPending={false}
        isFetching={false}
        error={new Error('timeout')}
      />,
    );

    expect(screen.getByText(/se conserva el último parte válido: timeout/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Nieve actual en Base')).toBeInTheDocument();
  });

  test('shows an independent error without hiding the forecast area', () => {
    render(
      <CurrentSnowPanel
        data={undefined}
        isPending={false}
        isFetching={false}
        error={new Error('todas las fuentes fallaron')}
      />,
    );

    expect(screen.getByRole('heading', { name: /Nieve actual no disponible/i })).toBeInTheDocument();
    expect(screen.getByText(/El pronóstico sigue disponible más abajo/i)).toBeInTheDocument();
  });
});
