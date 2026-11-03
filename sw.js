'use strict';

const CACHE_NAME = 'balance-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Установка и кеширование приложения
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

// Активация новой версии и удаление старых кешей
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('balance-shell-') &&
          key !== CACHE_NAME
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

// Обработка сетевых запросов
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Открытие приложения
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);

        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());

        return fresh;
      } catch (_) {
        return (
          await caches.match('./index.html') ||
          await caches.match('./')
        );
      }
    })());

    return;
  }

  // Остальные ресурсы
  event.respondWith((async () => {
    const cached = await caches.match(request);

    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }

      return response;

    } catch (_) {
      return new Response(
        'Офлайн: ресурс недоступен.',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        }
      );
    }
  })());
});
