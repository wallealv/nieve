import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, vi } from 'vitest';

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../public/sw.js'), 'utf8');
const version = /const VERSION = '([^']+)';/.exec(source)?.[1];

type LifecycleListener = (event: { waitUntil: (promise: Promise<unknown>) => void }) => void;

/** Runs public/sw.js against an in-memory `caches` holding the given cache names. */
function loadWorker(existingCaches: string[]) {
  const listeners = new Map<string, LifecycleListener>();
  const stored = new Map<string, string[]>(existingCaches.map((name) => [name, []]));
  const caches = {
    keys: async () => [...stored.keys()],
    delete: async (name: string) => stored.delete(name),
    open: async (name: string) => {
      if (!stored.has(name)) stored.set(name, []);
      return {
        addAll: async (urls: string[]) => {
          stored.get(name)!.push(...urls);
        },
      };
    },
  };
  const self = {
    addEventListener: (type: string, listener: LifecycleListener) => listeners.set(type, listener),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined) },
    location: { origin: 'https://nieve.test' },
  };
  new Function('self', 'caches', source)(self, caches);

  async function dispatch(type: 'install' | 'activate') {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)!({ waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
  }
  return { stored, self, dispatch };
}

test('replaces the caches of the v3-1 worker still installed on returning clients', async () => {
  const worker = loadWorker(['snow-monitor-v3-1-shell', 'snow-monitor-v3-1-data']);

  await worker.dispatch('install');
  await worker.dispatch('activate');

  expect(version).toMatch(/^snow-monitor-/);
  expect([...worker.stored.keys()]).toEqual([`${version}-shell`]);
  expect(worker.stored.get(`${version}-shell`)).toContain('/');
  expect(worker.self.skipWaiting).toHaveBeenCalled();
  expect(worker.self.clients.claim).toHaveBeenCalled();
});
