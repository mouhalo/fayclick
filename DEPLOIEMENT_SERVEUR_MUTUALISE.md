# 🚀 Déploiement sur Serveur Mutualisé - FayClick V2

**Type de serveur** : Hébergement mutualisé (Apache)  
**Domaine** : v2.fayclick.net  
**Date** : 1er octobre 2025

---

## ✅ Prérequis

Sur un serveur mutualisé, vous avez :
- ✅ Accès FTP/SFTP
- ✅ Possibilité de créer/modifier `.htaccess`
- ❌ PAS d'accès SSH
- ❌ PAS d'accès aux fichiers de config Apache/Nginx

**C'est parfait !** Le fichier `.htaccess` suffit pour tout configurer.

---

## 🎯 Déploiement en 3 Commandes

### **1. Build de l'application**

```bash
npm run build
```

✅ Cela génère le dossier `out/` avec tous les fichiers statiques

### **2. Déploiement automatique**

```bash
node deploy.mjs --build --force
```

✅ Le script :
- Build l'application
- Copie automatiquement `.htaccess` dans `out/`
- Upload tout vers le serveur via FTP
- Affiche un résumé du déploiement

### **3. Vérification**

Ouvrez votre navigateur :
```
https://v2.fayclick.net
```

✅ L'application doit se charger correctement (plus d'index de répertoire !)

---

## 📁 Fichiers Critiques

### **1. `.htaccess` (DÉJÀ CRÉÉ ✅)**

Ce fichier est **ESSENTIEL** et fait 3 choses :

```apache
# 1. Désactive l'affichage de l'index de répertoire
Options -Indexes

# 2. Redirige toutes les routes vers index.html (SPA)
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]

# 3. Configure le cache et la sécurité
# (compression, headers de sécurité, etc.)
```

**Emplacement** : À la racine de `v2.fayclick.net/`

### **2. `next.config.ts` (DÉJÀ CONFIGURÉ ✅)**

```typescript
output: 'export', // Génération statique pour serveur mutualisé
```

---

## 🔧 Configuration FTP

Créez/modifiez le fichier `.env` à la racine :

```env
# Configuration FTP pour v2.fayclick.net
FTP_HOST=node260-eu.n0c.com
FTP_USER=userv2@fayclick.net
FTP_PASSWORD=votre_mot_de_passe_ici
FTP_PORT=21
FTP_SITE_PATH=/
FTP_SECURE=false
SITE_URL=https://v2.fayclick.net
```

**⚠️ IMPORTANT** : Ne commitez JAMAIS le fichier `.env` sur Git !

---

## 📊 Structure Finale sur le Serveur

```
v2.fayclick.net/
├── .htaccess              ⭐ CRITIQUE - Empêche l'index de répertoire
├── index.html             📄 Page principale
├── 404.html               📄 Page d'erreur
├── _next/                 📁 Assets Next.js
│   └── static/
│       ├── chunks/        📦 JavaScript
│       ├── css/           🎨 Styles
│       └── media/         🖼️ Images
├── dashboard/             📁 Routes dashboard
│   ├── index.html
│   └── commerce/
│       ├── index.html
│       ├── clients/
│       │   └── index.html
│       ├── factures/
│       │   └── index.html
│       └── produits/
│           └── index.html
└── facture/               📁 Routes factures publiques
    └── index.html
```

---

## ✅ Tests Post-Déploiement

### **Test 1 : Page d'accueil**
```
https://v2.fayclick.net
```
✅ Doit afficher l'application

### **Test 2 : Dashboard**
```
https://v2.fayclick.net/dashboard
```
✅ Doit rediriger vers login si non authentifié

### **Test 3 : Routes spécifiques**
```
https://v2.fayclick.net/dashboard/commerce/clients
```
✅ Doit afficher l'application (PAS l'index de répertoire)

### **Test 4 : Rechargement de page**
- Naviguez vers une page
- Appuyez sur F5
- ✅ La page doit se recharger correctement (pas d'erreur 404)

### **Test 5 : Bouton retour**
- Naviguez entre plusieurs pages
- Utilisez le bouton retour du navigateur
- ✅ La navigation doit fonctionner correctement

---

## 🐛 Résolution de Problèmes

### **Problème : Index de répertoire toujours visible**

**Cause** : Le fichier `.htaccess` n'est pas uploadé ou pas lu par Apache

**Solutions** :
1. Vérifiez que `.htaccess` est bien à la racine de `v2.fayclick.net/`
2. Vérifiez les permissions : `chmod 644 .htaccess`
3. Vérifiez que le fichier n'est pas renommé (ex: `htaccess.txt`)
4. Contactez votre hébergeur pour vérifier que `AllowOverride All` est activé

### **Problème : Erreur 404 sur les routes**

**Cause** : La redirection vers `index.html` ne fonctionne pas

**Solution** :
```apache
# Ajoutez ceci dans .htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ /index.html [L,QSA]
</IfModule>
```

### **Problème : CSS/JS ne se chargent pas**

**Cause** : Chemins incorrects ou fichiers manquants

**Solutions** :
1. Vérifiez que le dossier `_next/` est bien uploadé
2. Vérifiez les permissions : `chmod 755` pour les dossiers
3. Vérifiez la console du navigateur pour voir les erreurs

### **Problème : Déploiement FTP échoue**

**Solutions** :
1. Testez la connexion avec FileZilla
2. Vérifiez les credentials dans `.env`
3. Vérifiez que le serveur FTP est accessible
4. Essayez en mode passif : `FTP_PASSIVE=true`

---

## 🎯 Commandes de Déploiement

### **Déploiement complet (recommandé)**
```bash
node deploy.mjs --build --force
```
- Build l'application
- Upload tous les fichiers
- Remplace les fichiers existants

### **Déploiement rapide (fichiers modifiés uniquement)**
```bash
node deploy.mjs --build
```
- Build l'application
- Upload seulement les fichiers modifiés

### **Déploiement avec logs détaillés**
```bash
node deploy.mjs --build --verbose
```
- Affiche tous les détails du déploiement
- Utile pour le debugging

### **Build local uniquement (sans déploiement)**
```bash
npm run build
```
- Génère le dossier `out/`
- Permet de vérifier le build avant déploiement

---

## 📦 Déploiement Manuel (Alternative)

Si le script automatique ne fonctionne pas :

### **Étape 1 : Build**
```bash
npm run build
```

### **Étape 2 : Copier .htaccess**
```bash
copy .htaccess out\.htaccess
```

### **Étape 3 : Upload via FTP**
1. Ouvrez FileZilla (ou votre client FTP préféré)
2. Connectez-vous avec vos credentials
3. Uploadez TOUT le contenu du dossier `out/` vers la racine de `v2.fayclick.net/`
4. Assurez-vous que `.htaccess` est bien uploadé

---

## 🔐 Sécurité

### **Headers de sécurité (déjà dans .htaccess)**

```apache
# Protection XSS
Header set X-XSS-Protection "1; mode=block"

# Protection clickjacking
Header set X-Frame-Options "SAMEORIGIN"

# Protection MIME sniffing
Header set X-Content-Type-Options "nosniff"
```

### **Fichiers sensibles protégés**

```apache
# Bloquer l'accès aux fichiers sensibles
<FilesMatch "\.(env|log|md|git)$">
  Order allow,deny
  Deny from all
</FilesMatch>
```

---

## 📞 Support Hébergeur

Si vous rencontrez des problèmes avec `.htaccess` :

**Questions à poser à votre hébergeur** :
1. Est-ce que `mod_rewrite` est activé ?
2. Est-ce que `AllowOverride All` est configuré ?
3. Quelle version d'Apache utilisez-vous ?
4. Y a-t-il des restrictions sur les directives `.htaccess` ?

---

## ✨ Résumé

### **Ce qui est FAIT ✅**
- ✅ Configuration `next.config.ts` : `output: 'export'`
- ✅ Fichier `.htaccess` créé et configuré
- ✅ Script de déploiement automatique `deploy.mjs`
- ✅ Protection contre l'index de répertoire
- ✅ Redirection SPA vers `index.html`
- ✅ Headers de sécurité
- ✅ Compression et cache

### **Ce qu'il vous reste à faire 📋**
1. Configurer le fichier `.env` avec vos credentials FTP
2. Lancer `node deploy.mjs --build --force`
3. Tester les URLs sur v2.fayclick.net
4. Vérifier qu'il n'y a plus d'index de répertoire

---

**Bon déploiement ! 🚀**

*Pour plus de détails, consultez `DEPLOIEMENT_RAPIDE.md`*
