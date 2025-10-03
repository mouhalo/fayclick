# 📘 Guide - Pages Dynamiques Publiques (SPA React)

> **Guide pratique pour implémenter des pages publiques partagées dans une SPA React + PWA**

## 🎯 Vue d'ensemble

Ce guide explique comment notre application eTicket gère les **pages dynamiques publiques** accessibles sans authentification, telles que :
- `/eventofday/:eventId` - Détails et achat de tickets pour un événement
- `/mestickets/:numerotel` - Consultation des tickets achetés par téléphone

### Architecture globale

```
┌─────────────────────────────────────────────────┐
│  URL Publique (ex: /eventofday/123)             │
│  https://eticket.virtualfact.net/eventofday/123 │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Serveur Web (Apache/Nginx)                     │
│  ✓ Redirige TOUTES les routes vers index.html  │
│  ✓ Configuration .htaccess                      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  index.html (Point d'entrée unique)             │
│  ✓ Charge React App                             │
│  ✓ Initialise le Service Worker (PWA)          │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  App.tsx (Router côté client)                   │
│  ✓ Détecte l'URL avec window.location.pathname │
│  ✓ Extrait les paramètres (eventId, phone)     │
│  ✓ Affiche le composant approprié              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Composant Screen (ex: TicketScreen)            │
│  ✓ Appelle l'API publiquement (sans auth)      │
│  ✓ Affiche les données dynamiques              │
└─────────────────────────────────────────────────┘
```

---

## 📋 Table des matières

1. [Configuration serveur web](#1-configuration-serveur-web)
2. [Détection et routing dans React](#2-détection-et-routing-dans-react)
3. [Appels API publics (sans authentification)](#3-appels-api-publics-sans-authentification)
4. [Création d'une nouvelle page dynamique](#4-création-dune-nouvelle-page-dynamique)
5. [Configuration PWA pour pages publiques](#5-configuration-pwa-pour-pages-publiques)
6. [Partage sur réseaux sociaux](#6-partage-sur-réseaux-sociaux)
7. [Tests et validation](#7-tests-et-validation)
8. [Dépannage](#8-dépannage)

---

## 1. Configuration serveur web

### 🔧 Apache (.htaccess)

**Fichier:** `public/.htaccess`

```apache
RewriteEngine On

# ===========================
# GESTION ROUTES SPA (PWA)
# ===========================
# Rediriger toutes les requêtes vers index.html sauf les fichiers existants
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_URI} !\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|webmanifest)$
RewriteRule . /index.html [L]

# Erreur 404 -> index.html (gestion par React)
ErrorDocument 404 /index.html
```

**Points clés:**
- ✅ Toutes les routes sont redirigées vers `index.html`
- ✅ Sauf les fichiers physiques existants (assets, images, etc.)
- ✅ Sauf les appels API (`/api/*`)
- ✅ Les 404 sont gérés par React

### 🔧 Alternative Nginx

```nginx
server {
    listen 80;
    server_name eticket.votredomaine.com;
    root /var/www/eticket/dist;
    index index.html;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Routing SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Pas de cache pour index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

## 2. Détection et routing dans React

### 📁 Fichier: `src/App.tsx`

```typescript
import { useEffect, useState } from 'react';
import TicketScreen from '@/components/screens/TicketScreen';
import MyTicketsPublicScreen from '@/components/screens/MyTicketsPublicScreen';

type AppView = 'splash' | 'login' | 'events' | 'mestickets' | 'eventofday' | ...;

function App() {
  const [currentView, setCurrentView] = useState<AppView>('events');
  const [phoneNumberFromUrl, setPhoneNumberFromUrl] = useState<string | null>(null);
  const [eventIdFromUrl, setEventIdFromUrl] = useState<number | null>(null);

  useEffect(() => {
    // Initialiser l'authentification
    initializeAuth();

    // ✅ Détection de l'URL au chargement
    const path = window.location.pathname;

    // 📱 Page /mestickets/numerotel
    const mesTicketsMatch = path.match(/^\/mestickets\/(\d{9})$/);
    if (mesTicketsMatch) {
      const phoneNumber = mesTicketsMatch[1];
      console.log('🎫 [URL] Page mes tickets détectée pour:', phoneNumber);
      setPhoneNumberFromUrl(phoneNumber);
      setCurrentView('mestickets');
      return;
    }

    // 🎪 Page /eventofday/idEvent
    const eventOfDayMatch = path.match(/^\/eventofday\/(\d+)$/);
    if (eventOfDayMatch) {
      const eventId = parseInt(eventOfDayMatch[1]);
      console.log('🎪 [URL] Page événement détectée pour ID:', eventId);
      setEventIdFromUrl(eventId);
      setCurrentView('eventofday');
      return;
    }
  }, [initializeAuth]);

  // ✅ Rendu conditionnel selon la vue
  if (currentView === 'mestickets' && phoneNumberFromUrl) {
    return <MyTicketsPublicScreen
      phoneNumber={phoneNumberFromUrl}
      onBack={() => {
        setCurrentView('events');
        setPhoneNumberFromUrl(null);
        window.history.pushState({}, '', '/'); // Réinitialiser URL
      }}
    />;
  }

  if (currentView === 'eventofday' && eventIdFromUrl) {
    return <TicketScreen
      eventId={eventIdFromUrl}
      onBack={() => {
        setCurrentView('events');
        setEventIdFromUrl(null);
        window.history.pushState({}, '', '/'); // Réinitialiser URL
      }}
    />;
  }

  // ... Autres vues
}
```

### 🔑 Points importants

1. **Détection au chargement:** `useEffect` s'exécute une seule fois au démarrage
2. **Regex pour extraction:** Utiliser `match()` avec groupes de capture `(\d+)`
3. **Validation:** Vérifier le format (ex: 9 chiffres pour téléphone)
4. **État local:** Stocker les paramètres extraits dans le state
5. **Navigation retour:** Réinitialiser l'URL avec `window.history.pushState()`

---

## 3. Appels API publics (sans authentification)

### 🔓 Architecture des services

Notre application utilise une architecture à 3 couches :

```
Component (Screen)
    ↓
Service Layer (ApiService, TicketSearchService)
    ↓
Database Service (Requêtes SQL via XML)
    ↓
Backend API (PostgreSQL via HTTP)
```

### 📡 Service Database - Couche de base

**Fichier:** `src/services/database.ts`

```typescript
const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.icelabsoft.com/api_bd/api.php';

class DatabaseService {
  private construireXml = (application_name: string, requeteSql: string) => {
    const sql_text = requeteSql.replace(/\n/g, ' ').trim();
    return `<?xml version="1.0" encoding="UTF-8"?>
        <request>
            <application>${application_name}</application>
            <requete_sql>${sql_text}</requete_sql>
        </request>`;
  };

  async envoyerRequeteApi(application_name: string, requeteSql: string) {
    try {
      const xml = this.construireXml(application_name, requeteSql);

      // ✅ Appel PUBLIC - Pas de token d'authentification requis
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml'
        },
        body: xml
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erreur DatabaseService:', error);
      throw error;
    }
  }

  // ✅ Méthode publique simplifiée
  static async query(sql: string) {
    const instance = DatabaseService.getInstance();
    return instance.envoyerRequeteApi('eticket', sql);
  }
}

export default DatabaseService;
```

### 🎫 Service API - Récupération événement

**Fichier:** `src/services/api.ts`

```typescript
import DatabaseService from './database';
import { type EventWithTickets } from '@/types';

export class ApiService {

  /**
   * ✅ MÉTHODE PUBLIQUE - Récupérer un événement par ID
   * Pas d'authentification requise
   */
  static async getEventById(eventId: number): Promise<EventWithTickets | null> {
    try {
      // Requête SQL directe - Accessible publiquement
      const query = `
        SELECT
          e.id_event,
          e.id_zone,
          e.date_event,
          e.nom_event,
          e.expire_le,
          e.heure,
          e.lieu,
          e.tms_create,
          z.nom_zone,
          z.localite,
          de.id_detail,
          de.id_type,
          de.nombre AS stock,
          de.prix,
          tt.nom_type
        FROM evenement e
        INNER JOIN zone z ON e.id_zone = z.id_zone
        LEFT JOIN detail_event de ON e.id_event = de.id_event
        LEFT JOIN type_ticket tt ON de.id_type = tt.id_type
        WHERE e.id_event = ${eventId}
      `;

      const results = await DatabaseService.query(query);
      const groupedResults = this.groupEventResults(results);
      return groupedResults[0] || null;
    } catch (error) {
      console.error('❌ Erreur getEventById:', error);
      return null;
    }
  }

  /**
   * Grouper les résultats SQL en objets EventWithTickets
   */
  private static groupEventResults(rawResults: any[]): EventWithTickets[] {
    const eventsMap = new Map<number, EventWithTickets>();

    rawResults.forEach((row) => {
      const eventId = row.id_event || row.idevent;

      if (!eventsMap.has(eventId)) {
        eventsMap.set(eventId, {
          id_event: eventId,
          id_zone: row.id_zone || row.idzone,
          date_event: row.date_event || row.dateevent,
          nom_event: row.nom_event || row.nomevent,
          expire_le: row.expire_le || row.expirele,
          heure: row.heure,
          lieu: row.lieu,
          tms_create: row.tms_create || row.tmscreate,
          zone: {
            nom_zone: row.nom_zone || row.nomzone,
            localite: row.localite
          },
          tickets: []
        });
      }

      // Ajouter le ticket si présent
      if (row.id_detail || row.iddetail) {
        eventsMap.get(eventId)!.tickets.push({
          id_detail: row.id_detail || row.iddetail,
          id_type: row.id_type || row.idtype,
          nombre: row.stock || row.nombre,
          prix: row.prix || row.price,
          nom_type: row.nom_type || row.nomtype
        });
      }
    });

    return Array.from(eventsMap.values());
  }
}
```

### 📱 Service Recherche Tickets - Par téléphone

**Fichier:** `src/services/ticketSearch.ts`

```typescript
import DatabaseService from './database';

export interface TicketInfo {
  code_ticket: string;
  status: 'DISPONIBLE' | 'VENDU_VALIDE' | 'DEJA_UTILISE' | 'ANNULE';
  prix: number;
  mode_vente: string;
  event_info: {
    id_event: number;
    nom_event: string;
    date_event: string;
    heure: string;
    lieu: string;
    zone: string;
  };
  qrCode?: string;
}

export interface SearchResult {
  success: boolean;
  message?: string;
  tickets?: TicketInfo[];
  summary?: {
    total_tickets: number;
    tickets_valides: number;
    tickets_utilises: number;
    total_montant: number;
  };
}

export class TicketSearchService {

  /**
   * ✅ MÉTHODE PUBLIQUE - Rechercher tickets par téléphone ou code
   * Pas d'authentification requise
   */
  static async searchTickets(
    searchValue: string,
    searchType: 'phone' | 'code'
  ): Promise<SearchResult> {
    try {
      console.log(`🔍 [TicketSearch] Recherche ${searchType}: ${searchValue}`);

      let query: string;
      if (searchType === 'phone') {
        // Validation format téléphone (9 chiffres)
        if (searchValue.length !== 9 || !/^\d+$/.test(searchValue)) {
          return {
            success: false,
            message: 'Le numéro de téléphone doit contenir exactement 9 chiffres'
          };
        }
        // ✅ Appel fonction PostgreSQL publique
        query = `SELECT validate_ticket_user('${searchValue}', '');`;
      } else {
        // Recherche par code ticket
        query = `SELECT validate_ticket_user('', '${searchValue.toUpperCase()}');`;
      }

      const results = await DatabaseService.query(query);

      if (results && results.length > 0) {
        // Extraire et parser le résultat JSON
        const extractedData = results[0].validate_ticket_user || results[0];
        return extractedData;
      }

      return {
        success: false,
        message: 'Aucun ticket trouvé'
      };
    } catch (error) {
      console.error('❌ Erreur searchTickets:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de recherche'
      };
    }
  }
}
```

### 🖼️ Utilisation dans un composant

**Fichier:** `src/components/screens/TicketScreen/index.tsx`

```typescript
import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';
import type { EventWithTickets } from '@/types';

interface TicketScreenProps {
  eventId?: number;
  onBack?: () => void;
}

export default function TicketScreen({ eventId, onBack }: TicketScreenProps) {
  const [event, setEvent] = useState<EventWithTickets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      const loadEvent = async () => {
        try {
          setLoading(true);
          setError(null);

          // ✅ Appel API public - Sans authentification
          const eventData = await ApiService.getEventById(eventId);

          if (!eventData) {
            throw new Error('Événement introuvable');
          }

          setEvent(eventData);
          console.log('✅ Événement chargé:', eventData.nom_event);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
          console.error('❌ Erreur:', err);
        } finally {
          setLoading(false);
        }
      };

      loadEvent();
    }
  }, [eventId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!event) return null;

  return (
    <div>
      <h1>{event.nom_event}</h1>
      <p>Date: {event.date_event}</p>
      <p>Lieu: {event.lieu}</p>
      {/* Affichage des tickets disponibles */}
      {event.tickets.map(ticket => (
        <div key={ticket.id_detail}>
          <p>{ticket.nom_type} - {ticket.prix} FCFA</p>
          <p>Stock: {ticket.nombre}</p>
        </div>
      ))}
    </div>
  );
}
```

### 🔑 Points clés des appels API publics

1. **Pas de token/authentification** - Les appels sont ouverts
2. **Validation côté serveur** - La base de données PostgreSQL gère les permissions
3. **Données en lecture seule** - Les pages publiques ne modifient pas les données sensibles
4. **Fonctions PostgreSQL sécurisées** - `validate_ticket_user()` est conçue pour l'accès public
5. **Gestion d'erreurs robuste** - Toujours prévoir les cas d'échec

---

## 4. Création d'une nouvelle page dynamique

### 📝 Étape par étape

#### Étape 1: Définir la route et le pattern

```typescript
// Dans App.tsx
type AppView = 'splash' | 'events' | 'newpage'; // Ajouter 'newpage'

// Définir le pattern d'URL
const NEW_PAGE_PATTERN = /^\/newpage\/(\d+)$/; // Ex: /newpage/123
```

#### Étape 2: Ajouter la détection d'URL

```typescript
useEffect(() => {
  const path = window.location.pathname;

  // Nouvelle page dynamique
  const newPageMatch = path.match(NEW_PAGE_PATTERN);
  if (newPageMatch) {
    const itemId = parseInt(newPageMatch[1]);
    console.log('🆕 [URL] Nouvelle page détectée pour ID:', itemId);
    setItemIdFromUrl(itemId);
    setCurrentView('newpage');
    return;
  }
}, []);
```

#### Étape 3: Créer le service API

```typescript
// src/services/api.ts
export class ApiService {

  static async getItemById(itemId: number): Promise<ItemData | null> {
    try {
      const query = `
        SELECT *
        FROM ma_table
        WHERE id_item = ${itemId}
      `;

      const results = await DatabaseService.query(query);
      return results[0] || null;
    } catch (error) {
      console.error('❌ Erreur getItemById:', error);
      return null;
    }
  }
}
```

#### Étape 4: Créer le composant Screen

```typescript
// src/components/screens/NewPageScreen/index.tsx
import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';

interface NewPageScreenProps {
  itemId: number;
  onBack: () => void;
}

export default function NewPageScreen({ itemId, onBack }: NewPageScreenProps) {
  const [item, setItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItem = async () => {
      try {
        setLoading(true);
        const data = await ApiService.getItemById(itemId);
        setItem(data);
      } catch (err) {
        console.error('❌ Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [itemId]);

  if (loading) return <LoadingSpinner />;
  if (!item) return <div>Item non trouvé</div>;

  return (
    <div>
      <button onClick={onBack}>← Retour</button>
      <h1>{item.nom}</h1>
      {/* Contenu dynamique */}
    </div>
  );
}
```

#### Étape 5: Ajouter le rendu dans App.tsx

```typescript
// Dans App.tsx
if (currentView === 'newpage' && itemIdFromUrl) {
  return <NewPageScreen
    itemId={itemIdFromUrl}
    onBack={() => {
      setCurrentView('events');
      setItemIdFromUrl(null);
      window.history.pushState({}, '', '/');
    }}
  />;
}
```

#### Étape 6: Mettre à jour le Service Worker (PWA)

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    VitePWA({
      workbox: {
        additionalManifestEntries: [
          { url: '/eventofday/', revision: null },
          { url: '/mestickets/', revision: null },
          { url: '/newpage/', revision: null }, // ✅ Ajouter
        ]
      }
    })
  ]
})
```

---

## 5. Configuration PWA pour pages publiques

### ⚙️ Vite Config - Service Worker

**Fichier:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'eTicket - Gestion de Billets',
        short_name: 'eTicket',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],

        // ✅ Support routes SPA - CRITIQUE pour éviter les 404
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//, // Exclure routes API
          /\.(js|css|png|jpg|jpeg|gif|ico|svg)$/
        ],

        // ✅ Routes publiques à pre-cache
        additionalManifestEntries: [
          { url: '/eventofday/', revision: null },
          { url: '/mestickets/', revision: null }
        ],

        // ✅ Cache API en mode NetworkFirst
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.icelabsoft\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24h
              }
            }
          },
          // ✅ Cache navigation SPA
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    })
  ]
});
```

### 📱 Manifest PWA

Le manifest est généré automatiquement par Vite PWA Plugin, mais peut être personnalisé:

```json
{
  "name": "eTicket - Gestion de Billets",
  "short_name": "eTicket",
  "description": "Application de billetterie événementielle",
  "theme_color": "#5080ed",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "icons": [
    {
      "src": "pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 6. Partage sur réseaux sociaux

### ⚠️ Limitation actuelle

Les **meta tags Open Graph** ne sont **PAS dynamiques** dans notre SPA. Les scrapers Facebook/WhatsApp/Twitter voient toujours le HTML statique de `index.html`.

### 📄 Meta tags statiques actuels

**Fichier:** `index.html`

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Meta tags statiques -->
    <meta name="description" content="Application de billetterie pour événements sportifs et culturels" />
    <meta name="theme-color" content="#6495ed" />

    <!-- ⚠️ Pas de meta Open Graph dynamiques -->
    <!-- Les previews de liens affichent toujours ces valeurs génériques -->

    <title>eTicket: Billets en ligne</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 🛠️ Solutions pour meta tags dynamiques

#### Option 1: React Helmet Async (Recommandé pour PWA)

```bash
npm install react-helmet-async
```

```typescript
// src/main.tsx
import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
```

```typescript
// src/components/screens/TicketScreen/index.tsx
import { Helmet } from 'react-helmet-async';

export default function TicketScreen({ eventId }: Props) {
  const [event, setEvent] = useState<EventWithTickets | null>(null);

  return (
    <>
      <Helmet>
        <title>{event?.nom_event || 'Événement'} - eTicket</title>
        <meta name="description" content={`Réservez vos billets pour ${event?.nom_event}`} />

        {/* Open Graph */}
        <meta property="og:title" content={event?.nom_event} />
        <meta property="og:description" content={`${event?.date_event} à ${event?.lieu}`} />
        <meta property="og:url" content={`https://eticket.virtualfact.net/eventofday/${eventId}`} />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event?.nom_event} />
        <meta name="twitter:description" content={`${event?.date_event} à ${event?.lieu}`} />
      </Helmet>

      {/* Contenu */}
    </>
  );
}
```

⚠️ **Limitation:** Les scrapers Facebook/WhatsApp ne voient PAS les meta tags générés par JavaScript.

#### Option 2: Pre-rendering (Recommandé pour SEO)

```bash
npm install vite-plugin-prerender
```

```typescript
// vite.config.ts
import prerender from 'vite-plugin-prerender';

export default defineConfig({
  plugins: [
    react(),
    prerender({
      // Routes à pre-render
      routes: [
        '/',
        '/eventofday/123',
        '/eventofday/456',
        '/mestickets/690123456'
      ],
      // Générer HTML statique avec meta tags
      postProcess(renderedRoute) {
        // Personnaliser meta tags par route
        return renderedRoute;
      }
    })
  ]
});
```

✅ **Avantage:** HTML statique avec meta tags corrects pour les scrapers

❌ **Inconvénient:** Nécessite rebuild pour chaque nouvel événement

#### Option 3: SSR complet (Solution ultime)

Migrer vers **Next.js** ou **Remix** pour Server-Side Rendering complet.

**Next.js exemple:**

```typescript
// pages/eventofday/[id].tsx
export async function getServerSideProps({ params }) {
  const event = await fetch(`API/events/${params.id}`).then(r => r.json());

  return {
    props: { event }
  };
}

export default function EventPage({ event }) {
  return (
    <Head>
      <title>{event.nom_event} - eTicket</title>
      <meta property="og:title" content={event.nom_event} />
      <meta property="og:image" content={event.image_url} />
    </Head>
    {/* Contenu */}
  );
}
```

✅ **Avantages:**
- Meta tags dynamiques fonctionnels
- SEO optimal
- Previews réseaux sociaux corrects

❌ **Inconvénients:**
- Migration complète de l'architecture
- Serveur Node.js requis

---

## 7. Tests et validation

### ✅ Checklist de tests

#### Tests en local (développement)

```bash
# 1. Démarrer le serveur dev
npm run dev

# 2. Tester les routes dynamiques
open http://localhost:5173/eventofday/123
open http://localhost:5173/mestickets/690123456

# 3. Vérifier les logs console
# Rechercher: "🎪 [URL] Page événement détectée"
# Rechercher: "🎫 [URL] Page mes tickets détectée"
```

#### Tests en production

```bash
# 1. Build l'application
npm run build

# 2. Preview local
npm run preview

# 3. Tester routes en production locale
open http://localhost:4173/eventofday/123

# 4. Déployer
npm run deploy

# 5. Tester sur le serveur
open https://eticket.virtualfact.net/eventofday/123
```

### 🔍 Tests de partage

#### Test Open Graph

Utiliser l'outil Facebook Debugger:

```
https://developers.facebook.com/tools/debug/
```

1. Entrer l'URL: `https://eticket.virtualfact.net/eventofday/123`
2. Cliquer "Scrape Again"
3. Vérifier les meta tags détectés

**Résultat attendu (sans SSR):**
```
⚠️ Meta tags génériques de index.html
Titre: eTicket: Billets en ligne
Description: Application de billetterie pour événements...
```

#### Test WhatsApp

1. Envoyer le lien dans un chat WhatsApp
2. Observer la preview générée

**Résultat attendu (sans SSR):**
```
⚠️ Preview générique
Pas d'image spécifique à l'événement
```

### 🧪 Tests automatisés

```typescript
// tests/routing.test.ts
import { describe, it, expect } from 'vitest';

describe('Routes dynamiques', () => {
  it('Doit extraire eventId de /eventofday/123', () => {
    const path = '/eventofday/123';
    const match = path.match(/^\/eventofday\/(\d+)$/);
    expect(match).toBeTruthy();
    expect(match[1]).toBe('123');
  });

  it('Doit valider format téléphone', () => {
    const phone = '690123456';
    expect(phone).toMatch(/^\d{9}$/);
  });
});
```

---

## 8. Dépannage

### ❌ Erreur: Page 404 après refresh

**Symptôme:** Refresh F5 sur `/eventofday/123` → 404

**Cause:** Configuration `.htaccess` manquante ou incorrecte

**Solution:**
```apache
# Ajouter dans public/.htaccess
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### ❌ Erreur: Service Worker bloque les routes

**Symptôme:** Routes dynamiques ne se chargent pas après installation PWA

**Cause:** `navigateFallback` mal configuré

**Solution:**
```typescript
// vite.config.ts
workbox: {
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [
    /^\/api\//, // Exclure API
  ]
}
```

### ❌ Erreur: API returns 401 Unauthorized

**Symptôme:** Appels API échouent avec erreur 401

**Cause:** Endpoint nécessite authentification

**Solution:**
1. Vérifier que l'endpoint est public côté backend
2. Utiliser une fonction PostgreSQL publique
3. Ou implémenter un système de tokens temporaires

### ❌ Erreur: EventId undefined

**Symptôme:** `eventId` est `undefined` dans le composant

**Cause:** Regex ne match pas le pattern d'URL

**Solution:**
```typescript
// Debug avec console.log
const path = window.location.pathname;
console.log('🔍 Path actuel:', path);

const match = path.match(/^\/eventofday\/(\d+)$/);
console.log('🔍 Match regex:', match);

// Vérifier le pattern exact
```

### 🐛 Mode Debug

Activer les logs détaillés:

```typescript
// src/App.tsx
useEffect(() => {
  const DEBUG = true; // ✅ Activer debug

  if (DEBUG) {
    console.group('🔍 [ROUTING DEBUG]');
    console.log('📍 pathname:', window.location.pathname);
    console.log('🔗 href:', window.location.href);
    console.log('🎯 currentView:', currentView);
    console.groupEnd();
  }
}, [currentView]);
```

---

## 📚 Ressources et références

### Documentation technique
- [React Router](https://reactrouter.com/) - Alternative pour routing complexe
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox) - Service Worker

### Outils de test
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Articles connexes
- [SPA Routing Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [PWA Deep Linking](https://web.dev/app-like-pwas/)
- [Open Graph Protocol](https://ogp.me/)

---

## 🎓 Formation équipe

### Prérequis pour l'équipe

✅ Connaissances React (Hooks: useState, useEffect)
✅ Compréhension SPA vs MPA
✅ Bases HTTP/REST API
✅ Regex JavaScript pour extraction paramètres
✅ Debugging DevTools Chrome

### Exercices pratiques

**Exercice 1:** Créer une page `/product/:productId`
- Détecter l'URL et extraire l'ID produit
- Créer un service `ApiService.getProductById()`
- Afficher les détails du produit

**Exercice 2:** Implémenter partage événement
- Ajouter bouton "Partager" sur TicketScreen
- Copier le lien `/eventofday/123` dans le presse-papiers
- Afficher toast de confirmation

**Exercice 3:** Tester en production
- Builder et déployer l'app
- Tester le lien partagé sur mobile
- Vérifier la preview WhatsApp

---

## 🔄 Évolutions futures

### Court terme (Q1 2025)
- [ ] Implémenter react-helmet-async pour meta tags dynamiques
- [ ] Ajouter images de couverture pour événements
- [ ] Optimiser pre-cache PWA

### Moyen terme (Q2 2025)
- [ ] Pre-rendering avec vite-plugin-prerender
- [ ] Analytics sur partages d'événements
- [ ] Deep linking pour application mobile native

### Long terme (Q3-Q4 2025)
- [ ] Migration vers Next.js pour SSR complet
- [ ] Meta tags Open Graph dynamiques fonctionnels
- [ ] SEO optimisé pour moteurs de recherche

---

## ✅ Checklist finale

Avant de déployer une nouvelle page dynamique publique:

- [ ] ✅ Pattern d'URL défini et testé avec regex
- [ ] ✅ Service API créé et appel public vérifié
- [ ] ✅ Composant Screen créé avec gestion loading/error
- [ ] ✅ Routing ajouté dans App.tsx
- [ ] ✅ `.htaccess` configuré pour redirection SPA
- [ ] ✅ Service Worker mis à jour (additionalManifestEntries)
- [ ] ✅ Tests locaux (npm run dev) réussis
- [ ] ✅ Build production (npm run build) réussi
- [ ] ✅ Tests en preview (npm run preview) réussis
- [ ] ✅ Déploiement effectué
- [ ] ✅ Tests en production réussis
- [ ] ✅ Partage de lien testé sur mobile
- [ ] ✅ Documentation mise à jour

---

**Date de création:** 2 octobre 2025
**Version:** 1.0
**Auteur:** Équipe eTicket
**Dernière mise à jour:** 2 octobre 2025

---

## 📞 Support

Pour toute question ou problème:
1. Consulter la section [Dépannage](#8-dépannage)
2. Vérifier les logs console (🔍 rechercher emojis)
3. Tester avec le mode DEBUG activé
4. Contacter l'équipe technique

**Bonne chance dans vos développements ! 🚀**
