# Contrat d'interface DBA — Fonctions PostgreSQL exposées au backend

> Propriété **dba_master**. Ce fichier est la liste signée des fonctions que `kader_backend`
> peut appeler depuis Node.js / Python.
>
> Toute modification de signature = **breaking change** à coordonner explicitement.
> Toute nouvelle fonction doit être ajoutée ici avant utilisation en production.
>
> Dernière mise à jour : 2026-07-24 (Phase 1 — Persistance remise par ligne — **EXÉCUTÉE EN PROD**)

---

## ✅ CHANTIER PHASE 1 — Persistance remise par ligne (24/07/2026) — EXÉCUTÉ

**Statut : DÉPLOYÉ EN PRODUCTION** sur `fayclick_db` le 24/07/2026 par `dba_master` (exécution directe,
psql absent du poste PO). COMMIT confirmé, 21 tests fonctionnels PASS (voir
`RAPPORT_PHASE1_REMISE_LIGNE.md` §12 Exécution). **Aucun breaking change** de signature — le format
`articles_string` ci-dessous est disponible immédiatement, le front peut commencer à émettre les
champs 4-5 dès maintenant (rétro-compat 3-champs garantie, testée).

**Déviation notable vs script initial** : l'ÉTAPE 3 (vue `list_detailventes`) plaçait
`remise_pct`/`prix_origine` entre `prix` et `marge`, ce que `CREATE OR REPLACE VIEW` interdit
(réordonnancement de colonne). Corrigé en ajoutant les 2 colonnes en **fin** de liste (après
`description`). Détail dans `RAPPORT_PHASE1_REMISE_LIGNE.md` §12.2.

### Changement d'interface (NON breaking sur les signatures)

Les **signatures de toutes les fonctions ci-dessous restent strictement identiques**.
Le changement porte uniquement sur le **format du paramètre `p_articles_string`** qui accepte
désormais **2 champs optionnels supplémentaires** :

| Format | Exemple | Sémantique |
|---|---|---|
| 3 champs (rétro-compat) | `"4682-3-176#"` | Inchangé — `remise_pct=NULL, prix_origine=NULL` |
| 4 champs | `"4682-3-176-12.5#"` | Remise ligne persistée (`12.5%`) |
| 5 champs | `"4682-3-176-12.5-200#"` | Ligne autoporteuse (`prix_origine=200`) |

### ⚠️ Contrat fort côté `kader_backend`

- **Séparateur de champs** : `-` (tiret). **Séparateur décimal : `.` (point)**, jamais `,`.
  Le cast `::NUMERIC` échouerait sur une virgule (erreur SQLSTATE 22P02).
- Lignes 2-champs ou 6+ champs **rejetées** (`NOT BETWEEN 3 AND 5`).
- Lignes mixtes autorisées dans la même facture : `"4682-3-176-12.5-200#887-2-25000#"`.
- `prix_origine` est **informatif** (prix public avant remise). Aucune CHECK sur la relation
  `prix_origine >= prix` (permet la vente en gros où `prix > prix_origine` public).

### Fonctions impactées (14 surcharges au total)

Colonne **Vérifié** : ✅ = exécutée réellement en base (BEGIN...ROLLBACK) le 24/07/2026 avec
assertions sur le JSON retourné et les lignes insérées. ⚠️ = `CREATE OR REPLACE` appliqué et
syntaxiquement valide (le script complet a COMMIT sans erreur), mais **non exercée au runtime** —
à tester avant de bâtir dessus côté front si le module correspondant est mis en chantier.

| # | Fonction | Surcharges | Changement | Vérifié |
|---|---|---|---|---|
| 1 | `create_proforma` | 1 | garde `3..5` + INSERT étendu proforma_details | ✅ |
| 2 | `edit_proforma` | 1 | garde + lecture 4-5 + re-INSERT étendu | ⚠️ |
| 3 | `convert_proforma_to_facture` | 1 | propagation string 5-champs | ✅ |
| 4 | `create_facture_complete1` (varchar) | 1 | garde `3..5` + INSERT étendu | ✅ (3/4/5 champs + CHECK reject) |
| 5 | `create_facture_complete1` (text) | 1 | idem (R1 élevé — 2 surcharges conservées) | ✅ (identité TEXT confirmée distincte) |
| 6 | `create_facture_complete` (ancien) | 1 | idem (patché par sécurité) | ⚠️ |
| 7 | `create_facture_online` | 1 | idem | ⚠️ |
| 8 | `create_bon_commande` | 1 | garde `3..5` + INSERT étendu bon_commande_details | ✅ (structure 218) |
| 9 | `edit_bon_commande` | 1 | idem | ✅ (structure 218, retro-compat 3 champs) |
| 10 | `add_new_devis_complet` | 1 | garde + INSERT étendu detail_devis | ⚠️ |
| 11 | `maj_devis` | 1 | idem | ⚠️ |
| 12 | `modifier_facturecom` | 1 | garde + UPDATE/INSERT étendus + log audit étendu | ✅ |
| 13 | `rechercher_multifacturecom` | 1 | 2 `json_build_object` +`remise_pct`/`prix_origine` | ✅ |
| 14 | `get_my_factures1` | 1 | 2 `json_build_object` +`remise_pct`/`prix_origine` (via vue) | ✅ |

### Colonnes ajoutées (4 tables)

```sql
-- Toutes NULL par défaut (préserve l'historique 548k lignes)
ALTER TABLE detail_facture_com   ADD COLUMN remise_pct NUMERIC(5,2),  ADD COLUMN prix_origine NUMERIC(10,2);
ALTER TABLE proforma_details     ADD COLUMN remise_pct NUMERIC(5,2),  ADD COLUMN prix_origine NUMERIC(10,2);
ALTER TABLE bon_commande_details ADD COLUMN remise_pct NUMERIC(5,2),  ADD COLUMN prix_origine NUMERIC(10,2);
ALTER TABLE detail_devis         ADD COLUMN remise_pct NUMERIC(5,2),  ADD COLUMN prix_origine NUMERIC(10,2);
```

CHECK `remise_pct IS NULL OR (remise_pct BETWEEN 0 AND 100)` sur les 4 tables.

### Affichage : `get_proforma_details` auto-exposé

`get_proforma_details(p_id_proforma, p_id_structure) RETURNS json` — expose **automatiquement**
les 2 nouvelles colonnes via `row_to_json(proforma_details)` (aucun patch requis).

### Références

- Script SQL : `docs/database/PATCH_PHASE1_REMISE_LIGNE.sql`
- Rollback : `docs/database/99_rollback_phase1_remise_ligne.sql`
- Backup pre-exec : `docs/database/backup_phase1_pre_execution.sh`
- Rapport : `docs/database/RAPPORT_PHASE1_REMISE_LIGNE.md`
- Rapport Phase 0 : `docs/database/PLAN_PHASE0_PERSISTANCE_REMISE_LIGNE.md`

---

## Convention d'appel (rappel)

```typescript
// Pattern de consommation côté Node.js
const res = await DatabaseService.executeFunction('nom_fonction', [param1, param2]);
// ou via requête directe :
// SELECT nom_fonction($1, $2, ...) AS result
// → vérifier typeof result === 'string' avant JSON.parse()
```

---

## Module Commerce — Factures

### `create_facture_complete1`

```sql
create_facture_complete1(
    p_date_facture      date,
    p_id_structure      integer,
    p_tel_client        varchar,
    p_nom_client_payeur varchar,
    p_montant           numeric,
    p_description       varchar,           -- surcharge varchar
    p_articles_string   text,              -- format "id-qty-prix#id-qty-prix#..."
    p_mt_remise         numeric DEFAULT 0,
    p_mt_acompte        numeric DEFAULT 0,
    p_avec_frais        boolean DEFAULT false,
    p_est_devis         boolean DEFAULT false,
    p_id_utilisateur    integer DEFAULT 0
) RETURNS TABLE(id_facture integer, success boolean, message text,
                detail_ids integer[], detail_count integer)
```

Déployée : avant 2026-01
Statut : stable

---

### `add_acompte_facture`

```sql
add_acompte_facture(
    pid_structure    integer,
    pid_facture      integer,
    pmontant_acompte numeric,
    ptransactionid   varchar DEFAULT '',
    puuid            varchar DEFAULT 'face2face',
    pmode_paiement   varchar DEFAULT 'CASH',
    ptel_client      varchar DEFAULT '771234567'
) RETURNS json
```

Retourne : `{success, code, facture{...}, paiement{...}, detail_facture, recus_paiement}`

**ATTENTION** : Contient `UPDATE facture_com SET montant = montant - mt_remise` — NE PAS utiliser
pour la réconciliation dans `modifier_facturecom` (bug soustraction double). Utiliser uniquement
pour l'encaissement initial d'une nouvelle facture.

Déployée : avant 2026-01
Statut : stable (bug documenté, non bloquant pour usage nominal)

---

### `modifier_facturecom` — 2026-06-06 (v1.2)

```sql
modifier_facturecom(
    pid_structure     integer,
    pid_facture       integer,
    pid_utilisateur   integer,    -- utilisateur.id (pas id_utilisateur)
    p_articles_string varchar,    -- format "id-qty-prix#id-qty-prix#..."
    p_mt_remise       numeric
) RETURNS json
```

**But** : Modifier in-place une vente commerce **payée du jour** (articles + remise).
Conserve `id_facture` et `num_facture`. Vente reste PAYEE (`mt_restant=0`, `id_etat=2`).

**Retour succès** :
```json
{
  "success": true,
  "id_facture": 154466,
  "num_facture": "FAC-202606-218-0348",
  "net_avant": 2500,
  "net_apres": 3500,
  "ecart": 1000,
  "type_ajustement": "COMPLEMENT",
  "complement_a_encaisser": 1000,
  "monnaie_a_rendre": 0,
  "message": "Vente modifiee avec succes",
  "timestamp_operation": "2026-06-06T19:55:21.855Z"
}
```

**Retour erreur** :
```json
{
  "success": false,
  "code": "DATE_LOCKED",
  "message": "Seules les ventes du jour sont modifiables",
  "step": "DATE_GUARD",
  "sql_state": "..."
}
```

**Codes d'erreur** :

| Code | Condition |
|---|---|
| `INVOICE_NOT_FOUND` | `id_facture` introuvable |
| `INVOICE_WRONG_STRUCTURE` | Facture hors périmètre structure |
| `DATE_LOCKED` | `date_facture <> CURRENT_DATE` |
| `NOT_PAID` | `id_etat <> 2` |
| `INVOICE_REVERSED` | `mt_reverser = true` |
| `USER_NOT_FOUND` | Utilisateur inactif ou hors structure |
| `EMPTY_ARTICLES` | Liste articles vide |
| `INVALID_ARTICLE_FORMAT` | Parsing `id-qty-prix` échoué |
| `INVALID_REMISE` | `p_mt_remise < 0` ou `>= sous-total` |
| `MODIFICATION_ERROR` | Exception PG (rollback automatique) |

**Effets de bord** :
- Écrit dans `detail_facture_com` (UPDATE/DELETE/INSERT)
- Écrit dans `mouvement_stock` (mouvements compensatoires delta net)
- Écrit dans `recus_paiement` : UNIQUEMENT si COMPLEMENT (ecart > 0). Pas d'INSERT pour REMBOURSEMENT (CHECK montant_paye > 0 est un invariant correct)
- Écrit dans `journal_compte` (ligne crédit si COMPLEMENT, débit si REMBOURSEMENT)
- Écrit dans `log_modifications_factures` (toujours, snapshot avant/après)

**Exemple d'appel** :
```typescript
const res = await DatabaseService.executeFunction('modifier_facturecom', [
  idStructure,       // integer
  idFacture,         // integer
  idUtilisateur,     // integer  ← utilisateur.id
  articlesString,    // "138757-4-500#138759-1-1500"
  nouvelleRemise     // numeric, 0 si pas de remise
]);
const result = typeof res === 'string' ? JSON.parse(res) : res;
```

Déployée : 2026-06-06 — **v1.2** (CRIT-001 REMBOURSEMENT fix + MIN-003 baseline fix)
Statut : stable — Dual E2E validé structure 218 (PATH A REMBOURSEMENT 9/9 + PATH B COMPLEMENT 8/8)
PRD : `docs/prd-modification-vente-jour-2026-06-06.md`
Dump SQL : `docs/dba/scripts/prod-modifier_facturecom-2026-06-06.sql`
Doc DBA : `docs/dba/rapport-modifier-facturecom-2026-06-06.md`

---

## Module Commerce — Stock

### `get_etat_stock`

```sql
get_etat_stock(pid_structure integer)
RETURNS TABLE(id_produit, nom_produit, cout_revient, prix_vente, nom_categorie,
              qte_entree_stock, qte_sortie_stock, qte_vendue, stock_theorique, ecart)
```

Stock = somme des mouvements (confirmé audit 2026-06-06 — aucun solde caché sur `produit_service`).

Déployée : avant 2026-01
Statut : stable

---

## Module Commerce — Suppression factures

### `supprimer_facturecom_admin`

```sql
supprimer_facturecom_admin(
    pid_structure    integer,
    pid_facture      integer,
    pid_utilisateur  integer,    -- utilisateur.id
    p_password       varchar,
    p_raison         text DEFAULT NULL
) RETURNS json
```

Réservé aux profils admin (id_profil IN (1, 2)). Vérification mot de passe obligatoire.
Écrit dans `log_suppressions_factures` + mouvements ENTREE stock avant DELETE CASCADE.

Déployée : 2026-04-21
Statut : stable

---

## Module Commerce — Clients

### `get_list_clients`

```sql
get_list_clients(pid_structure integer, ptel_client varchar DEFAULT NULL)
RETURNS TABLE(...)
```

Déployée : avant 2026-01
Statut : stable

---

## Module Structures

### `get_une_structure`

```sql
get_une_structure(pid_structure integer) RETURNS json
```

Retourne JSON complet avec `param_structure` (credit_autorise, acompte_autorise, prix_engros,
compte_prive, info_facture, config_facture, etc.).

Déployée : avant 2026-01 — patchée 2026-04-26 (masquage hash bcrypt)
Statut : stable

### `edit_param_structure`

```sql
edit_param_structure(
    p_id_structure      integer,
    p_credit_autorise   boolean DEFAULT NULL,
    p_limite_credit     numeric DEFAULT NULL,
    p_acompte_autorise  boolean DEFAULT NULL,
    p_prix_engros       boolean DEFAULT NULL,
    p_info_facture      json    DEFAULT NULL,   -- merge côté serveur
    p_config_facture    json    DEFAULT NULL    -- remplacement complet
) RETURNS json
```

Déployée : avant 2026-01 — patchée 2026-05-24 (17 args réseau distribution)
Statut : stable

---

## Module Abonnements

### `calculer_montant_abonnement`

```sql
calculer_montant_abonnement(type varchar, date_debut date) RETURNS numeric
```

### `add_abonnement_structure`

```sql
add_abonnement_structure(id_structure integer, type varchar, methode varchar, ...)
RETURNS json
```

### `renouveler_abonnement`

```sql
renouveler_abonnement(id_structure integer, type varchar, methode varchar)
RETURNS json
```

### `historique_abonnements_structure`

```sql
historique_abonnements_structure(id_structure integer, limite integer)
RETURNS TABLE(...)
```

Déployées : 2026-05-02
Statut : stable

---

## Module Wallet (KALPE)

### `get_soldes_wallet_structure`

```sql
get_soldes_wallet_structure(pid_structure integer) RETURNS json
```

### `get_wallet_structure`

```sql
get_wallet_structure(pid_structure integer) RETURNS json
```

### `add_retrait_marchand`

```sql
add_retrait_marchand(
    pid_structure    integer,
    ptransactionid   varchar,
    ptelnumber       varchar,
    pamount          numeric,
    pmethode         varchar,    -- 'OM' | 'WAVE'
    pfrais           integer     -- laisser 0
) RETURNS json
```

Appeler UNIQUEMENT après succès API `send_cash`. Ne jamais appeler en cas d'échec API.

Déployées : avant 2026-01
Statut : stable

---

## Module Proformas

### `create_proforma` / `edit_proforma` / `delete_proforma`

### `convert_proforma_to_facture`

### `get_list_proformas` / `get_proforma_details`

Déployées : 2026-03-13
Statut : stable (branche feature/factures-proformes)

---

## Module Dashboard Commerce

### `get_dashboard_commerce_complet`

```sql
get_dashboard_commerce_complet(pid_structure integer, pperiode_top varchar DEFAULT 'mois')
RETURNS json
```

Retourne : `{success, kpis, graphique_semaine, top_articles, top_clients,
dernieres_factures, stats_globales, depenses_mois}`

Déployée : 2026-03-05
Statut : stable
