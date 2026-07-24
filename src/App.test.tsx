import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { makeForecastFixture } from './test/fixtures.js';
import type { CurrentSnowResponse } from './types/currentSnow.js';

const forecastRefetch = vi.fn();
const currentSnowRefetch = vi.fn();
const hourlyRefetch = vi.fn();
const modelRunsRefetch = vi.fn();
const roadRefetch = vi.fn();
const webcamRefetch = vi.fn();
const regionalRefetch = vi.fn();
const climatologyRefetch = vi.fn();
const useForecastMock = vi.fn();
const useCurrentSnowMock = vi.fn();
const useHourlyForecastMock = vi.fn();
const useModelRunsMock = vi.fn();
const useRoadStatusMock = vi.fn();
const useWebcamStatusMock = vi.fn();
const useRegionalForecastMock = vi.fn();
const useClimatologyMock = vi.fn();

const currentSnowData: CurrentSnowResponse = {
  resort: 'Las Leñas',
  generatedAt: '2026-07-24T12:00:00Z',
  zones: [
    {
      zone: 'base', officialDepthCm: 20, referenceDepthCm: 20, referenceKind: 'official',
      independentSourceCount: 2, externalMinCm: 18, externalMaxCm: 22, newSnow24hCm: 3, observations: [],
    },
    {
      zone: 'mid', officialDepthCm: null, referenceDepthCm: null, referenceKind: 'unavailable',
      independentSourceCount: 0, externalMinCm: null, externalMaxCm: null, newSnow24hCm: null, observations: [],
    },
    {
      zone: 'summit', officialDepthCm: 35, referenceDepthCm: 35, referenceKind: 'official',
      independentSourceCount: 2, externalMinCm: 30, externalMaxCm: 35, newSnow24hCm: 5, observations: [],
    },
  ],
  operations: {
    liftsOpen: 8, liftsConditional: 1, liftsTotal: 12, slopesOpen: 14, slopesTotal: 29,
    slopesOpenKm: null, slopesTotalKm: null, avalancheRisk: 3, offPisteStatus: 'Condicional',
    officialNote: null, fetchedAt: '2026-07-24T12:00:00Z',
  },
  sourceStatuses: [],
  warnings: [],
};

vi.mock('./hooks/useForecast.js', () => ({ useForecast: () => useForecastMock() }));
vi.mock('./hooks/useCurrentSnow.js', () => ({ useCurrentSnow: () => useCurrentSnowMock() }));
vi.mock('./hooks/useHourlyForecast.js', () => ({ useHourlyForecast: () => useHourlyForecastMock() }));
vi.mock('./hooks/useModelRuns.js', () => ({ useModelRuns: () => useModelRunsMock() }));
vi.mock('./hooks/useRoadStatus.js', () => ({ useRoadStatus: () => useRoadStatusMock() }));
vi.mock('./hooks/useWebcamStatus.js', () => ({ useWebcamStatus: () => useWebcamStatusMock() }));
vi.mock('./hooks/useRegionalForecast.js', () => ({ useRegionalForecast: () => useRegionalForecastMock() }));
vi.mock('./hooks/useClimatology.js', () => ({ useClimatology: () => useClimatologyMock() }));
vi.mock('./hooks/useOffPisteChange.js', () => ({ useOffPisteChange: () => null }));
vi.mock('./hooks/usePwaStatus.js', () => ({
  usePwaStatus: () => ({
    online: true,
    standalone: true,
    canInstall: false,
    ios: false,
    updateAvailable: false,
    install: vi.fn().mockResolvedValue(false),
    reload: vi.fn(),
  }),
}));
vi.mock('./components/map/RegionalSnowMapLoader.js', () => ({
  RegionalSnowMapLoader: () => <div>regional-map-loader</div>,
}));

vi.mock('./components/charts/SnowForecastChart.js', () => ({
  SnowForecastChart: ({ level }: { level: { level: { id: string } } }) => (
    <div>snow-chart-{level.level.id}</div>
  ),
}));

vi.mock('./components/charts/ConditionsChart.js', () => ({
  ConditionsChart: ({ level }: { level: { level: { id: string } } }) => (
    <div>conditions-chart-{level.level.id}</div>
  ),
}));

import { App } from './App.js';

function secondaryQuery(refetch: ReturnType<typeof vi.fn>) {
  return {
    data: undefined,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch,
    change: null,
  };
}

beforeEach(() => {
  localStorage.clear();
  [
    forecastRefetch,
    currentSnowRefetch,
    hourlyRefetch,
    modelRunsRefetch,
    roadRefetch,
    webcamRefetch,
    regionalRefetch,
    climatologyRefetch,
  ].forEach((mock) => mock.mockReset());
  useForecastMock.mockReturnValue({
    data: makeForecastFixture(), isPending: false, isError: false, isFetching: false,
    error: null, refetch: forecastRefetch,
  });
  useCurrentSnowMock.mockReturnValue({
    data: currentSnowData, isPending: false, isError: false, isFetching: false,
    error: null, refetch: currentSnowRefetch,
  });
  useHourlyForecastMock.mockReturnValue(secondaryQuery(hourlyRefetch));
  useModelRunsMock.mockReturnValue(secondaryQuery(modelRunsRefetch));
  useRoadStatusMock.mockReturnValue(secondaryQuery(roadRefetch));
  useWebcamStatusMock.mockReturnValue(secondaryQuery(webcamRefetch));
  useRegionalForecastMock.mockReturnValue(secondaryQuery(regionalRefetch));
  useClimatologyMock.mockReturnValue(secondaryQuery(climatologyRefetch));
});

test('renders storm, current snow and changes selected forecast level', async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.getByRole('heading', { name: /Las Leñas Snow Monitor/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Nieve actual reportada/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Estado de la RP 222/i })).toBeInTheDocument();
  expect(screen.getByText(/Tormenta principal/i)).toBeInTheDocument();
  expect(screen.getByText('regional-map-loader')).toBeInTheDocument();
  expect(await screen.findByText('snow-chart-summit')).toBeInTheDocument();

  const baseButtons = screen.getAllByRole('button', { name: /Base/i });
  await user.click(baseButtons[0]!);
  expect(await screen.findByText('snow-chart-base')).toBeInTheDocument();
});

test('changes mountain profile period and refreshes all endpoints', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(await screen.findByRole('button', { name: '15 días' }));
  expect(screen.getByText(/próximas 15 días/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Actualizar ahora/i }));
  expect(forecastRefetch).toHaveBeenCalledTimes(1);
  expect(currentSnowRefetch).toHaveBeenCalledTimes(1);
  expect(hourlyRefetch).toHaveBeenCalledTimes(1);
  expect(modelRunsRefetch).toHaveBeenCalledTimes(1);
  expect(roadRefetch).toHaveBeenCalledTimes(1);
  expect(webcamRefetch).toHaveBeenCalledTimes(1);
  expect(regionalRefetch).toHaveBeenCalledTimes(1);
  expect(climatologyRefetch).toHaveBeenCalledTimes(1);
});

test('keeps the last successful forecast visible when a refresh fails', () => {
  useForecastMock.mockReturnValue({
    data: makeForecastFixture(), isPending: false, isError: true, isFetching: false,
    error: new Error('Actualización temporalmente no disponible'), refetch: forecastRefetch,
  });

  render(<App />);

  expect(screen.getByRole('heading', { name: /Las Leñas Snow Monitor/i })).toBeInTheDocument();
  expect(screen.getByText(/Actualización temporalmente no disponible/i)).toBeInTheDocument();
});

test('keeps forecast visible when current snow is unavailable', async () => {
  useCurrentSnowMock.mockReturnValue({
    data: undefined, isPending: false, isError: true, isFetching: false,
    error: new Error('Fuentes bloqueadas temporalmente'), refetch: currentSnowRefetch,
  });

  render(<App />);

  expect(await screen.findByText('snow-chart-summit')).toBeInTheDocument();
  expect(screen.getByText(/Fuentes bloqueadas temporalmente/i)).toBeInTheDocument();
});