# Audit DBA — Marges Inventaire
**Fonction cible** : `get_inventaire_periodique(pid_structure, pannee, pmois, psemaine, pjour)`
**DB** : `fayclick_db` — Serveur `154.12.224.173:3253`
**DBA** : dba_master
**Date** : 2026-05-19
**Spec de référence** : `docs/spec-marges-inventaire-2026-05-19.md`

---

## Audit 1 — Snapshot `prix_achat` dans `facture_details`

### Table réelle de détails
La table s'appelle `detail_facture_com` (pas `facture_details`). Structure :

| Colonne | Type | Nullable | Description |
|---|---|---|---|
| `id_detail` | integer | NO | PK |
| `id_facture` | integer | NO | FK vers `facture_com` |
| `date_facture` | date | NO | Date snapshot (dénormalisé) |
| `id_produit` | integer | NO | FK vers `produit_service` |
| `quantite` | real | NO | Quantité vendue |
| `prix` | numeric | NO | Prix de vente unitaire au moment de la vente |

**Conclusion** : **Aucun snapshot `prix_achat` / `cout_revient`** dans `detail_facture_com`. La colonne `prix` capture le prix de vente unitaire mais pas le coût de revient.

### Vue `list_detailventes`
La vue joint `detail_facture_com` avec `produit_service` et expose :
- `cout_revient` : issu de `produit_service.cout_revient` (valeur COURANTE)
- `marge` : colonne calculée = `(df.prix - ps.cout_revient) * df.quantite`

### Décision retenue : Scénario A — `LEFT JOIN produit_service` avec valeur courante

**Justification** : Pas de snapshot disponible. Le calcul utilisera `produit_service.cout_revient` au moment de l'appel.

**Risque documenté** : Si un commerçant modifie le coût de revient d'un produit après une vente, les marges historiques affichées refléteront le PA actuel, pas celui en vigueur lors de la vente. Cela peut entraîner une sous- ou sur-estimation des marges passées.

**Migration future recommandée** : Ajouter une colonne `cout_revient_snapshot NUMERIC DEFAULT 0` dans `detail_facture_com`, alimentée lors de la création de la ligne de détail (dans `create_facture_complete1()`). La colonne peut être ajoutée progressivement : `COALESCE(df.cout_revient_snapshot, ps.cout_revient)` garantit la compatibilité ascendante.

**Stratégie robustesse** : Utiliser `LEFT JOIN produit_service ps ON ps.id_produit = df.id_produit` + `COALESCE(ps.cout_revient, 0)`. Pour un produit supprimé (orphelin), la marge = PV × quantité (PA inconnu traité comme 0), ce qui surestime légèrement la marge. Comportement transparent et non bloquant.

---

## Audit 2 — Colonne d'annulation facture

### Résultat
La table `facture_com` **ne possède pas de colonne `annulee`**. Elle ne possède que `id_etat` (FK vers `etat_facture`).

Contenu de la table `etat_facture` :

| id_etat | libelle |
|---|---|
| 1 | IMPAYEE |
| 2 | PAYEE |

**Il n'existe que 2 états. Aucun état ANNULEE dans le système actuel.**

### Décision retenue
La spec mentionne `WHERE f.annulee = false` — ce filtre n'est pas applicable tel quel. Le filtre équivalent est **`f.mt_acompte > 0`** (seules les factures avec un encaissement sont considérées), ce qui exclut de facto les factures impayées.

**Clarification comportementale** : Dans FayClick, une "annulation" de facture se traduit par une suppression physique (pas logique) via la fonction `supprimer_facturecom()`. Les factures annulées disparaissent donc de la table. Le filtre `mt_acompte > 0` est donc suffisant et correct.

**Mapping spec → SQL** :
- Spec : `WHERE f.montant_acompte > 0 AND f.annulee = false`
- SQL réel : `WHERE f.mt_acompte > 0` (annulee absent, soft-delete inexistant)

---

## Audit 3 — Soft-delete sur `produit_service`

### Résultat
La table `produit_service` **ne possède aucune colonne de soft-delete** (`actif`, `supprime`, `deleted_at`, `archivé`, etc.).

Les suppressions de produits sont **physiques** (DELETE).

### Conséquence
Un `INNER JOIN` sur `produit_service` exclura silencieusement les lignes de `detail_facture_com` dont le produit a été supprimé depuis la vente. Cela sous-estime la marge totale.

### Décision retenue
Utiliser `LEFT JOIN produit_service ps ON ps.id_produit = df.id_produit` avec `COALESCE(ps.cout_revient, 0)`. Les lignes orphelines contribueront à la marge avec PA=0, soit marge = PV × quantité (comportement conservateur, légèrement optimiste vs réalité).

**Stats cout_revient sur structure 1675** :
- Total produits : 1004
- Avec cout_revient renseigné : 1004 (100%)
- Avec cout_revient = 0 : 1 (0,1%)
- Avec cout_revient > 0 : 1003 (99,9%)

---

## Audit 4 — Index existants et baseline performance

### Index pertinents sur `facture_com`

| Index | Colonnes | Pertinence |
|---|---|---|
| `idx_facture_com_structure_date` | `(id_structure, date_facture)` | **Principal** — couvre le filtre de la fonction |
| `idx_facture_structure_date` | `(id_structure, date_facture DESC)` | Redondant partiel |
| `idx_factures_structure_date_montant` | `(id_structure, date_facture, montant)` | Couverture partielle — inclut `montant` |

**Index manquant critique** : Aucun index ne couvre `(id_structure, date_facture, mt_acompte)`. Le filtre `mt_acompte > 0` de la nouvelle CTE de marges ne bénéficiera pas d'un covering index.

**Recommandation** : Créer `idx_facture_com_structure_date_acompte ON facture_com (id_structure, date_facture, mt_acompte)` — inclus dans le patch SQL.

### Index pertinents sur `detail_facture_com`

| Index | Colonnes | Pertinence |
|---|---|---|
| `idx_detail_facture` | `(id_facture)` | JOIN sur `id_facture` |
| `idx_detail_facture_date_produit_all` | `(date_facture, id_facture, id_produit, quantite, prix)` | Covering index — couvrira les colonnes nécessaires |
| `idx_detailventes_facture_produit` | `(id_facture, id_produit, quantite)` | Couvre le JOIN + agrégation |
| `idx_detail_produit` | `(id_produit)` | JOIN sur `produit_service` |

### Index sur `produit_service`

| Index | Colonnes | Pertinence |
|---|---|---|
| `produit_service_pkey` | `(id_produit)` | JOIN principal |
| `idx_produit_service_prix` | `(id_structure, prix_vente, cout_revient)` | Covering pour `cout_revient` |

### Baseline performance

| Structure | Période | Temps DB (EXPLAIN ANALYZE) | Wall time |
|---|---|---|---|
| 1675 (CHEZ KELEFA NT) | Semaine 20 / 2026 | 26,9 ms | 205 ms |
| 183 | Semaine 20 / 2026 | 7,7 ms | 203 ms |

**Cible CA-12** : < +30 % → 1675 : < 34,9 ms | 183 : < 10,0 ms

### Volumétrie
| Structure | Total factures | Factures encaissées | Période |
|---|---|---|---|
| 1675 | 1244 | 1240 (99,7%) | 2026-02-26 → 2026-05-19 |
| 183 | 125 | 111 (88,8%) | 2025-01-01 → 2026-05-01 |

---

## Audit 5 — Compréhension du schéma `montant_net`

**Confirmation** : La colonne `montant` dans `facture_com` est le montant net après remise.

Vérification sur facture avec remise :
- `sous_total_brut` = somme(quantité × prix dans `detail_facture_com`) = 5900
- `mt_remise` = 590
- `montant` = 5310 = `sous_total_brut - mt_remise`

**Donc** : `facture_com.montant` = montant net = base de calcul du ratio d'encaissement.

**Formule SQL confirmée** :
```sql
ratio_encaissement = LEAST(mt_acompte / NULLIF(montant, 0), 1)
marge_brute = SUM((df.prix - COALESCE(ps.cout_revient, 0)) * df.quantite)
marge_realisee = marge_brute * ratio_encaissement
```

---

## Récapitulatif des décisions

| # | Question | Décision |
|---|---|---|
| R-02 | Snapshot PA dans `facture_details` ? | Non. Utiliser `produit_service.cout_revient` (valeur courante) via `LEFT JOIN`. Migration `cout_revient_snapshot` recommandée en V3. |
| Annulation | Colonne `annulee` ? | Absente. Filtre `mt_acompte > 0` suffisant (suppressions physiques, pas logiques). |
| Soft-delete | Colonne suppression logique produit ? | Absente. `LEFT JOIN` + `COALESCE(cout_revient, 0)` pour robustesse. |
| Index | Index manquant ? | `(id_structure, date_facture, mt_acompte)` absent. Créé dans le patch. |
| montant_net | Quelle colonne ? | `facture_com.montant` = montant net après remise. |
| marge_precedente < 0 | Cas non couvert spec §4.4 ? | **Confirmé en prod** (1 mois négatif sur fayclick_db, structure 139 aout 2025 = -216 767 FCFA). Fix v2.1 : CASE utilise `ABS(marge_precedente)` comme dénominateur pour `marge_precedente <> 0`. Test validé : sept. 2025 = +137.3 % depuis base négative. |

---

## Backup DDL avant patch

Le DDL de la version v1 est intégralement sauvegardé dans :
`D:\React_Prj\fayclick\docs\dba-patch-get_inventaire_periodique-v2-2026-05-19.sql`
(Section `-- BACKUP DDL v1` en commentaire en tête de fichier)

**Note** : v1 DDL non extrait avant CREATE OR REPLACE (gap protocole — v1 écrasé dans pg_proc).
La sauvegarde commentée est partielle. Lecon : toujours `pg_get_functiondef()` → fichier dédié avant tout patch.
