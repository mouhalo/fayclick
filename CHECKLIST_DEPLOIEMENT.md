# ✅ Checklist Déploiement FayClick V2

## 🔍 Pré-déploiement (OBLIGATOIRE)

### Validation du Code
- [ ] **Tests locaux** : `npm run dev` fonctionne sans erreur
- [ ] **Pages publiques** testées : `/facture?token=ODktMzIz`
- [ ] **Pages privées** avec authentification fonctionnelle
- [ ] **ConditionalAuthProvider** : Pas d'AuthContext sur pages publiques
- [ ] **APIs** : Appels vers bon environnement (dev/prod auto-détecté)

### Configuration Build
- [ ] **next.config.ts** : `output: 'export'` activé
- [ ] **TypeScript** : `ignoreBuildErrors: false` (ou `true` temporairement)
- [ ] **Images** : `unoptimized: true` pour export statique
- [ ] **Validation token** : `token.length < 6` pour factures publiques

### Environnement
- [ ] **Node.js** : v20.16.0+ installé
- [ ] **Variables ENV** : Fichiers `.env.local` configurés si nécessaire
- [ ] **Dependencies** : `npm install` à jour

## 🏗️ Processus de Build

### Build Local (Test)
```bash
# 1. Nettoyage (optionnel)
rm -rf .next out

# 2. Build de test
npm run build

# 3. Vérifications
✅ Fichier out/facture.html généré
✅ Fichier out/.htaccess copié
✅ Aucune erreur TypeScript critique
```

### Validation Structure Out/
- [ ] **out/facture.html** : Page factures publiques générée
- [ ] **out/.htaccess** : Configuration Apache présente
- [ ] **out/_next/** : Assets Next.js optimisés
- [ ] **out/dashboard.html** : Pages privées générées
- [ ] **Taille raisonnable** : < 5MB total

## 🚀 Déploiement Production

### Commande Recommandée
```bash
npm run deploy:build
```

### Vérifications Temps Réel
- [ ] **Build réussi** : Aucune erreur compilation
- [ ] **FTP connexion** : `node260-eu.n0c.com:21` accessible
- [ ] **Upload progression** : 100% (≈126 fichiers)
- [ ] **Durée raisonnable** : < 3 minutes

### Logs Attendus
```
✅ Build Next.js terminé avec succès
✅ Build généré: 126 fichiers (X.X MB)
✅ Déploiement FTP terminé
✅ FayClick V2 déployé avec succès !
🌐 Site web: https://v2.fayclick.net
```

## 🧪 Tests Post-Déploiement (CRITIQUE)

### URLs Critiques à Tester

#### 1. Site Principal
```
https://v2.fayclick.net
```
- [ ] **Charge correctement** : Page d'accueil affichée
- [ ] **Design responsive** : Mobile + desktop
- [ ] **Navigation** : Liens fonctionnels

#### 2. Factures Publiques ⭐ PRIORITÉ
```
https://v2.fayclick.net/facture?token=ODktMzIz
```
- [ ] **Page se charge** : Pas de 404
- [ ] **Token décodé** : Affichage facture ou erreur claire
- [ ] **Pas d'AuthContext** : Aucune tentative localStorage
- [ ] **Interface claire** : Boutons paiement visibles

#### 3. Pages Privées
```
https://v2.fayclick.net/dashboard
```
- [ ] **Redirection login** : Si non connecté
- [ ] **Authentification** : Login fonctionne
- [ ] **Dashboard accessible** : Après login

#### 4. Authentification
```
https://v2.fayclick.net/login
```
- [ ] **Formulaire charge** : Interface complète
- [ ] **API login** : Appels vers bonne API
- [ ] **Redirection** : Vers dashboard après login

### Tests API
- [ ] **Environnement** : API production auto-détectée
- [ ] **Calls factures** : `facturePubliqueService.getFacturePublique()`
- [ ] **Calls auth** : Login/logout fonctionnels
- [ ] **Timeouts** : Réponses < 30s

## 🔧 Résolution Problèmes Fréquents

### ❌ Page facture en 404
**Diagnostic :**
```bash
# Vérifier .htaccess déployé
curl -I "https://v2.fayclick.net/facture?token=test"

# Vérifier structure out/
ls -la out/facture.html
ls -la out/.htaccess
```

**Solutions :**
- [ ] Vérifier `.htaccess` dans `/out`
- [ ] Contrôler règles Apache factures
- [ ] Validation token : `< 6` caractères

### ❌ AuthContext sur pages publiques
**Diagnostic :** Console browser : tentatives localStorage

**Solutions :**
- [ ] ConditionalAuthProvider importé dans `layout.tsx`
- [ ] Pages publiques listées : `['/facture', '/fay']`
- [ ] Chemin pathname détecté correctement

### ❌ Build qui échoue
**Solutions temporaires :**
```typescript
// next.config.ts - TEMPORAIRE UNIQUEMENT
typescript: {
  ignoreBuildErrors: true
}
```

**Solutions permanentes :**
- [ ] Corriger erreurs TypeScript
- [ ] Vérifier imports manquants
- [ ] Valider syntaxe JSX/TSX

### ❌ API vers mauvais environnement
**Diagnostic :** Logs console "Configuration API"

**Solutions :**
- [ ] Hostname détection : `localhost` vs `v2.fayclick.net`
- [ ] Variables d'environnement override si nécessaire
- [ ] Cache browser vidé

## 📊 Métriques de Succès

### Performance Attendue
- [ ] **Chargement initial** : < 3s (réseau Sénégal)
- [ ] **Pages factures** : < 2s affichage
- [ ] **APIs** : < 5s réponse standard
- [ ] **Build time** : < 5 minutes

### Taille Optimale
- [ ] **Bundle total** : < 5MB
- [ ] **Page facture** : < 500KB
- [ ] **Assets critiques** : < 1MB

## 🔄 Actions Post-Déploiement

### Validation Finale
- [ ] **Équipe informée** : Déploiement réussi
- [ ] **URLs partagées** : Tests par utilisateurs finaux
- [ ] **Monitoring** : Vérification erreurs 24h

### Documentation
- [ ] **Changelog** : Fonctionnalités déployées
- [ ] **Known issues** : Problèmes temporaires documentés
- [ ] **Rollback plan** : Procédure retour arrière si nécessaire

## 🆘 Plan d'Urgence (Rollback)

### Si Déploiement Échoue
```bash
# 1. Retour version précédente (git)
git log --oneline -5
git checkout <commit-stable>

# 2. Re-déploiement version stable
npm run deploy:build

# 3. Validation critique
curl -I https://v2.fayclick.net
curl -I "https://v2.fayclick.net/facture?token=ODktMzIz"
```

### Contacts Urgence
- **Hébergeur** : Support technique si serveur inaccessible
- **DNS** : Vérification domaine `v2.fayclick.net`
- **Équipe** : Communication problème critique

---

## 🎯 Résumé Checklist

**AVANT déploiement :**
1. ✅ Tests locaux complets
2. ✅ Configuration export statique
3. ✅ ConditionalAuthProvider validé

**PENDANT déploiement :**
4. ✅ `npm run deploy:build`
5. ✅ Upload 100% réussi

**APRÈS déploiement :**
6. ✅ Tests URLs critiques
7. ✅ Factures publiques fonctionnelles
8. ✅ Performance acceptable

---

*Checklist validée sur déploiement 2025-09-20 - FayClick V2 Production*