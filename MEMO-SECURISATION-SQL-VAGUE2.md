# Mémo de sécurisation — API `/api/sql` → `sql_jsonpro` · VAGUE 2 (isolation utilisateur)

**Statut : À EXÉCUTER** · Préparé le 2026-10-26 · Branche front : `refonte-v3`
**Destinataires :** `Kader_backend` (sql_jsonpro / api.icelabsoft.com) + équipe Dév front
**Fait suite à :** `MEMO-SECURISATION-SQL-JSONPRO.md` (Vague 1 — clé `X-App-Key`, déjà déployée)
**À lire en entier avant toute modification.**

---

## 0. Résumé en une phrase

La Vague 1 authentifie l'**application** auprès de `sql_jsonpro` ; elle n'empêche **pas** un visiteur
d'envoyer du **SQL arbitraire** via notre propre proxy `/api/sql`, ni de lire les données de **toutes**
les structures. La Vague 2 ferme ça : **JWT utilisateur signé serveur + `id_structure` dérivé du token +
fin du SQL libre (liste blanche de fonctions paramétrées)**.

---

## 1. Pourquoi (constats vérifiés dans le code, 2026-10-26)

- `app/api/sql/route.ts` ne valide que la présence de `body.query` puis transmet **n'importe quelle
  requête SQL** à `https://api.icelabsoft.com/api/sql_jsonpro`. Aucune vérification d'identité.
- `services/database.service.ts` est le **goulot unique** côté front : tout (auth, dashboard, clients,
  produits, marketplace, factures…) passe par `query()` / `executeFunction()`, qui **concatènent du SQL
  brut** (échappement maison `replace(/'/g,"''")`, et **aucun** échappement sur l'interpolation
  numérique, ex. `get_mes_droits(${id_structure}, ${id_profil})`).
- Le `id_structure` est **fourni par le client** dans la requête → l'isolation des données repose sur la
  bonne foi du navigateur.
- **Le « token » n'est pas un vrai JWT.** `auth.service.ts > generateSessionToken()` (≈ l.491-510) :
  dev = `btoa(JSON.stringify(user))` (falsifiable), prod = `SecurityService.encrypt()` **côté client**
  (clé dans le bundle). Il est **généré par le client**, non signé serveur, et **jamais envoyé** (aucun
  header `Authorization`).
- **Fuite publique** : au chargement de la landing, `services/catalogues-public.service.ts` exécute
  `SELECT ... FROM list_structures` **sans authentification** et renvoie les **1706 structures avec leur
  `mobile_om`**.

### ⚠️ Fait d'architecture décisif
Le front est en **export statique** (`next.config.mjs : output: 'export'`). En **prod**, `route.ts`
**ne s'exécute pas** — c'est le reverse proxy `.htaccess` qui route `/api/sql → sql_jsonpro`.
**Conséquence : toute protection mise dans le Next ou le navigateur est contournable par un simple
`curl`.** La barrière réelle DOIT vivre dans **`sql_jsonpro`** (et le proxy). Le refactor front est
nécessaire (defense-in-depth + câblage du token) mais **non porteur** à lui seul.

---

## 2. Cible d'architecture

Passer `sql_jsonpro` du mode « exécute une `query` libre » au mode **RPC à liste blanche** :

1. **JWT signé serveur** (secret serveur only, HS256/RS256), claims :
   `{ id_utilisateur, id_structure, id_profil, exp }`. Émis au login par `check_user_credentials`
   (ou un endpoint `/login` dédié).
2. **La requête nomme une fonction + des paramètres typés** : `{ fn, params }` — **plus de SQL libre**.
   Le serveur mappe `fn` vers un `SELECT fn($1,$2,…)` **paramétré** si `fn` ∈ liste blanche, sinon **403**.
3. **`id_structure` dérivé du JWT**, injecté **par le serveur** dans l'appel. Jamais pris du payload.
4. **Contrôle de droits** : pour les fonctions sensibles, vérifier `id_profil`/droits du token
   (un CAISSIER ne doit pas pouvoir appeler une fonction admin).
5. **Allowlist publique** (sans token) réduite au strict nécessaire ; tout le reste → **401** sans token.

---

## 3. TÂCHES BACKEND — `Kader_backend` (sql_jsonpro / api.icelabsoft.com) · PORTEUR

### 3.0 — Émettre un vrai JWT (PRÉREQUIS BLOQUANT)
- `check_user_credentials` (ou `/login`) renvoie un **JWT signé serveur**, claims
  `{ id_utilisateur, id_structure, id_profil, exp }`, TTL raisonnable (ex. 8-24 h).
- Secret de signature **côté serveur uniquement** (jamais dans le bundle, jamais commité).
- Prévoir la **vérification de signature** sur chaque appel protégé.

### 3.1 — Fonction marketplace publique (ferme la fuite des téléphones)
- Créer `marketplace_public_list(...)` renvoyant **uniquement** les champs publics :
  `id_structure, nom_structure, type_structure, id_localite, logo` — **SANS `mobile_om`**, sans adresse fine.
- L'ajouter à l'allowlist publique.

### 3.2 — Mode RPC + liste blanche
- Accepter `{ fn, params }` ; refuser toute `query` SQL libre (ou la restreindre à l'allowlist le temps de
  la bascule). `fn` hors liste → **403** ; token absent sur fonction protégée → **401**.
- **Dériver `id_structure` du JWT** et l'injecter ; ignorer tout `id_structure` du payload.
- Liste blanche initiale (fonctions déjà utilisées — à compléter avec l'équipe front) :
  - **Publiques (sans token)** : `marketplace_public_list`, `check_user_credentials`,
    `add_demande_password`, `add_check_demande`, `add_edit_inscription`.
  - **Protégées (token requis, `id_structure` du token)** : `get_une_structure`, `get_mes_droits`,
    `get_dashboard_commerce_complet`, `get_dashboard`, `get_my_factures1`, `get_list_clients`,
    `get_list_infos_client`, `list_produits`, `get_active_live`, `get_soldes_wallet_structure`,
    `get_wallet_structure`, `edit_param_structure`, `add_acompte_facture`, `add_retrait_marchand`,
    `add_edit_utilisateur`, `change_user_password`, `add_edit_structure`.
  - **Admin (token + `id_profil` admin)** : fonctions d'administration système (gestion structures,
    abonnements, mensualités…).
- **Chaque paramètre passe en `$n` paramétré** (pas de concaténation). La colonne « params » est **déjà
  transmise** par `route.ts` (`body.params`) mais inutilisée côté front — on va s'en servir.

### 3.3 — Durcissements
- **Rate-limiting** sur `sql_jsonpro` (et sur l'OTP) : par IP + par token.
- Journaliser les refus (401/403) et les `fn` hors liste (détection d'abus).
- Rotation du secret JWT documentée (comme la clé `X-App-Key`).

---

## 4. TÂCHES FRONT — équipe Dév (branche `refonte-v3`)

### 4.1 — `services/database.service.ts` : passer en RPC
- Remplacer `envoyerRequeteApi(query)` par `callFunction(fn, params[])` qui POST **`{ fn, params }`**
  (typés) — **supprimer toute concaténation SQL**.
- Ajouter le header **`Authorization: Bearer <jwt>`** sur chaque appel (token lu via `auth.service`).
- Garder une période de **tuilage** : tant que le backend accepte encore `query`, `callFunction` peut
  émettre l'ancien format en repli, mais **aucune nouvelle** concaténation.

### 4.2 — `services/auth.service.ts`
- **Cesser de générer le token côté client** (`generateSessionToken`) : utiliser le **JWT renvoyé par le
  backend** (étape 3.0). Le stocker (`fayclick_token`) et le joindre à chaque appel.

### 4.3 — Migration des appelants
- D'abord les `executeFunction('fn', [...])` (déjà nommés → conversion directe).
- Puis les `.query('SELECT …')` bruts : `getStructureDetails`, `getUserRights`, `getListClients`,
  `editParamStructure`, `updateUser`, `updateStructure`, `checkStructureNameExists`,
  `requestPasswordReset`, `verifyPasswordResetCode`, `getStructureTypes`.
- `catalogues-public.service.ts` / `marketplace-search.service.ts` → `marketplace_public_list` (4.1 + 3.1).

### 4.4 — Proxy prod (`.htaccess`)
- **Transmettre le header `Authorization`** jusqu'à `sql_jsonpro` (en plus de l'injection `X-App-Key`).
- Vérifier que le reverse proxy ne filtre pas l'en-tête.

---

## 5. Ordre d'exécution (dépendances)

1. **3.1 + 4.3-marketplace** : ferme la fuite publique des téléphones. *(rapide, fort impact)*
2. **3.0** : JWT signé serveur. *(prérequis de tout le reste)*
3. **3.2 + 4.1 + 4.2** : RPC + liste blanche + `id_structure` du token + Authorization.
4. **4.3 (reste)** : migration des appelants restants.
5. **3.3 + 4.4** : rate-limiting + transmission Authorization au proxy.

---

## 6. Critères de succès (tests)

- [ ] `curl` anonyme d'une `query` libre sur `/api/sql` (ou sql_jsonpro) → **403/401** (plus d'exécution).
- [ ] `curl` avec token du compte A demandant `id_structure` = B → ne renvoie **que** les données de A
      (le serveur ignore le `id_structure` du payload).
- [ ] Réponse marketplace publique **sans aucun `mobile_om`**.
- [ ] Un CAISSIER ne peut pas appeler une fonction admin (403).
- [ ] Journal serveur : refus loggés, `fn` hors liste tracées.
- [ ] Non-régression : parcours login → dashboard → vente → facture fonctionnels.

## 7. Rollback
Backend en **tuilage** : tant que `sql_jsonpro` accepte encore `query` + token optionnel, on peut revenir
à l'ancien chemin sans casser la prod. Le durcissement (refus 401/403) ne s'active qu'une fois le front
migré et vérifié.

## 8. Points de coordination
- Le **secret JWT** et l'activation des refus (401/403) sont **côté serveur** : point de synchro
  front/backend avant bascule.
- La **liste blanche** doit être validée conjointement (le front fournit la liste exhaustive des `fn`
  réellement appelées avant de couper le SQL libre).

---

*Préparé pour l'équipe Dév FayClick et l'agent Kader_backend. Référent front : branche `refonte-v3`.*
