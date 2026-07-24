import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type { CurrentSnowResponse } from './types/currentSnow.js';
import { makeForecastFixture } from './test/fixtures.js';

const forecastRefetch = vi.fn();
const currentSnowRefetch = vi.fn();
const useForecastMock = vi.fn();
const useCurrentSnowMock = vi.fn();

const currentSnowData: CurrentSnowResponse = {
  resort: 'Las Leñas',
  generatedAt: '2026-07-24T12:00:00Z',
  zones: [
    {
      zone: 'base',
      officialDepthCm: 20,
      referenceDepthCm: 20,
      referenceKind: 'official',
      independentSourceCount: 2,
      externalMinCm: 18,
      externalMaxCm: 22,
      newSnow24hCm: 3,
      observations: [],
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
      officialDepthCm: 35,
      referenceDepthCm: 35,
      referenceKind: 'official',
      independentSourceCount: 2,
      externalMinCm: 30,
      externalMaxCm: 35,
      newSnow24hCm: 5,
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
  sourceStatuses: [],
  warnings: [],
};

vi.mock('./hooks/useForecast.js', () => ({
  useForecast: () => useForecastMock(),
}));

vi.mock('./hooks/useCurrentSnow.js', () => ({
  useCurrentSnow: () => useCurrentSnowMock(),
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

beforeEach(() => {
  forecastRefetch.mockReset();
  currentSnowRefetch.mockReset();
  useForecastMock.mockReturnValue({
    data: makeForecastFixture(),
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: forecastRefetch,
  });
  useCurrentSnowMock.mockReturnValue({
    data: currentSnowData,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: currentSnowRefetch,
  });
});

test('renders current snow and changes selected forecast level', async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.getByRole('heading', { name: /Las Leñas Snow Monitor/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Nieve actual reportada/i })).toBeInTheDocument();
  expect(screen.getByText('snow-chart-summit')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Base/i }));
  expect(screen.getByText('snow-chart-base')).toBeInTheDocument();
});

test('changes mountain profile period and refreshes both endpoints', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: '15 días' }));
  expect(screen.getByText(/próximas 15 días/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Actualizar ahora/i }));
  expect(forecastRefetch).toHaveBeenCalledTimes(1);
  expect(currentSnowRefetch).toHaveBeenCalledTimes(1);
});

test('keeps the last successful forecast visible when a refresh fails', () => {
  useForecastMock.mockReturnValue({
    data: makeForecastFixture(),
    isPending: false,
    isError: true,
    isFetching: false,
    error: new Error('Actualización temporalmente no disponible'),
    refetch: forecastRefetch,
  });

  render(<App />);

  expect(screen.getByRole('heading', { name: /Las Leñas Snow Monitor/i })).toBeInTheDocument();
  expect(screen.getByText(/Actualización temporalmente no disponible/i)).toBeInTheDocument();
});

test('keeps forecast visible when current snow is unavailable', () => {
  useCurrentSnowMock.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
    isFetching: false,
    error: new Error('Fuentes bloqueadas temporalmente'),
    refetch: currentSnowRefetch,
  });

  render(<App />);

  expect(screen.getByText('snow-chart-summit')).toBeInTheDocument();
  expect(screen.getByText(/Fuentes bloqueadas temporalmente/i)).toBeInTheDocument();
});
