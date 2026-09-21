# Mémo de sécurisation — API `sql_jsonpro` (fayclick)

**Exécuté le 2026-09-21** : route Next (`app/api/sql/route.ts`) + injection `RequestHeader` dans le `.htaccess` de prod via `deploy.mjs` (clé lue depuis l'env locale, jamais commitée). Déployé et vérifié sur v2.fayclick.net et fayclick.com. Lire en entier avant toute modification.
**Application :** `fayclick` · **Vague 1 (clé générée le 14/08)** · **Ouvert le :** 2026-08-14
**Réf. plan :** `D:\React_Prj\PLAN_SECURISATION\PLAN-SECURISATION-SQL-JSONPRO.md`

---

## 1. Pourquoi

`POST https://api.icelabsoft.com/api/sql_jsonpro` n'exige aujourd'hui **aucune authentification** :
toute personne connaissant un nom d'`application` (visible dans les bundles JS) peut lire/modifier la
production. Correction = **une clé par application** dans l'en-tête HTTP `X-App-Key`. Cette app est
enrôlée sous l'identifiant **`fayclick`**.

## 2. Le seul changement de code — CÔTÉ PROXY (recommandé)

fayclick passe déjà par un **proxy** : `app/api/sql/route.ts:21` (dev) + reverse proxy `.htaccess`
(`/api/sql → sql_jsonpro`, prod). **Injecter la clé dans le proxy** = elle n'est jamais exposée au
navigateur. C'est la bonne configuration ; ne pas mettre la clé dans le client.

- **Fichier à modifier :** `app/api/sql/route.ts` (le `fetch` sortant vers `sql_jsonpro`, ~ligne 21).

```diff
  const res = await fetch("https://api.icelabsoft.com/api/sql_jsonpro", {
    method: "POST",
-   headers: { "Content-Type": "application/json" },
+   headers: {
+     "Content-Type": "application/json",
+     ...(process.env.SQL_APP_KEY ? { "X-App-Key": process.env.SQL_APP_KEY } : {}),
+   },
    body: /* corps inchangé */,
  });
```

> Si le reverse proxy prod `.htaccess` court-circuite la route Next en production, ajouter aussi
> l'en-tête `X-App-Key` côté serveur web (RequestHeader set) ou basculer le passage par la route Next.

## 3. La clé (JAMAIS en clair dans le dépôt)

- **Format :** `sk_fayclick_<48 hex>`. **Statut : clé générée le 14/08**, disponible côté serveur.
- **La valeur réelle n'est PAS dans ce mémo** : transmise hors dépôt par canal sûr (fichier serveur
  `/root/cles_sql_jsonpro_20260814.txt`, perms 600). La demander à l'admin BDD.
- **Stockage :** variable d'env **serveur** `SQL_APP_KEY` (PAS `NEXT_PUBLIC_*` — la clé ne doit pas
  partir dans le bundle).
- **À faire :**
  - [x] Ajouter `SQL_APP_KEY=` (vide) dans `.env.example`.
  - [x] Mettre la vraie valeur dans `.env` (local) / secret de déploiement (prod).
  - [x] Vérifier que `.env*` est ignoré (`.gitignore` OK, garde `.env.example`).
  - [x] Ne JAMAIS committer la clé (ni log, ni Markdown).

## 4. Comportement obligatoire : clé absente → envoyer sans en-tête

Le serveur est en **tuilage** (il n'exige pas encore la clé). Si `SQL_APP_KEY` est absente, l'appel
part **sans** `X-App-Key` — **ne jamais lever d'exception, ne jamais bloquer**. Sinon on casse le dev
local et l'état non-enrôlé.

## 5. Critères de succès (deux tiers)

**A. Maintenant (serveur en tuilage — non-régression) :**
- [x] Avec la clé : l'appel renvoie toujours `status: success`.
- [x] Sans la clé (var non définie) : l'appel fonctionne toujours (aucune exception).

**B. Après activation serveur (étape 2b, coordination admin `sql_jsonpro`) :**
- [ ] Le journal serveur montre `cle=valide` pour `fayclick`.
- [ ] ⚠️ Seul le serveur peut le confirmer — point de coordination, pas auto-vérifiable ici.

## 6. Rollback

Retirer l'ajout de l'en-tête dans `app/api/sql/route.ts` (le corps est inchangé) et redéployer.

## 7. Rotation

Remplacer la clé périodiquement, et immédiatement en cas de fuite/départ prestataire :
mettre à jour `SQL_APP_KEY` et redéployer.

---

**Préparé le 2026-08-14. Exécution : équipe Dév, session ultérieure. Référent : agent Kader.**
