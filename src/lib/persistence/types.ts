export type StorageKey =
  | 'forecast-history'
  | 'alert-settings'
  | 'last-alert'
  | 'preferences'
  | 'favorites'
  | 'road-status'
  | 'last-valid-responses';

export interface StorageExport {
  schemaVersion: 3;
  generatedAt: string;
  data: Partial<Record<StorageKey, unknown>>;
}

export interface StorageAdapter {
  get<T>(key: StorageKey): Promise<T | null>;
  set<T>(key: StorageKey, value: T): Promise<void>;
  remove(key: StorageKey): Promise<void>;
  exportAll(): Promise<StorageExport>;
  clearAll(): Promise<void>;
}
