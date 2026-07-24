const VERSION = 'snow-monitor-v3-1';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.svg', '/icons/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && (response.headers.get('content-type') || '').includes('application/json')) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || new Response(JSON.stringify({ error: 'OFFLINE', message: 'Sin conexión y sin datos guardados.' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).origin === self.location.origin) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (request.mode === 'navigate' || url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
