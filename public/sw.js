const STATIC_CACHE = 'piletech-static-v1';
const DRIVE_CACHE = 'piletech-drive-pages-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(['/manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function isDrivePage(url) {
  return /^\/piles\/[^/]+\/drive\/?$/.test(url.pathname);
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname === '/manifest.json';
}

async function cacheLatestDrivePage(request, response) {
  const cache = await caches.open(DRIVE_CACHE);
  const existing = await cache.keys();
  const requestUrl = typeof request === 'string' ? request : request.url;
  await Promise.all(existing.filter((entry) => entry.url !== new URL(requestUrl).href).map((entry) => cache.delete(entry)));
  await cache.put(request, response);
}

async function cacheStaticAssets(assets) {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all((Array.isArray(assets) ? assets : []).map(async (asset) => {
    try {
      const url = new URL(asset, self.location.origin);
      if (url.origin !== self.location.origin || !isStaticAsset(url)) return;
      const response = await fetch(url, { credentials: 'same-origin' });
      if (response.ok) await cache.put(url, response);
    } catch {
      // Individual asset failures should not prevent the Drive page cache.
    }
  }));
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_DRIVE_PAGE' || !event.data.url) return;
  event.waitUntil(Promise.all([
    fetch(event.data.url, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) return;
        return cacheLatestDrivePage(event.data.url, response);
      })
      .catch(() => undefined),
    cacheStaticAssets(event.data.assets)
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        return response;
      }))
    );
    return;
  }

  if (request.mode === 'navigate' && isDrivePage(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void cacheLatestDrivePage(request, copy);
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Drive page unavailable</title><main style="font-family:system-ui;padding:2rem"><h1>Drive page unavailable offline</h1><p>Open this pile Drive page online once before working offline.</p></main>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
  }
});
