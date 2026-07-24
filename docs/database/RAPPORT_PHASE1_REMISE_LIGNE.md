# RAPPORT — Phase 1 : Exécution DDL + Patches — EXÉCUTÉ EN PRODUCTION

**Chantier** : Persistance de la remise par ligne en base (`fayclick_db`)
**Date rédaction script** : 24/07/2026
**Date exécution réelle** : 24/07/2026
**Auteur** : `dba_master`
**Statut** : ✅ **EXÉCUTÉ ET COMMITTÉ EN PRODUCTION** — voir §12 pour le détail de l'exécution.
**Base cible** : `fayclick_db` @ `154.12.224.173:3253` (PG 16.14)
**Décisions PO validées** : 4 (cf. §1)
**Mode opératoire réel** : le PO n'avait pas `psql` sur son poste Windows (`psql: command not found`).
`dba_master` a exécuté le patch directement via son accès serveur habituel (Node.js `pg` +
`C:\tmp\pgquery\`, cf. §12), car aucun binaire `psql`/`pg_dump` n'est disponible non plus sur ce
poste. Tous les backups et l'exécution ont donc été réalisés en SQL pur (pas de `pg_dump` binaire).

---

## 0. Synthèse exécutive

- **Périmètre exécuté (script)** : 4 tables + 14 surcharges de fonctions + 1 vue + 2 surfaces d'affichage.
- **Zéro impact métier** sur `montant`/`mt_remise`/`mt_acompte`/`mt_restant`/stock/wallet — confirmé par :
  - Trigger `trigger_recalcul_after_update_detail` WHEN `(old.quantite IS DISTINCT FROM new.quantite) OR (old.prix ...) OR (old.id_facture ...)` → un UPDATE de `remise_pct`/`prix_origine` seuls ne déclenche **pas** `recalculer_montant_facture`.
  - `recalculer_montant_facture()` fait `SUM(quantite * prix)` — indépendant des nouvelles colonnes.
- **Rétro-compat absolue** : `NULL` par défaut sur les 4 tables, parseur 3-champs toujours accepté, **signatures inchangées**.
- **ALTER metadata-only** (`ADD COLUMN ... NULL` sans DEFAULT) → instantané même sur 548 593 lignes (PG 11+).
- **Idempotent** : `ADD COLUMN IF NOT EXISTS` + `DO $$ IF NOT EXISTS` pour les contraintes + `CREATE OR REPLACE` pour les fonctions.

---

## 1. Décisions PO intégrées

| # | Décision | Mise en œuvre |
|---|---|---|
| 1 | Étendre BC + devis à `BETWEEN 3 AND 5` | `create_bon_commande`, `edit_bon_commande`, `add_new_devis_complet`, `maj_devis` patchées. **DDL étendu à `bon_commande_details` et `detail_devis`** (colonnes + CHECK) car ils reçoivent des INSERT 5-champs. |
| 2 | Option A (vue `list_detailventes`) pour `get_my_factures1` | `CREATE OR REPLACE VIEW list_detailventes` (ajout `df.remise_pct, df.prix_origine`) + patch `get_my_factures1` (2 `json_build_object`). |
| 3 | Patcher `create_facture_complete` (ancienne) par sécurité | Patchée (même logique que `create_facture_complete1`). |
| 4 | Étendre le log audit `modifier_facturecom` | `articles_avant`/`articles_apres` incluent désormais `remise_pct`/`prix_origine`. |

---

## 2. État courant constaté (re-vérifié le 24/07/2026 avant génération du patch)

### 2.1 Colonnes présentes (4 tables)

| Table | Lignes | `remise_pct` | `prix_origine` | Action |
|---|---|---|---|---|
| `detail_facture_com` | 548 593 | absente | absente | ALTER + CHECK |
| `proforma_details` | 876 | absente | absente | ALTER + CHECK |
| `bon_commande_details` | faible | absente | absente | ALTER + CHECK (décision 1) |
| `detail_devis` | 10 | absente | absente | ALTER + CHECK (décision 1) |

→ **Aucune** des 4 tables n'a les colonnes. ALTER à appliquer partout (idempotent).

### 2.2 Surcharges détectées (14 au total)

```
create_facture_complete1 : 2 surcharges (p_description varchar ET text)
create_facture_complete  : 1 surcharge
create_facture_online    : 1 surcharge
create_proforma          : 1 surcharge
edit_proforma            : 1 surcharge
convert_proforma_to_facture : 1 surcharge
create_bon_commande      : 1 surcharge
edit_bon_commande        : 1 surcharge
add_new_devis_complet    : 1 surcharge
maj_devis                : 1 surcharge
modifier_facturecom      : 1 surcharge
rechercher_multifacturecom : 1 surcharge (2 branches json_build_object)
get_my_factures1         : 1 surcharge (2 json_build_object)
```

**R1 (élevé) traité** : les 2 surcharges `create_facture_complete1` sont patchées **individuellement**
et leur identité (varchar vs text, retour `detail_ids/detail_count` vs `details_ids/nb_details`)
est préservée. Vérification post-patch : smoke query §6.3.

---

## 3. Commandes d'exécution (procédure PO)

### 3.1 Pré-requis : backup pré-exécution (1 commande)

```bash
# Depuis Git Bash sur le serveur de dev ou un poste d'admin
cd "D:/React_Prj/fayclick/docs/database"

# Positionner les credentials (à récupérer du .env du projet — JAMAIS committer)
export DB_HOST=154.12.224.173
export DB_PORT=3253
export DB_NAME=fayclick_db
export DB_USER=admin_icelab
export DB_PASS='********'

bash backup_phase1_pre_execution.sh
```

Produit dans `C:/tmp/pgquery/backup_remise_ligne_<YYYYMMDD_HHMMSS>/` :
- `01_schema_<table>_before.txt` (×4) — `\d+` des 4 tables
- `03_dump_detail_facture_com.dump` (~100 Mo, format custom)
- `04_dump_proforma_details.dump`
- `05_dump_bon_commande_details.dump`
- `06_dump_detail_devis.dump`
- `backup_functions_before_phase1.sql` — **14 `pg_get_functiondef` exacts** (pour rollback R5)
- `20_view_list_detailventes_before.sql` — vue originale
- `30_sommes_avant.txt` — sommes des montants (sanity check post-rollback)

Durée estimée : 5-15 min (dump de 548k lignes).

### 3.2 Exécution du patch (1 commande)

```bash
psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" \
     -v ON_ERROR_STOP=1 \
     -f PATCH_PHASE1_REMISE_LIGNE.sql
```

- **Atomique** : `BEGIN; ... COMMIT;` englobe tout. Si une étape échoue, ROLLBACK complet.
- `ON_ERROR_STOP=1` : arrêt au premier échec (pas de cascade silencieuse).
- Les `\echo` affichent la progression ; les `RAISE NOTICE` internes au `DO $$` affichent les CHECK créés.
- Durée estimée : < 10 secondes (DDL metadata-only + CREATE OR REPLACE). Le seul cost est le
  `DROP VIEW` + `CREATE VIEW` de `list_detailventes` (recréation du catalogue — négligeable).

### 3.3 Smoke post-exécution (intégrées au script §6)

Le script lance déjà en fin (read-only) :
- Présence des colonnes sur les 4 tables (4 tables × 2 colonnes = 8 lignes attendues).
- Présence des 4 contraintes CHECK.
- **R1 critique** : `create_facture_complete1` retourne **exactement 2 surcharges** distinctes.
- Volumétries inchangées.
- Vue `list_detailventes` expose les 2 colonnes.
- Comptage des lignes historiques NULL (doit valoir le total — aucune ligne nouvelle).

---

## 4. Détail des patches par fonction (diff avant/après)

Le pattern est **uniforme** pour les 11 fonctions qui insèrent des lignes (1 à 12 sauf 3 et 13/14) :

```sql
-- AVANT (parseur) :
v_parts := string_to_array(v_article, '-');
IF array_length(v_parts, 1) != 3 THEN              -- ou <> 3, ou garde absente
  RAISE EXCEPTION 'Format article invalide: ...';
END IF;
v_id_produit := v_parts[1]::INTEGER;
v_quantite   := v_parts[2]::...;
v_prix       := v_parts[3]::NUMERIC;

-- APRÈS :
v_parts := string_to_array(v_article, '-');
IF array_length(v_parts, 1) NOT BETWEEN 3 AND 5 THEN
  RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix[-remise[-prix_origine]])', v_article;
END IF;
v_id_produit := v_parts[1]::INTEGER;
v_quantite   := v_parts[2]::...;
v_prix       := v_parts[3]::NUMERIC;
v_remise_pct   := CASE WHEN array_length(v_parts,1) >= 4 AND v_parts[4] IS NOT NULL AND v_parts[4] <> ''
                       THEN v_parts[4]::NUMERIC(5,2) ELSE NULL END;
v_prix_origine := CASE WHEN array_length(v_parts,1) >= 5 AND v_parts[5] IS NOT NULL AND v_parts[5] <> ''
                       THEN v_parts[5]::NUMERIC(10,2) ELSE NULL END;
```

Et l'INSERT étendu (exemple `detail_facture_com`) :

```sql
-- AVANT :
INSERT INTO detail_facture_com (id_facture, date_facture, id_produit, quantite, prix)
VALUES (v_new_document_id, p_date_facture, v_id_produit, v_quantite, v_prix);

-- APRÈS :
INSERT INTO detail_facture_com (id_facture, date_facture, id_produit, quantite, prix, remise_pct, prix_origine)
VALUES (v_new_document_id, p_date_facture, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine);
```

### 4.1 Spécificités par fonction

| Fonction | Spécificité |
|---|---|
| `create_proforma` | INSERT étendu dans `proforma_details (id_proforma, id_produit, nom_produit, quantite, prix_unitaire, sous_total, remise_pct, prix_origine)`. |
| `edit_proforma` | DELETE préalable puis re-INSERT étendu. |
| `convert_proforma_to_facture` | **Pas de parseur modifié** — concatène les lignes proforma en `articles_string` : `id-qt-prix[-remise[-prix_origine]]#` avec gestion NULL (omet 4-5 si NULL). Symétrie parfaite proforma→facture. |
| `create_facture_complete1` (varchar) | INSERT `detail_devis` OU `detail_facture_com` selon `p_est_devis`. Retourne `detail_ids`/`detail_count`. |
| `create_facture_complete1` (text) | Identique au précédent mais `p_description text` et retour `details_ids`/`nb_details`. **R1** : ne pas confondre les deux retours. |
| `create_facture_complete` (ancien) | `add_new_facture` sans `p_id_utilisateur`. INSERT étendu. |
| `create_facture_online` | `add_new_facture` simplifié (sans remise/acompte en-tête). INSERT étendu. |
| `create_bon_commande` | INSERT étendu `bon_commande_details (..., cout_revient, remise_pct, prix_origine)`. Garde `SECURITY DEFINER`. |
| `edit_bon_commande` | DELETE préalable + re-INSERT étendu. |
| `add_new_devis_complet` | Pré-validation + INSERT étendu `detail_devis`. Garde double parsing (pré-validation + insertion) — les **deux** boucles patchées. |
| `maj_devis` | DELETE total + UPDATE en-tête + INSERT étendu `detail_devis`. Pré-validation et boucle d'insertion patchées. |
| `modifier_facturecom` | **3 zones étendues** : (a) snapshot `articles_avant` + `remise_pct`/`prix_origine`, (b) UPDATE conservés + INSERT nouveaux avec `remise_pct`/`prix_origine`, (c) snapshot `articles_apres` étendu (décision 4). Garde `NOT BETWEEN 3 AND 5` avec retour erreur structuré (pas `RAISE EXCEPTION` car la fonction attrape et renvoie un JSON `code`). |
| `rechercher_multifacturecom` | 2 branches `json_build_object` (pid_facture + pnum_factures) — ajout `'remise_pct', df.remise_pct, 'prix_origine', df.prix_origine`. |
| `get_my_factures1` | 2 `json_build_object` détails (CAS 1 facture unique + CAS 2 liste) — ajout via la vue `list_detailventes`. |

### 4.2 Non-patchés (justifiés)

| Fonction | Raison |
|---|---|
| `add_new_facture` | N'insère que l'en-tête `facture_com`. Aucune référence à `articles_string`. |
| `get_proforma_details` | Utilise `row_to_json(proforma_details)` → expose automatiquement les nouvelles colonnes après ALTER. Smoke test suffisant. |
| `create_facture_representant` | Prix imposé (`prix_vente_rep`) — pas de remise ligne pertinente. Délègue à `create_facture_complete1`. |
| `generate_invoices_simula27` / `generate_random_invoices_for_structures` | Jobs de seed qui émettent du 3-champs. Continuent de fonctionner. |

---

## 5. Vérifications fonctionnelles post-patch (scénarios §3.6 Phase 0)

À lancer **après exécution** sur des structures de test (ex. 183 TECH24, 218 LIBRAIRIE CHEZ KELEFA),
avec cleanup final. Séparateur décimal `.` obligatoire.

| # | Scénario | Attendu |
|---|---|---|
| 1 | `create_proforma('183',..., '4682-3-176-12.5-200#')` | `remise_pct=12.50`, `prix_origine=200.00` |
| 2 | `create_proforma('183',..., '4682-3-176#')` | `remise_pct=NULL`, `prix_origine=NULL` (rétro-compat) |
| 3 | `edit_proforma` avec 2 lignes (1 remisée, 1 non) | Persistées correctement |
| 4 | `convert_proforma_to_facture` (depuis proforma 5 champs) | `detail_facture_com` porte les **mêmes** valeurs |
| 5 | `create_facture_complete1` (varchar) avec 5 champs | INSERT ok, `montant = SUM(qte*prix)` inchangé |
| 6 | `create_facture_complete1` (text) avec 3 champs | Identique à aujourd'hui |
| 7 | `create_facture_online` avec 5 champs | INSERT ok |
| 8 | `modifier_facturecom` string 5 champs | UPDATE/INSERT avec report des valeurs |
| 9 | UPDATE `remise_pct` seul sur un détail existant | **Aucun** delta `montant`/`mt_remise`/`mt_acompte` (trigger WHEN exclut) |
| 10 | Wallet/stock/paiements | Inchangés vs vente équivalente sans remise |
| 11 | INSERT avec `remise_pct=150` | Rejet `CHECK` (SQLSTATE 23514) |
| 12 | `get_proforma_details` | JSON contient `remise_pct`/`prix_origine` |
| 13 | `get_my_factures1(pid_facture)` | JSON `details` contient les 2 colonnes |
| 14 | `rechercher_multifacturecom(pid_facture=...)` | JSON `details` contient les 2 colonnes |
| 15 | `supprimer_facturecom_admin` (cleanup) | Restore stock (test `detail_facture_stock_trig`) |

### 5.1 Requêtes de test prêtes à l'emploi (smoke fonctionnel)

```sql
-- Scénario 1 : proforma 5 champs
SELECT create_proforma(183, CURRENT_DATE, '771234567', 'Client Test',
                       'Proforma test remise', 528, '4682-3-176-12.5-200#', 0, 1);

-- Vérifier
SELECT id_produit, quantite, prix_unitaire, remise_pct, prix_origine
FROM proforma_details
WHERE id_proforma = (SELECT MAX(id_proforma) FROM proforma)
ORDER BY id_detail DESC LIMIT 5;

-- Scénario 11 : CHECK constraint
-- Doit échouer avec SQLSTATE 23514
-- SELECT create_proforma(183, CURRENT_DATE, '771234567', 'X', 'X', 100, '4682-1-100-150#', 0, 1);

-- Scénario 9 : trigger non perturbé
-- (sur une vente existante du jour, UPDATE remise_pct seul et comparer montant avant/après)
```

---

## 6. Vérifications structurelles (smoke queries intégrées au script)

### 6.1 Colonnes présentes (4 tables × 2 = 8 lignes attendues)

```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('detail_facture_com','proforma_details','bon_commande_details','detail_devis')
  AND column_name IN ('remise_pct','prix_origine')
ORDER BY table_name, column_name;
-- ATTENDU : 8 lignes
```

### 6.2 Contraintes CHECK (4 attendues)

```sql
SELECT conname FROM pg_constraint WHERE conname LIKE 'chk_%remise_pct';
-- ATTENDU : chk_bon_commande_remise_pct, chk_detail_devis_remise_pct,
--           chk_detail_facture_remise_pct, chk_proforma_remise_pct
```

### 6.3 R1 CRITIQUE — les 2 surcharges `create_facture_complete1`

```sql
SELECT pg_get_function_identity_arguments(p.oid) AS identity_args
FROM pg_proc p
WHERE proname = 'create_facture_complete1'
  AND pronamespace = 'public'::regnamespace;
-- ATTENDU : exactement 2 lignes
--   "...,p_description character varying,..."
--   "...,p_description text,..."
```

### 6.4 Volumétries inchangées

```sql
SELECT relname, reltuples::bigint
FROM pg_class
WHERE relname IN ('detail_facture_com','proforma_details','bon_commande_details','detail_devis');
-- ATTENDU : 548593, 876, ~0, 10 (inchangées vs pré-patch)
```

---

## 7. Rollback (`99_rollback_phase1_remise_ligne.sql`)

En cas de problème, restauration complète à l'état antérieur :

```bash
# Étape 1 : rollback schéma (DROP COLUMN + CHECK + restauration vue originale)
psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" \
     -v ON_ERROR_STOP=1 \
     -f 99_rollback_phase1_remise_ligne.sql

# Étape 2 : restauration des 14 fonctions (depuis le backup pre-exec)
psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" \
     -v ON_ERROR_STOP=1 \
     -f C:/tmp/pgquery/backup_remise_ligne_<DATE>/backup_functions_before_phase1.sql
```

**Points d'attention rollback** :
- `DROP COLUMN` sur `detail_facture_com` (548k lignes) implique un **REWRITE de table** sur PG < 13.
  PG 16.14 → optimisé mais reste exclusif. **Exécuter en heure creuse**.
- Le rollback est **non-idempotent** pour le `DROP COLUMN` (exécuter une seule fois).
- Le dump `backup_functions_before_phase1.sql` est **strictement requis** — sans lui, il faudrait
  re-patcher manuellement chaque fonction pour retirer le code `[PHASE1]`.
- Les dumps `.dump` (format custom) permettent de restaurer les **données** en cas de besoin,
  via `pg_restore --data-only --table=...`.

---

## 8. Risques résiduels

| # | Risque | Niveau | Mitigation |
|---|---|---|---|
| R1 | Oubli d'une surcharge `create_facture_complete1` | Élevé → **maîtrisé** | Les 2 surcharges patchées individuellement. Smoke §6.3 vérifie les 2 identités. |
| R2 | Décimal régional `12,5` vs `12.5` | Moyen | Documenté dans `FONCTIONS_SIGNEES_BACKEND.md`. `kader_backend` doit émettre un point. |
| R3 | `prix_origine < prix` (vente en gros) | Faible | Aucune CHECK (volontaire). |
| R4 | `create_facture_complete` (ancienne) appelée par backend | Moyen → **maîtrisé** | Patchée par sécurité (décision 3). |
| R5 | BC/devis cassés si front émet 5 champs | Moyen → **maîtrisé** | Étendus par décision 1 (DDL + fonctions). |
| R6 | Lock pendant ALTER sur 548k lignes | Faible → **nul** | `ADD COLUMN NULL` sans DEFAULT = metadata-only, instantané (PG 11+). |
| R7 | Trigger recalcul invoqué à tort sur UPDATE `remise_pct` seul | Faible → **nul** | WHEN exclut ces colonnes (vérifié). Smoke §5 sc. 9. |
| R8 | Backup 548k lignes | Faible | `pg_dump --format=custom` rapide (~100 Mo). Heure creuse. |

---

## 9. Livrables produits

| Fichier | Rôle |
|---|---|
| `PATCH_PHASE1_REMISE_LIGNE.sql` | Script transactionnel principal (DDL + 14 fonctions + vue + smoke) |
| `99_rollback_phase1_remise_ligne.sql` | Rollback schéma (DROP COLUMN + restauration vue) |
| `backup_phase1_pre_execution.sh` | Backup pré-exécution (4 dumps + 14 pg_get_functiondef + sommes) |
| `RAPPORT_PHASE1_REMISE_LIGNE.md` | Ce rapport |
| `FONCTIONS_SIGNEES_BACKEND.md` | Mis à jour — encart Phase 1 en tête du contrat d'interface |

---

## 10. Coordination avec `kader_backend`

- **Le contrat d'interface est mis à jour** : `FONCTIONS_SIGNEES_BACKEND.md` précise le nouveau
  format `articles_string` (3/4/5 champs), la règle du séparateur décimal `.` et la liste exhaustive
  des 14 fonctions impactées.
- **Signatures inchangées** : aucun breaking change Node.js. Les appels existants continuent de
  fonctionner (rétro-compat 3-champs).
- **Nouvelles colonnes exposées automatiquement** dans :
  - `get_proforma_details` (via `row_to_json`)
  - `get_my_factures1` (via vue `list_detailventes`)
  - `rechercher_multifacturecom` (via `json_build_object`)
- **Action `kader_backend`** : étendre le formateur `articles_string` côté front pour émettre les
  champs 4-5 quand une remise ligne est saisie. Cf. `INVENTAIRE_FRONTEND_REMISE_LIGNE.md`.

---

## 11. Ordre de déploiement

1. **BD d'abord** (ce script) — rétro-compatible, front ancien continue de marcher.
2. **Front ensuite** — `kader_backend` étend les services émetteurs d'`articles_string`.

Aucun耦合 : la BD accepte les 2 formats (3-champs et 5-champs) indistinctement.

---

## 12. Exécution réelle (24/07/2026) — Compte-rendu

### 12.1 Contexte

Le PO a tenté d'exécuter `backup_phase1_pre_execution.sh` et `PATCH_PHASE1_REMISE_LIGNE.sql` depuis
son poste Windows via `psql`, absent (`psql: command not found`). Un backup partiel (schéma seul de
`detail_facture_com`) a été produit dans
`C:/tmp/pgquery/backup_remise_ligne_20260724_135426/` puis **considéré incomplet et écarté**.
`dba_master` a repris intégralement la procédure via son accès serveur habituel (Node.js `pg`
depuis `C:\tmp\pgquery\`, aucun `psql`/`pg_dump` disponible non plus sur cette machine — tous les
backups ont donc été produits en SQL pur : `pg_get_functiondef`, `information_schema`, dumps JSON
data-only pour les petites tables).

### 12.2 Étape 1 — Vérification de l'état réel AVANT patch (discovery)

Script : `C:/tmp/pgquery/remise_00_discovery.js` → `remise_00_discovery_output.json`.

**Résultat : 0 écart avec les hypothèses du patch.**

- Les 4 tables existent, `remise_pct`/`prix_origine` **absentes** partout (0/8 colonnes).
- Aucune contrainte `chk_%remise_pct` présente.
- Vue `list_detailventes` dans sa forme originale (11 colonnes, sans `remise_pct`/`prix_origine`).
- **13 noms de fonctions → exactement 14 surcharges** (`create_facture_complete1` en a 2 : varchar
  et text), et **chaque signature (`identity_args`) correspond mot pour mot** à celle du patch —
  aucune surcharge inattendue, aucune fonction manquante.
- Volumétrie exacte (COUNT réel, pas l'estimation `pg_class.reltuples`) :
  `detail_facture_com` = **565 196** lignes (l'estimation `reltuples` à 548 593 dans le rapport
  initial et dans le script était une statistique `ANALYZE` périmée — sans impact, le
  `COUNT(*)` exact est la mesure de référence utilisée pour la vérification post-patch),
  `proforma_details` = 880, `bon_commande_details` = 4, `detail_devis` = 10.
- PostgreSQL 16.14 confirmé.

### 12.3 Étape 2 — Backups complets AVANT patch

Répertoire : **`C:/tmp/pgquery/backup_remise_ligne_20260724_140227/`**
(le dossier partiel `..._135426` du PO est laissé tel quel, non utilisé).

| Fichier | Contenu |
|---|---|
| `backup_functions_before_phase1.sql` | `pg_get_functiondef` exact des **14 surcharges** (rejouable tel quel pour rollback R5) |
| `01_schema_detail_facture_com_before.json` | Colonnes + contraintes + index (6 col, 3 contraintes, 7 index) |
| `01_schema_proforma_details_before.json` | idem (7 col, 2 contraintes, 2 index) |
| `01_schema_bon_commande_details_before.json` | idem (7 col, 5 contraintes, 3 index) |
| `01_schema_detail_devis_before.json` | idem (5 col, 3 contraintes, 3 index) |
| `data_proforma_details_before.json` | Dump data-only complet JSON (880 lignes) |
| `data_bon_commande_details_before.json` | Dump data-only complet JSON (4 lignes) |
| `data_detail_devis_before.json` | Dump data-only complet JSON (10 lignes) |
| `02_count_detail_facture_com_before.json` | `COUNT(*)`=565196, `SUM(quantite*prix)`=8 151 941 986 (pas de dump data — 113 Mo, ALTER metadata-only, colonnes NULL, restauration = simple `DROP COLUMN`) |
| `20_view_list_detailventes_before.sql` | `CREATE OR REPLACE VIEW` — définition originale exacte (11 colonnes) |
| `30_sommes_avant.json` | Sommes de contrôle des 4 tables (sanity check post-rollback éventuel) |

### 12.4 Étape 3 — Exécution du patch

Script : `C:/tmp/pgquery/remise_02_apply_patch.js` (transaction unique `BEGIN;...COMMIT;`, exécutée
en protocole simple node-pg — Postgres exécute les statements en séquence et s'arrête au premier
échec ; le `COMMIT` final n'est jamais atteint si une étape échoue, garantissant l'atomicité).

**⚠️ Déviation vs script initial — ÉTAPE 3 (vue `list_detailventes`)**

Premier essai (2026-07-24 14:02) → **ÉCHEC** :
```
ERREUR: cannot change name of view column "marge" to "remise_pct"
HINT: Use ALTER VIEW ... RENAME COLUMN ... to change name of view column instead.
```
Cause : la version initiale du patch insérait `remise_pct, prix_origine` **entre** `prix` et
`marge`, décalant la position physique de `marge` de 8 à 10. `CREATE OR REPLACE VIEW` n'autorise
**que l'ajout de colonnes en fin de liste**, jamais un réordonnancement/insertion au milieu.
Transaction proprement annulée (ROLLBACK automatique côté serveur), base intacte, vérifié par
requête (0/8 colonnes toujours après l'échec).

**Fix appliqué** (fichier `PATCH_PHASE1_REMISE_LIGNE.sql` modifié sur disque, ÉTAPE 3 uniquement) :
les 2 nouvelles colonnes sont désormais ajoutées **en fin de `SELECT`**, après `description`,
en conservant l'ordre exact des 11 colonnes d'origine. Sans impact fonctionnel :
`get_my_factures1`/`rechercher_multifacturecom` lisent ces colonnes **par nom**
(`json_build_object`), pas par position. **Le fichier `.sql` versionné dans le repo diffère donc
de sa version initiale — le diff git ne concerne que l'ÉTAPE 3 (ordre des colonnes de la vue)**,
aucune autre étape modifiée.

Deuxième essai (2026-07-24 14:15) → **✅ SUCCÈS, COMMIT en 829 ms.**

### 12.5 Étape 4 — Smoke tests structurels post-COMMIT

Intégrés au script d'exécution, résultats dans `remise_03_smoke_post_patch.json` :

| Vérification | Attendu | Obtenu |
|---|---|---|
| Colonnes `remise_pct`/`prix_origine` (4 tables) | 8 lignes | ✅ 8 lignes |
| Contraintes CHECK `chk_%remise_pct` | 4 | ✅ 4 (`chk_bon_commande_remise_pct`, `chk_detail_devis_remise_pct`, `chk_detail_facture_remise_pct`, `chk_proforma_remise_pct`) |
| Surcharges `create_facture_complete1` | 2 (varchar + text) | ✅ 2, identités exactes confirmées |
| `COUNT(*)` exact 4 tables (vs AVANT) | Identique | ✅ 565196/880/4/10 — **inchangé** |
| Vue `list_detailventes` expose les 2 colonnes | oui | ✅ |
| Lignes historiques `remise_pct`/`prix_origine` NULL | = total (aucune régression) | ✅ 565196/880/4/10 NULL partout |

### 12.6 Étape 4 (suite) — Vérifications fonctionnelles (runtime, `BEGIN...ROLLBACK`)

Script : `C:/tmp/pgquery/remise_04_functional_tests.js` (structure test **183 — TECH24**, produit
`1052 "Casa 79"` prix_vente=32.00, utilisateur `202` admin actif). **21/21 tests PASS.**
Résultats complets : `remise_05_functional_tests_results.json`.

| # | Test | Résultat |
|---|---|---|
| T1 | `create_facture_complete1` (varchar) format **3 champs** `"1052-3-32#"` | success=true, `remise_pct=NULL`/`prix_origine=NULL`, montant=96 (rétro-compat intacte) |
| T2 | idem format **5 champs** `"1052-3-32-12.5-32.00#"` | success=true, `remise_pct=12.50`/`prix_origine=32.00` persistés, **montant=96 inchangé** |
| T3 | idem format **4 champs** `"1052-2-32-12#"` | success=true, `remise_pct=12.00`/`prix_origine=NULL` |
| T4 | `create_facture_complete1` **surcharge TEXT** format 3 champs | success=true, retour `nb_details`/`details_ids` (identité TEXT distincte de VARCHAR confirmée — R1 traité) |
| T5 | INSERT avec `remise_pct=150` | success=**false**, message `violates check constraint "chk_detail_facture_remise_pct"` (catché en interne par la fonction, transaction non abortée) |
| T6 | `create_proforma` 5 champs + `get_proforma_details` | proforma créée, `get_proforma_details` expose `remise_pct=12.5`/`prix_origine=32` via `row_to_json` (aucun patch requis, confirmé) |
| T7 | `convert_proforma_to_facture` | `detail_facture_com` reçoit **les mêmes** `remise_pct=12.50`/`prix_origine=32.00` que la proforma source, montant facture=96 identique |
| T8 | `UPDATE detail_facture_com SET remise_pct=20` seul | `facture_com.montant` **inchangé** avant/après (96.00 → 96.00) — trigger `WHEN` confirmé neutre sur ces 2 colonnes |
| T9 | `modifier_facturecom` format 5 champs sur facture PAYÉE du jour | success=true, `remise_pct=15.00`/`prix_origine=32.00` reportés dans `detail_facture_com`, montant recalculé=64 (2×32, remise ligne neutre) |
| T10 | `rechercher_multifacturecom` + `get_my_factures1` | les 2 exposent `remise_pct`/`prix_origine` dans le JSON `details` |

**Tests bonus** (script `C:/tmp/pgquery/remise_06_bc_smoke.js`, structure **218**, fournisseur
`id=2`, produit `150819`) :
- `create_bon_commande` 5 champs `"150819-2-60-10.5-70.00#"` → success=true, `remise_pct=10.50`/
  `prix_origine=70.00` persistés dans `bon_commande_details`.
- `edit_bon_commande` avec 3 champs `"150819-3-60#"` sur le même BC → success=true,
  `remise_pct=NULL`/`prix_origine=NULL` après ré-édition (rétro-compat confirmée).

**Fonctions patchées non exercées au runtime** (CREATE OR REPLACE syntaxiquement valide — le script
complet a COMMIT sans erreur — mais logique 3/4/5-champs non testée en exécution) :
`edit_proforma`, `create_facture_complete` (ancienne, non appelée en prod selon décision 3),
`create_facture_online`, `add_new_devis_complet`, `maj_devis`. À tester avant tout chantier front
qui s'appuierait spécifiquement sur l'une de ces fonctions.

**Toutes les transactions de test ont été ROLLBACK.** Vérification post-rollback : aucun des
`id_facture` de test (158210-158213, 158215) ni la proforma de test (id=70) ni le bon de commande
de test (structure 218) ne persiste en base. Une seule ligne pré-existante matche le filtre
générique de contrôle (`id_facture=298`, structure 139, "Test facture multiple", datée du
23/07/2026 — antérieure à cette session, sans rapport).

### 12.7 Étape 5 — Documentation mise à jour

- `RAPPORT_PHASE1_REMISE_LIGNE.md` (ce fichier) — présente section 12.
- `FONCTIONS_SIGNEES_BACKEND.md` — statut passé à EXÉCUTÉ, déviation documentée, colonne "Vérifié"
  ajoutée au tableau des 14 surcharges.
- **Aucun commit git** effectué (le PO s'en charge, conformément à la consigne).

### 12.8 Rollback — vérification (non exécuté, lecture de contrôle)

`99_rollback_phase1_remise_ligne.sql` relu : DROP des 4 CHECK (idempotent `IF EXISTS`), puis
`DROP VIEW IF EXISTS list_detailventes` (pas de `CASCADE` — échouera proprement s'il existe des
vues dépendantes plutôt que de les supprimer silencieusement), `DROP COLUMN` sur les 4 tables, puis
**recréation de la vue dans sa forme ORIGINALE à 11 colonnes** (identique au dump
`20_view_list_detailventes_before.sql`), et enfin rejeu de `backup_functions_before_phase1.sql`
(ÉTAPE R5, hors transaction). **Cohérent avec l'exécution réelle** — le fix de l'ÉTAPE 3 (append en
fin de vue) ne remet pas en cause ce script de rollback : le `DROP VIEW` supprime la vue quelle que
soit sa définition, et R4 recrée l'originale à l'identique du backup.

### 12.9 Fichiers de travail produits (hors repo, `C:\tmp\pgquery\`)

`remise_00_discovery.js/.json`, `remise_01_backup.js`, `remise_02_apply_patch.js`,
`remise_03_smoke_post_patch.json`, `remise_04_functional_tests.js`,
`remise_05_functional_tests_results.json`, `remise_06_bc_smoke.js`,
`backup_remise_ligne_20260724_140227/` (backups complets).

---

*Rapport produit par `dba_master` le 24/07/2026 — Phase 1 exécutée et validée en production.*
