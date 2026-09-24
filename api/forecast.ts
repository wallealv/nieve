import { getDatabaseClient, runSafely } from '../src/lib/database/client.js';
import { saveForecastSnapshots } from '../src/lib/database/forecastSnapshots.js';
import {
  loadForecastCalibration,
  unavailableCalibration,
} from '../src/lib/database/modelSkill.js';
import { fetchOpenMeteoModel } from '../src/lib/forecast/openMeteo.js';
import { buildForecastResponse } from '../src/lib/forecast/service.js';
import type { ForecastCalibration, ForecastResponse } from '../src/types/forecast.js';

const CACHE_CONTROL =
  'public, max-age=0, s-maxage=10800, stale-while-revalidate=1800';

type ForecastLoader = () => Promise<unknown>;

export function createForecastHandler(loadForecast: ForecastLoader) {
  return async function handleForecastRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json(
        { error: 'METHOD_NOT_ALLOWED', message: 'Solo se admite GET.' },
        { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } },
      );
    }

    try {
      const data = await loadForecast();
      return Response.json(data, {
        status: 200,
        headers: { 'Cache-Control': CACHE_CONTROL },
      });
    } catch (error) {
      return Response.json(
        {
          error: 'FORECAST_UNAVAILABLE',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo obtener el pronóstico.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}

export interface ForecastLoaderDependencies {
  loadCalibration: () => Promise<ForecastCalibration>;
  buildForecast: (calibration: ForecastCalibration) => Promise<ForecastResponse>;
  saveSnapshots: (forecast: ForecastResponse) => Promise<boolean>;
}

const defaultForecastDependencies: ForecastLoaderDependencies = {
  loadCalibration: () => loadForecastCalibration(getDatabaseClient()),
  buildForecast: (calibration) =>
    buildForecastResponse(fetchOpenMeteoModel, new Date().toISOString(), calibration),
  saveSnapshots: (forecast) => saveForecastSnapshots(getDatabaseClient(), forecast),
};

/**
 * Model skill (database) → skill-weighted forecast → snapshots saved for future skill → response.
 * The database steps are best effort: without it, or when it fails, the forecast is the plain
 * multimodel median and the HTTP response is unchanged.
 */
export function createForecastLoader(
  overrides: Partial<ForecastLoaderDependencies> = {},
) {
  const { loadCalibration, buildForecast, saveSnapshots } = {
    ...defaultForecastDependencies,
    ...overrides,
  };

  return async function loadForecast(): Promise<ForecastResponse> {
    const calibration = await runSafely(
      'load calibration',
      loadCalibration,
      unavailableCalibration(),
    );
    const forecast = await buildForecast(calibration);
    await runSafely('save forecast snapshots', () => saveSnapshots(forecast), false);
    return forecast;
  };
}

export const handleForecastRequest = createForecastHandler(createForecastLoader());

export default {
  fetch: handleForecastRequest,
};
