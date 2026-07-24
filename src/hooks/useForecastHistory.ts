import { useEffect, useState } from 'react';
import type { CurrentSnowResponse } from '../types/currentSnow.js';
import type { ForecastResponse } from '../types/forecast.js';
import {
  appendForecastSnapshot,
  buildForecastSnapshot,
  loadForecastHistory,
  saveForecastHistory,
  type ForecastSnapshot,
} from '../lib/forecast/history.js';
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
  const [history, setHistory] = useState<ForecastSnapshot[]>(() =>
    loadForecastHistory(browserStorage()),
  );

  useEffect(() => {
    if (!forecast) return;
    const snapshot = buildForecastSnapshot(forecast, currentSnow, storm);
    setHistory((current) => {
      const next = appendForecastSnapshot(current, snapshot);
      saveForecastHistory(browserStorage(), next);
      return next;
    });
  }, [currentSnow, forecast, storm]);

  return history;
}
