import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import type { RegionalGridResponse } from '../../types/regional.js';

const useRegionalGridMock = vi.fn();
vi.mock('../../hooks/useRegionalGrid.js', () => ({
  useRegionalGrid: (enabled: boolean) => useRegionalGridMock(enabled),
}));

import { RegionalSnowMapLoader } from './RegionalSnowMapLoader.js';

const data: RegionalGridResponse = {
  generatedAt: '2026-07-24T12:00:00Z',
  model: 'ECMWF IFS',
  warning: 'Mapa orientativo.',
  points: [
    {
      id: 'las-lenas-summit', name: 'Las Leñas · Cumbre', latitude: -35.13, longitude: -70.11,
      elevationM: 3430, phase: 'snow', snowfallCm: { '6h': 5, '12h': 10, '24h': 20, '48h': 35, '72h': 50 },
    },
  ],
};

describe('RegionalSnowMapLoader', () => {
  test('does not request or render the map before explicit interaction', () => {
    useRegionalGridMock.mockImplementation((enabled: boolean) => ({
      data: enabled ? data : undefined, isPending: false, error: null,
    }));
    render(<RegionalSnowMapLoader />);
    expect(useRegionalGridMock).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('heading', { name: /Mapa regional de nieve/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir mapa regional/i })).toBeInTheDocument();
  });

  test('loads the map and switches forecast period', async () => {
    const user = userEvent.setup();
    useRegionalGridMock.mockImplementation((enabled: boolean) => ({
      data: enabled ? data : undefined, isPending: false, error: null,
    }));
    render(<RegionalSnowMapLoader />);
    await user.click(screen.getByRole('button', { name: /Abrir mapa regional/i }));
    expect(await screen.findByRole('heading', { name: /Mapa regional de nieve/i })).toBeInTheDocument();
    expect(screen.getByText('20 cm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '72 h' }));
    expect(screen.getByText('50 cm')).toBeInTheDocument();
  });
});
