# 📝 Changelog FayClick V2

## [1.1.0] - 2025-08-25 - Déploiement Production

### 🚀 Nouveautés Majeures
- ✅ **Script de déploiement professionnel** (`deploy.mjs`)
  - Build automatique avec validation TypeScript
  - Déploiement FTP optimisé avec gestion d'erreurs
  - Logs colorés et progression temps réel
  - Diagnostics automatiques en cas d'échec
  - Support timeouts et retry automatique

- ✅ **Configuration API centralisée** (`lib/api-config.ts`)
  - Gestion environnements DEV/PROD automatique
  - URLs configurables via variables `.env`
  - Support basculement API dynamique

- ✅ **Architecture de données adaptative**
  - Types financiers spécifiques par secteur business
  - Calculs intelligents selon structure (SCOLAIRE, COMMERCIALE, IMMOBILIER, PRESTATAIRE)
  - Interface `FinancialData` flexible avec propriétés optionnelles

### 🔧 Corrections Techniques

#### Types TypeScript
- **Suppression types `any`** dans `auth.service.ts`
- **Interfaces cohérentes** entre services et types centralisés
- **Imports optimisés** et dépendances circulaires résolues

#### Calculs Financiers par Secteur
```typescript
// SCOLAIRE: Factures, payées, impayées
calculateScolaireFinancials(stats) -> totalRevenues, totalPaid, totalUnpaid

// COMMERCIALE: Stock, charges estimées
calculateCommercialeFinancials(stats) -> totalStock, totalCharges, soldeNet

// IMMOBILIER: Commissions, revenus
calculateImmobilierFinancials(stats) -> totalCommissions, totalRevenues

// PRESTATAIRE: Chiffre affaire, charges
calculatePrestatairesFinancials(stats) -> totalRevenueBusiness, totalCharges
```

### 🌐 Production
- **URL live**: https://v2.fayclick.net
- **Build réussi**: 74 fichiers (1.6 MB) déployés
- **Performance**: Déploiement en 148.9s
- **Tests validés**: Login, routage dashboards, API calls

### 📚 Documentation
- ✅ **Guide complet** (`DEPLOYMENT_GUIDE.md`)
  - Processus step-by-step
  - Troubleshooting avancé 
  - Métriques de performance
  - Checklist de déploiement

- ✅ **CLAUDE.md mis à jour**
  - Commandes de déploiement
  - Architecture API documentée
  - Status production ajouté

### 🔄 Scripts NPM Ajoutés
```json
{
  "deploy": "node deploy.mjs",
  "deploy:force": "node deploy.mjs --force", 
  "deploy:build": "node deploy.mjs --build --force",
  "deploy:verbose": "node deploy.mjs --verbose --build"
}
```

### 🗂️ Fichiers Créés
- `deploy.mjs` - Script de déploiement moderne
- `lib/api-config.ts` - Configuration API centralisée
- `DEPLOYMENT_GUIDE.md` - Documentation complète
- `CHANGELOG.md` - Historique des versions

### 🗂️ Fichiers Modifiés
- `package.json` - Scripts de déploiement
- `services/auth.service.ts` - Types TypeScript corrects
- `services/dashboard.service.ts` - Calculs par secteur
- `types/dashboard.ts` - Interface FinancialData flexible
- `hooks/useDashboardData.ts` - Imports optimisés
- `CLAUDE.md` - Procédures mises à jour

### 🗑️ Fichiers Supprimés
- `deploy.js` - Ancien script obsolète (remplacé par deploy.mjs)

---

## [1.0.0] - 2025-08-17 - Version Initiale

### 🚀 Fonctionnalités Principales
- ✅ PWA Next.js 15 avec App Router
- ✅ Design system responsive Tailwind CSS
- ✅ Authentication avec JWT
- ✅ Dashboards multi-secteurs (Commerce, Scolaire, Immobilier, Admin)
- ✅ Intégration API IcelabSoft
- ✅ Animations Framer Motion
- ✅ Support TypeScript strict

### 🎨 Design System
- Palette couleurs : Bleu (#0ea5e9) et Orange (#f59e0b)
- Typographies : Inter (body) et Montserrat (headings)
- Breakpoints responsives : 5 tailles (xs à 2xl)
- Animations GPU optimisées

### 🏗️ Architecture
- App Router Next.js 15
- Components pattern-based
- Custom hooks réutilisables
- Export statique configuré
- PWA manifest inclus

---

*Dernière mise à jour : 25 Août 2025*  
*Maintenu par : Expert Senior FayClick*