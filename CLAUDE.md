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
- **`dashboard.service.ts`** : Statistiques par type de structure

### PostgreSQL Functions Used
```sql
-- Clients
SELECT * FROM get_list_clients(pid_structure, ptel_client);

-- Droits utilisateur
SELECT * FROM get_mes_droits(pid_structure, pid_profil);

-- Structures
SELECT * FROM list_structures WHERE id_structure = ?;
```

## Composants Clés

### Panier & Vente
- **`ModalPanier.tsx`** : Modal panier avec section client redesignée
  - Label client avec bouton éditer
  - Bouton Annuler (rouge) + Commander (bleu) en grille 2×1
  - Réinitialisation auto si articles supprimés

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

## Notes Importantes

### À NE PAS FAIRE
- ❌ Ne jamais lancer `npm run dev` après des modifications sans raison (mentionne dans fichier)
- ❌ Ne pas oublier `stopPropagation()` sur boutons dans éléments cliquables
- ❌ Ne pas oublier de mettre à jour la version du Service Worker lors de changements majeurs
- ❌ Ne pas commit sans tester le déploiement en production

### À TOUJOURS FAIRE
- ✅ Mettre à jour `CACHE_NAME` dans Service Worker si changements UI majeurs
- ✅ Vérifier que le panier se réinitialise correctement (articles + client)
- ✅ Tester en navigation privée après déploiement
- ✅ Utiliser `rm -rf .next` avant `npm run deploy:build` si cache suspect
- ✅ Commit avec messages descriptifs suivant format emoji (✨, 🔧, 🐛, etc.)