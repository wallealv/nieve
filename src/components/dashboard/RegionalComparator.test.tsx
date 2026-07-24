import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import type { RegionalResponse } from '../../types/regional.js';
import { RegionalComparator } from './RegionalComparator.js';

const data: RegionalResponse = {
  generatedAt: '2026-07-24T12:00:00Z',
  source: 'Open-Meteo · puntos representativos',
  warnings: [],
  resorts: [
    {
      id: 'las-lenas', name: 'Las Leñas', country: 'Argentina', officialUrl: 'https://laslenas.com/',
      representativeLatitude: -35.14, representativeLongitude: -70.09,
      snow72hCm: 60, snow7dCm: 100, snowMin7dCm: 80, snowMax7dCm: 120,
      confidenceScore: 82, confidenceLabel: 'Alta', maxGustKmh: 55,
      basePhaseRisk: 'snow', modelCount: 3, warnings: [], rank: 1, score: 91,
      status: 'ranked', reasons: ['Acumulación importante en 72 horas.'], penalties: [],
    },
    {
      id: 'catedral', name: 'Cerro Catedral', country: 'Argentina', officialUrl: 'https://www.catedralaltapatagonia.com/',
      representativeLatitude: -41.16, representativeLongitude: -71.47,
      snow72hCm: 30, snow7dCm: 55, snowMin7dCm: 40, snowMax7dCm: 70,
      confidenceScore: 65, confidenceLabel: 'Media', maxGustKmh: 90,
      basePhaseRisk: 'mixed-risk', modelCount: 3, warnings: [], rank: 2, score: 61,
      status: 'ranked', reasons: [], penalties: ['Viento muy fuerte previsto.'],
    },
  ],
};

describe('RegionalComparator', () => {
  test('renders ranking, accumulation, confidence and limitations', () => {
    render(<RegionalComparator data={data} favorites={[]} onToggleFavorite={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Comparador regional/i })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('60 cm')).toBeInTheDocument();
    expect(screen.getByText(/Confianza alta/i)).toBeInTheDocument();
    expect(screen.getByText(/puntos representativos/i)).toBeInTheDocument();
  });

  test('sorts by wind and toggles favorites', async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();
    render(<RegionalComparator data={data} favorites={[]} onToggleFavorite={toggle} />);
    await user.selectOptions(screen.getByRole('combobox', { name: /Ordenar centros/i }), 'wind');
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Las Leñas');
    await user.click(screen.getByRole('button', { name: /Agregar Las Leñas a favoritos/i }));
    expect(toggle).toHaveBeenCalledWith('las-lenas');
  });
});
