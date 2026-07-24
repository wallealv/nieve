import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_ALERT_SETTINGS,
  evaluateAlert,
  type AlertSettings,
} from '../lib/forecast/alerts.js';
import { getBrowserStorageAdapter } from '../lib/persistence/storage.js';
import type { ForecastResponse } from '../types/forecast.js';

const SETTINGS_KEY = 'las-lenas:alert-settings:v1';
const LAST_NOTIFICATION_KEY = 'las-lenas:last-alert-notification:v1';

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadSettings(): AlertSettings {
  const storage = browserStorage();
  if (!storage) return DEFAULT_ALERT_SETTINGS;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_ALERT_SETTINGS;
    return { ...DEFAULT_ALERT_SETTINGS, ...(JSON.parse(raw) as Partial<AlertSettings>) };
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

function persistSettings(settings: AlertSettings): void {
  const storage = browserStorage();
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Local persistence is optional.
  }
  void getBrowserStorageAdapter()?.set('alert-settings', settings);
}

export function useAlertSettings(forecast: ForecastResponse | undefined) {
  const [settings, setSettingsState] = useState<AlertSettings>(loadSettings);
  const match = useMemo(
    () => (forecast ? evaluateAlert(forecast, settings) : null),
    [forecast, settings],
  );

  const setSettings = (next: AlertSettings) => {
    setSettingsState(next);
    persistSettings(next);
  };

  const requestNotifications = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof Notification === 'undefined') return 'unsupported';
    const permission = await Notification.requestPermission();
    setSettings({ ...settings, notificationsEnabled: permission === 'granted' });
    return permission;
  };

  useEffect(() => {
    if (
      !match?.active ||
      !match.fingerprint ||
      !settings.notificationsEnabled ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const storage = browserStorage();
    const previous = storage?.getItem(LAST_NOTIFICATION_KEY);
    if (previous === match.fingerprint) return;

    new Notification('Alerta de nieve en Las Leñas', {
      body: match.message,
      tag: match.fingerprint,
    });
    try {
      storage?.setItem(LAST_NOTIFICATION_KEY, match.fingerprint);
    } catch {
      // Notification still works without deduplication persistence.
    }
    void getBrowserStorageAdapter()?.set('last-alert', match.fingerprint);
  }, [match, settings.notificationsEnabled]);

  const notificationPermission: NotificationPermission | 'unsupported' =
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

  return {
    settings,
    setSettings,
    match,
    requestNotifications,
    notificationPermission,
  };
}
