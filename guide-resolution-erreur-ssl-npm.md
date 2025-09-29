# Guide de résolution : Erreur SSL npm lors du déploiement

## 🚨 Problème rencontré

Vous obtenez cette erreur lors du déploiement :

```
npm error code UNABLE_TO_VERIFY_LEAF_SIGNATURE
npm error errno UNABLE_TO_VERIFY_LEAF_SIGNATURE
npm error request to https://registry.npmjs.org/next failed, reason: unable to verify the first certificate
```

## 🎯 Objectif

Ce guide vous permettra de résoudre rapidement cette erreur de certificat SSL et de reprendre votre déploiement.

---

## 📋 Solutions à tester (dans l'ordre)

### ✅ Solution 1 : Désactiver la vérification SSL stricte (RECOMMANDÉE)

**Étape 1 :** Ouvrez votre terminal/invite de commande dans le répertoire de votre projet

**Étape 2 :** Exécutez cette commande :
```bash
npm config set strict-ssl false
```

**Étape 3 :** Relancez votre commande de déploiement :
```bash
npm exec next lint
# ou votre commande spécifique
```

**Étape 4 :** Si cela fonctionne, passez à la section "Rétablir la sécurité"

---

### ✅ Solution 2 : Variable d'environnement (si Solution 1 échoue)

#### Pour Windows Command Prompt (CMD) :
```cmd
set NODE_TLS_REJECT_UNAUTHORIZED=0
npm exec next lint
```

#### Pour Windows PowerShell :
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm exec next lint
```

#### Pour macOS/Linux (Terminal) :
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npm exec next lint
```

---

### ✅ Solution 3 : Changer vers registre HTTP (si Solutions 1-2 échouent)

**Étape 1 :** Changer temporairement vers HTTP :
```bash
npm config set registry http://registry.npmjs.org/
```

**Étape 2 :** Relancer votre commande :
```bash
npm exec next lint
```

---

### ✅ Solution 4 : Nettoyer le cache npm (en dernier recours)

**Étape 1 :** Nettoyer le cache :
```bash
npm cache clean --force
```

**Étape 2 :** Essayer une des solutions précédentes

---

## 🔒 IMPORTANT : Rétablir la sécurité après résolution

⚠️ **OBLIGATOIRE** : Une fois votre déploiement terminé avec succès, vous DEVEZ rétablir les paramètres de sécurité :

### Commandes de restauration :

```bash
# 1. Rétablir la vérification SSL
npm config set strict-ssl true

# 2. Rétablir le registre HTTPS sécurisé
npm config set registry https://registry.npmjs.org/
```

### Supprimer la variable d'environnement (si utilisée) :

#### Windows CMD :
```cmd
set NODE_TLS_REJECT_UNAUTHORIZED=
```

#### Windows PowerShell :
```powershell
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED
```

#### macOS/Linux :
```bash
unset NODE_TLS_REJECT_UNAUTHORIZED
```

---

## 🔍 Vérification que tout est rétabli

Exécutez cette commande pour vérifier vos paramètres npm :
```bash
npm config list
```

Vous devriez voir :
- `strict-ssl = true`
- `registry = "https://registry.npmjs.org/"`

---

## 📝 Procédure complète étape par étape

### Phase 1 : Résolution du problème
1. ✅ Ouvrir le terminal dans le répertoire du projet
2. ✅ Exécuter `npm config set strict-ssl false`
3. ✅ Relancer la commande de déploiement
4. ✅ Si ça marche → passer à Phase 2
5. ✅ Si ça ne marche pas → essayer Solution 2, puis 3, puis 4

### Phase 2 : Restauration de la sécurité (OBLIGATOIRE)
1. ✅ Exécuter `npm config set strict-ssl true`
2. ✅ Exécuter `npm config set registry https://registry.npmjs.org/`
3. ✅ Supprimer la variable d'environnement si utilisée
4. ✅ Vérifier avec `npm config list`

---

## 🆘 En cas de problème persistant

Si aucune solution ne fonctionne :

1. **Vérifiez votre connexion internet**
2. **Essayez depuis un autre réseau** (parfois les proxies d'entreprise causent ce problème)
3. **Contactez l'administrateur système** si vous êtes en environnement d'entreprise
4. **Tentez de mettre à jour npm** :
   ```bash
   npm install -g npm@latest
   ```

---

## ⚠️ Notes de sécurité importantes

- 🔴 **Ces solutions désactivent temporairement la vérification des certificats SSL**
- 🔴 **Ne jamais laisser ces paramètres en production**
- 🔴 **Toujours rétablir la sécurité après usage**
- 🔴 **Utilisez uniquement en cas de blocage du déploiement**

---

## 💡 Pourquoi cette erreur arrive-t-elle ?

Cette erreur survient généralement quand :
- Le serveur npm ne fournit pas une chaîne de certificats complète
- Vous êtes derrière un proxy d'entreprise qui intercepte les connexions SSL
- Les certificats du système sont obsolètes ou corrompus

---

## 📞 Support

Si vous continuez à avoir des problèmes après avoir suivi ce guide :
1. Documentez les étapes que vous avez essayées
2. Incluez les messages d'erreur complets
3. Contactez l'équipe technique avec ces informations

---

*Dernière mise à jour : $(date)*
*Ce guide est destiné à un usage temporaire pour débloquer les déploiements*