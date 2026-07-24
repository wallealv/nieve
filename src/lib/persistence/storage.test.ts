import { describe, expect, test } from 'vitest';
import { createLocalStorageAdapter, migrateLegacyStorage } from './localStorageAdapter.js';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe('local persistence adapter', () => {
  test('stores, reads and removes typed app data', async () => {
    const storage = memoryStorage();
    const adapter = createLocalStorageAdapter(storage);
    await adapter.set('preferences', { level: 'summit' });
    expect(await adapter.get<{ level: string }>('preferences')).toEqual({ level: 'summit' });
    await adapter.remove('preferences');
    expect(await adapter.get('preferences')).toBeNull();
  });

  test('exports and clears only Snow Monitor keys', async () => {
    const storage = memoryStorage();
    storage.setItem('unrelated', 'keep');
    const adapter = createLocalStorageAdapter(storage);
    await adapter.set('favorites', ['las-lenas']);
    const exported = await adapter.exportAll();
    expect(exported.schemaVersion).toBe(3);
    expect(exported.data.favorites).toEqual(['las-lenas']);
    await adapter.clearAll();
    expect(storage.getItem('unrelated')).toBe('keep');
    expect(await adapter.get('favorites')).toBeNull();
  });

  test('migrates known v1 keys without deleting them', async () => {
    const storage = memoryStorage();
    storage.setItem('las-lenas:forecast-history:v1', JSON.stringify([{ updatedAt: 'old' }]));
    storage.setItem('las-lenas:alert-settings:v1', JSON.stringify({ threshold72hCm: 30 }));
    const adapter = createLocalStorageAdapter(storage);
    await migrateLegacyStorage(storage, adapter);
    expect(await adapter.get('forecast-history')).toEqual([{ updatedAt: 'old' }]);
    expect(await adapter.get('alert-settings')).toEqual({ threshold72hCm: 30 });
    expect(storage.getItem('las-lenas:forecast-history:v1')).not.toBeNull();
  });

  test('returns null for malformed JSON instead of throwing', async () => {
    const storage = memoryStorage();
    storage.setItem('snow-monitor:v3:preferences', '{broken');
    const adapter = createLocalStorageAdapter(storage);
    await expect(adapter.get('preferences')).resolves.toBeNull();
  });
});
