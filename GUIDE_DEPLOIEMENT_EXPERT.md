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

## 🔍 Processus de Build

### 1. Validation pré-build
```bash
# Vérification Node.js
node --version  # Requis: v20.16.0+

# Nettoyage automatique
rm -rf .next out
```

### 2. Build Next.js
```bash
next build
# Génère les fichiers statiques dans /out
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

### Erreur 404 sur factures publiques
**Cause** : Configuration .htaccess ou validation token
**Solution** :
1. Vérifier `.htaccess` copié dans `/out`
2. Validation token : `token.length < 6`
3. ConditionalAuthProvider appliqué

### Build qui échoue
**Cause** : Erreurs TypeScript bloquantes
**Solution temporaire** :
```typescript
// next.config.ts
typescript: {
  ignoreBuildErrors: true, // Temporaire uniquement
}
```

### Pages qui chargent AuthContext inutilement
**Cause** : AuthProvider global
**Solution** : ConditionalAuthProvider exclut pages publiques

### API calls vers mauvais environnement
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

---

## 🎯 Résumé Expert

**FayClick V2** utilise une architecture hybride optimisée :
- **Export statique** pour performance et simplicité déploiement
- **Authentification conditionnelle** pour pages publiques/privées
- **Auto-détection environnement** pour flexibilité DEV/PROD
- **Déploiement FTP automatisé** avec script professionnel

Cette approche garantit **performance, sécurité et maintenabilité** pour le marché sénégalais ciblé.

---

*Guide créé par équipe technique FayClick V2 - Dernière MAJ: 2025-09-20*