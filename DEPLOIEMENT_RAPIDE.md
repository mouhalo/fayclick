# 🚀 Déploiement Rapide - FayClick V2

**Date**: 1er octobre 2025

---

## ⚡ Déploiement en 3 Étapes

### **Étape 1 : Vérifier la configuration**

Assurez-vous que votre fichier `.env` contient :

```env
# Configuration FTP pour v2.fayclick.net
FTP_HOST=node260-eu.n0c.com
FTP_USER=userv2@fayclick.net
FTP_PASSWORD=votre_mot_de_passe
FTP_PORT=21
FTP_SITE_PATH=/
FTP_SECURE=false
SITE_URL=https://v2.fayclick.net
```

### **Étape 2 : Lancer le déploiement**

```bash
# Option 1 : Build + Déploiement (RECOMMANDÉ)
node deploy.mjs --build --force

# Option 2 : Déploiement uniquement (si déjà buildé)
node deploy.mjs

# Option 3 : Mode verbose (pour debugging)
node deploy.mjs --build --verbose
```

### **Étape 3 : Vérifier le déploiement**

Testez ces URLs :
- ✅ https://v2.fayclick.net
- ✅ https://v2.fayclick.net/dashboard
- ✅ https://v2.fayclick.net/dashboard/commerce/clients

---

## 📋 Checklist Pré-Déploiement

- [ ] Fichier `.env` configuré avec les credentials FTP
- [ ] `next.config.ts` : `output: 'export'` ✅ (déjà fait)
- [ ] Fichier `.htaccess` présent à la racine ✅ (déjà créé)
- [ ] Tests locaux réussis : `npm run dev`
- [ ] Build local réussi : `npm run build`

**Note** : Sur serveur mutualisé, seul `.htaccess` est nécessaire (pas d'accès à la config Apache/Nginx)

---

## 🔧 Résolution de Problèmes

### **Erreur : Variables d'environnement manquantes**

```bash
# Créer le fichier .env à la racine du projet
# Copier le contenu de .env.example
# Remplir avec vos credentials FTP
```

### **Erreur : Dossier /out manquant**

```bash
# Build manuel
npm run build

# Puis déployer
node deploy.mjs
```

### **Erreur : ENOTFOUND / ECONNREFUSED**

- Vérifiez `FTP_HOST` dans `.env`
- Testez la connexion FTP avec FileZilla
- Vérifiez votre connexion internet

### **Erreur : EAUTH (Authentification échouée)**

- Vérifiez `FTP_USER` et `FTP_PASSWORD`
- Testez les credentials avec un client FTP
- Contactez votre hébergeur si nécessaire

---

## 📊 Après le Déploiement

### **Tests Obligatoires**

1. **Page d'accueil**
   ```
   https://v2.fayclick.net
   ```

2. **Dashboard**
   ```
   https://v2.fayclick.net/dashboard
   ```

3. **Navigation**
   - Tester le bouton retour du navigateur
   - Recharger la page (F5)
   - Naviguer entre les sections

4. **Vérifier qu'il n'y a PLUS d'index de répertoire**
   ```
   https://v2.fayclick.net/dashboard/commerce/
   ```
   ✅ Doit afficher l'application, PAS la liste de fichiers

---

## 🎯 Commandes Utiles

```bash
# Voir l'aide complète
node deploy.mjs --help

# Build + Déploiement forcé (recommandé pour premier déploiement)
node deploy.mjs --build --force

# Déploiement avec logs détaillés
node deploy.mjs --build --verbose

# Déploiement rapide (sans rebuild)
node deploy.mjs

# Build local uniquement (sans déploiement)
npm run build

# Test local du build
npm run build && npx serve out
```

---

## 📁 Structure des Fichiers Déployés

```
v2.fayclick.net/
├── .htaccess              # ✅ Configuration Apache (CRITIQUE)
├── index.html             # Page principale
├── _next/                 # Assets Next.js
│   ├── static/           # JS, CSS, fonts
│   └── ...
├── dashboard/             # Routes dashboard
├── facture/              # Routes factures
└── ...                   # Autres routes
```

**⚠️ IMPORTANT** : Le fichier `.htaccess` DOIT être présent à la racine pour éviter l'affichage de l'index de répertoire !

---

## 🔐 Sécurité

### **Fichiers à NE PAS déployer**

- ❌ `.env` (credentials)
- ❌ `.git/` (historique Git)
- ❌ `node_modules/` (dépendances)
- ❌ `.next/` (build Next.js)
- ❌ `*.map` (source maps)

Le script `deploy.mjs` exclut automatiquement ces fichiers.

---

## 📞 Support

**En cas de problème** :

1. Vérifiez les logs du script de déploiement
2. Testez la connexion FTP avec FileZilla
3. Vérifiez les logs Apache sur le serveur
4. Consultez `GUIDE_DEPLOIEMENT.md` pour plus de détails

---

**Bon déploiement ! 🚀**
