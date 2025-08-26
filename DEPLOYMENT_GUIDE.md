# 🚀 Guide de Déploiement FayClick V2
## Documentation Complète du Processus de Build et Déploiement

---

## 📋 Vue d'Ensemble

Ce guide documente le processus de déploiement professionnel de FayClick V2, une PWA Next.js 15 avec TypeScript. Il couvre toutes les étapes depuis la préparation jusqu'au déploiement en production.

### 🎯 Objectifs
- Build Next.js optimisé et validation TypeScript
- Déploiement FTP automatisé vers serveur de production
- Tests de validation post-déploiement

---

## 🛠️ Architecture Technique

### Stack Technologique
- **Framework** : Next.js 15.4.6 (App Router)
- **Language** : TypeScript 5
- **Styling** : Tailwind CSS 3.4.1
- **Animations** : Framer Motion 12
- **Build** : Export statique (`output: 'export'`)

### Configuration Environnements
```bash
# Variables dans .env
MODE=DEVELOPMENT                    # ou PRODUCTION
NEXT_PUBLIC_API_URL_DEV=http://127.0.0.1:5000/
NEXT_PUBLIC_API_URL_PROD=https://api.icelabsoft.com/api

# Variables FTP (production)
FTP_USER=userv2@fayclick.net
FTP_PASSWORD=[mot_de_passe_sécurisé]
FTP_HOST=node260-eu.n0c.com
FTP_PORT=21
FTP_PATH=/
SITE_URL=https://v2.fayclick.net
```

---

## 🚀 Processus de Déploiement

### Prérequis
- Node.js 18+ (testé avec v20.16.0)
- NPM 10+
- Fichier `.env` configuré
- Accès FTP au serveur de production

### Commandes de Déploiement

#### 1️⃣ **Déploiement Complet** (Recommandé)
```bash
npm run deploy:build
```
- Build automatique Next.js
- Validation TypeScript/ESLint
- Déploiement FTP forcé
- Logs de progression

#### 2️⃣ **Déploiement avec Logs Détaillés**
```bash
npm run deploy:verbose
```
- Identique au précédent + logs verbeux
- Utile pour diagnostiquer les problèmes

#### 3️⃣ **Déploiement Simple** (Build existant)
```bash
npm run deploy
```
- Utilise le build existant dans `/out`
- Plus rapide si build déjà fait

#### 4️⃣ **Mode Force** (Retransfert complet)
```bash
npm run deploy:force
```
- Force le retransfert de tous les fichiers
- Utile en cas de corruption

### Étapes Détaillées du Script

#### Phase 1 : Validation
```bash
🔍 Validation de l'environnement...
✅ Version Node.js: v20.16.0
✅ Configuration Next.js détectée
✅ Variables FTP présentes
✅ Environnement validé
```

#### Phase 2 : Build Next.js
```bash
🏗️ Build Next.js en cours...
ℹ Nettoyage du dossier: .next
ℹ Nettoyage du dossier: out
✅ Build Next.js terminé avec succès
ℹ Build généré: 74 fichiers (1.6 MB)
```

#### Phase 3 : Déploiement FTP
```bash
🚀 Déploiement FTP en cours...
ℹ Configuration FTP:
  Host: node260-eu.n0c.com:21
  User: userv2@fayclick.net
  Local: D:\React_Prj\fayclick\out
  Remote: /
  Secure: FTP
📤 Progression: 0% → 100%
✅ Déploiement FTP terminé
```

#### Phase 4 : Résumé
```bash
📊 Résumé du Déploiement
✅ Fichiers déployés: 73
✅ Taille transférée: 1.6 MB
✅ Durée: 148.9s
✅ Vitesse: 11.0 KB/s
🌐 Site web: https://v2.fayclick.net
```

---

## 🔧 Configuration Technique

### Script de Déploiement (`deploy.mjs`)

#### Fonctionnalités Principales
- **Build automatique** avec timeout de sécurité (5 min)
- **Validation pré-déploiement** (environnement, fichiers)
- **Déploiement FTP** avec retry et gestion d'erreurs
- **Logs professionnels** avec couleurs et progression
- **Diagnostics automatiques** en cas d'erreur

#### Options Supportées
```bash
--build, -b      # Build automatique avant déploiement
--force, -f      # Mode forcé (retransfère tous les fichiers)
--verbose, -v    # Logs détaillés
--help, -h       # Aide
```

### Configuration API Centralisée (`lib/api-config.ts`)

```typescript
export function getApiBaseUrl(): string {
  const mode = process.env.MODE || 'DEVELOPMENT';
  
  switch (mode) {
    case 'PRODUCTION':
      return process.env.NEXT_PUBLIC_API_URL_PROD || 'https://api.icelabsoft.com/api';
    case 'DEVELOPMENT':
    default:
      return process.env.NEXT_PUBLIC_API_URL_DEV || 'http://127.0.0.1:5000';
  }
}
```

---

## 🏗️ Corrections Techniques Apportées

### 1️⃣ **Types TypeScript Cohérents**

#### Problème Initial
```typescript
// ❌ Erreurs ESLint
saveUser(user: any): void          // any interdit
getUser(): any | null             // any interdit
```

#### Solution Appliquée
```typescript
// ✅ Types spécifiques
import { User } from '@/types/auth';
saveUser(user: User): void
getUser(): User | null
```

### 2️⃣ **Interface FinancialData Adaptative**

#### Problème
Chaque type de structure retourne des données différentes :
- **SCOLAIRE** : `mt_total_factures`, `mt_total_payees`, `mt_total_impayees`
- **COMMERCIALE** : `mt_valeur_stocks` (pas de factures)
- **IMMOBILIER** : factures + commissions
- **PRESTATAIRE** : `mt_chiffre_affaire`

#### Solution
```typescript
export interface FinancialData {
  // Propriétés communes
  totalRevenues: number;
  totalPaid: number;
  totalUnpaid: number;
  netBalance: number;
  
  // Propriétés optionnelles selon le type
  totalInvoices?: number;      // SCOLAIRE & IMMOBILIER
  totalCharges?: number;       // COMMERCIALE & PRESTATAIRE
  soldeNet?: number;          // Calculé selon le type
  totalStock?: number;         // COMMERCIALE uniquement
  totalCommissions?: number;   // IMMOBILIER uniquement
  totalRevenueBusiness?: number; // PRESTATAIRE uniquement
}
```

### 3️⃣ **Calculs Financiers par Type**

```typescript
calculateFinancialData(stats: DashboardStats): FinancialData {
  const type = stats.type_structure;
  
  switch (type) {
    case 'SCOLAIRE':
      return this.calculateScolaireFinancials(stats);
    case 'COMMERCIALE':
      return this.calculateCommercialeFinancials(stats);
    case 'IMMOBILIER':
      return this.calculateImmobilierFinancials(stats);
    case 'PRESTATAIRE DE SERVICES':
      return this.calculatePrestatairesFinancials(stats);
    default:
      return this.calculateDefaultFinancials(stats);
  }
}
```

---

## 🔍 Guide de Troubleshooting

### Erreurs Communes et Solutions

#### 1️⃣ **Erreur de Build TypeScript**
```bash
❌ Type error: Property 'totalInvoices' does not exist
```

**Cause** : Interface FinancialData incohérente
**Solution** : Vérifier synchronisation types entre `/types` et `/services`

#### 2️⃣ **Erreur de Permissions Build**
```bash
❌ EPERM: operation not permitted, lstat '.next/trace'
```

**Cause** : Serveur dev encore actif ou verrous fichiers
**Solution** :
```bash
# Arrêter tous processus Node
taskkill /f /im node.exe /t

# Nettoyer et relancer
npm run deploy:build
```

#### 3️⃣ **Erreurs FTP**
```bash
❌ ENOTFOUND - Serveur FTP introuvable
```

**Solutions** :
- Vérifier `FTP_HOST` dans `.env`
- Tester connectivité réseau
- Vérifier DNS/firewall

```bash
❌ EAUTH - Échec authentification
```

**Solutions** :
- Vérifier `FTP_USER` et `FTP_PASSWORD`
- Contrôler permissions compte FTP

#### 4️⃣ **Timeout de Build**
```bash
❌ Build timeout (5 minutes)
```

**Solutions** :
- Nettoyer `node_modules` : `rm -rf node_modules && npm install`
- Augmenter timeout dans `deploy.mjs`
- Vérifier ressources système

### Commandes de Diagnostic

```bash
# Vérifier environnement
node --version && npm --version

# Tester build local uniquement
npm run build

# Logs détaillés
npm run deploy:verbose

# Mode diagnostic complet
node deploy.mjs --verbose --build
```

---

## 📊 Métriques de Performance

### Build Optimal
- **Fichiers générés** : ~74 fichiers
- **Taille totale** : ~1.6 MB
- **Temps de build** : 30-60s
- **Temps déploiement** : 2-3 minutes

### Optimisations Appliquées
- Export statique Next.js
- Images non optimisées (compatibilité export)
- Exclusion fichiers inutiles (.map, dev files)
- Cache FTP intelligent

---

## 🌐 URLs et Environnements

### Production
- **URL principale** : https://v2.fayclick.net
- **API Backend** : https://api.icelabsoft.com/api
- **Serveur FTP** : node260-eu.n0c.com

### Développement  
- **URL locale** : http://localhost:3000
- **API Backend** : http://127.0.0.1:5000
- **Mode** : DEVELOPMENT

---

## 🔄 Processus de Mise à Jour

### Pour un Nouveau Build
1. **Développement** : Coder et tester en local
2. **Validation** : `npm run lint && npm run build`
3. **Déploiement** : `npm run deploy:build`
4. **Tests** : Valider sur https://v2.fayclick.net

### Pour une Correction Rapide
1. **Fix** : Corriger le problème
2. **Deploy** : `npm run deploy:force`
3. **Vérifier** : Tests post-déploiement

### Rollback d'Urgence
1. **Identifier** : Version stable précédente
2. **Restaurer** : Depuis sauvegarde FTP ou Git
3. **Redéployer** : `npm run deploy:force`

---

## 📝 Checklist de Déploiement

### Pré-Déploiement
- [ ] Code validé et testé localement
- [ ] Variables `.env` à jour
- [ ] Pas d'erreurs ESLint/TypeScript
- [ ] Build local réussi (`npm run build`)

### Déploiement
- [ ] Commande : `npm run deploy:build`
- [ ] Surveillance logs sans erreur
- [ ] Progression FTP 100%
- [ ] Message succès final

### Post-Déploiement
- [ ] Site accessible : https://v2.fayclick.net
- [ ] Page d'accueil responsive
- [ ] Login fonctionnel
- [ ] Routage dashboards opérationnel
- [ ] APIs connectées (DEV/PROD selon MODE)

---

## 🏆 Bonnes Pratiques

### Déploiement
1. **Toujours** utiliser `deploy:build` pour un déploiement complet
2. **Tester** en local avant déploiement
3. **Valider** post-déploiement systematiquement
4. **Documenter** les changements importants

### Sécurité
1. **Jamais** committer le fichier `.env`
2. **Utiliser** des tokens FTP sécurisés  
3. **Changer** mots de passe régulièrement
4. **Monitorer** accès serveur

### Performance
1. **Optimiser** images et assets
2. **Minimiser** bundle size
3. **Utiliser** cache FTP intelligent
4. **Surveiller** métriques de build

---

## 📞 Support et Maintenance

### Contacts Techniques
- **Développeur Principal** : Expert Senior FayClick
- **Hébergement** : Support technique hébergeur
- **API Backend** : Équipe IcelabSoft

### Monitoring
- **Uptime** : Surveillance automatique site
- **Erreurs** : Logs serveur et console browser
- **Performance** : Métriques build et déploiement

---

*Dernière mise à jour : 25 Août 2025*  
*Version documentation : 1.0*  
*Status : ✅ Déploiement Production Réussi*