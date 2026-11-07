
'use strict';

// Wayne PWA — branded release 7.
// IndexedDB is intentionally not touched by the Service Worker.
const CACHE_NAME = 'wayne-shell-v7';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './wayne-logo.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames
        .filter(name =>
          (
            name.startsWith('balance-shell-') ||
            name.startsWith('forge-shell-') ||
            name.startsWith('wayne-shell-')
          ) &&
          name !== CACHE_NAME
        )
        .map(name => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }

        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);

        return (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               new Response('Приложение временно недоступно.', {
                 status: 503
               });
      }
    })());

    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);

    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    } catch (_) {
      return new Response('Офлайн: ресурс недоступен.', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
  })());
});
