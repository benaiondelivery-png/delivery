// ========================================
// BENAION DELIVERY - SERVICE WORKER (V2.2)
// ========================================

const CACHE_NAME = 'benaion-cache-v2';

const ASSETS = [
  './',
  './index.html',
  './cliente.html',
  './entregador.html',
  './parceiro.html',
  './admin.html',
  './css/style.css',
  './js/api.js',
  './js/utils.js',
  './js/cliente.js',
  './js/entregador.js',
  './js/parceiro.js',
  './js/admin.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
  'https://i.postimg.cc/T2Vt53JP/Vermelho-delivery-logo-20260227-011329-0005.png'
];

// Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Benaion Cache: Todos os assets em cache');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação - Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Estratégia: Cache First, depois Network
self.addEventListener('fetch', (event) => {
  // Não cacheia requisições do Firebase (API dinâmica)
  if (event.request.url.includes('firestore') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Não cacheia respostas de erro
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
