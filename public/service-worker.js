// Service Worker FayClick V2 - PWA Complète
// Version: 2.0.0

const CACHE_NAME = 'fayclick-v2-cache-v1';
const DYNAMIC_CACHE_NAME = 'fayclick-v2-dynamic-v1';
const OFFLINE_PAGE_URL = '/offline';

// Assets essentiels à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Patterns des routes publiques (ne nécessitent pas d'installation)
const PUBLIC_ROUTES = [
  /^\/facture/,
  /^\/fay/,
  /^\/login/,
  /^\/register/,
  /^\/inscription-success/,
];

// Patterns des assets statiques
const STATIC_PATTERNS = [
  /\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/,
  /_next\/(static|image)/,
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Mise en cache des assets essentiels');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.error('[Service Worker] Erreur lors de la mise en cache:', error);
        // Continue même si certains assets échouent
        return Promise.resolve();
      });
    })
  );

  // Force l'activation immédiate
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation...');

  event.waitUntil(
    // Nettoyer les anciens caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Stratégie de cache pour les requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP(S)
  if (!request.url.startsWith('http')) {
    return;
  }

  // Ignorer les requêtes API (toujours network-first)
  if (url.hostname.includes('api') || url.pathname.startsWith('/api')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Vérifier si c'est une route publique
  const isPublicRoute = PUBLIC_ROUTES.some(pattern => pattern.test(url.pathname));

  // Vérifier si c'est un asset statique
  const isStaticAsset = STATIC_PATTERNS.some(pattern => pattern.test(url.pathname));

  // Stratégie Cache-First pour les assets statiques
  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stratégie Network-First pour les pages (avec fallback offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request).catch(() => {
        // Si c'est une page publique, essayer de la servir depuis le cache
        if (isPublicRoute) {
          return caches.match(request).then(response => {
            if (response) return response;
            // Fallback vers page offline si disponible
            return caches.match(OFFLINE_PAGE_URL);
          });
        }
        // Pour les pages privées, toujours la page offline
        return caches.match(OFFLINE_PAGE_URL);
      })
    );
    return;
  }

  // Par défaut, Network-First
  event.respondWith(networkFirst(request));
});

// Stratégie Cache-First
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    // Ne cacher que les requêtes GET réussies (POST/PUT/DELETE ne peuvent pas être cachés)
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Erreur réseau:', error);
    throw error;
  }
}

// Stratégie Network-First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Ne cacher que les requêtes GET réussies (POST/PUT/DELETE ne peuvent pas être cachés)
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
    event.ports[0].postMessage({ cleared: true });
  }
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Synchroniser les données en attente
  console.log('[Service Worker] Synchronisation des données...');
  // TODO: Implémenter la synchronisation des factures, paiements, etc.
}

// Gestion des notifications push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification FayClick',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ouvrir FayClick',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icon-192.png'
      },
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FayClick', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});