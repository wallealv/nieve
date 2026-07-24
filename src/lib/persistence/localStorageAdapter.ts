import type { StorageAdapter, StorageExport, StorageKey } from './types.js';

const PREFIX = 'snow-monitor:v3:';
const KEYS: StorageKey[] = [
  'forecast-history',
  'alert-settings',
  'last-alert',
  'preferences',
  'favorites',
  'road-status',
  'last-valid-responses',
];

function fullKey(key: StorageKey): string {
  return `${PREFIX}${key}`;
}

export function createLocalStorageAdapter(storage: Storage): StorageAdapter {
  return {
    async get<T>(key: StorageKey): Promise<T | null> {
      try {
        const raw = storage.getItem(fullKey(key));
        return raw === null ? null : (JSON.parse(raw) as T);
      } catch {
        return null;
      }
    },
    async set<T>(key: StorageKey, value: T): Promise<void> {
      storage.setItem(fullKey(key), JSON.stringify(value));
    },
    async remove(key: StorageKey): Promise<void> {
      storage.removeItem(fullKey(key));
    },
    async exportAll(): Promise<StorageExport> {
      const data: Partial<Record<StorageKey, unknown>> = {};
      for (const key of KEYS) {
        const value = await this.get(key);
        if (value !== null) data[key] = value;
      }
      return { schemaVersion: 3, generatedAt: new Date().toISOString(), data };
    },
    async clearAll(): Promise<void> {
      KEYS.forEach((key) => storage.removeItem(fullKey(key)));
    },
  };
}

const LEGACY_KEYS: Array<{ old: string; next: StorageKey }> = [
  { old: 'las-lenas:forecast-history:v1', next: 'forecast-history' },
  { old: 'las-lenas:alert-settings:v1', next: 'alert-settings' },
  { old: 'las-lenas:last-alert-notification:v1', next: 'last-alert' },
];

export async function migrateLegacyStorage(
  storage: Storage,
  adapter: StorageAdapter,
): Promise<void> {
  for (const item of LEGACY_KEYS) {
    if ((await adapter.get(item.next)) !== null) continue;
    const raw = storage.getItem(item.old);
    if (!raw) continue;
    try {
      await adapter.set(item.next, JSON.parse(raw) as unknown);
    } catch {
      // Invalid legacy values are ignored and preserved for manual recovery.
    }
  }
}
