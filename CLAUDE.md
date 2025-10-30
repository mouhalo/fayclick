# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FayClick V2 is a Next.js-based Progressive Web App (PWA) designed as a "Super App" for the Senegalese market. It targets four business segments: service providers (Prestataires), commerce, education (Scolaire), and real estate (Immobilier).

## Development Commands

### Core Commands
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Deployment Commands (Production Ready)
- `npm run deploy:build` - **Recommended**: Build + deploy to production (complete process)
- `npm run deploy:verbose` - Build + deploy with detailed logs (troubleshooting)
- `npm run deploy` - Deploy existing build only
- `npm run deploy:force` - Force complete re-upload

### Development Notes
- Always use port 3000 for development
- If port 3000 is in use, ask user for a screenshot to see the current result
- **For deployment**: Use `npm run deploy:build` for production builds
- **API Environment**: Automatically detected (localhost = DEV API, fayclick.net = PROD API)
- **Documentation**: Complete guides available:
  - `DEPLOYMENT_GUIDE.md` - Full deployment process
  - `TROUBLESHOOTING.md` - Quick fixes for common issues (READ FIRST!)
  - `CHANGELOG.md` - Version history

### Environment Configuration
- **No manual setup required** - Environment auto-detected by URL
- **Development**: `localhost:3000` → API `127.0.0.1:5000` 
- **Production**: `v2.fayclick.net` → API `api.icelabsoft.com`
- **Override**: Set `FORCE_ENVIRONMENT=production` if needed

## Architecture & Technology Stack

### Framework & Core Technologies
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS v3.4.1** for styling
- **React 19** with modern patterns

### Design System
- **Primary Colors**: Blue (#0ea5e9) and Orange (#f59e0b) palette
- **Typography**: Inter (body text) and Montserrat (headings) from Google Fonts
- **Responsive Design**: Mobile-first approach with 5 breakpoints (xs: 480px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
- **Animations**: GPU-accelerated animations with custom Tailwind utilities

### Key Components Architecture

#### UI Components (`components/ui/`)
- `Button.tsx` - Button with gradient and glassmorphism variants
- `Card.tsx` - Card components with hover effects
- `Modal.tsx` - Modal with backdrop blur and animations

#### Pattern Components (`components/patterns/`)
- `ResponsiveCard` - Adaptive card layouts
- `PageContainer` - Responsive page wrappers
- `ResponsiveHeader` - Adaptive headers
- `TouchCarousel` - Touch-optimized carousels

#### Custom Hooks (`hooks/`)
- `useBreakpoint` - Responsive breakpoint detection
- `useTouch` - Touch gesture handling and capabilities
- `useDashboardData` - Dashboard data management with API integration

### Styling Conventions
- Use Tailwind utility classes primarily
- Custom CSS animations defined in `globals.css` with @layer utilities
- Glassmorphism effects with backdrop-blur
- GPU-optimized animations with `will-change-transform`
- Adaptive particle systems based on screen size

### PWA Configuration
- PWA-ready with manifest.json configured
- Icons: favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png
- Metadata optimized for mobile and SEO
- Viewport configuration for safe areas

### File Structure Patterns
- App Router structure in `app/` directory
- Page components directly in app folders (page.tsx)
- Shared components in `components/` with pattern-based organization
- Centralized exports through index.ts files
- TypeScript interfaces co-located with components

### API Architecture & Data Types
- **Centralized API config**: `lib/api-config.ts` with **automatic environment detection**
- **Authentication service**: `services/auth.service.ts` with JWT token management
- **Dashboard service**: `services/dashboard.service.ts` with structure-specific data processing
- **Type definitions**: `types/` directory with comprehensive interfaces

#### Automatic Environment Detection
- **Smart detection**: Analyzes `window.location.hostname` to determine environment
- **Development triggers**: `localhost`, `127.0.0.1`, `192.168.x`, `*.local`, `ngrok`, `vercel.app`
- **Production default**: All other domains (including `v2.fayclick.net`)
- **Manual override**: `FORCE_ENVIRONMENT=production` variable if needed
- **Server-side**: Falls back to `NODE_ENV` during build/SSR

#### Data Structure by Business Type
- **SCOLAIRE**: `total_eleves`, `mt_total_factures`, `mt_total_payees`, `mt_total_impayees`
- **COMMERCIALE**: `total_produits`, `total_clients`, `mt_valeur_stocks`
- **IMMOBILIER**: `total_clients`, `mt_total_factures`, `mt_total_payees`, `mt_total_impayees`
- **PRESTATAIRE DE SERVICES**: `total_services`, `total_clients`, `mt_chiffre_affaire`

### Performance Optimizations
- Bundle splitting configured in next.config.ts
- Image optimization enabled
- Font optimization with display: swap
- Webpack optimizations for production builds

### Development Conventions
- French language for UI text and comments
- Mobile-first responsive design approach
- TypeScript strict mode
- Component composition over inheritance
- Atomic design principles for component organization

### Système d'Authentification Avancé

#### Architecture React Context + localStorage
- **AuthContext** centralisé avec état global réactif (user, structure, permissions)
- **Hydratation sécurisée** depuis localStorage avec vérification d'intégrité
- **Workflow complet** : login → `SELECT * FROM list_structures WHERE id_structure = ?` → calcul permissions → stockage sécurisé

#### Hooks d'Authentification
- **`useAuth()`** : Accès à l'état global d'authentification
- **`usePermissions()`** : Vérification des droits (`can()`, `canAny()`, `canAll()`)  
- **`useStructure()`** : Gestion des données de structure avec validations
- **`AuthGuard`** : Protection automatique des routes avec redirection

#### Système de Permissions
- **Permissions granulaires** selon profil utilisateur (ADMIN, MANAGER, USER, etc.)
- **Permissions spécifiques** par type de structure (SCOLAIRE, COMMERCIALE, IMMOBILIER, etc.)
- **Calcul automatique** des droits selon combinaison profil + structure
- **Navigation contextuelle** avec redirection selon permissions

#### Workflow d'Authentification
```typescript
1. Utilisateur se connecte → AuthContext.login()
2. AuthService.completeLogin() exécute :
   - login(credentials) → vérification identifiants
   - fetchStructureDetails(id_structure) → SELECT * FROM list_structures...
   - getUserPermissions(user, structure) → calcul des droits
3. Stockage sécurisé : user + structure + permissions
4. Redirection automatique selon type de structure
5. Hooks disponibles partout : useAuth(), useStructure(), usePermissions()
```

#### Utilisation dans les Composants
```typescript
// Protection de route
<AuthGuard requiredPermission={Permission.MANAGE_STUDENTS}>
  <StudentManagement />
</AuthGuard>

// Vérification de permissions
const { can, canAny } = usePermissions();
if (can(Permission.VIEW_FINANCES)) {
  // Afficher données financières
}

// Accès données structure
const { structure, isSchool } = useStructure();
```

### Current Development Status
The project is in Phase 2 development with:
- ✅ Complete responsive design system
- ✅ Authentication pages (login/register)
- ✅ Landing page with business segments
- ✅ **Production deployment system** with automated build/FTP
- ✅ **Multi-dashboard architecture** (Commerce, Scolaire, Immobilier, Admin)
- ✅ **API integration** with dynamic environment switching (DEV/PROD)
- ✅ **Type-safe data layer** with structure-specific financial calculations
- ✅ **Advanced Authentication System** with React Context + permissions
- ✅ **PWA complète** avec Service Worker et installation intelligente
- ✅ **Système de panier** avec recherche client intelligente
- ✅ **Gestion des clients** avec fonction PostgreSQL get_list_clients()
- ✅ **Gestion des abonnements** (MENSUEL/ANNUEL) avec paiement wallet
- ✅ **Système de paiement wallet** (OM/WAVE/FREE) pour factures et abonnements
- ✅ **VenteFlash (Ventes Rapides)** avec client anonyme et encaissement CASH immédiat

### Production Environment
- **Live URL**: https://v2.fayclick.net
- **Deployment**: Automated via `deploy.mjs` script
- **API**: Configurable (DEV: localhost:5000 | PROD: api.icelabsoft.com)

### Business Context
Target market: Senegal
User base: Small businesses across 4 sectors
Key features: Mobile money integration, offline capabilities, multi-language support (French primary)

## État Management & Services

### Zustand Stores
- **`panierStore`** (`stores/panierStore.ts`) : Gestion panier avec persistence localStorage
  - Articles, quantités, client, remise, acompte
  - Auto-réinitialisation du client quand panier vidé
  - Validation stock disponible

### Services Architecture
Tous les services suivent un pattern singleton avec gestion d'erreurs centralisée :

- **`database.service.ts`** : Requêtes PostgreSQL directes
  - `query()` : Exécution requêtes brutes
  - `getListClients(id_structure, tel_client?)` : Récupération clients avec filtre optionnel
  - `getUserRights(id_structure, id_profil)` : Système de droits

- **`auth.service.ts`** : Authentification complète
  - `completeLogin()` : Login + structure + permissions + droits
  - Token JWT + localStorage sécurisé
  - Auto-logout si session expirée

- **`clients.service.ts`** : Gestion clients
  - `searchClientByPhone(telephone)` : Recherche intelligente avec 9 chiffres
  - `getListeClients()` : Liste complète avec statistiques
  - Cache 5 minutes pour optimisation

- **`produits.service.ts`** : Gestion produits/articles
- **`facture.service.ts`** : Création/gestion factures
  - `createFacture(articles, clientInfo, montants, avecFrais)` : Création facture + détails en une requête
  - Validation automatique : articles, montants, remise ≤ sous-total, acompte ≤ montant_net
  - Retourne : `{ success, id_facture, message }`
- **`dashboard.service.ts`** : Statistiques par type de structure
- **`subscription.service.ts`** : Gestion abonnements structures (MENSUEL/ANNUEL)
- **`payment-wallet.service.ts`** : Paiements mobiles (OM/WAVE/FREE)

### PostgreSQL Functions Used
```sql
-- Clients
SELECT * FROM get_list_clients(pid_structure, ptel_client);

-- Droits utilisateur
SELECT * FROM get_mes_droits(pid_structure, pid_profil);

-- Structures
SELECT * FROM list_structures WHERE id_structure = ?;

-- Abonnements
SELECT calculer_montant_abonnement(type, date_debut);
SELECT add_abonnement_structure(id_structure, type, methode, ...);
SELECT renouveler_abonnement(id_structure, type, methode);
SELECT * FROM historique_abonnements_structure(id_structure, limite);

-- Encaissement CASH (VenteFlash)
-- ⚠️ Format CRITIQUE : add_acompte_facture(pid_structure, pid_facture, pmontant_acompte, ptransactionid, puuid)
-- Exemple : add_acompte_facture(183, 731, 475, 'CASH-183-301020251245', 'face2face')
SELECT * FROM add_acompte_facture(
  pid_structure,      -- INTEGER : ID structure
  pid_facture,        -- INTEGER : ID facture créée
  pmontant_acompte,   -- NUMERIC : Montant payé
  ptransactionid,     -- VARCHAR : 'CASH-{id_structure}-{timestamp}'
  puuid              -- VARCHAR : 'face2face' pour paiement direct
);
```

## Composants Clés

### Panier & Vente
- **`ModalPanier.tsx`** : Modal panier avec section client redesignée
  - Label client avec bouton éditer
  - Bouton Annuler (rouge) + Commander (bleu) en grille 2×1
  - Réinitialisation auto si articles supprimés

- **`PanierVenteFlash.tsx`** : Panier simplifié pour ventes ultra-rapides
  - **Client anonyme par défaut** (pas de sélection client nécessaire)
  - Affichage articles + contrôles quantité + remise
  - Sous-total et total calculés automatiquement
  - **Workflow 2 étapes** : `factureService.createFacture()` + `add_acompte_facture()` pour CASH
  - Affiche reçu (`ModalRecuGenere`) au lieu de facture
  - Sidebar avec animation slide-in (Framer Motion)
  - Boutons : Annuler (rouge - vider + fermer) / Sauver (vert - créer vente)

- **`ModalRechercheClient.tsx`** : Recherche intelligente client
  - Auto-recherche à 9 chiffres saisis
  - Badge vert (client trouvé) / bleu (nouveau)
  - Nom verrouillé si client existant
  - Formatage téléphone : 77 123 45 67

- **`CarteProduit.tsx`** : Carte produit cliquable
  - Clic sur carte → ouvre modal édition
  - Boutons avec `e.stopPropagation()` pour actions spécifiques
  - Contrôles quantité + stock disponible

### Système PWA
- **Service Worker** (`public/service-worker.js`)
  - Version actuelle : **v2.1.0 (2025-09-30)**
  - Cache : `fayclick-v2-cache-v2-20250930`
  - **IMPORTANT** : Mettre à jour la version cache lors de changements majeurs
  - Routes publiques exclues : `/facture`, `/fay`, `/login`, `/register`

- **Installation PWA** (`components/pwa/PWAInstallProvider.tsx`)
  - Prompt intelligent après 2s sur pages privées
  - Badge permanent après 5s si non installé
  - Max 3 fermetures, délai 7 jours entre prompts
  - Exclusion automatique des pages publiques

## Gestion du Cache & Déploiement

### Forcer mise à jour PWA
Quand les utilisateurs ne voient pas les changements après déploiement :

1. **Mettre à jour Service Worker version** :
```javascript
// public/service-worker.js
const CACHE_NAME = 'fayclick-v2-cache-v2-YYYYMMDD';
```

2. **Rebuild + déploiement** :
```bash
rm -rf .next && npm run deploy:build
```

3. **Côté utilisateur** :
   - DevTools (F12) → Application → Service Workers → Update
   - Ou désinstaller PWA + Clear site data + réinstaller

### Workflow Déploiement Standard
```bash
# 1. Nettoyage cache local
rm -rf .next

# 2. Build + déploiement complet
npm run deploy:build

# 3. Vérifier sur https://v2.fayclick.net
# 4. Hard refresh : Ctrl + Shift + R
```

## Patterns de Développement

### Gestion des Événements (stopPropagation)
Quand un élément parent est cliquable, utiliser `stopPropagation()` sur les enfants :
```typescript
<div onClick={() => handleParentClick()}>
  <button onClick={(e) => {
    e.stopPropagation();
    handleChildClick();
  }}>
    Action spécifique
  </button>
</div>
```

### Réinitialisation d'État
Toujours réinitialiser les états liés quand une action critique survient :
```typescript
// Exemple : Vider panier doit aussi vider le client
clearPanier() {
  set({
    articles: [],
    infosClient: {
      id_client: undefined,  // ← Important !
      nom_client_payeur: 'CLIENT_ANONYME',
      tel_client: '771234567'
    },
    remise: 0,
    acompte: 0
  });
}
```

### Formatage des Données
- **Téléphones** : Format sénégalais 9 chiffres commençant par 7 (ex: 771234567)
- **Montants** : `toLocaleString('fr-FR')` + ' FCFA'
- **Dates** : `toLocaleDateString('fr-FR')` avec format DD/MM/YYYY

## Système de Paiement Wallet (OM/WAVE/FREE)

### Architecture Séparée Factures vs Abonnements
⚠️ **CRITIQUE** : Ne jamais mélanger les workflows factures et abonnements

- **`payment-wallet.service.ts`** contient **2 méthodes distinctes** :
  - `createPayment(method, context)` - Pour **factures** uniquement
  - `createSubscriptionPaymentDirect(params)` - Pour **abonnements** uniquement

### Spécificités Orange Money (OM)
- **2 liens de paiement** (vs 1 pour WAVE/FREE) :
  - `response.om` : Deeplink app Orange Money (📱 Ouvrir Orange Money)
  - `response.maxit` : Lien web MaxIt (🌐 Payer via MaxIt Web)
- **UI** : Afficher **2 boutons orange** avec gradients différenciés
- **Validation stricte** : Numéro doit commencer par 77 ou 78

### Contraintes Techniques Paiements
- **Référence paiement** : Max **19 caractères** (ex: `ABO-139-1759523454`)
  - Format : `ABO-{id_structure}-{timestamp_10digits}`
  - Dépasser 19 caractères → HTTP 400 sur tous wallets
- **Timeout polling** : 90s pour abonnements, 120s pour factures
- **Endpoint API** : `/add_payement` (pas `/create_payment`)

### Workflow Paiement Abonnement
```typescript
1. Utilisateur sélectionne MENSUEL/ANNUEL
2. Sélection wallet (OM/WAVE/FREE)
3. createSubscriptionPaymentDirect({
     idStructure,
     typeAbonnement,
     montant,
     methode,
     nomStructure,    // Vrai nom depuis structure
     telStructure     // mobile_om ou mobile_wave
   })
4. Affichage QR Code + liens paiement
5. Polling statut (5s interval, 90s timeout)
6. Si COMPLETED → createSubscription(uuid_paiement)
7. Modal SUCCESS → callback onSuccess()
```

### Gestion QR Code & URLs
```typescript
// Extraction conditionnelle selon wallet
if (method === 'OM') {
  setOmDeeplink(response.om || null);
  setMaxitUrl(response.maxit || null);
  setPaymentUrl(null);
} else {
  setPaymentUrl(extractPaymentUrl(response, method));
  setOmDeeplink(null);
  setMaxitUrl(null);
}
```

### Composants Paiement Wallet
- **`ModalPaiementAbonnement.tsx`** : Paiement abonnements avec workflow complet
- **`ModalPaiementQRCode.tsx`** : Paiement factures avec QR + polling
- **QR Code dépliable** : Accordéon avec animation Framer Motion
- **Dual buttons OM** : App + Web pour Orange Money uniquement

## Système d'Abonnements Structures

### Formules Disponibles
- **MENSUEL** : Calcul dynamique selon jours du mois (28-31 jours × 100 FCFA)
- **ANNUEL** : Somme 12 mois - 120 FCFA de réduction (10 FCFA/mois économie)

### Workflow Abonnement Complet
```typescript
1. calculateAmount(type, date_debut?) → Montant en FCFA
2. Affichage formules avec montants calculés
3. Sélection formule + méthode paiement
4. Création paiement wallet (voir section Paiement Wallet)
5. Polling jusqu'à statut COMPLETED
6. createSubscription({
     id_structure,
     type_abonnement,
     methode,
     uuid_paiement  // ⚠️ OBLIGATOIRE après polling COMPLETED
   })
7. PostgreSQL crée abonnement + annule ancien si actif
```

### États Abonnement
- **ACTIF** : En cours, date_fin > aujourd'hui
- **EXPIRE** : Terminé, date_fin < aujourd'hui
- **EN_ATTENTE** : Paiement initié mais non complété
- **ANNULE** : Remplacé par nouveau (forcer_remplacement=true)

### Règles de Gestion PostgreSQL
- **1 seul abonnement ACTIF** par structure à la fois
- **Chevauchement interdit** : Nouveau annule automatiquement l'ancien
- **Renouvellement** : date_debut = date_fin ancien + 1 jour
- **Calcul montant** : 100 FCFA/jour (tarification dynamique)

## Système VenteFlash (Ventes Rapides)

### Architecture VenteFlash
Module dédié aux ventes ultra-rapides avec client anonyme et encaissement CASH immédiat.

**Composants** :
- `app/dashboard/commerce/venteflash/page.tsx` - Page principale VenteFlash
- `components/venteflash/VenteFlashHeader.tsx` - Header avec panier + actions
- `components/venteflash/PanierVenteFlash.tsx` - Panier simplifié client anonyme
- `components/venteflash/VenteFlashStatsCards.tsx` - Statistiques jour en 3×1
- `components/venteflash/VenteFlashListeVentes.tsx` - Liste ventes du jour
- `components/venteflash/VenteCarteVente.tsx` - Carte vente individuelle

### Workflow Vente Flash
```typescript
1. Scan/Recherche produits → Ajout panier (panierStore)
2. Clic panier → PanierVenteFlash s'ouvre (sidebar right)
3. Ajuster quantités + saisir remise optionnelle
4. Clic "Sauver" → 2 étapes séquentielles :

   // Étape 1 : Créer facture avec factureService
   const result = await factureService.createFacture(
     articles,
     {
       nom_client_payeur: 'CLIENT_ANONYME',
       tel_client: '000000000',
       description: 'Vente Flash'
     },
     { remise: remise || 0, acompte: 0 },
     false // Sans frais
   );

   // Étape 2 : Enregistrer encaissement CASH avec add_acompte_facture
   const transactionId = `CASH-${id_structure}-${Date.now()}`;
   await database.query(`
     SELECT * FROM add_acompte_facture(
       ${id_structure},
       ${id_facture},
       ${montant_total},
       '${transactionId}',
       'face2face'
     )
   `);

5. Panier se ferme → ModalRecuGenere s'affiche
6. Liste ventes se rafraîchit automatiquement
```

### Points Critiques VenteFlash
- ⚠️ **Ne PAS utiliser `ModalPanier`** standard (trop complexe avec client)
- ⚠️ **Toujours client anonyme** : `CLIENT_ANONYME` / `000000000`
- ⚠️ **Transaction ID format strict** : `CASH-{id_structure}-{timestamp}`
- ⚠️ **UUID fixe** : `'face2face'` pour paiements directs
- ⚠️ **2 étapes obligatoires** : createFacture() puis add_acompte_facture()
- ✅ **Afficher reçu** (pas facture) pour ventes flash
- ✅ **Auto-refresh** liste après chaque vente

## Notes Importantes

### À NE PAS FAIRE
- ❌ Ne jamais lancer `npm run dev` après des modifications sans raison
- ❌ Ne pas oublier `stopPropagation()` sur boutons dans éléments cliquables
- ❌ Ne pas oublier de mettre à jour la version du Service Worker lors de changements majeurs
- ❌ Ne pas commit sans tester le déploiement en production
- ❌ **Ne JAMAIS modifier `createPayment()` pour gérer les abonnements** - Utiliser `createSubscriptionPaymentDirect()`
- ❌ **Ne pas dépasser 19 caractères** pour les références de paiement (pReference)
- ❌ **Ne pas oublier les 2 boutons OM** (app + web) lors d'ajout de modals paiement
- ❌ **Ne PAS créer de fonctions dupliquées** - Toujours vérifier l'existant avant (approche Senior Developer)
- ❌ **Ne PAS utiliser mauvais format `add_acompte_facture`** - Respecter signature PostgreSQL

### À TOUJOURS FAIRE
- ✅ Mettre à jour `CACHE_NAME` dans Service Worker si changements UI majeurs
- ✅ Vérifier que le panier se réinitialise correctement (articles + client)
- ✅ Tester en navigation privée après déploiement
- ✅ Utiliser `rm -rf .next` avant `npm run deploy:build` si cache suspect
- ✅ Commit avec messages descriptifs suivant format emoji (✨, 🔧, 🐛, etc.)
- ✅ **Chercher fonctions existantes** (Grep/Glob) avant d'en créer de nouvelles
- ✅ **Vérifier signatures PostgreSQL** avant d'appeler fonctions DB