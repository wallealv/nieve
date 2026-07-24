import type {
  BestScoredWindow,
  BestWindowSummary,
  ForecastWindow,
  HourlyLevelForecast,
  HourlyPoint,
  SnowPhase,
  SnowQualityLabel,
} from '../../types/hourly.js';
import type { LevelId } from '../../types/forecast.js';
import { classifyPhase } from './phase.js';
import { estimateSnowQuality } from './quality.js';
import { scoreWindow } from './scores.js';

function finite(values: Array<number | null>): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value));
}

function sum(values: Array<number | null>): number {
  return finite(values).reduce((total, value) => total + value, 0);
}

function min(values: Array<number | null>): number | null {
  const numbers = finite(values);
  return numbers.length ? Math.min(...numbers) : null;
}

function max(values: Array<number | null>): number | null {
  const numbers = finite(values);
  return numbers.length ? Math.max(...numbers) : null;
}

function average(values: Array<number | null>): number | null {
  const numbers = finite(values);
  return numbers.length ? numbers.reduce((total, value) => total + value, 0) / numbers.length : null;
}

function aggregatePoint(points: HourlyPoint[], elevationM: number): {
  phase: SnowPhase;
  quality: SnowQualityLabel;
} {
  const synthetic: HourlyPoint = {
    time: points[0]?.time ?? '',
    snowfallCm: sum(points.map((point) => point.snowfallCm)),
    rainMm: sum(points.map((point) => point.rainMm)),
    precipitationMm: sum(points.map((point) => point.precipitationMm)),
    precipitationProbability: average(points.map((point) => point.precipitationProbability)),
    temperatureC: max(points.map((point) => point.temperatureC)),
    apparentTemperatureC: min(points.map((point) => point.apparentTemperatureC)),
    relativeHumidityPct: max(points.map((point) => point.relativeHumidityPct)),
    dewPointC: max(points.map((point) => point.dewPointC)),
    windSpeedKmh: max(points.map((point) => point.windSpeedKmh)),
    windDirectionDeg: points.find((point) => point.windDirectionDeg !== null)?.windDirectionDeg ?? null,
    windGustKmh: max(points.map((point) => point.windGustKmh)),
    visibilityM: min(points.map((point) => point.visibilityM)),
    cloudCoverPct: max(points.map((point) => point.cloudCoverPct)),
    shortwaveRadiationWm2: max(points.map((point) => point.shortwaveRadiationWm2)),
    freezingLevelM: average(points.map((point) => point.freezingLevelM)),
    snowDepthCm: max(points.map((point) => point.snowDepthCm)),
    isDay: points.some((point) => point.isDay === true),
    weatherCode: points.find((point) => point.weatherCode !== null)?.weatherCode ?? null,
  };
  const phase = classifyPhase(synthetic, elevationM);
  return { phase: phase.phase, quality: estimateSnowQuality(synthetic, phase).label };
}

export function buildThreeHourWindows(level: HourlyLevelForecast): ForecastWindow[] {
  const windows: ForecastWindow[] = [];
  for (let index = 0; index < level.points.length; index += 3) {
    const points = level.points.slice(index, index + 3);
    if (points.length === 0) continue;
    const classification = aggregatePoint(points, level.level.elevationM);
    const probabilities = finite(points.map((point) => point.precipitationProbability));
    windows.push({
      startTime: points[0]!.time,
      endTime: points.at(-1)!.time,
      snowfallCm: Math.round(sum(points.map((point) => point.snowfallCm)) * 10) / 10,
      rainMm: Math.round(sum(points.map((point) => point.rainMm)) * 10) / 10,
      nightSnowfallCm:
        Math.round(
          sum(points.map((point) => (point.isDay === false ? point.snowfallCm : 0))) * 10,
        ) / 10,
      temperatureMinC: min(points.map((point) => point.temperatureC)),
      temperatureMaxC: max(points.map((point) => point.temperatureC)),
      windMaxKmh: max(points.map((point) => point.windSpeedKmh)),
      gustMaxKmh: max(points.map((point) => point.windGustKmh)),
      visibilityMinM: min(points.map((point) => point.visibilityM)),
      shortwaveRadiationMaxWm2: max(points.map((point) => point.shortwaveRadiationWm2)),
      phase: classification.phase,
      quality: classification.quality,
      confidenceScore: probabilities.length
        ? Math.round(probabilities.reduce((total, value) => total + value, 0) / probabilities.length)
        : 50,
    });
  }
  return windows;
}

export interface BestWindowContext {
  observedDepthByLevel: Record<LevelId, number | null>;
  offPisteStatus: string | null;
  avalancheRisk: number | null;
  liftsOpenRatio: number | null;
}

function best(
  candidates: BestScoredWindow[],
): BestScoredWindow | null {
  return [...candidates].sort(
    (left, right) => right.score - left.score || left.startTime.localeCompare(right.startTime),
  )[0] ?? null;
}

export function findBestWindows(
  levels: HourlyLevelForecast[],
  context: BestWindowContext,
): BestWindowSummary {
  const powder: BestScoredWindow[] = [];
  const piste: BestScoredWindow[] = [];
  const freeride: BestScoredWindow[] = [];
  const dayScores = new Map<string, number[]>();

  for (const level of levels) {
    for (const window of buildThreeHourWindows(level)) {
      const scores = scoreWindow(window, {
        observedDepthCm: context.observedDepthByLevel[level.level.id],
        offPisteStatus: context.offPisteStatus,
        avalancheRisk: context.avalancheRisk,
        liftsOpenRatio: context.liftsOpenRatio,
      });
      if (scores.powder.score !== null) powder.push({ ...window, levelId: level.level.id, score: scores.powder.score });
      if (scores.piste.score !== null) piste.push({ ...window, levelId: level.level.id, score: scores.piste.score });
      if (scores.freeride.score !== null) freeride.push({ ...window, levelId: level.level.id, score: scores.freeride.score });
      const date = window.startTime.slice(0, 10);
      const combined = [scores.powder.score, scores.piste.score, scores.freeride.score].filter(
        (score): score is number => score !== null,
      );
      if (combined.length) {
        const values = dayScores.get(date) ?? [];
        values.push(combined.reduce((total, value) => total + value, 0) / combined.length);
        dayScores.set(date, values);
      }
    }
  }

  const bestDay = [...dayScores.entries()]
    .map(([date, values]) => ({
      date,
      score: Math.round(values.reduce((total, value) => total + value, 0) / values.length),
    }))
    .sort((left, right) => right.score - left.score || left.date.localeCompare(right.date))[0] ?? null;

  return {
    powder: best(powder),
    piste: best(piste),
    freeride: best(freeride),
    bestDay,
  };
}
