self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.startsWith('cargona-pwa-')).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-only: let the browser handle requests without synthetic HTTP errors.
