import { createIndexedDbAdapter } from './indexedDbAdapter.js';
import { createLocalStorageAdapter, migrateLegacyStorage } from './localStorageAdapter.js';
import type { StorageAdapter, StorageKey } from './types.js';

class FallbackAdapter implements StorageAdapter {
  constructor(
    private readonly primary: StorageAdapter,
    private readonly fallback: StorageAdapter,
  ) {}

  async get<T>(key: StorageKey): Promise<T | null> {
    try {
      const value = await this.primary.get<T>(key);
      if (value !== null) return value;
    } catch {
      // Fall through to localStorage.
    }
    return this.fallback.get<T>(key);
  }

  async set<T>(key: StorageKey, value: T): Promise<void> {
    try {
      await this.primary.set(key, value);
    } catch {
      await this.fallback.set(key, value);
    }
  }

  async remove(key: StorageKey): Promise<void> {
    await Promise.allSettled([this.primary.remove(key), this.fallback.remove(key)]);
  }

  async exportAll() {
    try {
      return await this.primary.exportAll();
    } catch {
      return this.fallback.exportAll();
    }
  }

  async clearAll(): Promise<void> {
    await Promise.allSettled([this.primary.clearAll(), this.fallback.clearAll()]);
  }
}

let browserAdapter: StorageAdapter | null = null;

export function getBrowserStorageAdapter(): StorageAdapter | null {
  if (typeof window === 'undefined') return null;
  if (browserAdapter) return browserAdapter;
  let local: StorageAdapter;
  try {
    local = createLocalStorageAdapter(window.localStorage);
  } catch {
    return null;
  }
  browserAdapter = typeof indexedDB === 'undefined'
    ? local
    : new FallbackAdapter(createIndexedDbAdapter(indexedDB), local);
  void migrateLegacyStorage(window.localStorage, browserAdapter);
  return browserAdapter;
}
