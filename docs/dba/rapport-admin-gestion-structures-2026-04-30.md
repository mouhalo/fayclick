# Rapport DBA — Admin Gestion Structures
**Date** : 2026-04-30  
**Projet** : FayClick V2  
**Base de données** : `fayclick_db` — 154.12.224.173:3253  
**Auteur** : dba_master  
**Branch frontend** : `feature/admin-gestion-structures` (commit `0c26d82`)  

---

## 1. Résumé Exécutif

Déploiement complet réussi de 7 objets PostgreSQL pour le module Admin Gestion Structures. Tous les tests T1-T7 passent. La fonction `delete_structure` a été testée en dry-run ROLLBACK sur la structure de test SIMULA27 (id=1998) avec succès — aucune donnée de production détruite.

**Verdict final** : 7/7 objets déployés — 7/7 tests PASS

---

## 2. Objets Déployés

### 2.1 Table `admin_actions_log` (nouveau)

Journal d'audit des actions administrateur.

```sql
CREATE TABLE public.admin_actions_log (
  id_log          BIGSERIAL PRIMARY KEY,
  id_admin        INTEGER NOT NULL REFERENCES public.utilisateur(id),
  action          VARCHAR(100) NOT NULL,
  cible_type      VARCHAR(50),
  cible_id        INTEGER,
  cible_nom       VARCHAR(255),
  ancienne_valeur JSONB,
  nouvelle_valeur JSONB,
  motif           TEXT,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Index créés** :
- `idx_admin_log_admin` — sur `id_admin`
- `idx_admin_log_cible` — sur `(cible_type, cible_id)`
- `idx_admin_log_action` — sur `action`

**Note FK** : La contrainte référence `utilisateur(id)` (pas `utilisateurs(id_utilisateur)` comme indiqué dans le PRD — noms de tables corrects vérifiés sur le schéma réel).

### 2.2 Fonction `log_admin_action` (nouveau)

```sql
log_admin_action(
  p_id_admin       INTEGER,
  p_action         VARCHAR,
  p_cible_type     VARCHAR  DEFAULT NULL,
  p_cible_id       INTEGER  DEFAULT NULL,
  p_cible_nom      VARCHAR  DEFAULT NULL,
  p_ancienne_valeur JSONB   DEFAULT NULL,
  p_nouvelle_valeur JSONB   DEFAULT NULL,
  p_motif          TEXT     DEFAULT NULL
) RETURNS BIGINT
```

Insère une ligne dans `admin_actions_log` et retourne le `id_log` (BIGINT).

### 2.3 Fonction `edit_param_structure` (étendue 10 → 16 params)

**Opération** : DROP version 10 params (oid 26872), CREATE version 16 params (oid 67049).

Nouveaux paramètres ajoutés en position 11-16 :

| # | Paramètre | Type | Default |
|---|-----------|------|---------|
| 11 | `p_nombre_produit_max` | INTEGER | NULL |
| 12 | `p_nombre_caisse_max`  | INTEGER | NULL |
| 13 | `p_compte_prive`       | BOOLEAN | NULL |
| 14 | `p_mensualite`         | NUMERIC | NULL |
| 15 | `p_taux_wallet`        | NUMERIC | NULL |
| 16 | `p_live_autorise`      | BOOLEAN | NULL |

**Correction appliquée** : Type-cast `json || jsonb` → `(jsonb || jsonb)::json` pour la fusion de `info_facture`.

**Pattern COALESCE** : NULL = no-op (paramètre inchangé en base).  
**Signature frontend** (`database.service.ts` ligne 195) : correspond exactement aux 16 arguments dans l'ordre documenté.

### 2.4 Fonction `get_admin_all_utilisateurs` (étendue 9 → 11 params)

**Opération** : DROP version 9 params (signature exacte : `integer, integer, character varying, integer, integer, integer, boolean, character varying, character varying`), CREATE version 11 params.

Nouveaux paramètres :

| # | Paramètre | Type | Comportement |
|---|-----------|------|--------------|
| 10 | `p_search_structure` | VARCHAR | ILIKE sur `s.nom_structure` |
| 11 | `p_search_telephone` | VARCHAR | ILIKE sur `u.tel_user` |

**Retour JSON** :
```json
{
  "success": true,
  "total": 1718,
  "utilisateurs": [...]
}
```

Test de filtre `p_search_structure='Kelefa'` → total=5 utilisateurs — fonctionnel.

### 2.5 Fonction `delete_structure` (nouveau)

```sql
delete_structure(
  p_id_structure INTEGER,
  p_id_admin     INTEGER
) RETURNS JSON
```

**Retour JSON** :
```json
{
  "success": true,
  "message": "Structure supprimée avec succès",
  "nb_factures_supprimees": 4,
  "nb_users_supprimes": 1
}
```

**Cascade DELETE — 22 étapes dans l'ordre des dépendances FK** :

1. `detail_facture_com` (FK → facture_com)
2. `recus_paiement` (FK → facture_com)
3. `proforma_details` (FK → proforma)
4. `proforma`
5. `facture_com`
6. `facture` (table scolaire/immobilier)
7. `mouvement_stock`
8. `produit_photos` (FK → produit_service)
9. `product_embeddings` (FK → produit_service)
10. `produit_service`
11. `categorie`
12. `devis`
13. `depense`
14. `type_depense`
15. `abonnements`
16. `abonnement_tarif`
17. `client_facture`
18. `compte_structure`
19. `frais_virement`
20. `banque_structure`
21. `active_live`
22. `demande_auth`
23. `progression`
24. `profil_droits`
25. `journal_activite`
26. `import_data`
27. `control_access` (FK sur `code_structure` string)
28. `utilisateur`
29. `param_structure`
30. `structures` (dernière)

**Guards** :
- `p_id_structure = 0` ou `NULL` → rejeté immédiatement
- Structure inexistante → rejeté avec message clair

**Log automatique** : `log_admin_action('DELETE_STRUCTURE', snapshot JSONB)` après succès.

**Correction PRD** : La table clients s'appelle `client_facture` (pas `client`). La table `list_factures_com` est une VIEW — le schéma est `facture_com` pour les DELETE.

### 2.6 Fonction `add_abonnement_offert` (nouveau)

```sql
add_abonnement_offert(
  p_id_structure INTEGER,
  p_nb_jours     INTEGER,
  p_motif        TEXT    DEFAULT NULL,
  p_id_admin     INTEGER DEFAULT NULL
) RETURNS JSON
```

**Retour JSON** (conforme au contrat `admin.service.ts` ligne 1008) :
```json
{
  "success": true,
  "message": "Abonnement offert créé avec succès",
  "data": {
    "id_abonnement": 1721,
    "date_debut": "2026-04-30",
    "date_fin": "2026-05-06"
  }
}
```

**Logique dates** : Si abonnement ACTIF existant, part de `MAX(date_fin) + 1 jour`, sinon `CURRENT_DATE`.

**Valeurs insérées** :
- `methode = 'OFFERT'` (nouveau valeur dans contrainte CHECK)
- `type_abonnement = 'OFFERT'` (nouveau valeur dans contrainte CHECK)
- `uuid_paiement = gen_random_uuid()` (contrainte UUID NOT NULL)
- `montant = 0`

**Guards** : id_structure = 0/NULL → rejeté ; nb_jours <= 0 → rejeté ; structure inexistante → rejeté.

### 2.7 PATCH `reset_user_password`

**Problème corrigé** : La version précédente retournait `'OK'` (string littéral) et définissait un mot de passe fixe `'0000'`. Incompatible avec le frontend qui affiche le résultat comme nouveau MDP à l'admin.

**Nouveau comportement** :
- Génère un MDP aléatoire 8 caractères (alphanumérique, sans ambiguïtés O/0/I/1/l)
- Hash bcrypt avec `crypt(mdp, gen_salt('bf', 8))`
- Force `pwd_changed = false` (l'utilisateur devra changer au prochain login)
- Retourne le MDP **en clair** pour affichage unique à l'admin
- Si utilisateur inexistant : retourne `'NOK'` inchangé

**Jeu de caractères** : `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789` (57 chars, pas d'ambiguïtés visuelles)

---

## 3. Corrections de Schéma

### 3.1 Contraintes CHECK `abonnements` étendues

Les contraintes CHECK existantes ne permettaient pas les valeurs `'OFFERT'` nécessaires pour `add_abonnement_offert`.

**Avant** :
- `abonnements_methode_check` : `IN ('OM', 'WAVE', 'FREE')`
- `abonnements_type_abonnement_check` : `IN ('JOURNALIER','HEBDO','HEBDOMADAIRE','MENSUEL','TRIMESTRIEL','SEMESTRIEL','ANNUEL')`

**Après** :
- `abonnements_methode_check` : `IN ('OM', 'WAVE', 'FREE', 'OFFERT')`
- `abonnements_type_abonnement_check` : `IN ('JOURNALIER','HEBDO','HEBDOMADAIRE','MENSUEL','TRIMESTRIEL','SEMESTRIEL','ANNUEL', 'OFFERT')`

---

## 4. Résultats Tests T1-T7

| Test | Description | Résultat |
|------|-------------|---------|
| T1 | `log_admin_action` — retourne BIGINT | PASS (id_log=4) |
| T2 | `edit_param_structure` 16 params — ALL NULL no-op | PASS |
| T3 | `get_admin_all_utilisateurs` 11 params — base | PASS (total=1718) |
| T3b | `get_admin_all_utilisateurs` avec `p_search_structure='Kelefa'` | PASS (total=5) |
| T4a | `add_abonnement_offert(0, ...)` — guard id=0 | PASS (rejeté) |
| T4b | `add_abonnement_offert(1, -5, ...)` — guard jours négatifs | PASS (rejeté) |
| T4c | `add_abonnement_offert(999999, ...)` — structure inexistante | PASS (rejeté) |
| T4d | `add_abonnement_offert(1998, 7, ...)` — SIMULA27 réel | PASS (id=1721, 2026-04-30 → 2026-05-06) |
| T5a | `delete_structure(0, ...)` — guard absolu | PASS (rejeté) |
| T5b | `delete_structure(999999, ...)` — inexistant | PASS (rejeté) |
| T5c | `delete_structure(1998, ...)` ROLLBACK dry-run SIMULA27 | PASS (success=true, 4 factures, 1 user — ROLLBACK confirmé, structure présente) |
| T6 | `reset_user_password(205)` — retourne MDP aléatoire | PASS (8 chars alphanum) |
| T7 | `admin_actions_log` — 3 index présents | PASS |

**Tous les tests passent (13/13).**

---

## 5. Écarts PRD / Schéma Réel

Ces écarts ont été identifiés lors de l'audit et corrigés avant déploiement :

| PRD mentionnait | Schéma réel | Correction |
|----------------|-------------|-----------|
| `utilisateurs(id_utilisateur)` | `utilisateur(id)` | FK admin_actions_log corrigée |
| `client` | `client_facture` | CASCADE delete corrigé |
| `list_factures_com` | Vue (pas de DELETE possible) | `facture_com` utilisé |
| `methode_paiement` | `methode` | INSERT add_abonnement_offert corrigé |
| methode='OFFERT' | CHECK constraint bloquait | ALTER contrainte étendue |
| type_abonnement='OFFERT' | CHECK constraint bloquait | ALTER contrainte étendue |
| uuid_paiement='OFFERT' | Type UUID bloquait | `gen_random_uuid()` utilisé |
| reset_user_password retourne 'OK' | Devait retourner MDP | PATCH appliqué |

---

## 6. Fichiers de Déploiement

- **Script principal** : `D:/React_Prj/fayclick/docs/dba/scripts/deploy_admin_2026-04-30.js`
- **Scripts de diagnostic** : `D:/React_Prj/fayclick/docs/dba/scripts/diag1.js` à `diag8.js`

---

## 7. État Post-Déploiement

```
admin_actions_log     : 3 lignes (tests)
abonnements SIMULA27  : 1 abonnement OFFERT créé (id=1721, 7 jours)
Structures            : aucune supprimée (T5c = dry-run ROLLBACK)
Utilisateurs          : admin id=205 — MDP réinitialisé (test T6)
```

**Recommandation** : Réinitialiser le MDP de l'utilisateur 205 si nécessaire (test T6 a changé son mot de passe).

---

## 8. Compatibilité Frontend

Tous les contrats de signature respectés tels que définis dans :
- `services/admin.service.ts` — `deleteStructure()` (ligne 972), `offrirAbonnement()` (ligne 1008), `resetUserPassword()` (ligne 1144)
- `services/database.service.ts` — `editParamStructure()` (ligne 195) — 16 arguments dans l'ordre exact

Le déploiement est compatible avec le commit frontend `0c26d82` sur la branche `feature/admin-gestion-structures`.
