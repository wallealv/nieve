import { FORECAST_MODELS, MOUNTAIN_LEVELS, RESORT } from '../config/mountain.js';
import { bandForDay, confidenceLabelForScore } from '../lib/forecast/confidence.js';
import type { ForecastResponse, LevelForecast } from '../types/forecast.js';

const dates = Array.from({ length: 15 }, (_, index) => {
  const date = new Date('2026-08-01T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
});

function makeLevel(levelIndex: number): LevelForecast {
  const level = MOUNTAIN_LEVELS[levelIndex]!;
  let cumulative = 0;
  const daily = dates.map((date, dayIndex) => {
    const median =
      dayIndex === 1
        ? 12 + levelIndex * 4
        : dayIndex === 4
          ? 5 + levelIndex * 2
          : dayIndex === 9
            ? 2
            : 0;
    cumulative += median;
    const confidenceScore = dayIndex <= 7 ? 82 : dayIndex <= 10 ? 58 : 34;
    return {
      date,
      dayIndex,
      band: bandForDay(dayIndex),
      snowfallMedianCm: median,
      snowfallMinCm: Math.max(0, median - 3),
      snowfallMaxCm: median + 5,
      cumulativeMedianCm: cumulative,
      confidenceScore,
      confidenceLabel: confidenceLabelForScore(confidenceScore),
      modelCount: dayIndex <= 7 ? 3 : 2,
      models: FORECAST_MODELS.map((model, modelIndex) => ({
        model: model.id,
        snowfallCm:
          model.id === 'icon' && dayIndex > 7
            ? null
            : Math.max(0, median + modelIndex - 1),
        source: 'estimated' as const,
      })),
      temperatureMinC: -8 + dayIndex * 0.3,
      temperatureMaxC: -3 + dayIndex * 0.5,
      windMaxKmh: 18 + dayIndex,
      gustMaxKmh: 28 + dayIndex * 1.5,
      freezingLevelM: 1700 + dayIndex * 80,
      weatherCode: median > 0 ? 73 : 3,
    };
  });

  return {
    level,
    daily,
    totals: {
      hours24: levelIndex * 2,
      hours72: 12 + levelIndex * 4,
      days7: 17 + levelIndex * 6,
      days15: 19 + levelIndex * 6,
    },
    maxWindKmh: 34,
    maxGustKmh: 49,
  };
}

export function makeForecastFixture(): ForecastResponse {
  const levels = MOUNTAIN_LEVELS.map((_, index) => makeLevel(index));
  return {
    resort: {
      name: RESORT.name,
      timezone: RESORT.timezone,
      updatedAt: '2026-07-23T21:00:00-03:00',
      source: 'Open-Meteo · ECMWF IFS · NOAA GFS · DWD ICON',
    },
    horizons: {
      operationalThroughDay: 7,
      extendedThroughDay: 10,
      maximumDay: 14,
    },
    models: FORECAST_MODELS.map((model) => ({
      id: model.id,
      name: model.name,
      shortName: model.shortName,
      status: 'ok',
      availableLevels: 3,
      requestedLevels: 3,
      forecastThrough: dates[Math.min(model.expectedThroughDay, 14)]!,
      generatedAt: '2026-07-23T21:00:00-03:00',
      message: null,
    })),
    levels,
    dailyConsensus: dates.map((date, dayIndex) => ({
      date,
      dayIndex,
      band: bandForDay(dayIndex),
      mountainSnowMedianCm: levels[1]!.daily[dayIndex]!.snowfallMedianCm,
      confidenceScore: levels[1]!.daily[dayIndex]!.confidenceScore,
      confidenceLabel: levels[1]!.daily[dayIndex]!.confidenceLabel,
    })),
    warnings: [],
  };
}
