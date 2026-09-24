import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { ForecastCalibration, LevelCalibration } from '../../types/forecast.js';
import { ForecastMethodology } from './ForecastMethodology.js';

function level(
  id: LevelCalibration['level'],
  samples: [number, number, number],
  weights: [number, number, number] | null,
): LevelCalibration {
  return {
    level: id,
    active: weights !== null,
    models: (['ecmwf', 'gfs', 'icon'] as const).map((model, index) => ({
      model,
      samples: samples[index]!,
      maeCm: 2,
      biasCm: 0,
      weight: weights?.[index] ?? null,
    })),
  };
}

function calibration(
  status: ForecastCalibration['status'],
  levels: LevelCalibration[],
): ForecastCalibration {
  return { status, windowDays: 60, minSamples: 10, levels };
}

test('shows the skill weights of the mid level when calibration is active', () => {
  render(
    <ForecastMethodology
      calibration={calibration('active', [
        level('base', [14, 14, 14], [0.6, 0.2, 0.2]),
        level('mid', [12, 11, 12], [0.4545, 0.2455, 0.3]),
        level('summit', [4, 4, 4], null),
      ])}
    />,
  );

  expect(
    screen.getByText(
      'Consenso ponderado por el error real de cada modelo en Las Leñas (Montaña media, últimos 60 días): ECMWF 45 %, GFS 25 %, ICON 30 %.',
    ),
  ).toBeInTheDocument();
});

test('falls back to another active level when the mid level is not calibrated', () => {
  render(
    <ForecastMethodology
      calibration={calibration('active', [
        level('base', [14, 14, 14], [1 / 3, 1 / 3, 1 / 3]),
        level('mid', [9, 12, 12], null),
      ])}
    />,
  );

  expect(screen.getByText(/\(Base, últimos 60 días\): ECMWF 34 %, GFS 33 %, ICON 33 %\./)).toBeInTheDocument();
});

test('shows the sampling progress while there is not enough data', () => {
  render(
    <ForecastMethodology
      calibration={calibration('insufficient-data', [
        level('base', [3, 2, 3], null),
        level('mid', [7, 6, 7], null),
        level('summit', [0, 0, 0], null),
      ])}
    />,
  );

  expect(
    screen.getByText(
      'Guardando pronósticos y partes oficiales para calibrar los modelos (6 de 10 comparaciones).',
    ),
  ).toBeInTheDocument();
});

test('says nothing about calibration when it is unavailable', () => {
  render(<ForecastMethodology calibration={calibration('unavailable', [])} />);
  expect(screen.queryByText(/calibrar|ponderado/i)).not.toBeInTheDocument();

  render(<ForecastMethodology />);
  expect(screen.queryByText(/calibrar|ponderado/i)).not.toBeInTheDocument();
});
