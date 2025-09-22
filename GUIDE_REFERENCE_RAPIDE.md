# 🚀 Guide de Référence Rapide - FayClick V2

## 📌 Commandes Essentielles

### Développement
```bash
npm run dev                  # Serveur de développement port 3000
npm run build               # Build local pour tests
npm run lint                # Vérification ESLint
```

### Déploiement Production
```bash
npm run deploy:build        # ⭐ RECOMMANDÉ: Build + déploiement complet
npm run deploy:verbose      # Build + déploiement avec logs détaillés
npm run deploy              # Déploiement seul (sans build)
npm run deploy:force        # Re-upload complet forcé
```

## 🌐 URLs Critiques

| Environnement | URL | Usage |
|---------------|-----|-------|
| **Local** | `http://localhost:3000` | Développement |
| **Production** | `https://v2.fayclick.net` | Site live |
| **Factures publiques** | `https://v2.fayclick.net/facture?token=XXX` | Liens clients |
| **Dashboard** | `https://v2.fayclick.net/dashboard` | Interface privée |

## ⚡ Tests Post-Déploiement (5 min)

### 1. Site Principal ✅
```bash
curl -I https://v2.fayclick.net
# Attendu: HTTP/1.1 200 OK
```

### 2. Factures Publiques ⭐ PRIORITÉ
```bash
# Test en browser:
https://v2.fayclick.net/facture?token=ODktMzIz
```
- [ ] Page se charge (pas de 404)
- [ ] Interface facture affichée
- [ ] Pas d'erreur AuthContext

### 3. Dashboard Privé
```bash
# Test en browser:
https://v2.fayclick.net/dashboard
```
- [ ] Redirection vers /login si non connecté
- [ ] Login fonctionne
- [ ] Dashboard accessible après auth

## 🔧 Configuration Clés

### next.config.ts
```typescript
output: 'export',           // Export statique obligatoire
images: { unoptimized: true },
typescript: { ignoreBuildErrors: true } // Temporaire si erreurs
```

### ConditionalAuthProvider
```typescript
// Pages publiques (SANS authentification)
const publicPages = ['/facture', '/fay'];
```

### .htaccess Apache
```apache
# Factures avec token
RewriteRule ^fay/(.+)$ /facture?token=$1 [L,QSA,R=301]
RewriteRule ^facture$ /facture.html [L,QSA]
```

## 🚨 Problèmes Fréquents

### ❌ Facture 404
**Cause**: Token ou .htaccess
**Fix rapide**:
1. Vérifier token ≥ 6 caractères
2. Contrôler `.htaccess` dans `/out`
3. ConditionalAuthProvider actif

### ❌ Build échoue
**Fix temporaire**:
```typescript
// next.config.ts
typescript: { ignoreBuildErrors: true }
```

### ❌ AuthContext sur pages publiques
**Fix**: ConditionalAuthProvider exclu `/facture`

## 📊 Structure Export (/out)

```
out/
├── facture.html           # ⭐ Pages factures publiques
├── dashboard.html         # Dashboard principal
├── login.html            # Authentification
├── .htaccess             # ⭐ Configuration Apache
└── _next/                # Assets optimisés
```

## 🎯 Checklist Express (2 min)

**Avant déploiement:**
- [ ] `npm run dev` fonctionne
- [ ] Pages factures testées localement
- [ ] ConditionalAuthProvider validé

**Déploiement:**
- [ ] `npm run deploy:build`
- [ ] Upload 100% réussi

**Après déploiement:**
- [ ] `https://v2.fayclick.net` accessible
- [ ] `https://v2.fayclick.net/facture?token=ODktMzIz` fonctionne
- [ ] Dashboard authentification OK

## 📞 Support Urgence

### Rollback Rapide
```bash
git log --oneline -5        # Voir commits
git checkout <commit-stable>
npm run deploy:build        # Re-déployer version stable
```

### Validation Site Live
```bash
curl -I https://v2.fayclick.net
curl -I "https://v2.fayclick.net/facture?token=ODktMzIz"
```

---

**⚡ En cas de problème**: Consulter `TROUBLESHOOTING.md` ou `CHECKLIST_DEPLOIEMENT.md` pour diagnostics détaillés.

*Guide créé le 2025-09-20 - FayClick V2 Production*