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

#### Settings Components (`components/settings/`)
- `UsersManagement.tsx` - Gestion utilisateurs/caissiers avec maxCaissiers dynamique
- `CategoriesManagement.tsx` - Gestion catégories produits
- `FactureLayoutEditor.tsx` - Configurateur drag & drop modèle facture (zones header/footer G/C/D)

#### Custom Hooks (`hooks/`)
- `useBreakpoint` - Responsive breakpoint detection
- `useTouch` - Touch gesture handling and capabilities
- `useDashboardData` - Dashboard data management with API integration (mobile)
- `useDashboardCommerceComplet` - Dashboard Commerce desktop avec données réelles PostgreSQL
- `useWalletStructure` - Gestion données wallet (soldes, transactions, totaux)

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
- **Dashboard service**: `services/dashboard.service.ts` with structure-specific data processing + `getDashboardCommerceComplet()` pour desktop
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
- ✅ **Système KALPE (Coffre-Fort Wallet)** avec soldes OM/WAVE/FREE et historique transactions
- ✅ **Retraits Wallet** avec OTP SMS, API send_cash et flip cards animées
- ✅ **Impression multi-format** factures (Reçu, Facture, BL, BR) avec format personnalisé/standard (compte_prive)
- ✅ **Paramètres structure DB-first** avec sync localStorage (param_structure → Settings)
- ✅ **Infos facture** éditables (adresse, tél, email, site, banque, NINEA) dans Règles Ventes
- ✅ **Configurateur modèle facture** drag & drop avec aperçu live (compte_prive uniquement)
- ✅ **Dashboard Commerce Desktop** avec données réelles PostgreSQL (KPIs, graphique semaine, top articles/clients, factures, dépenses, stats globales)
- ✅ **Masquage montants CAISSIER** sur dashboard desktop (CA, panier moyen, valeur stock, factures, top produits/clients, dépenses → ***)

### Production Environment
- **Live URL**: https://v2.fayclick.net
- **Deployment**: Automated via `deploy.mjs` script
- **API**: Configurable (DEV: localhost:5000 | PROD: api.icelabsoft.com)

### Business Context
Target market: Senegal
User base: Small businesses across 4 sectors
Key features: Mobile money integration, offline capabilities, multi-language support (French primary)

## Routes & Pages

### Structure des Routes Dashboard
```
/dashboard
├── /commerce              # Dashboard Commerce
│   ├── /clients          # Gestion clients commerce
│   ├── /produits         # Gestion produits/articles
│   ├── /factures         # Liste et gestion factures
│   ├── /depenses         # Suivi des dépenses
│   ├── /inventaire       # Gestion inventaire/stock
│   └── /venteflash       # Ventes rapides (client anonyme)
├── /scolaire             # Dashboard Scolaire
├── /immobilier           # Dashboard Immobilier
├── /services             # Dashboard Prestataires de Services
│   ├── /clients          # Clients prestataires
│   ├── /services         # Gestion des services proposés
│   ├── /prestations      # Suivi des prestations
│   ├── /devis            # Création/gestion devis
│   └── /factures         # Factures prestataires
└── /admin                # Dashboard Admin Système
```

### Pages Publiques
- `/` : Landing page avec segments métier
- `/login` : Connexion utilisateur
- `/register` : Inscription nouvelle structure
- `/facture` : Visualisation facture publique (lien partageable)
- `/catalogue` : Catalogue public d'une structure
- `/catalogues` : Liste des catalogues publics
- `/recu` : Visualisation reçu de paiement
- `/offline` : Page mode hors-ligne PWA

### Pages Utilitaires
- `/settings` : Paramètres utilisateur/structure
- `/structure/gestion` : Gestion de la structure (profil, logo, infos)

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
  - `editParamStructure(id, params)` : Sauvegarde paramètres structure (sales rules, info_facture, config_facture)
  - `getStructureDetails(id)` : Détails complets via get_une_structure()

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
- **`facture-list.service.ts`** : Liste et recherche de factures
- **`facture-privee.service.ts`** : Factures privées (authentifiées)
- **`facture-publique.service.ts`** : Factures publiques (lien partageable)
  - `getFacturePublique(id_structure, id_facture)` : Récupère facture sans auth
  - `addAcomptePublique(params)` : Enregistre paiement wallet sans auth
- **`dashboard.service.ts`** : Statistiques par type de structure
  - `getDashboardStats(structureId)` : Données basiques (mobile)
  - `getDashboardCommerceComplet(structureId, periodeTop)` : Données complètes commerce (desktop) via `get_dashboard_commerce_complet()`
  - Cache dédié 5 min pour chaque méthode
- **`subscription.service.ts`** : Gestion abonnements structures (MENSUEL/ANNUEL)
- **`payment-wallet.service.ts`** : Paiements mobiles (OM/WAVE/FREE)
- **`admin.service.ts`** : Administration système (gestion structures, utilisateurs admin)
- **`depense.service.ts`** : Gestion des dépenses par structure
- **`inventaire.service.ts`** : Gestion de l'inventaire et mouvements de stock
- **`prestation.service.ts`** : Gestion des prestations de services
- **`sms.service.ts`** : Envoi de SMS (notifications, rappels)
- **`notification.service.ts`** : Système de notifications in-app
- **`registration.service.ts`** : Inscription et création de nouvelles structures
- **`users.service.ts`** : Gestion des utilisateurs (CRUD, droits)
- **`recu.service.ts`** : Génération de reçus de paiement
- **`etatGlobal.service.ts`** : État global et rapports consolidés
- **`catalogue-public.service.ts`** : Catalogues publics partageables
- **`logo-upload.service.ts`** : Upload et gestion des logos structures
- **`wallet.service.ts`** : Gestion soldes et historique wallet (KALPE)
- **`retrait.service.ts`** : Retraits wallet avec OTP et API send_cash

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

-- Wallet KALPE (Soldes et Historique)
SELECT * FROM get_soldes_wallet_structure(pid_structure);  -- Soldes simplifiés
SELECT * FROM get_wallet_structure(pid_structure);         -- Données complètes + historique

-- Paramètres structure
SELECT get_une_structure(pid_structure);  -- Retourne JSON complet avec param_structure
-- Retourne : credit_autorise, limite_credit, acompte_autorise, prix_engros,
--   nombre_produit_max, nombre_caisse_max, compte_prive, mensualite, taux_wallet,
--   info_facture (JSON), config_facture (JSON)
SELECT edit_param_structure(
  p_id_structure,       -- INTEGER
  p_credit_autorise,    -- BOOL DEFAULT NULL
  p_limite_credit,      -- NUMERIC DEFAULT NULL
  p_acompte_autorise,   -- BOOL DEFAULT NULL
  p_prix_engros,        -- BOOL DEFAULT NULL
  p_info_facture,       -- JSON DEFAULT NULL (merge avec existant)
  p_config_facture      -- JSON DEFAULT NULL (remplacement complet)
);

-- Dashboard Commerce Complet (Desktop)
SELECT * FROM get_dashboard_commerce_complet(
  pid_structure,      -- INTEGER : ID structure
  pperiode_top        -- VARCHAR DEFAULT 'mois' : 'semaine' ou 'mois' pour top articles/clients
);
-- Retourne JSON : { success, kpis, graphique_semaine, top_articles, top_clients,
--   dernieres_factures, stats_globales, depenses_mois }

-- Retraits Wallet
-- ⚠️ Appeler UNIQUEMENT après succès API send_cash
SELECT * FROM add_retrait_marchand(
  pid_structure,      -- INTEGER : ID structure
  ptransactionid,     -- VARCHAR : Transaction ID reçu de l'API (ex: 'CI260111.1924.A12345')
  ptelnumber,         -- VARCHAR : Numéro destination (9 chiffres)
  pamount,            -- NUMERIC : Montant du retrait
  pmethode,           -- VARCHAR : 'OM' ou 'WAVE' (FREE utilise 'OM')
  pfrais              -- INTEGER : Laisser à 0 (frais calculés automatiquement)
);
```

## Systèmes Complexes (Documentation Détaillée)

Pour les détails techniques approfondis, voir **`docs/DETAILED_ARCHITECTURE.md`** :
- Système de Paiement Wallet (OM/WAVE/FREE)
- Système d'Abonnements Structures
- Système VenteFlash (Ventes Rapides)
- Composants Clés Panier & Vente
- Système PWA complet
- Gestion du Cache & Déploiement

### Dashboard Commerce Desktop (Données Réelles)

#### Architecture
- **Fonction PostgreSQL** : `get_dashboard_commerce_complet(pid_structure, pperiode_top)` retourne un JSON complet
- **Service** : `dashboard.service.ts` → `getDashboardCommerceComplet()` avec cache 5 min dédié
- **Hook** : `useDashboardCommerceComplet(structureId)` avec auto-refresh 5 min
- **Composant** : `CommerceDashboardDesktop.tsx` avec sous-composants internes (WeeklyBarChart, TopProducts, TopClients, RecentInvoices)

#### Sections du Dashboard
- **KPI Cards** : Ventes du jour, Clients du jour, CA Semaine, Panier Moyen (avec variations %)
- **Graphique** : Barres CSS des ventes par jour de la semaine (montant + nb_ventes)
- **Top 5 Produits** : Classement par CA avec quantités vendues
- **Stats Globales** : Total produits, Valeur stock (toggle eye), Ventes du mois, Clients actifs, CA du mois
- **Dernières Factures** : 10 dernières avec ref, client, montant, statut, date
- **Top 5 Clients** : Classement par CA avec nb factures
- **Dépenses du Mois** : Total + variation + nb dépenses

#### Masquage Montants (Droits CAISSIER)
- Le droit `VOIR CHIFFRE D'AFFAIRE` (`canViewCA`) contrôle la visibilité des montants
- **Masqué** (profil CAISSIER) : KPI CA/Panier Moyen hidden, montants → `***`, Valeur Stock → `***` sans bouton eye, Dépenses → `***`
- **Visible** (profil ADMIN) : Tous les montants affichés normalement
- **Pattern** : `canViewCA` passé en prop à chaque sous-composant (WeeklyBarChart, TopProducts, TopClients, RecentInvoices)

#### Types TypeScript (`types/dashboard.ts`)
- `DashboardCommerceComplet` : Type racine avec success + toutes les sections
- `DashboardCommerceKpis`, `DashboardCommerceGraphiqueJour`, `DashboardCommerceTopArticle`
- `DashboardCommerceTopClient`, `DashboardCommerceDerniereFacture`, `DashboardCommerceStatsGlobales`, `DashboardCommerceDepensesMois`

#### ⚠️ Import DatabaseService
```typescript
// database.service.ts exporte : export default DatabaseService.getInstance()
// L'import EST déjà l'instance singleton — NE PAS appeler .getInstance() dessus
import DatabaseService from './database.service';
const results = await DatabaseService.executeFunction('ma_fonction', [params]);
// ❌ NE PAS FAIRE : DatabaseService.getInstance().executeFunction(...)
```

### Système KALPE & Retraits Wallet
Documentation complète : **`docs/Gestion_Wallet/MEMO_KALPE_RETRAITS.md`**

#### Composants Coffre-Fort (`components/coffre-fort/`)
- **`ModalCoffreFort.tsx`** : Modal 3 onglets (CA Global, KALPE, Transactions)
- **`WalletFlipCard.tsx`** : Carte wallet avec flip 3D pour retrait
- **`OTPInput.tsx`** : Saisie OTP 5 chiffres avec validation

#### Workflow Retrait
```
1. Clic carte (solde > 0) → Flip animation
2. Saisie montant → Validation (min 100 FCFA, max solde)
3. Envoi OTP via API send_o_sms → SMS au numéro structure
4. Saisie OTP (5 chiffres, 3 tentatives, expire 2 min)
5. Appel API send_cash → https://api.icelabsoft.com/pay_services/api/send_cash
6. Si SUCCESS → Sauvegarde add_retrait_marchand()
7. Refresh soldes automatique
```

#### API send_cash
```json
POST https://api.icelabsoft.com/pay_services/api/send_cash
{
  "pservicename": "OFMS",        // "INTOUCH" pour WAVE
  "app_name": "FAYCLICK",
  "pmethode": "OM",              // "OM" ou "WAVE"
  "ptelnumber": "777301221",
  "pamount": 1000,
  "pmotif": "Retrait OM KALPE 260111193045",
  "pnomstructure": "MA BOUTIQUE"
}
```

#### API SMS OTP
```json
POST https://api.icelabsoft.com/sms_service/api/send_o_sms
{
  "numtel": "777301221",
  "message": "Entrez le code : 12345 pour valider le retrait...",
  "sender": "ICELABOSOFT"
}
```

### Impression Multi-Format Factures (compte_prive)

#### Composants Impression (`components/impression/`)
- **`ModalImpressionDocuments.tsx`** : Modal choix document + format + impression iframe

#### Comportement conditionnel
- **`compte_prive = true`** : Bouton "Imprimer" (indigo) sur FactureCard PAYÉE → modal avec Reçu, Facture, BL, BR → choix Personnalisé/Standard
- **`compte_prive = false`** : Bouton "Reçu" (vert) inchangé sur FactureCard PAYÉE

#### Formats d'impression
- **Personnalisé** : Utilise `config_facture` depuis auth context (flexbox gauche/centre/droite) + nomStructure en titre
- **Standard** : Layout centré classique (logo centré, nom structure h2, adresse, tél)

#### Pattern important
```typescript
// TOUJOURS appeler refreshAuth() après sauvegarde dans editParamStructure
// Sinon les autres pages n'auront pas les données à jour dans structure.*
const result = await databaseService.editParamStructure(id, { config_facture: ... });
if (result.success) await refreshAuth();
```

### Résumé PWA
- **Service Worker** : `public/service-worker.js` - Mettre à jour `CACHE_NAME` lors de changements majeurs
- **Installation** : `components/pwa/PWAInstallProvider.tsx` - Prompt intelligent
- **Background Sync** : `hooks/useBackgroundSync.ts` - Sync offline avec IndexedDB

### Paiement Factures Publiques (sans authentification)
Quand un client paie via le lien public d'une facture (`/facture?token=XXX`), le paiement doit être enregistré en BD.

**Composants** :
- `components/facture/FacturePubliqueClient.tsx` : Page facture publique
- `services/facture-publique.service.ts` : Service sans auth

**Workflow** :
```
1. Client ouvre lien facture publique
2. Clique sur wallet (OM/WAVE/FREE) → ModalPaiementQRCode
3. Paiement effectué → Polling COMPLETED avec uuid/reference_externe
4. handleWalletPaymentComplete(statusResponse) appelé
5. facturePubliqueService.addAcomptePublique({
     id_structure, id_facture, montant_acompte,
     transaction_id, uuid, mode_paiement, telephone
   })
6. PostgreSQL add_acompte_facture() exécuté
7. Facture rechargée → Statut mis à jour
```

**Transaction ID format** : `{WALLET}-PUB-{id_structure}-{timestamp}`
Exemple : `WAVE-PUB-183-1736693291000`

### Workflow Déploiement Rapide
```bash
rm -rf .next && npm run deploy:build
# Vérifier sur https://v2.fayclick.net + Hard refresh (Ctrl+Shift+R)
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

### Scan Code-Barres Multiples (pattern filter + modal sélection)
Un même code-barres peut correspondre à plusieurs produits (variantes couleur/taille). Toujours utiliser `filter()` au lieu de `find()`, puis afficher un modal de sélection si plus d'un résultat :
```typescript
// ❌ MAUVAIS : retourne seulement le premier match
const match = produits.find(p => p.code_barre === code);

// ✅ BON : gère les matches multiples
const matches = produits.filter(p => p.code_barre && p.code_barre.trim() === code.trim());
if (matches.length === 1) {
  handleProductSelected(matches[0]);
} else if (matches.length > 1) {
  setBarcodeMatches(matches);
  setShowBarcodeSelectionModal(true);
}
```
**Fichiers concernés** : `produits/page.tsx`, `venteflash/page.tsx`, `VenteFlashHeader.tsx`
**VenteFlashHeader** : Utilise le callback `onMultipleMatches` pour déléguer au parent.

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

### Éviter les Closures Stale dans les Callbacks
Quand un callback est passé à une fonction async (polling, setTimeout, etc.), les valeurs d'état React capturées peuvent être périmées (stale).

**Problème** :
```typescript
// ❌ MAUVAIS : selectedMethod sera null dans le callback
const handleSelectMethod = (method) => {
  setSelectedMethod(method); // async - pas encore mis à jour
  startPolling(uuid, (status) => {
    // selectedMethod est capturé ici comme null !
    if (status === 'COMPLETED') {
      createSubscription(selectedMethod); // null !
    }
  });
};
```

**Solution** : Passer les valeurs directement en paramètres :
```typescript
// ✅ BON : Passer les valeurs directement au callback
const startPolling = (uuid, formula, method) => {
  paymentService.startPolling(uuid, async (status) => {
    if (status === 'COMPLETED') {
      await handlePaymentCompleted(uuid, formula, method);
    }
  });
};

// Appel avec valeurs explicites
startPolling(uuid, formula.type, method);
```

### Parsing JSON PostgreSQL
Les réponses PostgreSQL peuvent être string JSON ou objet déjà parsé. Toujours vérifier :
```typescript
const rawResponse = result[0].ma_fonction;
const response = typeof rawResponse === 'string'
  ? JSON.parse(rawResponse)
  : rawResponse;
```

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
- ❌ **Ne PAS appeler `add_retrait_marchand` sans succès API send_cash** - Toujours vérifier status === 'SUCCESS'
- ❌ **Ne PAS utiliser `<style jsx>` pour animations 3D** - Utiliser styles inline React
- ❌ **Ne PAS capturer useState dans callbacks async** - Passer les valeurs en paramètres (évite closure stale)
- ❌ **Ne PAS faire JSON.parse() sans vérifier typeof** - PostgreSQL peut retourner objet ou string
- ❌ **Ne PAS utiliser `produits.find()` pour recherche par code-barres** - Utiliser `produits.filter()` car un même code-barres peut correspondre à plusieurs produits (ex: variantes couleur)
- ❌ **Ne PAS oublier `refreshAuth()` après `editParamStructure()`** - Sinon les autres pages n'auront pas les données à jour (config_facture, info_facture, etc.)
- ❌ **Ne PAS appeler `DatabaseService.getInstance()`** dans les services — l'import default EST déjà l'instance singleton
- ❌ **Ne PAS afficher de montants sans vérifier `canViewCA`** sur le dashboard desktop — les CAISSIERS ne doivent pas voir les CA, dépenses, valeur stock

### À TOUJOURS FAIRE
- ✅ Mettre à jour `CACHE_NAME` dans Service Worker si changements UI majeurs
- ✅ Vérifier que le panier se réinitialise correctement (articles + client)
- ✅ Tester en navigation privée après déploiement
- ✅ Utiliser `rm -rf .next` avant `npm run deploy:build` si cache suspect
- ✅ Commit avec messages descriptifs suivant format emoji (✨, 🔧, 🐛, etc.)
- ✅ **Chercher fonctions existantes** (Grep/Glob) avant d'en créer de nouvelles
- ✅ **Vérifier signatures PostgreSQL** avant d'appeler fonctions DB
- ✅ **Flip 3D** : Utiliser `style={{ perspective, transformStyle, backfaceVisibility }}` inline
- ✅ **OTP sessions** : Stockées en mémoire avec expiration 2 min et max 3 tentatives
- ✅ **Callbacks polling** : Passer `formula` et `method` en paramètres (pas via useState)
- ✅ **Réponses PostgreSQL** : Vérifier `typeof === 'string'` avant `JSON.parse()`
- ✅ **Scan code-barres** : Toujours utiliser `filter()` + modal sélection si matches > 1 (pattern appliqué dans Produits + VenteFlash)
- ✅ **Toggle prix en gros** : Condition = `salesRules.prixEnGrosActif` seul (pas de check `prix_grossiste > 0`), avec fallback `prix_vente` si grossiste = 0
- ✅ **Après `editParamStructure()` réussi** : Toujours appeler `await refreshAuth()` pour syncer l'auth context
- ✅ **Paramètres structure** : DB = source de vérité, sync localStorage au login + sauvegarde optimiste
- ✅ **editParamStructure()** : 7 paramètres (id, credit, limite, acompte, gros, info_facture JSON, config_facture JSON)
- ✅ **config_facture** : Remplacement complet (pas de merge), layout = `{ header: { gauche, centre, droite }, footer: { ... } }`
- ✅ **info_facture** : Merge côté serveur (COALESCE champ par champ)
- ✅ **Dashboard desktop montants** : Toujours passer `canViewCA` aux sous-composants (WeeklyBarChart, TopProducts, TopClients, RecentInvoices) et afficher `***` si false
- ✅ **DatabaseService import** : Utiliser directement `DatabaseService.executeFunction()` (l'import est l'instance, pas la classe)

---

## 🚀 BMAD Method Integration

Ce projet utilise la méthode BMAD pour le développement structuré.

### Activation
Pour activer l'agent BMAD, dis : "Active SUPER_BMAD_AGENT"

### Documentation BMAD
- Agent : `.claude/bmad/BMAD_AGENT.md`
- Config : `.claude/bmad/config.yaml`
- Templates : `.claude/bmad/templates/`

### Commandes BMAD
| Commande | Action |
|----------|--------|
| `/bmad-init` | Initialiser BMAD |
| `/bmad-status` | État du projet |
| `/bmad-discover` | Analyser l'existant |
| `/bmad-prd` | Créer un PRD |
| `/bmad-arch` | Architecture |
| `/bmad-story` | Créer une story |
| `/bmad-context` | Générer prompt contexte |

### Référence
@see .claude/bmad/BMAD_AGENT.md
```

---

## 📁 **Structure Finale Recommandée**
```
fayclick/                          # ou payecole, etc.
├── CLAUDE.md                      # ✅ Existant + section BMAD ajoutée
├── .claude/
│   ├── settings.json              # ✅ Existant préservé
│   ├── commands/                  # ✅ Existant préservé
│   │   └── [tes commandes]
│   └── bmad/                      # 🆕 Nouveau
│       ├── BMAD_AGENT.md          # Prompt complet
│       ├── config.yaml            # Config BMAD
│       └── templates/
│           ├── PROJECT_CONTEXT.tpl.md
│           ├── PRD.tpl.md
│           └── STORY.tpl.md
│
├── docs/                          # 🆕 Structure BMAD
│   ├── bmad/
│   ├── architecture/
│   └── stories/
│
└── src/                           # ✅ Code existant préservé