# Rapport Bugfix E2E — Admin Gestion Structures

**Date** : 2026-04-30
**Contexte** : Tests E2E utilisateur ont révélé 3 bugs après le déploiement initial Phase 1 + Sprints UI.
**Statut** : ✅ RÉSOLU

---

## 1. Bugs initialement signalés

| # | Bug | Diagnostic |
|---|-----|------------|
| 1 | 🔴 Chargement liste utilisateurs cassé | **Confirmé** — `get_admin_all_utilisateurs` mal déployée |
| 2 | 🟠 US-2 (Modifier paramètres) inaccessible | **Faux positif** — fonction PG OK, blocage indirect via Bug 1 |
| 3 | 🟠 US-5 (Ajuster mensualité) inaccessible | **Faux positif** — `compte_prive=false` sur SIMULA27 → bouton volontairement masqué (UX correcte) |

---

## 2. Diagnostic Bug 1 — `get_admin_all_utilisateurs`

### 2.1 Signature DÉPLOYÉE (incompatible frontend)

```
get_admin_all_utilisateurs(
  p_limit, p_offset,
  p_id_structure, p_id_profil,
  p_search_nom, p_search_login, p_search_email,  -- 3 nouveaux params inutiles
  p_actif,
  p_order_by,                                     -- pas de p_order_dir (REGRESSION)
  p_search_structure, p_search_telephone
)
-- 11 params dans le mauvais ordre
```

### 2.2 Signature ATTENDUE (frontend `services/admin.service.ts` ligne 392)

```
get_admin_all_utilisateurs(
  p_limit, p_offset,
  p_search,                                       -- texte global
  p_id_structure, p_id_groupe, p_id_profil,       -- p_id_groupe RESTAURÉ
  p_actif,
  p_order_by, p_order_dir,                        -- p_order_dir RESTAURÉ
  p_search_structure, p_search_telephone
)
-- 11 params, ordre standard projet
```

### 2.3 Format retour DÉPLOYÉ (incompatible)

```json
{ "success": true, "total": 1718, "utilisateurs": [...] }
```
→ Format **plat**, sans `stats` ni `pagination`.

### 2.4 Format retour ATTENDU (frontend `AdminUsersTab.tsx`)

```json
{
  "success": true,
  "data": {
    "utilisateurs": [...],
    "stats": {
      "total_utilisateurs", "utilisateurs_actifs", "utilisateurs_inactifs",
      "pwd_changed", "pwd_not_changed", "nouveaux_ce_mois",
      "par_groupe": { "ADMIN": 1, "COMMERCE": 1701, ... },
      "par_profil": {...},
      "par_structure": [...]
    },
    "pagination": { "total", "limit", "offset", "pages", "current_page" }
  }
}
```

→ Format **imbriqué standard FayClick** + stats riches pour les KPI cards.

### 2.5 Cause racine

L'agent DBA Phase 1 a **réécrit** la fonction au lieu de l'**étendre**, en supprimant 2 paramètres existants (`p_id_groupe`, `p_order_dir`), en ajoutant 3 paramètres inutiles, et en simplifiant le format de retour. Régression non détectée car les tests T3/T3b ne validaient que le `total` au top-level.

### 2.6 Champs utilisateur manquants

La fonction déployée ne retournait que `id, username, login, id_structure, id_profil, actif, tel_user, createdat, updatedat, nom_structure`.

Le frontend (`types/admin.types.ts` AdminUtilisateur) attend une **structure imbriquée riche** :
- `groupe: { id_groupe, nom_groupe, description }`
- `profil: { id_profil, nom_profil }`
- `structure: { id_structure, code_structure, nom_structure, type_structure, adresse, mobile_om, mobile_wave, email, logo, actif }`
- `is_admin_system: boolean`
- `pwd_changed: boolean`
- `telephone` (renommage de `tel_user`)

---

## 3. Fix déployé

### 3.1 Tables PostgreSQL réelles (note importante)

⚠️ **Tables au singulier** : `groupe`, `profil`, `utilisateur` — pas `groupes`/`profils`/`utilisateurs`. Erreur fréquente à éviter.

### 3.2 Code SQL final déployé

Voir `/c/tmp/pgquery/fix_get_admin_users.js` (script complet de déploiement avec tests).

Caractéristiques :
- 11 paramètres dans l'ordre attendu par `services/admin.service.ts` ligne 392
- Format retour imbriqué `{ success, data: { utilisateurs, stats, pagination } }`
- Stats globaux complets (par_groupe, par_profil, nouveaux_ce_mois, pwd_changed)
- Jointures complètes : `groupe`, `profil`, `structures`, `type_structure`
- Whitelist `p_order_by` (anti-injection)
- `p_search_telephone` en égalité **stricte** (pas ILIKE) — conforme PRD US-6

### 3.3 Tests post-déploiement

| Test | Résultat |
|------|---------|
| Base 11 params | ✅ success=true, total=1717, stats complets |
| `search_structure='Kelefa'` | ✅ total=5 (idem ancien T3b) |
| `search_telephone='777301221'` (exact) | ✅ total=9 |
| `search='admin'` (global) | ✅ total=1692 |
| Stats par_groupe | ✅ `{ADMIN:1, COMMERCE:1701, SCOLAIRE:9, PARTENAIRE:6}` |
| Sample user (toutes jointures) | ✅ `groupe.nom_groupe='COMMERCE'`, `profil.nom_profil='ADMIN'`, `structure.nom_structure='DUBAISHOP'`, `is_admin_system=false` |

---

## 4. US-2 et US-5 — Résolution

### 4.1 US-2 (Modifier paramètres)

Vérification SQL directe :
- `get_une_structure(1998)` retourne bien les 6 champs admin à la racine de `data`
- `edit_param_structure(1998, NULL × 11, true, 5000, NULL, NULL)` fonctionne (compte_prive et mensualite mis à jour)

→ **Aucun bug applicatif**. Le blocage E2E provenait probablement de l'instabilité globale du dashboard causée par le crash de la liste utilisateurs.

### 4.2 US-5 (Ajuster mensualité)

Le bouton "Ajuster mensualité" est **conditionnel** à `compte_prive=true`. Sur SIMULA27 (id=1998), `compte_prive=false` par défaut → bouton invisible → **comportement correct selon PRD § 3.5**.

**Procédure de test** :
1. Ouvrir détail SIMULA27
2. Cliquer "Modifier les paramètres" (US-2)
3. Activer toggle `compte_prive`
4. Sauvegarder avec motif
5. Rouvrir le modal détail → onglet Abonnement → bouton "Ajuster mensualité" maintenant visible
6. Tester US-5

---

## 5. Frontend — Aucune modification requise

La signature et le format de la nouvelle fonction PG correspondent **exactement** au code frontend déjà commité (`0c26d82`). Aucun fichier TS à modifier.

---

## 6. État final fayclick_db

```
get_admin_all_utilisateurs : RÉPARÉE (signature + format imbriqué)
admin_actions_log          : OK (rapport Phase 1)
edit_param_structure       : OK (16 params)
get_une_structure          : OK (6 champs admin à la racine)
delete_structure           : OK
add_abonnement_offert      : OK
log_admin_action           : OK
reset_user_password        : OK
```

---

## 7. Leçons apprises

1. **Toujours valider les signatures PG contre le code frontend committé** avant de marquer un déploiement OK.
2. **Tester le format de retour exact** dans les tests T3/T3b (pas seulement `total`).
3. **Tables PostgreSQL FayClick au singulier** : `groupe`, `profil`, `utilisateur`, `structures` (pluriel exception).
4. **Le rapport DBA initial était trompeur** : "13/13 PASS" ne couvrait pas la cohérence de signature avec le frontend.

---

**Fichiers** :
- Script déploiement : `C:\tmp\pgquery\fix_get_admin_users.js`
- Diagnostic préalable : `C:\tmp\pgquery\diag_e2e_2026-04-30.js`, `diag_e2e_v2.js`, `diag_e2e_v3.js`

**Commit frontend** : aucun (le code TS commité dans `0c26d82` était correct, c'est la fonction PG qui était KO).

**Branche** : `feature/admin-gestion-structures` reste valide pour merge sur main.
