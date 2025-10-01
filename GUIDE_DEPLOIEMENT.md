# 🚀 Guide de Déploiement - FayClick V2

**Problème identifié** : Affichage de l'index de répertoire au lieu de l'application

---

## 🔍 Diagnostic du Problème

### **Symptômes**
- Navigation vers `/dashboard/commerce/` affiche un index de fichiers
- Liste visible : `clients.html`, `factures.html`, `produits.html`
- L'application ne se charge pas correctement

### **Cause**
Le serveur web (Apache/Nginx) n'est pas configuré pour :
1. Désactiver l'affichage de l'index de répertoire
2. Rediriger toutes les routes vers `index.html` (SPA)
3. Servir correctement l'application Next.js

---

## ✅ Solutions par Type de Serveur

### **Option 1 : Apache (.htaccess)**

#### Étape 1 : Copier le fichier .htaccess
```bash
# Le fichier .htaccess est déjà créé à la racine du projet
# Assurez-vous qu'il est bien uploadé sur le serveur
```

#### Étape 2 : Vérifier la configuration Apache
```bash
# Sur le serveur, vérifier que mod_rewrite est activé
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod deflate
sudo a2enmod expires

# Redémarrer Apache
sudo systemctl restart apache2
```

#### Étape 3 : Configuration VirtualHost
```apache
<VirtualHost *:80>
    ServerName v2.fayclick.net
    DocumentRoot /var/www/fayclick/out
    
    <Directory /var/www/fayclick/out>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/fayclick-error.log
    CustomLog ${APACHE_LOG_DIR}/fayclick-access.log combined
</VirtualHost>
```

### **Option 2 : Nginx**

#### Étape 1 : Copier la configuration
```bash
# Copier nginx.conf vers /etc/nginx/sites-available/
sudo cp nginx.conf /etc/nginx/sites-available/fayclick

# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/fayclick /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

---

## 📦 Processus de Build et Déploiement

### **Méthode 1 : Build Statique (Recommandé pour Apache/Nginx)**

#### Étape 1 : Modifier next.config.ts
```typescript
const nextConfig: NextConfig = {
  output: 'export', // ⚠️ Changer de 'standalone' à 'export'
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // ... reste de la config
};
```

#### Étape 2 : Build l'application
```bash
# Installer les dépendances
npm install

# Build pour production
npm run build

# Le dossier 'out' contient les fichiers statiques
```

#### Étape 3 : Déployer
```bash
# Copier le contenu de 'out' vers le serveur
scp -r out/* user@server:/var/www/fayclick/out/

# Ou via FTP/SFTP
# Uploader tout le contenu du dossier 'out' vers /var/www/fayclick/out/
```

### **Méthode 2 : Mode Standalone (Pour serveur Node.js)**

#### Étape 1 : Garder next.config.ts actuel
```typescript
const nextConfig: NextConfig = {
  output: 'standalone', // Garder standalone
  // ... reste de la config
};
```

#### Étape 2 : Build et déployer
```bash
# Build
npm run build

# Copier les fichiers vers le serveur
scp -r .next/standalone/* user@server:/var/www/fayclick/
scp -r .next/static user@server:/var/www/fayclick/.next/
scp -r public user@server:/var/www/fayclick/

# Sur le serveur, démarrer avec PM2
pm2 start server.js --name fayclick
pm2 save
pm2 startup
```

---

## 🔧 Corrections Immédiates

### **Solution Rapide (Sans redéploiement)**

Si vous ne pouvez pas redéployer immédiatement, ajoutez ceci dans le fichier `.htaccess` à la racine :

```apache
# URGENT : Désactiver l'index de répertoire
Options -Indexes

# Rediriger vers index.html
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ /index.html [L,QSA]
</IfModule>
```

### **Vérification**

1. **Tester l'accès** : `https://v2.fayclick.net/dashboard/commerce/`
2. **Vérifier les logs** :
   ```bash
   # Apache
   tail -f /var/log/apache2/fayclick-error.log
   
   # Nginx
   tail -f /var/log/nginx/fayclick-error.log
   ```

---

## 📋 Checklist de Déploiement

### **Avant le déploiement**
- [ ] Corriger les erreurs TypeScript (`ignoreBuildErrors: false`)
- [ ] Corriger les erreurs ESLint (`ignoreDuringBuilds: false`)
- [ ] Tester le build localement (`npm run build`)
- [ ] Vérifier que `out/index.html` existe

### **Configuration serveur**
- [ ] `.htaccess` uploadé (Apache) OU `nginx.conf` configuré (Nginx)
- [ ] `Options -Indexes` activé
- [ ] Redirection vers `index.html` configurée
- [ ] Modules Apache activés (mod_rewrite, mod_headers)

### **Après le déploiement**
- [ ] Tester toutes les routes principales
- [ ] Vérifier le rechargement de page (F5)
- [ ] Tester la navigation retour
- [ ] Vérifier les logs d'erreur

---

## 🐛 Debugging

### **Problème : Index de répertoire toujours visible**

**Solution 1** : Vérifier AllowOverride
```apache
# Dans VirtualHost
<Directory /var/www/fayclick/out>
    AllowOverride All  # ⚠️ IMPORTANT
</Directory>
```

**Solution 2** : Vérifier les permissions
```bash
# Sur le serveur
chmod 644 .htaccess
chmod 755 /var/www/fayclick/out
```

**Solution 3** : Vérifier mod_rewrite
```bash
# Apache
sudo a2enmod rewrite
sudo systemctl restart apache2

# Nginx
# Pas de module nécessaire, vérifier la config
sudo nginx -t
```

### **Problème : Routes 404**

**Cause** : La redirection vers `index.html` ne fonctionne pas

**Solution** :
```apache
# .htaccess
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]
```

### **Problème : CSS/JS ne se chargent pas**

**Cause** : Chemins incorrects

**Solution** :
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  basePath: '', // Pas de basePath si à la racine
  assetPrefix: '', // Ou l'URL complète si CDN
};
```

---

## 🚀 Script de Déploiement Automatique

Créez `deploy.sh` :

```bash
#!/bin/bash

echo "🚀 Déploiement FayClick V2"

# Build
echo "📦 Build de l'application..."
npm run build

# Vérifier que le build a réussi
if [ ! -d "out" ]; then
  echo "❌ Erreur : Le dossier 'out' n'existe pas"
  exit 1
fi

# Copier vers le serveur
echo "📤 Upload vers le serveur..."
rsync -avz --delete out/ user@server:/var/www/fayclick/out/

# Copier .htaccess
rsync -avz .htaccess user@server:/var/www/fayclick/out/

echo "✅ Déploiement terminé !"
echo "🔗 URL : https://v2.fayclick.net"
```

Utilisation :
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📞 Support

**En cas de problème persistant** :

1. **Vérifier les logs serveur**
2. **Tester en local** : `npm run build && npx serve out`
3. **Vérifier la configuration DNS**
4. **Contacter l'hébergeur** si problème de configuration serveur

---

## 🔐 Sécurité

### **Headers de sécurité** (déjà dans .htaccess)
- ✅ `X-Frame-Options: SAMEORIGIN`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-XSS-Protection: 1; mode=block`

### **HTTPS** (Recommandé)
```bash
# Installer Certbot
sudo apt install certbot python3-certbot-apache

# Obtenir un certificat SSL
sudo certbot --apache -d v2.fayclick.net
```

---

**Auteur** : Cascade AI  
**Date** : 1er octobre 2025  
**Version** : 1.0
