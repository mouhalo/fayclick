# 🚀 Guide Expert - Déploiement FayClick V2

## 📋 Vue d'ensemble

Ce guide documente la stratégie de déploiement optimisée pour **FayClick V2**, une PWA Next.js 15 avec export statique et déploiement FTP professionnel.

### 🎯 Architecture de déploiement

- **Framework** : Next.js 15 avec App Router
- **Mode** : Export statique (`output: 'export'`)
- **Build** : Génération de fichiers statiques dans `/out`
- **Déploiement** : FTP automatisé vers serveur de production
- **Environnements** : Auto-détection DEV/PROD via hostname

## 🏗️ Configuration Export Statique

### next.config.ts - Configuration Production

```typescript
const nextConfig: NextConfig = {
  // Export statique pour déploiement FTP
  output: 'export',

  // Optimisations pour pages publiques
  trailingSlash: false,

  // Images non-optimisées (requis pour export statique)
  images: {
    unoptimized: true,
  },

  // Lint et TypeScript selon contexte
  eslint: {
    ignoreDuringBuilds: true, // Permanent
  },
  typescript: {
    ignoreBuildErrors: false, // true temporairement si erreurs bloquantes
  },
};
```

### 🔧 Commandes de déploiement

```bash
# Déploiement complet (recommandé)
npm run deploy:build    # Build + déploiement forcé

# Autres commandes
npm run deploy:verbose  # Mode diagnostic
npm run deploy:force    # Re-upload complet sans build
npm run deploy          # Déploiement simple
```

## 🌐 Gestion des Environnements

### Configuration automatique API

```typescript
// lib/api-config.ts
const detectEnvironment = () => {
  const hostname = window.location.hostname;

  // Déclencheurs développement
  const devTriggers = [
    'localhost', '127.0.0.1', '192.168.',
    '.local', 'ngrok', 'vercel.app'
  ];

  return devTriggers.some(trigger =>
    hostname.includes(trigger)
  ) ? 'development' : 'production';
};

// APIs selon environnement
const config = {
  development: {
    baseUrl: 'https://api.icelabsoft.com/api/psql_request/api/psql_request',
    timeout: 30000
  },
  production: {
    baseUrl: 'https://api.icelabsoft.com/api/psql_request/api/psql_request',
    timeout: 30000
  }
};
```

### 📍 URLs et domaines

| Environnement | URL | API | Usage |
|---------------|-----|-----|-------|
| **Développement** | `http://localhost:3000` | API Prod | Tests locaux |
| **Production** | `https://v2.fayclick.net` | API Prod | Site live |

## 🔄 Architecture Pages Publiques vs Privées

### ConditionalAuthProvider

```typescript
// components/providers/ConditionalAuthProvider.tsx
const publicPages = [
  '/facture',      // Factures publiques avec token
  '/fay',          // Alias factures courtes
];

const isPublicPage = publicPages.some(publicPath =>
  pathname.startsWith(publicPath)
);

// Pages publiques : Pas d'AuthProvider
// Pages privées : AuthProvider complet
```

### 🎫 Système de factures publiques

#### Format URLs factures
```
https://v2.fayclick.net/facture?token=ODktMzIz
```

#### Validation token
```typescript
// Validation ajustée
if (!token || token.length < 6) {
  notFound();
}
```

#### Token encoding/decoding
```typescript
// lib/url-encoder.ts
export function encodeFactureParams(id_structure: number, id_facture: number): string {
  const dataToEncode = `${id_structure}-${id_facture}`;
  return btoa(dataToEncode)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

## ⚙️ Configuration Apache (.htaccess)

### Règles de réécriture pour factures publiques

```apache
# Configuration Apache pour FayClick V2
RewriteEngine On

# IMPORTANT: Gestion des factures avec token
# Redirection des URLs /fay/XXX vers /facture?token=XXX
RewriteRule ^fay/(.+)$ /facture?token=$1 [L,QSA,R=301]

# Si on accède à /facture avec un token, servir facture.html
RewriteCond %{REQUEST_URI} ^/facture$
RewriteCond %{QUERY_STRING} token=([^&]+)
RewriteRule ^facture$ /facture.html [L,QSA]

# Routes standard
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^/]+)/?$ /$1.html [L]

# Page 404 personnalisée
ErrorDocument 404 /404.html
```

## 🔍 Processus de Build Propre

### 1. Validation et nettoyage pré-build
```bash
# Vérification Node.js et npm
node --version  # Requis: v20.16.0+
npm --version   # Recommandé: v10.8.1+

# Nettoyage complet des caches
rm -rf .next
rm -f tsconfig.tsbuildinfo
rm -f nul
npm cache clean --force
```

### 2. Résolution problèmes SSL/Certificats
En cas d'erreur `UNABLE_TO_VERIFY_LEAF_SIGNATURE` :

#### Solution 1 - Configuration npm (RECOMMANDÉE)
```bash
# Désactiver temporairement la vérification SSL
npm config set strict-ssl false

# Tester le build
npm run build

# ⚠️ OBLIGATOIRE : Restaurer la sécurité après
npm config set strict-ssl true
npm config set registry https://registry.npmjs.org/
```

#### Solution 2 - Variable d'environnement (Windows)
```cmd
# CMD Windows
set NODE_TLS_REJECT_UNAUTHORIZED=0
npm run build
set NODE_TLS_REJECT_UNAUTHORIZED=

# PowerShell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm run build
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED
```

### 3. Gestion des Google Fonts (si échec SSL)
En cas d'échec de téléchargement des fonts :

#### Configuration temporaire dans app/layout.tsx
```typescript
// Commentaire temporaire pour build
// import { Inter, Montserrat } from "next/font/google";

// Fallback système temporaire
const inter = {
  variable: "--font-inter",
};

const montserrat = {
  variable: "--font-montserrat",
};
```

#### Restauration après build réussi
```typescript
// Restaurer après build
import { Inter, Montserrat } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
```

### 4. Build Next.js avec monitoring
```bash
# Build de production
npm run build

# Vérification du build
ls -la .next          # Cache Next.js (310M typique)
ls -la out            # Export statique généré
du -sh .next out      # Tailles des builds
```

### 5. Validation qualité build
```bash
# Vérifier les pages générées
ls out/*.html | wc -l    # Nombre de pages (26 attendu)

# Vérifier les assets critiques
ls out/_next/static/     # Chunks JavaScript
ls out/manifest.json     # PWA manifest
ls out/.htaccess        # Configuration Apache
```

### 3. Structure générée
```
out/
├── _next/              # Assets Next.js
├── facture.html        # Page factures publiques ✅
├── dashboard.html      # Dashboard principal
├── login.html          # Authentification
├── .htaccess          # Configuration Apache
└── [autres pages].html
```

### 4. Déploiement FTP

```javascript
// Configuration FTP
const ftpConfig = {
  host: 'node260-eu.n0c.com',
  port: 21,
  user: 'userv2@fayclick.net',
  localRoot: './out',
  remoteRoot: '/',
  include: ['*', '**/*'],
  deleteRemote: false, // Sécurité
  forcePasv: true
};
```

## ✅ Checklist de Déploiement

### Pré-déploiement
- [ ] Code testé localement
- [ ] Pages publiques fonctionnelles : `/facture?token=XXX`
- [ ] Pages privées avec authentification
- [ ] Build sans erreurs TypeScript critiques
- [ ] Configuration environnement correcte

### Post-déploiement
- [ ] Site accessible : `https://v2.fayclick.net`
- [ ] Factures publiques : `https://v2.fayclick.net/facture?token=ODktMzIz`
- [ ] Dashboard authentifié fonctionnel
- [ ] API calls vers environnement correct
- [ ] Performance et chargement optimal

## 🚨 Résolution de Problèmes

### ❌ Erreur SSL : `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
**Cause** : Certificats SSL non vérifiables (proxy entreprise, certificats obsolètes)
**Solutions** :
1. **npm config set strict-ssl false** (recommandé)
2. **NODE_TLS_REJECT_UNAUTHORIZED=0** (variable environnement)
3. **npm config set registry http://registry.npmjs.org/** (HTTP temporaire)
4. ⚠️ **TOUJOURS restaurer sécurité après** : `npm config set strict-ssl true`

### ❌ Échec Google Fonts durant build
**Cause** : SSL bloque téléchargement fonts depuis Google
**Solution** :
1. Commenter temporairement `import { Inter, Montserrat } from "next/font/google"`
2. Utiliser fallback système pour build
3. Restaurer imports après build réussi
4. Alternative : utiliser fonts locales en production

### ❌ Build qui échoue - Erreurs TypeScript
**Cause** : Erreurs TypeScript bloquantes (`@typescript-eslint/no-explicit-any`, variables non utilisées)
**Solution progressive** :
```typescript
// next.config.ts - Solution temporaire
typescript: {
  ignoreBuildErrors: true, // Uniquement pour débloquer
}

// Solution durable : Correction des erreurs
// - Remplacer `any` par types spécifiques
// - Supprimer variables non utilisées
// - Corriger imports manquants
```

### ❌ Dépendances manquantes durant build
**Cause** : node_modules corrompus ou incomplets
**Solution** :
```bash
# Nettoyage complet
rm -rf node_modules package-lock.json
npm cache clean --force

# Réinstallation propre
npm install

# Si SSL persiste
npm config set strict-ssl false
npm install
npm config set strict-ssl true
```

### ❌ Erreur 404 sur factures publiques
**Cause** : Configuration .htaccess ou validation token
**Solution** :
1. Vérifier `.htaccess` copié dans `/out`
2. Validation token : `token.length < 6`
3. ConditionalAuthProvider appliqué

### ❌ Pages qui chargent AuthContext inutilement
**Cause** : AuthProvider global
**Solution** : ConditionalAuthProvider exclut pages publiques

### ❌ API calls vers mauvais environnement
**Cause** : Détection environnement
**Solution** : Vérifier hostname dans `api-config.ts`

## 📊 Monitoring Post-Déploiement

### URLs de test critiques
```bash
# Site principal
curl -I https://v2.fayclick.net

# Page facture publique
curl -I "https://v2.fayclick.net/facture?token=ODktMzIz"

# Dashboard (doit rediriger vers login)
curl -I https://v2.fayclick.net/dashboard
```

### Performance attendue
- **Chargement initial** : < 2s
- **Assets Next.js** : Mise en cache optimale
- **API responses** : < 500ms (selon réseau Sénégal)

## 🔮 Évolutions Futures

### Optimisations envisagées
- [ ] CDN pour assets statiques
- [ ] Compression Brotli serveur
- [ ] Service Worker PWA avancé
- [ ] Cache API intelligent

### Monitoring avancé
- [ ] Logging déploiement automatisé
- [ ] Alertes échec déploiement
- [ ] Métriques performance temps réel

## 🎯 Checklist Build Propre - Procédure Validée

### 📋 Étapes Build Propre (Ordre Obligatoire)

#### 1. Préparation Environnement
```bash
# Vérifications préalables
node --version && npm --version

# Nettoyage complet
rm -rf .next
rm -f tsconfig.tsbuildinfo
rm -f nul
```

#### 2. Configuration SSL si Problème
```bash
# Si erreur UNABLE_TO_VERIFY_LEAF_SIGNATURE
npm config set strict-ssl false

# Note : Restauration obligatoire après build
```

#### 3. Gestion Google Fonts si Échec
Dans `app/layout.tsx`, remplacer temporairement :
```typescript
// Commenter temporairement
// import { Inter, Montserrat } from "next/font/google";

// Fallback système
const inter = { variable: "--font-inter" };
const montserrat = { variable: "--font-montserrat" };
```

#### 4. Exécution Build
```bash
npm run build
```

#### 5. Validation Build
```bash
# Vérifier taille et contenu
ls -la .next out
du -sh .next  # ~310M attendu

# Compter pages générées
ls out/*.html | wc -l  # 26 pages attendu
```

#### 6. Restauration Sécurité (OBLIGATOIRE)
```bash
# Restaurer SSL
npm config set strict-ssl true
npm config set registry https://registry.npmjs.org/

# Vérifier
npm config list | grep -E "(strict-ssl|registry)"
```

#### 7. Restauration Google Fonts
Dans `app/layout.tsx`, restaurer :
```typescript
import { Inter, Montserrat } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
```

### ✅ Indicateurs Build Réussi
- ✅ **Build terminé** : "Compiled successfully"
- ✅ **Export statique** : Dossier `/out` créé avec 26 pages
- ✅ **Taille acceptable** : .next ~310M, out variable
- ✅ **Assets présents** : manifest.json, .htaccess, service-worker.js
- ✅ **SSL restauré** : strict-ssl = true
- ✅ **Fonts restaurées** : Imports Google Fonts actifs

### 🚨 Points de Vigilance
- ⚠️ **Ne jamais oublier** la restauration SSL après build
- ⚠️ **Toujours vérifier** que les Google Fonts sont restaurées
- ⚠️ **Éviter** d'ignorer les erreurs TypeScript en permanence
- ⚠️ **Tester** les pages critiques après chaque modification

---

## 🎯 Résumé Expert

**FayClick V2** utilise une architecture hybride optimisée :
- **Export statique** pour performance et simplicité déploiement
- **Authentification conditionnelle** pour pages publiques/privées
- **Auto-détection environnement** pour flexibilité DEV/PROD
- **Déploiement FTP automatisé** avec script professionnel

Cette approche garantit **performance, sécurité et maintenabilité** pour le marché sénégalais ciblé.

---

*Guide créé par équipe technique FayClick V2 - Dernière MAJ: 2025-09-28*

---

## 📝 Historique des Mises à Jour

### v2.1 - 2025-09-28
- ✅ **Ajout procédure build propre validée** avec étapes détaillées
- ✅ **Résolution SSL** : Guide complet problèmes certificats
- ✅ **Gestion Google Fonts** : Solutions contournement et restauration
- ✅ **Checklist validation** : Indicateurs build réussi
- ✅ **Points vigilance** : Bonnes pratiques sécurité

### v2.0 - 2025-09-20
- ✅ Guide expert initial
- ✅ Architecture export statique
- ✅ Configuration Apache
- ✅ Processus déploiement FTP