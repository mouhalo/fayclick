# Design — Fallback API sql_jsonpro

**Date :** 2026-03-18
**Statut :** Validé
**Branche :** `feature/api-fallback`

## Contexte

L'API `sql_jsonpro` est disponible sur deux serveurs partageant la même base de données PostgreSQL :
- **Principal :** `https://api.icelabsoft.com/api/sql_jsonpro`
- **Secours :** `https://secours.icelabsoft.com/api/sql_jsonpro`

L'hébergement production est **statique (FTP)** avec Apache en reverse proxy via `.htaccess`. Pas de serveur Node.js en prod. Migration Node.js prévue à 10 000 clients.

## Décision

**Option B — Fallback côté client dans `database.service.ts` avec health check périodique 60s**, via deux routes proxy Apache pour éviter tout problème CORS/CSP.

## Architecture

### Stratégie proxy — zéro problème CORS

Actuellement, Apache fait un reverse proxy (flag `[P]`) :
```
Browser → /api/sql → Apache [P] → api.icelabsoft.com/api/sql_jsonpro
```

On ajoute une seconde route pour le secours :
```
Browser → /api/sql-secours → Apache [P] → secours.icelabsoft.com/api/sql_jsonpro
```

Le client appelle toujours des URLs relatives (`/api/sql`, `/api/sql-secours`) — jamais d'appel direct cross-origin. Pas de changement CORS ni CSP nécessaire.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `lib/sql-jsonpro-client.ts` | **Créer** — classe `SqlJsonProClient` avec fallback + health check |
| `services/database.service.ts` | **Modifier** — importer `SqlJsonProClient`, remplacer `fetch` direct |
| `public/.htaccess` | **Modifier** — ajouter `RewriteRule ^api/sql-secours$` |
| `app/api/sql/route.ts` | **Modifier** — ajouter route secours pour dev local |
| `config/env.ts` | **Inchangé** |
| Tous les services (`auth`, `dashboard`, `clients`, etc.) | **Inchangés** |

### Flux

```
Client (Browser)
  → database.service.ts (envoyerRequeteApi)
    → SqlJsonProClient.fetch()
      → /api/sql              [principal via proxy Apache]
      → /api/sql-secours      [secours via proxy Apache si échec]
      → health check 60s pour retour au principal
```

## SqlJsonProClient — Détail

### Configuration

```typescript
const SQL_ENDPOINTS = {
  principal: '/api/sql',
  secours: '/api/sql-secours',
} as const;

const FALLBACK_CONFIG = {
  REQUEST_TIMEOUT: 10_000,       // 10s avant bascule
  HEALTH_CHECK_INTERVAL: 60_000, // 60s entre chaque ping
  HEALTH_CHECK_TIMEOUT: 5_000,   // 5s timeout du ping
  RATE_LIMIT_MAX_RETRIES: 3,     // 3 tentatives sur 429
  RATE_LIMIT_BASE_DELAY: 1_000,  // 1s → 2s → 4s backoff
} as const;
```

URLs relatives via proxy Apache — pas d'appel cross-origin.

### État interne

- `activeServer: 'principal' | 'secours'` — initialisé à `'principal'`
- `healthCheckInterval: ReturnType<typeof setInterval> | null` — timer 60s, actif uniquement quand sur secours
- `switchingPromise: Promise<void> | null` — Promise partagée anti-race condition pendant la bascule

### Logique de requête

```
1. Requête arrive avec { application, query, timeout? }
2. Envoyer au serveur actif (timeout = paramètre ou 10s par défaut)
3. Réponse OK ?
   → OUI : retourner la Response
   → NON : analyser l'erreur
     → 4xx (sauf 429) : remonter l'erreur (pas de bascule)
     → 429 : retry backoff exponentiel (1s→2s→4s, max 3 tentatives, même serveur)
     → 5xx / timeout / erreur réseau :
       → Si switchingPromise !== null : await switchingPromise, puis réessayer avec le nouveau serveur actif
       → Si principal : créer switchingPromise, basculer sur secours, démarrer health check, résoudre la Promise
       → Si secours : tenter principal en dernier recours (sans changer activeServer)
       → Si les 2 échouent : remonter erreur
```

### Health check

- Démarré uniquement quand `activeServer === 'secours'`
- Guard : `if (this.healthCheckInterval) return` — empêche les timers multiples
- Toutes les 60s : POST sur `/api/sql` avec body `{ application: 'fayclick', query: 'SELECT 1' }`
- Timeout 5s via AbortController
- Critère de succès : **réponse HTTP reçue** (200 ou même 400) = serveur joignable
- Critère d'échec : erreur réseau ou timeout = serveur encore down
- Succès → `activeServer = 'principal'`, `clearInterval(healthCheckInterval)`, `healthCheckInterval = null`
- Échec → rester sur secours, réessayer dans 60s

### Méthode exposée

```typescript
async fetch(request: {
  application: string;
  query: string;
  timeout?: number;  // Conserve le customTimeout existant
}): Promise<Response>
```

Retourne la `Response` brute — le parsing (data.rows, datas, etc.) reste dans `database.service.ts`.

## Intégration dans database.service.ts

### Avant

```typescript
async envoyerRequeteApi(application_name, requeteSql, customTimeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(API_CONFIG.ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application, query }),
    signal: controller.signal,
  });
  // parsing...
}
```

### Après

```typescript
import { sqlClient } from '@/lib/sql-jsonpro-client';

async envoyerRequeteApi(application_name, requeteSql, customTimeout) {
  const response = await sqlClient.fetch({
    application: appConfig.name,
    query: requeteSql,
    timeout: customTimeout,  // Transmis au client
  });
  // parsing identique — aucun changement
}
```

La gestion du timeout/AbortController est déplacée dans `SqlJsonProClient`. Le `customTimeout` est conservé et transmis.

**Ce qui ne change pas :**
- `query()`, `executeFunction()`, toutes les méthodes métier
- Le parsing des réponses PostgreSQL (fallbacks data.rows, datas, etc.)
- Le pattern singleton
- Tous les 30+ services consommateurs

## Modifications .htaccess (production)

```apache
# Existant — ligne 65
RewriteRule ^api/sql$ https://api.icelabsoft.com/api/sql_jsonpro [P,L]

# Nouveau — ajouter après
RewriteRule ^api/sql-secours$ https://secours.icelabsoft.com/api/sql_jsonpro [P,L]
```

Pas de changement CSP ni CORS nécessaire — tout passe par le même domaine `v2.fayclick.net`.

## Modifications proxy dev local

Dans `app/api/sql/route.ts`, ajouter un export ou créer `app/api/sql-secours/route.ts` qui pointe vers `secours.icelabsoft.com/api/sql_jsonpro`. Permet de tester le fallback en dev local.

## Gestion des erreurs

| Erreur | Action | Bascule ? |
|--------|--------|-----------|
| Timeout (10s ou custom) | Tenter l'autre serveur | Oui |
| Erreur réseau (fetch failed) | Tenter l'autre serveur | Oui |
| HTTP 5xx | Tenter l'autre serveur | Oui |
| HTTP 429 | Retry backoff 1s→2s→4s même serveur | Non |
| HTTP 4xx (400, 401, 403, 404) | Remonter immédiatement | Non |
| 2 serveurs échouent | Remonter avec message clair | — |

### Race condition — requêtes concurrentes

Quand le principal tombe, plusieurs requêtes en vol peuvent échouer simultanément. Protections :
- `switchingPromise` : la première requête qui déclenche la bascule crée une Promise partagée. Les requêtes concurrentes font `await switchingPromise` puis réessaient avec le nouveau serveur actif — pas de busy wait, pas de rejet silencieux.
- `if (this.healthCheckInterval) return` empêche les timers multiples
- La Promise est résolue une fois la bascule terminée (succès ou échec du secours), libérant toutes les requêtes en attente

### Logging

- `console.warn('[SQL_CLIENT] Bascule vers secours (raison: ...)')` — à chaque bascule
- `console.info('[SQL_CLIENT] Retour au serveur principal')` — au retour
- `console.error('[SQL_CLIENT] Les 2 serveurs sont injoignables')` — si tout échoue
- En prod : `SecurityService.secureLog()` pour masquer données sensibles

### Message utilisateur final (si 2 serveurs down)

> "Service temporairement indisponible. Veuillez réessayer dans quelques instants."

## Tests et validation

Branche `feature/api-fallback` — merge sur main après validation complète.

### Plan de tests manuels

1. **Bascule** — Modifier `.htaccess` principal vers URL invalide → vérifier fonctionnement via secours (~10s)
2. **Retour auto** — Remettre `.htaccess` correct → attendre max 60s → vérifier retour au principal via logs console
3. **Rate limiting 429** — Vérifier retry backoff sans bascule (observable dans logs)
4. **Erreur 4xx** — SQL invalide → erreur remontée sans bascule
5. **2 serveurs down** — 2 RewriteRule vers URLs invalides → message "Service temporairement indisponible"
6. **Non-régression** — Login, dashboard, factures, VenteFlash, recherche clients
7. **Dev local** — Vérifier que le proxy Next.js fonctionne toujours via `/api/sql` et `/api/sql-secours`

## Hors scope (PRD séparés)

- Migration des requêtes vers paramètres préparés (`$1, $2...`)
- Méthodes `batch()`, `health()`, `applications()` sur `SqlJsonProClient`
- Migration vers hébergement Node.js
