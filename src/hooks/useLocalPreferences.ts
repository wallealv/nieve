import { useEffect, useState } from 'react';
import type { ForecastPeriod } from '../lib/forecast/presentation.js';
import { getBrowserStorageAdapter } from '../lib/persistence/storage.js';
import type { LevelId } from '../types/forecast.js';

interface LocalPreferences {
  levelId: LevelId;
  period: ForecastPeriod;
}

const DEFAULTS: LocalPreferences = { levelId: 'summit', period: '7d' };

export function useLocalPreferences() {
  const [preferences, setPreferences] = useState<LocalPreferences>(DEFAULTS);

  useEffect(() => {
    let active = true;
    void getBrowserStorageAdapter()?.get<Partial<LocalPreferences>>('preferences').then((saved) => {
      if (!active || !saved) return;
      setPreferences({ ...DEFAULTS, ...saved });
    });
    return () => {
      active = false;
    };
  }, []);

  const update = (next: LocalPreferences) => {
    setPreferences(next);
    void getBrowserStorageAdapter()?.set('preferences', next);
  };

  return {
    levelId: preferences.levelId,
    period: preferences.period,
    setLevelId: (levelId: LevelId) => update({ ...preferences, levelId }),
    setPeriod: (period: ForecastPeriod) => update({ ...preferences, period }),
  };
}
