import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { makeForecastFixture } from '../../test/fixtures.js';
import type { ForecastCalibration, LevelCalibration } from '../../types/forecast.js';
import { SnowForecastChart } from './SnowForecastChart.js';

const MEDIAN_CAPTION = 'Barras: mediana de modelos. Banda: mínimo–máximo. Línea: acumulado.';
const WEIGHTED_CAPTION =
  'Barras: consenso ponderado por el error de cada modelo. Banda: mínimo–máximo. Línea: acumulado.';

const { levels } = makeForecastFixture();
const base = levels[0]!;
const mid = levels[1]!;

function level(id: LevelCalibration['level'], weights: [number, number, number] | null): LevelCalibration {
  return {
    level: id,
    active: weights !== null,
    models: (['ecmwf', 'gfs', 'icon'] as const).map((model, index) => ({
      model,
      samples: weights ? 12 : 4,
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

test('calls the bars the median when there is no calibration', () => {
  render(<SnowForecastChart level={mid} calibration={calibration('unavailable', [])} />);
  expect(screen.getByText(MEDIAN_CAPTION)).toBeInTheDocument();
});

test('calls the bars the median for a response cached before calibration existed', () => {
  render(<SnowForecastChart level={mid} />);
  expect(screen.getByText(MEDIAN_CAPTION)).toBeInTheDocument();
});

test('calls the bars the median while calibration is still collecting samples', () => {
  render(
    <SnowForecastChart
      level={mid}
      calibration={calibration('insufficient-data', [level('base', null), level('mid', null)])}
    />,
  );
  expect(screen.getByText(MEDIAN_CAPTION)).toBeInTheDocument();
});

test('calls the bars skill-weighted only on the calibrated level', () => {
  const active = calibration('active', [level('base', null), level('mid', [0.5, 0.3, 0.2])]);

  const { unmount } = render(<SnowForecastChart level={mid} calibration={active} />);
  expect(screen.getByText(WEIGHTED_CAPTION)).toBeInTheDocument();
  unmount();

  render(<SnowForecastChart level={base} calibration={active} />);
  expect(screen.getByText(MEDIAN_CAPTION)).toBeInTheDocument();
  expect(screen.queryByText(/ponderado/)).not.toBeInTheDocument();
});
