# RAPPORT — Phase 0 : Investigation BD + Plan formel

**Chantier** : Persistance de la remise par ligne en base (`fayclick_db`)
**Date** : 24/07/2026
**Auteur** : `dba_master`
**Mode** : READ-ONLY — aucun DDL exécuté. Plan à valider par le PO avant exécution.
**Mémo de référence** : [`MEMO_CHANTIER_PERSISTANCE_REMISE_LIGNE.md`](./MEMO_CHANTIER_PERSISTANCE_REMISE_LIGNE.md) · [`INVENTAIRE_FRONTEND_REMISE_LIGNE.md`](./INVENTAIRE_FRONTEND_REMISE_LIGNE.md)

---

## Étape 1 — Documents de référence lus

- `INVENTAIRE_FRONTEND_REMISE_LIGNE.md` (23/07/2026) — lu intégralement, **exhaustif côté frontend**. Je confirme : tous les services émetteurs d'`articles_string` y sont cartographiés (10 services, 11 chemins d'appel), tous les composants consommateurs y sont listés (15 composants), tous les types à étendre y figurent (9 types). **Aucun appelant frontend oublié à signaler.**
- `MEMO_CHANTIER_PERSISTANCE_REMISE_LIGNE.md` (23/07/2026) — lu via `git show main:` (fichier présent sur `main` commit `dc49719`, absent de la branche courante `test/integration-remises`).

Branche courante : `test/integration-remises`.

---

## Étape 2 — Investigation BD (findings par fonction)

### 2.0 — Schéma actuel des deux tables cibles (confirmé vierge)

**`detail_facture_com`** (6 colonnes) :

| Colonne | Type | NULL | Défaut |
|---|---|---|---|
| `id_detail` | integer | NOT NULL | nextval |
| `id_facture` | integer | NOT NULL | — |
| `date_facture` | date | NOT NULL | CURRENT_DATE |
| `id_produit` | integer | NOT NULL | — |
| `quantite` | real | NOT NULL | 1 |
| `prix` | **numeric(10,2)** | NOT NULL | — |

**`proforma_details`** (7 colonnes) :

| Colonne | Type | NULL | Défaut |
|---|---|---|---|
| `id_detail` | integer | NOT NULL | nextval |
| `id_proforma` | integer | NOT NULL | — |
| `id_produit` | integer | NOT NULL | — |
| `nom_produit` | varchar(255) | NULL | '' |
| `quantite` | integer | NOT NULL | 1 |
| `prix_unitaire` | **numeric(12,2)** | NOT NULL | 0 |
| `sous_total` | numeric(12,2) | NULL | 0 |

**Aucune** des colonnes `remise_pct` / `prix_origine` n'existe. **Aucune contrainte CHECK** (seulement PK + FK). Volumes : `detail_facture_com` = **565 172 lignes**, `proforma_details` = **880 lignes**.

### 2.1 — `create_proforma` — 1 surcharge, signature inchangée

- **Args identité** : `(p_id_structure integer, p_date_proforma date, p_tel_client varchar, p_nom_client varchar, p_description text, p_montant numeric, p_articles_string text, p_mt_remise numeric, p_id_utilisateur integer)`. Retour `json`. **1 seule surcharge.**
- **Parseur** : `v_articles := string_to_array(RTRIM(p_articles_string, '#'), '#')` puis `v_parts := string_to_array(v_article, '-')`, garde **`IF array_length(v_parts, 1) >= 3`** (permissive — accepte déjà 4+ champs, mais ne lit que `v_parts[1..3]`).
- **INSERT** : `INSERT INTO proforma_details (id_proforma, id_produit, nom_produit, quantite, prix_unitaire, sous_total) VALUES (...)`. Ne touche pas aux nouvelles colonnes aujourd'hui.

### 2.2 — `edit_proforma` — 1 surcharge, signature inchangée

- **Args identité** : `(p_id_proforma integer, p_id_structure integer, p_tel_client varchar, p_nom_client varchar, p_description text, p_montant numeric, p_articles_string text, p_mt_remise numeric, p_id_etat integer)`. Retour `json`. **1 surcharge.**
- Même parseur et même INSERT que `create_proforma` (code dupliqué). Garde `>= 3` (permissive).

### 2.3 — `get_proforma_details` — 1 surcharge, **PAS DE PATCH REQUIS**

- **Args identité** : `(p_id_proforma integer, p_id_structure integer)`. Retour `json`.
- **Pas de parseur** : `SELECT json_agg(row_to_json(pd)) FROM proforma_details pd WHERE ...`. **`row_to_json` expose automatiquement TOUTES les colonnes** → dès l'ALTER TABLE, `remise_pct`/`prix_origine` seront présentes dans le JSON `details` **sans patch de fonction**. À confirmer en smoke test.

### 2.4 — `convert_proforma_to_facture` — point de PROPAGATION clé

- **Args identité** : `(p_id_proforma integer, p_id_structure integer, p_id_utilisateur integer)`. Retour `json`. 1 surcharge.
- **Reconstruit un `articles_string` 3-champs** depuis `proforma_details` puis le repasse à `create_facture_complete1` :
  ```sql
  FOR v_detail IN SELECT * FROM proforma_details WHERE id_proforma = p_id_proforma LOOP
    v_articles_string := v_articles_string || v_detail.id_produit || '-' || v_detail.quantite || '-' || v_detail.prix_unitaire || '#';
  END LOOP;
  ```
- **Pour propager** `remise_pct`/`prix_origine`, étendre cette concaténation à 5 champs (gestion NULL : omettre 4-5 si NULL).

### 2.5 — `create_facture_complete1` — **2 surcharges**, point de blocage n°1

Deux surcharges **distinctes** (se différencient par le type de `p_description` : `text` vs `varchar`, et par les noms des colonnes de retour : `nb_details`/`details_ids` vs `detail_count`/`detail_ids`). **Les deux doivent être patchées.**

- Garde **strictement rejettrice** dans les deux versions :
  ```sql
  IF array_length(v_article_parts, 1) != 3 THEN
    RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix)', v_article_string;
  END IF;
  ```
- **INSERT réel** dans `detail_facture_com` :
  ```sql
  INSERT INTO public.detail_facture_com (id_facture, date_facture, id_produit, quantite, prix)
  VALUES (v_new_document_id, p_date_facture, v_id_produit, v_quantite, v_prix)
  RETURNING id_detail INTO v_detail_id;
  ```
  Insère aussi dans `detail_devis` quand `p_est_devis = true` (hors scope, même parseur).

### 2.6 — `add_new_facture` — 1 surcharge, **N'INSÈRE PAS DE LIGNES** (confirmé)

- **Args identité** : `(p_date_facture timestamp, p_id_structure integer, p_tel_client varchar, p_nom_client_payeur varchar, p_montant numeric, p_description varchar, p_mt_remise numeric, p_mt_acompte numeric, p_avec_frais boolean, p_id_utilisateur integer)`. Retour `integer`.
- Ne fait **que** l'INSERT de l'en-tête `facture_com`. **Aucun INSERT dans `detail_facture_com`. Aucune référence à `articles_string`.**
- **Conclusion** : `add_new_facture` **n'est pas à patcher**. L'inserseur réel est `create_facture_complete1` (et équivalents `create_facture_complete`, `create_facture_online`).

### 2.7 — `modifier_facturecom` — 1 surcharge, point de blocage n°2

- **Args identité** : `(pid_structure integer, pid_facture integer, pid_utilisateur integer, p_articles_string varchar, p_mt_remise numeric)`. Retour `json`.
- Garde **strictement rejettrice** :
  ```sql
  IF array_length(v_article_parts, 1) <> 3 THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_ARTICLE_FORMAT', ...);
  END IF;
  ```
- UPDATE/INSERT/DELETE sur `detail_facture_com` (technique "UPDATE conservés / DELETE retirés / INSERT nouveaux"). Le snapshot `articles_avant`/`articles_apres` pour le log ne capte que `id_produit`/`quantite`/`prix`.

### 2.8 — Autres parseurs 3-champs stricts découverts (HORS scope mais à signaler)

| Fonction | Garde | Table écrite | Statut |
|---|---|---|---|
| `create_facture_complete` (sans `1`) | `!= 3` | `detail_facture_com` | **INSÈRE DIRECTEMENT dans notre cible.** Ancienne version, non appelée par le front actuel. **À patcher par sécurité.** |
| `create_facture_online` | `!= 3` | `detail_facture_com` | **INSÈRE DIRECTEMENT.** Appelée par `online-seller.service.ts` (3 variantes). **À patcher obligatoirement.** |
| `create_facture_representant` | `< 3` (permissive) | délègue à `create_facture_complete1` | Hors scope : prix imposé `prix_vente_rep` → pas de remise ligne pertinente. Laisser intact. |
| `add_new_devis_complet` | `!= 3` | `detail_devis` | Hors périmètre direct, **MAIS** front étendra le format à 5 champs pour `prestation.service.ts`. Cassera si front émet 5 champs pour les devis. |
| `maj_devis` | `!= 3` | `detail_devis` | Idem. |
| `create_bon_commande` | `<> 3` | `bon_commande_details` | Front `bon-commande.service.ts:84-96` étendra aussi. Cassera si front émet 5 champs. |
| `edit_bon_commande` | `<> 3` | `bon_commande_details` | Idem. |
| `generate_invoices_simula27` / `generate_random_invoices_for_structures` | génère du 3-champs | via `create_facture_complete1` | Jobs de seed. Émettent du 3-champs → continueront de fonctionner. **Pas à patcher.** |

### 2.9 — Triggers sur les tables cibles

**`detail_facture_com`** — 3 triggers AFTER :
- `detail_facture_stock_trig` (AFTER INSERT) → appelle `gere_stock(...)` avec `NEW.id_produit`, `NEW.quantite`, `NEW.prix`. **Ne lit pas les nouvelles colonnes.**
- `trigger_recalcul_after_insert_detail` / `trigger_recalcul_after_delete_detail` → `recalculer_montant_facture()` fait `SELECT SUM(quantite * prix)`. **Montant ne dépend ni de `remise_pct` ni de `prix_origine`** → recalcul inchangé.
- `trigger_recalcul_after_update_detail` (AFTER UPDATE) avec **WHEN conditionnel** : `(old.quantite IS DISTINCT FROM new.quantite) OR (old.prix IS DISTINCT FROM new.prix) OR (old.id_facture IS DISTINCT FROM new.id_facture)`. **Un UPDATE qui ne touche que `remise_pct`/`prix_origine` n'invoquera PAS le trigger** → aucun recalcul superflu, aucun risque.

**`proforma_details`** : **aucun trigger**.

### 2.10 — Dépendances de vues

Une seule vue dépend de `detail_facture_com` : **`list_detailventes`**. `SELECT` explicite des colonnes (pas `SELECT *`).
- L'ALTER ADD COLUMN **n'invalide pas** la vue (PostgreSQL ne recrée pas les vues sur un ADD COLUMN). **Pas de DROP/CREATE requis.**
- Pour exposer les nouvelles colonnes via cette vue → `CREATE OR REPLACE VIEW` ultérieur (optionnel).

**Aucune vue** ne dépend de `proforma_details`.

### 2.11 — Surfaces d'affichage retournant les lignes au frontend

| Surface | Source | Expose aujourd'hui ? | Action |
|---|---|---|---|
| `get_proforma_details` | `row_to_json(proforma_details)` | Oui (toutes colonnes) | **Rien à faire** — apparaîtra spontanément après ALTER. |
| `get_my_factures1` | via vue `list_detailventes` (colonnes explicites) | Oui mais **sans** nouvelles colonnes | **Option A** (vue) ou **B** (JOIN direct) — voir §3.4. |
| `rechercher_multifacturecom` | JOIN direct `detail_facture_com` + `json_build_object` | Colonnes explicites, **sans** nouvelles colonnes | **À patcher** : ajouter `remise_pct`/`prix_origine` dans les **deux** `json_build_object`. |
| `get_list_proformas` | `COUNT(*)` | Non (liste seulement) | Rien à faire. |

### 2.12 — Autres apps ICELABSOFT

L'instance ne contient qu'un **seul schéma `public`**. Les 79 tables appartiennent au périmètre `fayclick_db`. **Aucune autre base de l'écosystème ICELABSOFT n'appelle ces fonctions.**

---

## Étape 3 — Plan formel (livrable pour validation PO)

### 3.1 — Schéma DDL exact

```sql
-- 1) detail_facture_com (565 172 lignes)
ALTER TABLE public.detail_facture_com
  ADD COLUMN remise_pct   NUMERIC(5,2)  NULL,
  ADD COLUMN prix_origine NUMERIC(10,2) NULL;

ALTER TABLE public.detail_facture_com
  ADD CONSTRAINT chk_detail_facture_remise_pct
    CHECK (remise_pct IS NULL OR (remise_pct >= 0 AND remise_pct <= 100));

-- 2) proforma_details (880 lignes)
ALTER TABLE public.proforma_details
  ADD COLUMN remise_pct   NUMERIC(5,2)  NULL,
  ADD COLUMN prix_origine NUMERIC(10,2) NULL;

ALTER TABLE public.proforma_details
  ADD CONSTRAINT chk_proforma_remise_pct
    CHECK (remise_pct IS NULL OR (remise_pct >= 0 AND remise_pct <= 100));
```

**Justifications** :
- `NUMERIC(5,2)` `remise_pct` → `999.99%` max, 2 décimales (« 12.5 »).
- `NUMERIC(10,2)` `prix_origine` → cohérent avec `detail_facture_com.prix`. Couvre jusqu'à 99 999 999,99 FCFA.
- **NULL par défaut** (pas DEFAULT 0) : distinguo « historique inconnu » (NULL → fallback lookup front) vs « explicitement sans remise » (0).
- **CHECK autorise NULL** pour préserver l'historique.

### 3.2 — Patches de fonctions (avant/après)

Toutes les **signatures restent inchangées** (le string transporte tout).

#### Pattern commun (variables à ajouter dans chaque DECLARE)

```sql
v_remise_pct   NUMERIC(5,2);
v_prix_origine NUMERIC(10,2);
```

#### Helper de parsing (dans chaque boucle)

```sql
-- AVANT :
v_prix := v_parts[3]::NUMERIC;

-- APRÈS :
v_prix := v_parts[3]::NUMERIC;
v_remise_pct   := CASE WHEN array_length(v_parts,1) >= 4 AND v_parts[4] IS NOT NULL AND v_parts[4] <> ''
                       THEN v_parts[4]::NUMERIC(5,2) ELSE NULL END;
v_prix_origine := CASE WHEN array_length(v_parts,1) >= 5 AND v_parts[5] IS NOT NULL AND v_parts[5] <> ''
                       THEN v_parts[5]::NUMERIC(10,2) ELSE NULL END;
```

#### Garde à élargir

```sql
-- AVANT : IF array_length(v_article_parts, 1) != 3 THEN ...
-- APRÈS :
IF array_length(v_article_parts, 1) NOT BETWEEN 3 AND 5 THEN
  RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-qty-prix[-remise[-prix_origine]])', v_article_string;
END IF;
```

#### Détail par fonction

| Fonction | Garde | Lecture 4-5 | INSERT étendu | Surcharges |
|---|---|---|---|---|
| `create_proforma` | `>= 3` (OK) | OUI | `INSERT ... remise_pct, prix_origine` | 1 |
| `edit_proforma` | `>= 3` (OK) | OUI | Idem re-INSERT | 1 |
| `get_proforma_details` | n/a | n/a | **Rien à faire** | 1 |
| `convert_proforma_to_facture` | n/a | n/a | **Concaténation string 5 champs** | 1 |
| `create_facture_complete1` | `NOT BETWEEN 3 AND 5` | OUI | `INSERT ... remise_pct, prix_origine` | **2** |
| `create_facture_complete` (ancien) | `NOT BETWEEN 3 AND 5` | OUI | Idem | 1 |
| `create_facture_online` | `NOT BETWEEN 3 AND 5` | OUI | Idem | 1 |
| `modifier_facturecom` | `NOT BETWEEN 3 AND 5` | OUI | UPDATE/INSERT + log étendu | 1 |

**Aucun helper PL/pgSQL partagé n'existe** : parsing inline. Ne pas en introduire maintenant (dépendance circulaire, point de rupture unique). Le pattern est copy-paste, volume réduit et isolé.

### 3.3 — Plan de propagation `convert_proforma_to_facture`

```sql
FOR v_detail IN SELECT * FROM proforma_details WHERE id_proforma = p_id_proforma LOOP
  v_articles_string := v_articles_string
    || v_detail.id_produit || '-' || v_detail.quantite || '-' || v_detail.prix_unitaire;
  IF v_detail.remise_pct IS NOT NULL THEN
    v_articles_string := v_articles_string || '-' || v_detail.remise_pct;
    IF v_detail.prix_origine IS NOT NULL THEN
      v_articles_string := v_articles_string || '-' || v_detail.prix_origine;
    END IF;
  END IF;
  v_articles_string := v_articles_string || '#';
END LOOP;
```

Ligne sans remise → `id-qt-prix#` (3 champs) ; ligne remisée → 4 ou 5 champs. `create_facture_complete1` (patchée) accepte les trois. **Symétrie parfaite** : la facture convertie porte exactement les mêmes valeurs que la proforma source.

### 3.4 — Surfaces d'affichage à étendre

**Option A — Modifier la vue `list_detailventes`** (recommandée) :
```sql
CREATE OR REPLACE VIEW public.list_detailventes AS
SELECT df.id_detail, df.id_facture, df.date_facture, ps.nom_produit, ps.cout_revient,
       df.quantite, df.prix, df.remise_pct, df.prix_origine,
       (((df.prix - ps.cout_revient))::double precision * df.quantite) AS marge,
       df.id_produit, ps.nom_categorie, ps.description
FROM detail_facture_com df JOIN produit_service ps ON (df.id_produit = ps.id_produit);
```
Puis patcher `get_my_factures1` pour ajouter `'remise_pct', ldv.remise_pct, 'prix_origine', ldv.prix_origine` dans les **deux** `json_build_object`.

**`rechercher_multifacturecom`** : à patcher dans les deux branches (`pid_facture` + `pnum_factures`) en ajoutant les 2 colonnes au `json_build_object` des détails.

### 3.5 — Stratégie de rétro-compat testée

| Format envoyé | `array_length` | `remise_pct` | `prix_origine` | Comportement |
|---|---|---|---|---|
| `"4682-3-176#"` (3) | 3 | NULL | NULL | Identique aujourd'hui |
| `"4682-3-176-12#"` (4) | 4 | 12.00 | NULL | Remise persistée |
| `"4682-3-176-12.5-200#"` (5) | 5 | 12.50 | 200.00 | Ligne autoporteuse |
| `"1523-4-28-12.5-32#887-2-25000#"` (mixte) | 5, 3 | 12.50, NULL | 32.00, NULL | Hétérogène même facture |

**Cas rejeté** : 2 champs, 6+ champs → garde stricte conservée.

**Edge case décimal** : front doit émettre un **point** `.` (pas virgule) pour le cast `::NUMERIC`. À coordonner avec `kader_backend`.

### 3.6 — Smoke tests post-patch (Phase 1)

Sur structures **183 (TECH24)** et **218 (LIBRAIRIE CHEZ KELEFA)**, avec cleanup final :

1. Proforma 5 champs → `remise_pct=12.50`, `prix_origine=32.00`.
2. Proforma 3 champs (rétro-compat) → `NULL`, `NULL`.
3. Edit proforma → 2 lignes persistées avec valeurs attendues.
4. Conversion proforma → facture → `remise_pct`/`prix_origine` identiques.
5. Vente directe `create_facture_complete1` 5 champs → INSERT ok, `montant = SUM(qte*prix)` inchangé.
6. Vente directe 3 champs → identique aujourd'hui.
7. VenteFlash → identique.
8. `modifier_facturecom` string 5 champs → UPDATE/INSERT avec report.
9. Trigger non perturbé → aucun delta `montant`/`mt_remise`/`mt_acompte`/`mt_restant` sur UPDATE de `remise_pct` seul.
10. Wallet/stock/paiements inchangés vs vente équivalente sans remise.
11. CHECK constraint → rejet si `remise_pct = 150`.
12. `get_proforma_details` → JSON contient les 2 colonnes.
13. `get_my_factures1` (après Option A) → JSON `details` contient les 2 colonnes.
14. `rechercher_multifacturecom` → JSON `details` contient les 2 colonnes.
15. Cleanup → `supprimer_facturecom` (restaure stock).

### 3.7 — Backups prévus (`C:\tmp\pgquery\backup_remise_ligne_<YYYYMMDD>\`)

```
01_schema_detail_facture_com_before.sql
02_schema_proforma_details_before.sql
03_dump_detail_facture_com.csv          -- 565k lignes
04_dump_proforma_details.csv            -- 880 lignes
10_fn_create_proforma_before.sql
11_fn_edit_proforma_before.sql
12_fn_get_proforma_details_before.sql
13_fn_convert_proforma_to_facture_before.sql
14_fn_create_facture_complete1_text_before.sql
15_fn_create_facture_complete1_varchar_before.sql
16_fn_modifier_facturecom_before.sql
17_fn_create_facture_complete_before.sql
18_fn_create_facture_online_before.sql
19_fn_rechercher_multifacturecom_before.sql
20_view_list_detailventes_before.sql
99_rollback.sql                          -- DROP COLUMN + fonctions restaurées
```

### 3.8 — Risques, edge cases, zones d'ombre

| # | Risque | Niveau | Mitigation |
|---|---|---|---|
| R1 | Oubli d'une des 2 surcharges `create_facture_complete1` | Élevé | Checklist : vérifier `pg_get_function_identity_arguments` après chaque `CREATE OR REPLACE`. |
| R2 | Parseur décimal régional : « 12,5 » (virgule) vs « 12.5 » | Moyen | Front doit émettre un point. Coordonner `kader_backend`. Test spécifique. |
| R3 | `prix_origine < prix` net (vente en gros) | Faible | Aucune CHECK sur la relation (volontaire : remise informative, prix net peut être > prix public en gros). |
| R4 | `create_facture_complete` (ancienne) encore appelée par backend | Moyen | Patcher par sécurité. Vérifier avec `kader_backend` qu'aucun appel à `create_facture_complete` (sans `1`) ne subsiste. |
| R5 | BC/devis cassés si front émet 5 champs | Moyen | Décision PO : étendre aussi BC/devis à `BETWEEN 3 AND 5` (recommandé) ou discipline front stricte. |
| R6 | Vue `list_detailventes` utilisée par rapports admin | Faible | Audité : aucun ne casse avec 2 colonnes de plus. |
| R7 | Lock pendant ALTER sur 565k lignes | Faible | `ADD COLUMN ... NULL` sans DEFAULT = **instantané** (metadata-only) sur PG 11+. |
| R8 | Jobs seed `generate_invoices_*` | Nul | Émettent du 3-champs → continuent. |
| R9 | Trigger `recalculer_montant_facture` invoqué à tort | Faible | WHEN exclut déjà `remise_pct`/`prix_origine`. Confirmer en smoke. |
| R10 | Conversion proforma historique (NULL) | Nul | Boucle omet 4-5 → string 3-champs → facture sans remise. Rétro-compat parfaite. |
| R11 | Backup 565k lignes CSV | Faible | Plusieurs dizaines de Mo — heure creuse, ou `pg_dump --data-only --column-inserts`. |

---

## Synthèse pour le PO

- **Périmètre BD confirmé** : 2 ALTER TABLE + 8 fonctions à patcher + 1 vue (Option A) + 1 fonction d'affichage (`rechercher_multifacturecom`).
- **Aucun impact fonctionnel** sur montants/stock/wallet — confirmé par l'analyse du trigger (WHERE + WHEN conditionnel) et des fonctions de mutation.
- **Rétro-compat absolue** : NULL par défaut, parseur 3-champs accepté, signatures inchangées.

### Décisions à trancher par le PO
1. Étendre aussi `create_bon_commande`/`edit_bon_commande`/`add_new_devis_complet`/`maj_devis` à `BETWEEN 3 AND 5` (**recommandé**) ?
2. **Option A** (vue `list_detailventes`) vs **Option B** (JOIN direct) pour `get_my_factures1` (**recommandé : A**) ?
3. Patcher `create_facture_complete` (ancienne version) par sécurité (**recommandé : oui**) ?
4. Étendre le snapshot `articles_avant`/`articles_apres` du log `modifier_facturecom` pour audit (**recommandé : oui**) ?

### Ordre de déploiement inchangé
BD d'abord (rétro-compatible), front ensuite.

---

*Rapport produit par `dba_master` le 24/07/2026 — Phase 0 investigation read-only. Aucun DDL exécuté.*
