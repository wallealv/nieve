import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { ModelRunsResponse } from '../../types/modelRuns.js';
import type { RoadStatus } from '../../types/road.js';
import type { WebcamStatus } from '../../types/webcam.js';
import { ModelRunEvolution } from './ModelRunEvolution.js';
import { RoadStatusCard } from './RoadStatusCard.js';
import { WebcamCard } from './WebcamCard.js';

const modelRuns: ModelRunsResponse = {
  resort: 'Las Leñas',
  generatedAt: '2026-07-24T12:00:00Z',
  reports: [
    {
      model: 'ecmwf', name: 'ECMWF IFS', shortName: 'ECMWF', status: 'ok', message: null,
      runs: [
        { run: '2026-07-24T06:00', levels: { base: { hours72Cm: 30, days7Cm: 70 }, mid: { hours72Cm: 40, days7Cm: 90 }, summit: { hours72Cm: 50, days7Cm: 110 } } },
        { run: '2026-07-24T00:00', levels: { base: { hours72Cm: 25, days7Cm: 60 }, mid: { hours72Cm: 35, days7Cm: 80 }, summit: { hours72Cm: 45, days7Cm: 95 } } },
        { run: '2026-07-23T18:00', levels: { base: { hours72Cm: 20, days7Cm: 50 }, mid: { hours72Cm: 30, days7Cm: 70 }, summit: { hours72Cm: 40, days7Cm: 80 } } },
      ],
      trends: {
        base: { direction: 'up', current: 70, previous: 60, delta: 10 },
        mid: { direction: 'up', current: 90, previous: 80, delta: 10 },
        summit: { direction: 'up', current: 110, previous: 95, delta: 15 },
      },
    },
  ],
  convergence: { currentSpreadCm: 10, previousSpreadCm: 25, direction: 'converging' },
  warnings: [],
};

const road: RoadStatus = {
  route: 'RP 222', destination: 'Las Leñas', status: 'chains-required',
  statement: 'RP 222 a Las Leñas: transitable con portación obligatoria de cadenas.',
  chainsRequired: true, machineryWorking: true, hazards: ['nieve', 'hielo'],
  reportedAt: '2026-07-23T08:30:00-03:00', fetchedAt: '2026-07-24T12:00:00Z',
  sourceName: 'Gobierno de Mendoza', sourceUrl: 'https://prensa.mendoza.gob.ar/estado-de-las-rutas-en-mendoza-2/',
};

const webcam: WebcamStatus = {
  sourceName: 'Las Leñas oficial', officialUrl: 'https://laslenas.com/camara-en-vivo/',
  status: 'available', embeddable: false, checkedAt: '2026-07-24T12:00:00Z', message: null,
};

describe('operational insight panels', () => {
  test('shows model trend and convergence', () => {
    render(<ModelRunEvolution data={modelRuns} levelId="summit" />);
    expect(screen.getByRole('heading', { name: /Evolución de corridas/i })).toBeInTheDocument();
    expect(screen.getByText('110 cm')).toBeInTheDocument();
    expect(screen.getByText(/\+15 cm/i)).toBeInTheDocument();
    expect(screen.getByText(/convergiendo/i)).toBeInTheDocument();
  });

  test('shows chains, machinery and official link', () => {
    render(<RoadStatusCard data={road} isPending={false} error={null} />);
    expect(screen.getByRole('heading', { name: /RP 222/i })).toBeInTheDocument();
    expect(screen.getByText(/Cadenas obligatorias/i)).toBeInTheDocument();
    expect(screen.getByText(/Máquinas trabajando/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /parte oficial/i })).toHaveAttribute('href', road.sourceUrl);
  });

  test('offers the official webcam without inventing an image', () => {
    render(<WebcamCard data={webcam} isPending={false} error={null} />);
    expect(screen.getByRole('heading', { name: /Cámara oficial/i })).toBeInTheDocument();
    expect(screen.getByText(/Disponible/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir cámara/i })).toHaveAttribute('href', webcam.officialUrl);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
