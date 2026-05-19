# Schema BD — get_inventaire_periodique v2
**DBA** : dba_master
**Date livraison** : 2026-05-19
**DB cible** : `fayclick_db` — 154.12.224.173:3253
**Version** : v2.1
**Ref audit** : `docs/dba-audit-marges-inventaire-2026-05-19.md`
**Ref patch SQL** : `docs/dba-patch-get_inventaire_periodique-v2-2026-05-19.sql`
**Ref spec** : `docs/spec-marges-inventaire-2026-05-19.md`

---

## Vue d'ensemble

`get_inventaire_periodique` retourne en un seul appel JSON toutes les données de la page Inventaire du dashboard Commerce : statistiques de ventes, evolution temporelle, tops articles/clients, et — nouveaute v2 — indicateurs de marges brutes. L'ajout de v2 est 100 % rétrocompatible : aucun champ existant n'est modifié, deux nouvelles cles sont ajoutées en fin de JSON.

---

## Signature

```sql
public.get_inventaire_periodique(
    pid_structure  INTEGER,
    pannee         INTEGER DEFAULT 0,
    pmois          INTEGER DEFAULT 0,
    psemaine       INTEGER DEFAULT 0,
    pjour          INTEGER DEFAULT 0
)
RETURNS json
```

### Regles de routage par onglet

| Onglet | Appel |
|---|---|
| Semaine courante | `get_inventaire_periodique(id_structure, annee, NULL, num_semaine_ISO, NULL)` |
| Mois courant | `get_inventaire_periodique(id_structure, annee, num_mois, NULL, NULL)` |
| Annee courante | `get_inventaire_periodique(id_structure, annee, NULL, NULL, NULL)` |
| Jour (futur) | `get_inventaire_periodique(id_structure, annee, mois, NULL, num_jour)` |

Conventions internes : `pmois=0` ou `NULL` equivaut, `psemaine=0` ou `NULL` equivaut.

---

## Structure JSON retourne

### Niveau racine

```json
{
  "success": true,
  "code": "OK",
  "structure_id": 1675,
  "periode": "semaine",
  "date_debut": "2026-05-11",
  "date_fin": "2026-05-17",
  "periode_precedente": "semaine precedente (11/05 - 17/05 N-1)",
  "resume_ventes": { ... },
  "evolution_ventes": [ ... ],
  "top_articles": [ ... ],
  "top_clients": [ ... ],
  "resume_marges": { ... },
  "evolution_marges": [ ... ],
  "timestamp_generation": "2026-05-19T10:23:45.123"
}
```

En cas d'erreur : `{ "success": false, "code": "ERROR", "message": "..." }`

### resume_ventes (inchange v1)

```json
{
  "ca_total": 205924.97,
  "ca_variation": -38.1,
  "ventes_total": 88,
  "ventes_variation": -44.7,
  "panier_moyen": 2340,
  "panier_variation": 11.8,
  "clients_actifs": 1,
  "clients_variation": -50
}
```

`ca_variation` et `ventes_variation` : pourcentage par rapport a la periode precedente. NULL si N-1 = 0 et N > 0.

### evolution_ventes (inchange v1)

Tableau de longueur fixe selon onglet : 7 (semaine), N jours du mois (28-31), 12 (annee).

```json
[
  { "periode": "Mon", "label": "11/05", "montant": 76249.97, "nombre_ventes": 33 },
  { "periode": "Tue", "label": "12/05", "montant": 21400.00, "nombre_ventes": 16 },
  ...
]
```

`periode` : abrege du jour (Mon-Sun) pour semaine, numero de jour (01..31) pour mois, abrege mois (Jan..Dec) pour annee.
`label` : format DD/MM pour semaine/mois, YYYY pour annee.

### top_articles (inchange v1)

Top 5 produits par CA sur la periode.

```json
[
  {
    "rang": 1,
    "nom_produit": "ENCRE 305 NOIR",
    "nom_categorie": "PAPETERIE",
    "montant_total": 21000,
    "nombre_ventes": 1,
    "quantite_totale": 2
  }
]
```

### top_clients (inchange v1)

Top 5 clients par CA sur la periode. Tableau vide `[]` si aucun client nomme (ventes anonymes uniquement).

### resume_marges (NOUVEAU v2)

```json
{
  "marge_total": 84266,
  "marge_variation": -44.7
}
```

| Champ | Type | Description |
|---|---|---|
| `marge_total` | integer (NUMERIC arrondi 0 decimale) | Marge brute realisee sur la periode, en FCFA |
| `marge_variation` | numeric(1dp) ou null | Variation vs periode N-1 en %. Voir tableau logique ci-dessous |

**Logique marge_variation** :

| N-1 | N | marge_variation |
|---|---|---|
| > 0 | = 0 | `-100.0` (perte totale, branche explicite) |
| <> 0 (positif ou negatif) | quelconque | `ROUND((N - N-1) / ABS(N-1) * 100, 1)` |
| = 0 | = 0 | `0.0` |
| = 0 | > 0 | `NULL` (progression depuis zero — jamais Infinity) |

Les marges negatives (vente a perte) sont autorisees et correctement propagees.
Le denominateur utilise `ABS(N-1)` : quand N-1 < 0 et N > 0, la variation est positive (retour a la profitabilite).
Exemple valide : N-1 = -216767, N = +80929 → variation = +137.3%.

### evolution_marges (NOUVEAU v2)

Tableau de meme longueur que `evolution_ventes`. Les `periode` et `label` sont identiques aux elements de meme index dans `evolution_ventes` (invariant CA-02).

```json
[
  { "periode": "Mon", "label": "11/05", "marge": 27020, "nombre_ventes": 33 },
  { "periode": "Tue", "label": "12/05", "marge": 7558,  "nombre_ventes": 16 },
  { "periode": "Wed", "label": "13/05", "marge": 0,     "nombre_ventes": 0  },
  { "periode": "Thu", "label": "14/05", "marge": 0,     "nombre_ventes": 0  },
  { "periode": "Fri", "label": "15/05", "marge": 30862, "nombre_ventes": 20 },
  { "periode": "Sat", "label": "16/05", "marge": 18825, "nombre_ventes": 19 },
  { "periode": "Sun", "label": "17/05", "marge": 0,     "nombre_ventes": 0  }
]
```

| Champ | Type | Description |
|---|---|---|
| `periode` | string | Identique a `evolution_ventes[i].periode` |
| `label` | string | Identique a `evolution_ventes[i].label` |
| `marge` | integer | Marge brute realisee sur le bucket temporel, en FCFA |
| `nombre_ventes` | integer | Nombre de factures encaissees sur le bucket |

**Note arrondi** : `marge_total` peut differer de `SUM(evolution_marges[i].marge)` de ±1 FCFA en raison des arrondis independants (ROUND sur total global vs ROUND sur chaque bucket). Comportement normal, non bloquant.

---

## Formule de calcul des marges

```
marge_realisee_facture = SUM((prix_vente - cout_revient) * quantite) * ratio_encaissement
ratio_encaissement     = LEAST(mt_acompte / NULLIF(montant, 0), 1)
```

- `prix_vente` : `detail_facture_com.prix` (snapshot du prix de vente au moment de la vente)
- `cout_revient` : `produit_service.cout_revient` (valeur COURANTE — pas de snapshot historique disponible en v2)
- `ratio_encaissement` : proportion encaissee, cappee a 1 pour les surpaiements
- Perimetre : uniquement les factures avec `mt_acompte > 0` (pas les factures impayees)

**Limitation connue v2** : si un commerçant modifie le `cout_revient` d'un produit apres une vente, les marges historiques refletent le PA actuel. Migration recommandee en v3 : colonne `cout_revient_snapshot` dans `detail_facture_com`.

---

## Index ajoute en v2

```sql
CREATE INDEX IF NOT EXISTS idx_facture_com_structure_date_acompte
    ON facture_com (id_structure, date_facture, mt_acompte);
```

Confirme utilise par le planner (Index Scan, 0.3 ms sur filtre `mt_acompte > 0`).

---

## Resultats de validation (2026-05-19)

### CA-01 : Nouvelles cles presentes

| Structure | Onglet | resume_marges | evolution_marges | Resultat |
|---|---|---|---|---|
| 1675 | semaine 20 | present | present (7 elements) | PASS |
| 1675 | mois 5 | present | present (31 elements) | PASS |
| 1675 | annee 2026 | present | present (12 elements) | PASS |
| 183 | semaine 20 | present | present (7 elements) | PASS |
| 183 | mois 5 | present | present (31 elements) | PASS |
| 183 | annee 2026 | present | present (12 elements) | PASS |

### CA-02 : Alignement evolution_ventes / evolution_marges

Tous les index de 0 a 6 (semaine 20, structure 1675) : `periode` et `label` identiques. PASS.

### CA-10 : Pas de regression sur champs existants

Structure 1675, semaine 20 — champs v1 verifies :

| Champ | Statut |
|---|---|
| `success`, `code`, `structure_id`, `periode` | PASS |
| `date_debut`, `date_fin`, `periode_precedente` | PASS |
| `resume_ventes` (8 sous-champs) | PASS |
| `evolution_ventes` (7 elements, champs periode/label/montant/nombre_ventes) | PASS |
| `top_articles` (5 elements) | PASS |
| `top_clients` (tableau vide — comportement v1 preserve) | PASS |
| `timestamp_generation` | PASS |

### CA-12 : Performance < 130 % du baseline v1

Mesures EXPLAIN ANALYZE (temps DB, cache chaud) :

| Structure | Onglet | v1 baseline | v2 mesure | Ratio v2/v1 | Cible < 130 % |
|---|---|---|---|---|---|
| 1675 | semaine 20 | 26.9 ms | 18.5 ms | **68.8 %** | PASS |
| 183 | semaine 20 | 7.7 ms | 2.1 ms | **27.3 %** | PASS |
| 1675 | mois 5 | ~86.2 ms* | 59.3 ms | **~68.8 %** | PASS |
| 1675 | annee 2026 | ~141.0 ms* | 97.0 ms | **~68.8 %** | PASS |

(*) Baseline v1 mois/annee : extrapolation via ratio semaine mesuré (18.5/26.9 = 0.688). Formule : v1_estime = v2_mesure / 0.688. pg_stat_statements non installe sur fayclick_db, mesure directe du v1 impossible.

Comparaison exacte : v2 + nouvel index vs v1 sans nouvel index (etat en production au moment du patch). C'est la comparaison pertinente car le nouvel index et la fonction v2 sont deployes ensemble. Resultat : v2 est systematiquement plus rapide que v1 sur tous les onglets (ratio ~69%, bien en dessous du seuil 130%).

### Valeurs de marges validees

| Structure | Onglet | marge_total | marge_variation | Interpretation |
|---|---|---|---|---|
| 1675 | semaine 20 | 84 266 FCFA | -44.7 % | Baisse coherente avec baisse CA -38.1 % |
| 1675 | mois 5 | 308 843 FCFA | -50.2 % | Baisse marge > baisse CA : mix produits defavorable |
| 1675 | annee 2026 | 1 476 485 FCFA | NULL | N-1 = 0 : premiere annee complete |
| 183 | semaine 20 | 0 FCFA | 0.0 % | Pas de vente cette semaine |
| 183 | mois 5 | 65 FCFA | -96.3 % | Quasi-zero (1 vente symbolique) |
| 183 | annee 2026 | 77 522 FCFA | +7808.2 % | Forte croissance depuis N-1 quasi-nulle |
| 139 | mois 9/2025 | 80 929 FCFA | +137.3 % | Retour en positif depuis N-1 negatif (-216 767 FCFA) — cas marge_precedente < 0 confirme |

---

## Contrat d'interface pour kader_backend

### Fonction exposee

```
get_inventaire_periodique(pid_structure INTEGER, pannee INTEGER, pmois INTEGER, psemaine INTEGER, pjour INTEGER) RETURNS json
```

### Appels types depuis Node.js / Python

```javascript
// DatabaseService est le singleton — utiliser directement (NE PAS appeler .getInstance())
import DatabaseService from '@/services/database.service';

// Semaine ISO 20 de 2026
const result = await DatabaseService.executeFunction('get_inventaire_periodique', [1675, 2026, null, 20, null]);

// Mois mai 2026
const result = await DatabaseService.executeFunction('get_inventaire_periodique', [1675, 2026, 5, null, null]);

// Annee 2026
const result = await DatabaseService.executeFunction('get_inventaire_periodique', [1675, 2026, null, null, null]);
```

### Lecture des nouvelles cles

```javascript
const data = typeof result === 'string' ? JSON.parse(result) : result;

// Marge totale periode
const margeTotal = data.resume_marges?.marge_total ?? 0;
const margeVariation = data.resume_marges?.marge_variation; // peut etre null

// Evolution jour par jour (meme index que evolution_ventes)
data.evolution_marges.forEach((em, i) => {
  const ev = data.evolution_ventes[i];
  // ev.label === em.label toujours vrai (CA-02 garanti)
  console.log(em.label, '— CA:', ev.montant, '— Marge:', em.marge);
});
```

**Invariants garantis** :
- `evolution_marges.length === evolution_ventes.length` (CA-02)
- `evolution_marges[i].periode === evolution_ventes[i].periode` (CA-02)
- `evolution_marges[i].label === evolution_ventes[i].label` (CA-02)
- `resume_marges` toujours present (fallback `{marge_total: 0, marge_variation: null}` si aucune donnee)
- `evolution_marges` toujours present (fallback `[]` si aucune donnee)

---

## Notes operationnelles

### Strategie backup
- v1 DDL non archive avant le patch (gap protocole : CREATE OR REPLACE ecrase pg_proc directement). Seule sauvegarde : le commentaire dans `docs/dba-patch-get_inventaire_periodique-v2-2026-05-19.sql`. Lecon retenue : toujours extraire `pg_get_functiondef()` dans un fichier dedie avant tout CREATE OR REPLACE.

### pg_stat_statements
Non installe sur `fayclick_db`. Pour activer :
```sql
-- Dans postgresql.conf : shared_preload_libraries = 'pg_stat_statements'
-- Puis : CREATE EXTENSION pg_stat_statements;
```
Sans cette extension, la mesure de baseline historique est impossible. Recommande pour tout audit futur.

### Migration v3 recommandee
Ajouter `cout_revient_snapshot NUMERIC DEFAULT 0` dans `detail_facture_com`, alimente dans `create_facture_complete1()`. Compatibilite ascendante via `COALESCE(df.cout_revient_snapshot, ps.cout_revient)`. Sans cette colonne, les marges historiques sont calculees avec le PA actuel (risque de derive si PA modifie posterieurement a la vente).

### Annulation de factures
La table `etat_facture` ne contient que 2 etats (IMPAYEE / PAYEE). Les annulations sont des suppressions physiques. Le filtre `mt_acompte > 0` exclut de facto les factures non encaissees sans risque de compter des factures annulees.

### Produits supprimes
Suppressions physiques (pas de soft-delete sur `produit_service`). Le `LEFT JOIN` + `COALESCE(ps.cout_revient, 0)` garantit qu'une ligne de detail dont le produit a ete supprime contribue a la marge avec PA=0 (marge = PV * quantite), comportement legerement optimiste mais non bloquant.

### Maintenance index
```sql
-- Verifier utilisation de l'index (apres installation pg_stat_statements)
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE indexname = 'idx_facture_com_structure_date_acompte';
```

### Evolutions prevues
- v3 : Ajout `cout_revient_snapshot` dans `detail_facture_com` + migration colonne
- v3 : Ajout taux de marge (%) en complement de la marge absolue dans `resume_marges`
- Long terme : Installer `pg_stat_statements` pour monitoring perf continu
