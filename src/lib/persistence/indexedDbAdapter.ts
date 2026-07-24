import type { StorageAdapter, StorageExport, StorageKey } from './types.js';

const DATABASE = 'snow-monitor';
const STORE = 'v3';
const VERSION = 1;
const KEYS: StorageKey[] = [
  'forecast-history',
  'alert-settings',
  'last-alert',
  'preferences',
  'favorites',
  'road-status',
  'last-valid-responses',
];

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
  });
}

function transactionRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falló una operación de IndexedDB.'));
  });
}

export function createIndexedDbAdapter(factory: IDBFactory): StorageAdapter {
  let databasePromise: Promise<IDBDatabase> | null = null;
  const database = () => (databasePromise ??= openDatabase(factory));

  return {
    async get<T>(key: StorageKey): Promise<T | null> {
      const value = await transactionRequest(await database(), 'readonly', (store) => store.get(key));
      return (value as T | undefined) ?? null;
    },
    async set<T>(key: StorageKey, value: T): Promise<void> {
      await transactionRequest(await database(), 'readwrite', (store) => store.put(value, key));
    },
    async remove(key: StorageKey): Promise<void> {
      await transactionRequest(await database(), 'readwrite', (store) => store.delete(key));
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
      await transactionRequest(await database(), 'readwrite', (store) => store.clear());
    },
  };
}
