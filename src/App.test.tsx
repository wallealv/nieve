import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { makeForecastFixture } from './test/fixtures.js';

const refetch = vi.fn();
const useForecastMock = vi.fn();

vi.mock('./hooks/useForecast.js', () => ({
  useForecast: () => useForecastMock(),
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
  refetch.mockReset();
  useForecastMock.mockReturnValue({
    data: makeForecastFixture(),
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch,
  });
});

test('renders the product and changes selected level', async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.getByRole('heading', { name: /Las Leñas Snow Monitor/i })).toBeInTheDocument();
  expect(screen.getByText('snow-chart-summit')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Base/i }));
  expect(screen.getByText('snow-chart-base')).toBeInTheDocument();
});

test('changes mountain profile period and refreshes', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: '15 días' }));
  expect(screen.getByText(/próximas 15 días/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Actualizar ahora/i }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

test('keeps the last successful forecast visible when a refresh fails', () => {
  useForecastMock.mockReturnValue({
    data: makeForecastFixture(),
    isPending: false,
    isError: true,
    isFetching: false,
    error: new Error('Actualización temporalmente no disponible'),
    refetch,
  });

  render(<App />);

  expect(screen.getByRole('heading', { name: /Las Leñas Snow Monitor/i })).toBeInTheDocument();
  expect(screen.getByText(/Actualización temporalmente no disponible/i)).toBeInTheDocument();
});
