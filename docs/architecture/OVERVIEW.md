# FayClick V2 - Architecture Globale

> **Document BMAD** | Version: 1.0 | Dernière mise à jour: 2026-01-21

---

## 1. Vue d'Ensemble

FayClick V2 est une **Progressive Web App (PWA)** construite avec une architecture moderne orientée mobile-first.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│         (Smartphones Android, Tablets, Desktop)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (PWA)                                       │
│                     v2.fayclick.net                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js 15 (App Router) + React 19 + TypeScript                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │   Pages     │  │ Components  │  │   Hooks     │                 │   │
│  │  │  (31 pages) │  │    (UI)     │  │  (Logic)    │                 │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │   │
│  │         └────────────────┼────────────────┘                         │   │
│  │                          │                                          │   │
│  │  ┌───────────────────────┴───────────────────────────┐             │   │
│  │  │              Services Layer (36 services)          │             │   │
│  │  │  database.service.ts → API psql_request           │             │   │
│  │  │  auth.service.ts, payment-wallet.service.ts, etc. │             │   │
│  │  └───────────────────────┬───────────────────────────┘             │   │
│  │                          │                                          │   │
│  │  ┌───────────────────────┴───────────────────────────┐             │   │
│  │  │              State Management                      │             │   │
│  │  │  Zustand (panierStore) + React Context (Auth)     │             │   │
│  │  └───────────────────────────────────────────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PWA Layer                                                          │   │
│  │  Service Worker + IndexedDB + Background Sync                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API                                          │
│                   api.icelabsoft.com                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │    Auth     │  │   Payment   │  │     SMS     │  │   psql_req  │       │
│  │   (JWT)     │  │ (OM/Wave)   │  │  Gateway    │  │   (SQL)     │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘       │
└─────────────────────────────────────────────────────────────┼───────────────┘
                                                              │
                                                              │ SQL
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL                                           │
│                   154.12.224.173:3253                                       │
│                   Database: fayclick_db                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Tables: structures, users, clients, produits, facture_com, etc.    │   │
│  │  Functions: 25+ stored procedures (PL/pgSQL)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Technique

### 2.1 Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 15 | Framework React avec App Router |
| React | 19 | Bibliothèque UI |
| TypeScript | - | Typage statique |
| Tailwind CSS | 3.4.1 | Styling utility-first |
| Zustand | - | State management (panier) |
| React Context | - | State global (auth) |

### 2.2 Backend/API

| Technologie | URL | Usage |
|-------------|-----|-------|
| API REST | `api.icelabsoft.com` | Backend services |
| psql_request | `/api/psql_request/api/psql_request` | Requêtes PostgreSQL |
| JWT | - | Authentification |

### 2.3 Base de Données

| Technologie | Détails | Usage |
|-------------|---------|-------|
| PostgreSQL | `154.12.224.173:3253` | Base de données principale |
| PL/pgSQL | Functions | Logique métier |

### 2.4 Intégrations

| Service | API | Usage |
|---------|-----|-------|
| Orange Money | OFMS | Paiements |
| Wave | INTOUCH | Paiements |
| Free Money | OFMS | Paiements |
| SMS Gateway | send_o_sms | Notifications |

---

## 3. Structure des Dossiers

```
fayclick/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Routes authentification
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Dashboards par segment
│   │   ├── commerce/
│   │   │   ├── clients/
│   │   │   ├── produits/
│   │   │   ├── factures/
│   │   │   ├── depenses/
│   │   │   ├── inventaire/
│   │   │   └── venteflash/
│   │   ├── scolaire/
│   │   ├── immobilier/
│   │   ├── services/
│   │   ├── admin/
│   │   └── partenaire/
│   ├── facture/                  # Facture publique
│   ├── catalogue/                # Catalogue public
│   └── ...
│
├── components/                   # Composants React
│   ├── ui/                       # Composants UI de base
│   ├── patterns/                 # Composants patterns
│   ├── coffre-fort/              # Composants wallet
│   ├── pwa/                      # Composants PWA
│   └── ...
│
├── services/                     # Services API (36 fichiers)
│   ├── database.service.ts       # Requêtes PostgreSQL
│   ├── auth.service.ts           # Authentification
│   ├── payment-wallet.service.ts # Paiements
│   └── ...
│
├── stores/                       # Zustand stores
│   └── panierStore.ts
│
├── hooks/                        # Hooks personnalisés
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   └── ...
│
├── contexts/                     # React Contexts
│   └── AuthContext.tsx
│
├── types/                        # Types TypeScript
│
├── lib/                          # Utilitaires
│   └── api-config.ts             # Config API auto-détection
│
├── public/                       # Assets statiques
│   └── service-worker.js         # PWA Service Worker
│
└── docs/                         # Documentation BMAD
    ├── bmad/
    ├── architecture/
    └── ...
```

---

## 4. Patterns Architecturaux

### 4.1 Service Layer Pattern

Tous les appels API passent par des services singleton :

```typescript
// services/database.service.ts
class DatabaseService {
  async query(sql: string, params?: any[]) {
    const response = await fetch(API_ENDPOINTS.PSQL_REQUEST, {
      method: 'POST',
      body: JSON.stringify({ sql, params })
    });
    return response.json();
  }
}

export const databaseService = new DatabaseService();
```

### 4.2 Context + Hooks Pattern

Authentification via React Context + hooks personnalisés :

```typescript
// Utilisation
const { user, structure } = useAuth();
const { can, canAny } = usePermissions();
const { isCommerce, isScolaire } = useStructure();
```

### 4.3 Store Pattern (Zustand)

Panier avec persistence localStorage :

```typescript
// stores/panierStore.ts
const usePanierStore = create(
  persist(
    (set) => ({
      articles: [],
      addArticle: (article) => set((state) => ({...})),
      clearPanier: () => set({ articles: [], infosClient: {...} })
    }),
    { name: 'panier-storage' }
  )
);
```

---

## 5. Flux de Données

### 5.1 Flux Authentification

```
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│  Login   │───▶│ AuthService  │───▶│ check_user  │───▶│   JWT    │
│  Page    │    │  .login()    │    │ credentials │    │  Token   │
└──────────┘    └──────────────┘    └─────────────┘    └────┬─────┘
                                                            │
┌──────────┐    ┌──────────────┐    ┌─────────────┐         │
│ AuthCtx  │◀───│ get_structure│◀───│ get_droits  │◀────────┘
│ Provider │    │   Details    │    │             │
└──────────┘    └──────────────┘    └─────────────┘
```

### 5.2 Flux Facturation

```
┌──────────┐    ┌──────────────┐    ┌─────────────────────┐
│  Panier  │───▶│ FactureServ  │───▶│ create_facture_     │
│  Store   │    │ .create()    │    │ complete1()         │
└──────────┘    └──────────────┘    └──────────┬──────────┘
                                               │
┌──────────┐    ┌──────────────┐               │
│ Facture  │◀───│ detail_      │◀──────────────┘
│ Created  │    │ facture_com  │
└──────────┘    └──────────────┘
```

### 5.3 Flux Paiement Wallet

```
┌──────────┐    ┌──────────────┐    ┌─────────────┐
│  Modal   │───▶│ PaymentServ  │───▶│ create_     │
│  QRCode  │    │ .create()    │    │ payment()   │
└──────────┘    └──────────────┘    └──────┬──────┘
                                           │
     ┌─────────────────────────────────────┘
     ▼
┌──────────┐    ┌──────────────┐    ┌─────────────┐
│  POLL    │───▶│ get_status() │───▶│ COMPLETED?  │
│  Loop    │    │              │    │             │
└──────────┘    └──────────────┘    └──────┬──────┘
                                           │ YES
     ┌─────────────────────────────────────┘
     ▼
┌──────────┐    ┌──────────────┐
│ add_     │───▶│ Facture      │
│ acompte  │    │ Updated      │
└──────────┘    └──────────────┘
```

---

## 6. Sécurité

### 6.1 Authentification

| Mécanisme | Implémentation |
|-----------|----------------|
| JWT Token | Stockage localStorage |
| Session | Vérification à chaque requête |
| Permissions | Calculées par `get_mes_droits()` |

### 6.2 Autorisation

| Niveau | Mécanisme |
|--------|-----------|
| Route | `AuthGuard` component |
| UI | `usePermissions()` hook |
| API | Validation `id_structure` |
| DB | Contraintes CHECK |

### 6.3 Données

| Protection | Méthode |
|------------|---------|
| Mots de passe | Bcrypt hash |
| Données sensibles | `SecurityService` masquage |
| XSS | React auto-escape |
| CSRF | JWT dans headers |

---

## 7. Performance

### 7.1 Optimisations Frontend

| Technique | Usage |
|-----------|-------|
| Code splitting | Next.js automatic |
| Image optimization | Next/Image |
| Font optimization | Google Fonts display:swap |
| Bundle splitting | next.config.ts |

### 7.2 Optimisations PWA

| Technique | Usage |
|-----------|-------|
| Service Worker | Cache assets |
| Background Sync | IndexedDB queue |
| Offline mode | Fallback pages |

### 7.3 Optimisations BD

| Technique | Usage |
|-----------|-------|
| Index | Sur colonnes clés |
| Functions | Logique côté serveur |
| JSON responses | Réduction round-trips |

---

## 8. Environnements

| Environnement | URL | API |
|---------------|-----|-----|
| Development | `localhost:3000` | `127.0.0.1:5000` |
| Staging | `staging.fayclick.net` | `api.icelabsoft.com` |
| Production | `v2.fayclick.net` | `api.icelabsoft.com` |

**Détection automatique** via `lib/api-config.ts` :
- `localhost`, `127.0.0.1`, `*.local` → DEV
- Autres domaines → PROD

---

## 9. Déploiement

### 9.1 Process

```bash
# Build + Deploy
npm run deploy:build

# Deploy only (existing build)
npm run deploy

# Force re-upload
npm run deploy:force
```

### 9.2 Scripts

| Script | Action |
|--------|--------|
| `deploy.mjs` | Upload FTP automatisé |
| Service Worker | Mise à jour `CACHE_NAME` |

---

## 10. Monitoring

| Aspect | Outil |
|--------|-------|
| Erreurs frontend | Console logs |
| Performance | Lighthouse |
| BD | pg_stat_statements |

---

## 11. Documents Connexes

| Document | Chemin |
|----------|--------|
| Schéma BD | `docs/architecture/DATABASE_SCHEMA.md` |
| Endpoints API | `docs/architecture/API_ENDPOINTS.md` |
| Intégrations | `docs/architecture/INTEGRATIONS.md` |
| Features | `docs/bmad/EXISTING_FEATURES.md` |

---

## 12. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | System Architect Agent | Documentation initiale |
