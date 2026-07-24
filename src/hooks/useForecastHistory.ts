import { useEffect, useMemo } from 'react';
import type { CurrentSnowResponse } from '../types/currentSnow.js';
import type { ForecastResponse } from '../types/forecast.js';
import {
  appendForecastSnapshot,
  buildForecastSnapshot,
  loadForecastHistory,
  saveForecastHistory,
} from '../lib/forecast/history.js';
import { getBrowserStorageAdapter } from '../lib/persistence/storage.js';
import type { StormEvent } from '../lib/forecast/storm.js';

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useForecastHistory(
  forecast: ForecastResponse | undefined,
  currentSnow: CurrentSnowResponse | undefined,
  storm: StormEvent | null,
) {
  const history = useMemo(() => {
    const stored = loadForecastHistory(browserStorage());
    if (!forecast) return stored;
    const savedAt = currentSnow?.generatedAt ?? forecast.resort.updatedAt;
    const snapshot = buildForecastSnapshot(
      forecast,
      currentSnow,
      storm,
      savedAt,
    );
    return appendForecastSnapshot(stored, snapshot, new Date(savedAt));
  }, [currentSnow, forecast, storm]);

  useEffect(() => {
    if (!forecast) return;
    saveForecastHistory(browserStorage(), history);
    void getBrowserStorageAdapter()?.set('forecast-history', history);
  }, [forecast, history]);

  return history;
}
