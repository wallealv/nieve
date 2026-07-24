import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { BestWindowSummary, HourlyLevelForecast } from '../../types/hourly.js';
import { BestWindows } from './BestWindows.js';
import { HourlyTimeline } from './HourlyTimeline.js';
import { SnowPhaseQuality } from './SnowPhaseQuality.js';

const level: HourlyLevelForecast = {
  level: {
    id: 'summit',
    name: 'Alta montaña',
    shortName: 'Alta',
    elevationM: 3430,
    latitude: -35.1376,
    longitude: -70.1118,
  },
  points: [0, 1, 2].map((hour) => ({
    time: `2026-07-25T0${hour}:00`,
    snowfallCm: 3,
    rainMm: 0,
    precipitationMm: 3,
    precipitationProbability: 90,
    temperatureC: -6,
    apparentTemperatureC: -10,
    relativeHumidityPct: 90,
    dewPointC: -7,
    windSpeedKmh: 20,
    windDirectionDeg: 250,
    windGustKmh: 35,
    visibilityM: 4000,
    cloudCoverPct: 100,
    shortwaveRadiationWm2: 0,
    freezingLevelM: 1800,
    snowDepthCm: 35,
    isDay: false,
    weatherCode: 75,
  })),
};

const summary: BestWindowSummary = {
  powder: {
    startTime: '2026-07-25T06:00', endTime: '2026-07-25T08:00', snowfallCm: 18,
    rainMm: 0, nightSnowfallCm: 18, temperatureMinC: -8, temperatureMaxC: -5,
    windMaxKmh: 22, gustMaxKmh: 35, visibilityMinM: 5000,
    shortwaveRadiationMaxWm2: 0, phase: 'dry-snow', quality: 'dry-powder',
    confidenceScore: 82, levelId: 'summit', score: 91,
  },
  piste: {
    startTime: '2026-07-26T09:00', endTime: '2026-07-26T11:00', snowfallCm: 1,
    rainMm: 0, nightSnowfallCm: 0, temperatureMinC: -5, temperatureMaxC: -2,
    windMaxKmh: 12, gustMaxKmh: 18, visibilityMinM: 10000,
    shortwaveRadiationMaxWm2: 300, phase: 'dry-snow', quality: 'dense-powder',
    confidenceScore: 88, levelId: 'mid', score: 87,
  },
  freeride: null,
  bestDay: { date: '2026-07-26', score: 89 },
};

describe('hourly insight components', () => {
  test('shows best activity windows and blocked/unavailable freeride', () => {
    render(<BestWindows summary={summary} />);
    expect(screen.getByRole('heading', { name: /Mejores ventanas/i })).toBeInTheDocument();
    expect(screen.getByText('91/100')).toBeInTheDocument();
    expect(screen.getByText(/Alta montaña/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin ventana habilitada/i)).toBeInTheDocument();
  });

  test('shows a three-hour timeline with accumulated snow and visibility', () => {
    render(<HourlyTimeline level={level} />);
    expect(screen.getByRole('heading', { name: /Próximas 72 horas/i })).toBeInTheDocument();
    expect(screen.getByText('9 cm')).toBeInTheDocument();
    expect(screen.getByText(/4.0 km/i)).toBeInTheDocument();
  });

  test('explains estimated phase and quality', () => {
    render(<SnowPhaseQuality level={level} />);
    expect(screen.getByRole('heading', { name: /Fase y calidad/i })).toBeInTheDocument();
    expect(screen.getByText(/Nieve seca/i)).toBeInTheDocument();
    expect(screen.getByText(/Polvo seco/i)).toBeInTheDocument();
    expect(screen.getByText(/estimación/i)).toBeInTheDocument();
  });
});
