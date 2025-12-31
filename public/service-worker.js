// Service Worker FayClick V2 - PWA Complète
// Version: 2.6.0 - 2025-12-06 - Fix compatibilité cross-browser (Firefox, Safari iOS)
// Build: 2025-12-31T12:57:38.359Z - Force upload fix for ftp-deploy size comparison bug

const CACHE_NAME = 'fayclick-v2-cache-v2.6-20251206';
const DYNAMIC_CACHE_NAME = 'fayclick-v2-dynamic-v2.6-20251206';
const OFFLINE_PAGE_URL = '/offline';

// Assets essentiels à mettre en cache lors de l'installation
// Note: On ne met pas '/' car il sera caché dynamiquement (évite erreurs lors de l'install)
const STATIC_ASSETS = [
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
  /\.(css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/,
  /_next\/(static|image)/,
];

// Patterns des fichiers JS critiques qui doivent TOUJOURS être rechargés du réseau
// Ces fichiers contiennent la logique d'authentification et de routing
const CRITICAL_JS_PATTERNS = [
  /\/app\/layout-.*\.js$/,  // Fichier contenant AuthContext
  /\/chunks\/app\/.*\.js$/,  // Tous les chunks de l'app
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation v2.6.0 (cross-browser fix)...');

  event.waitUntil(
    // D'abord, supprimer TOUS les anciens caches
    caches.keys().then(cacheNames => {
      console.log('[Service Worker] Suppression de TOUS les caches existants');
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log(`[Service Worker] 🗑️ Suppression cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Ensuite, créer le nouveau cache
      return caches.open(CACHE_NAME);
    }).then(async (cache) => {
      console.log('[Service Worker] Mise en cache des assets essentiels');

      // Cacher chaque asset individuellement pour éviter que l'échec d'un seul bloque tout
      const cachePromises = STATIC_ASSETS.map(async (url) => {
        try {
          await cache.add(url);
          console.log(`[Service Worker] ✓ Cached: ${url}`);
        } catch (error) {
          console.warn(`[Service Worker] ✗ Failed to cache ${url}:`, error.message);
          // Continue même si cet asset échoue
        }
      });

      await Promise.allSettled(cachePromises);
      console.log('[Service Worker] Installation v2.6.0 terminée');
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
    }).then(() => {
      // Informer tous les clients qu'une nouvelle version est activée
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: '2.6.0',
            message: 'Service Worker mis à jour (fix cross-browser), rechargement recommandé'
          });
        });
      });
    })
  );

  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Stratégie de cache pour les requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Protection: Ignorer si request.url n'est pas défini (crash mobile)
  if (!request || !request.url) {
    console.warn('[Service Worker] Request invalide ignoré');
    return;
  }

  // Ignorer les requêtes non-HTTP(S)
  if (!request.url.startsWith('http')) {
    return;
  }

  // Protection: Ignorer les requêtes avec URL invalide
  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    console.warn('[Service Worker] URL invalide:', request.url);
    return;
  }

  // ===== FIX CROSS-BROWSER: Ignorer COMPLÈTEMENT les requêtes API =====
  // Sur iOS Safari et Firefox, le Service Worker peut interférer avec les requêtes API
  // On laisse le navigateur gérer ces requêtes directement sans intervention du SW
  const isAPIRequest =
    url.hostname.includes('api') ||  // api.icelabsoft.com
    url.hostname.includes('icelabsoft') ||
    url.pathname.startsWith('/api') ||
    request.headers.get('Content-Type')?.includes('xml') ||
    request.headers.get('Accept')?.includes('json');

  if (isAPIRequest) {
    // NE PAS appeler event.respondWith() - laisser le navigateur gérer nativement
    // C'est crucial pour la compatibilité iOS Safari et Firefox
    console.log('[Service Worker] Requête API ignorée (passthrough natif):', url.pathname);
    return;
  }

  // Vérifier si c'est une route publique
  const isPublicRoute = PUBLIC_ROUTES.some(pattern => pattern.test(url.pathname));

  // Vérifier si c'est un fichier JS critique (toujours network-first)
  const isCriticalJS = CRITICAL_JS_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (isCriticalJS) {
    console.log('[Service Worker] Fichier JS critique détecté, Network-First:', url.pathname);
    event.respondWith(networkFirst(request, false)); // false = ne pas mettre en cache
    return;
  }

  // Vérifier si c'est un asset statique
  const isStaticAsset = STATIC_PATTERNS.some(pattern => pattern.test(url.pathname));

  // Stratégie Cache-First pour les assets statiques (CSS, images, fonts)
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
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    // Ne cacher que les requêtes GET réussies (POST/PUT/DELETE ne peuvent pas être cachés)
    if (networkResponse.ok && request.method === 'GET') {
      try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        // Protection: Vérifier que la réponse peut être clonée (crash mobile)
        const responseToCache = networkResponse.clone();
        await cache.put(request, responseToCache);
      } catch (cacheError) {
        console.warn('[Service Worker] Erreur mise en cache:', cacheError.message);
        // Continue même si la mise en cache échoue
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Erreur réseau:', error);
    throw error;
  }
}

// Stratégie Network-First
async function networkFirst(request, shouldCache = true) {
  try {
    const networkResponse = await fetch(request);
    // Ne cacher que les requêtes GET réussies (POST/PUT/DELETE ne peuvent pas être cachés)
    // ET seulement si shouldCache est true
    if (shouldCache && networkResponse.ok && request.method === 'GET') {
      try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        // Protection: Vérifier que la réponse peut être clonée (crash mobile)
        const responseToCache = networkResponse.clone();
        await cache.put(request, responseToCache);
      } catch (cacheError) {
        console.warn('[Service Worker] Erreur mise en cache:', cacheError.message);
        // Continue même si la mise en cache échoue
      }
    }
    return networkResponse;
  } catch (error) {
    // Seulement essayer le cache si shouldCache est true
    if (shouldCache) {
      try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
      } catch (cacheMatchError) {
        console.warn('[Service Worker] Erreur lecture cache:', cacheMatchError.message);
      }
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