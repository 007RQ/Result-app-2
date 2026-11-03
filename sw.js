'use strict';

// Balance PWA — версия 3
const CACHE_NAME = 'balance-shell-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Установка приложения и кеширование файлов
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll(APP_SHELL);

      await self.skipWaiting();
    })()
  );
});

// Активация новой версии
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            key =>
              key.startsWith('balance-shell-') &&
              key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Обработка запросов
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Навигация и открытие приложения
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);

            await cache.put(
              './index.html',
              response.clone()
            );
          }

          return response;
        } catch (error) {
          return (
            await caches.match('./index.html') ||
            await caches.match('./') ||
            new Response('Приложение временно недоступно.', {
              status: 503
            })
          );
        }
      })()
    );

    return;
  }

  // Остальные ресурсы: сначала кеш, затем сеть
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);

          await cache.put(
            request,
            response.clone()
          );
        }

        return response;
      } catch (error) {
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
    })()
  );
});
