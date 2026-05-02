# Rapport d'audit — Flux de réabonnement FayClick
**Date** : 2026-05-02  
**Base auditée** : `fayclick_db` sur `154.12.224.173:3253`  
**DBA** : dba_master  
**Périmètre** : Fonctions PostgreSQL du flow renouvellement + structure de test 139  
**Sources fonctions** : `docs/dba/scripts/prod-*-2026-05-02.sql` (dumps pg_get_functiondef)

---

## 1. Résumé exécutif

**Le symptôme rapporté par le PO (« BD pas mise à jour après paiement ») n'est pas causé par un défaut d'insertion.** L'audit confirme que `renouveler_abonnement` insère correctement dans `abonnements` et que `get_une_structure` reflète le nouvel état immédiatement sans cache. La cause probable du symptôme est que le frontend lit `list_structures.etat_abonnement` (colonne vue non recalculée, toujours `'ACTIF'` depuis l'inscription) ou qu'un `refreshAuth()` manque après paiement confirmé.

Par ailleurs, l'audit a identifié **cinq anomalies indépendantes** du symptôme PO : une régression de calcul de `date_fin` (off-by-one, confirmée en prod), une sous/sur-facturation systématique du montant MENSUEL, une dette de données sur `nombre_jours`, et la vue `list_structures` qui masque l'état expiré de 1 626 structures.

---

## 2. Sources des fonctions (prod 2026-05-02)

Les fichiers de référence sont stockés en local :

| Fonction | OID | Fichier source |
|---|---|---|
| `renouveler_abonnement` | 27063 | `docs/dba/scripts/prod-renouveler_abonnement-2026-05-02.sql` |
| `add_abonnement_structure_avec_dates` | 26743 | `docs/dba/scripts/prod-add_abonnement_structure_avec_dates-2026-05-02.sql` |
| `add_abonnement_structure` | 26740 | `docs/dba/scripts/prod-add_abonnement_structure-2026-05-02.sql` |
| `calculer_montant_abonnement` | 26813 | `docs/dba/scripts/prod-calculer_montant_abonnement-2026-05-02.sql` |
| `get_une_structure` | 27008 | `docs/dba/scripts/prod-get_une_structure-2026-05-02.sql` |
| `historique_abonnements_structure` | 27014 | `docs/dba/scripts/prod-historique_abonnements_structure-2026-05-02.sql` |
| `verifier_chevauchement_abonnement` | 27104 | `docs/dba/scripts/prod-verifier_chevauchement_abonnement-2026-05-02.sql` |

Tous les numéros de ligne cités dans ce rapport correspondent aux fichiers ci-dessus, pas au dump `REnouvellement.txt`.

---

## 3. Analyse du symptôme PO : « BD pas mise à jour après paiement »

### 3.1 Ce que l'audit confirme : l'INSERT fonctionne

Après un appel réussi à `renouveler_abonnement`, la nouvelle ligne est visible immédiatement dans `abonnements`. `get_une_structure` recalcule `etat_reel` à la volée (fichier source `prod-get_une_structure-2026-05-02.sql`) :

```sql
CASE
  WHEN a.statut = 'ACTIF' AND a.date_fin >= CURRENT_DATE THEN 'ACTIF'
  WHEN a.statut = 'ACTIF' AND a.date_fin < CURRENT_DATE THEN 'EXPIRE'
  ELSE a.statut
END AS etat_reel
```

Il n'y a pas de cache, pas de réplique en lag, pas de colonne sur `structures` à synchroniser. La lecture post-INSERT voit immédiatement le nouvel abonnement, quelle que soit la connexion.

### 3.2 Cause probable du symptôme

Trois scénarios à éliminer côté frontend :

**Scénario A — lecture depuis `list_structures` au lieu de `get_une_structure`**  
La vue `list_structures` retourne `a.statut` brut (toujours `'ACTIF'` depuis l'inscription, jamais mis à jour). Si le frontend affiche `structure.etat_abonnement` issu du login initial ou d'une lecture de `list_structures`, la valeur ne changera pas après renouvellement même si l'INSERT a réussi.

**Scénario B — absence de `refreshAuth()` après renouvellement**  
Le contexte auth (`useAuth()`) est chargé une fois au login via `get_une_structure`. Si `refreshAuth()` n'est pas appelé après `renouveler_abonnement` succès dans `subscription.service.ts`, l'UI affiche l'ancien état en mémoire.

**Scénario C — `renouveler_abonnement` retourne `success: false` silencieusement**  
Le bloc `EXCEPTION WHEN OTHERS` de `add_abonnement_structure_avec_dates` (fichier source ligne 55-60) capture toutes les exceptions et retourne un JSON `success: false`. Si une contrainte unique est violée (ref_abonnement ou uuid_paiement déjà pris), l'INSERT échoue silencieusement. `subscription.service.ts` ligne 232 vérifie `response.success` et logue l'erreur, mais si le frontend ne remonte pas le message à l'utilisateur, la transaction apparaît comme « complétée » côté UI sans mise à jour.

---

## 4. État de la structure 139 (snapshot 2026-05-02)

### `list_structures` (vue)

| Champ | Valeur |
|---|---|
| `nom_structure` | ALLOSHOP |
| `type_structure` | COMMERCIALE |
| `etat_abonnement` (vue) | `'ACTIF'` — **TROMPEUR**, expiré depuis 63 jours |
| `date_limite_abonnement` | 2026-02-28 |
| `type_abonnement` | MENSUEL |

### `param_structure`

Aucune ligne — `compte_prive = NULL`, `mensualite = NULL`. La structure 139 n'a pas de tarif mensuel personnalisé.

### `get_une_structure(139)` — `etat_abonnement`

```json
{
  "statut": "EXPIRE",
  "type_abonnement": "MENSUEL",
  "date_debut": "2026-02-01",
  "date_fin": "2026-02-28",
  "montant": 2800,
  "jours_restants": 0
}
```

`get_une_structure` retourne le bon état `EXPIRE` — la perception PO de « BD pas mise à jour » ne vient pas de cette fonction.

### Historique `abonnements` structure 139

| id | date_debut | date_fin | montant | `nombre_jours` stocké | diff réel | statut |
|---|---|---|---|---|---|---|
| 10 | 2026-02-01 | 2026-02-28 | 2 800 | **1** | 27 | ACTIF |
| 4  | 2026-01-01 | 2026-01-31 | 3 100 | **1** | 30 | ACTIF |
| 3  | 2025-12-01 | 2025-12-31 | 3 100 | **1** | 30 | ACTIF |
| 2  | 2025-11-01 | 2025-11-30 | 3 000 | **1** | 29 | ACTIF |
| 1  | 2025-10-03 | 2025-10-31 | 3 100 | **1** | 28 | ACTIF |

`nombre_jours = 1` sur toutes les lignes, `diff réel` entre 27 et 30 jours — dette de données confirmée (INC-04).

### Simulation `renouveler_abonnement(139, 'MENSUEL', 'OM')` aujourd'hui

| Paramètre | Valeur |
|---|---|
| Dernier `date_fin` en base | 2026-02-28 (expiré) |
| `date_debut` calculée | 2026-05-02 (CURRENT_DATE) |
| `v_duree_jours` (MENSUEL) | 30 |
| `date_fin` prod (off-by-one) | **2026-06-01** — 1er de juin |
| `date_fin` correcte attendue | **2026-05-31** |
| `montant` via prod (`30 × 100`) | **3 000 FCFA** |
| `montant` correct mai (`31 × 100`) | **3 100 FCFA** |
| Écart | **-100 FCFA** sous-facturé |

---

## 5. Incohérences détectées

---

### INC-01 — [BLOQUANT] Off-by-one sur `date_fin` dans `renouveler_abonnement`

**Description** : La ligne 67 du fichier source `prod-renouveler_abonnement-2026-05-02.sql` est :

```sql
-- ligne 67
v_date_fin := v_date_debut + v_duree_jours;
```

Elle devrait être `v_date_debut + v_duree_jours - 1`. Sans le `-1`, un abonnement MENSUEL de 30 jours démarrant le 2026-05-02 se termine le **2026-06-01** (31 jours calendaires inclus) au lieu de 2026-05-31. L'effet est une cascade : chaque renouvellement enchaîné démarre le lendemain du `date_fin` précédent (ligne 60), soit le 2026-06-02, et termine au 2026-07-01 — structure 203 en est la preuve empirique (abonnements id 1687, 1723, 1731 avec `date_fin` au 1er de chaque mois).

**Écart prod vs dump local** : Le fichier `REnouvellement.txt` ligne 79 avait `v_date_fin := v_date_debut + v_duree_jours - 1`. La prod a perdu le `-1` lors d'une mise à jour de la fonction.

**Reproduction** :
```sql
SELECT
  CURRENT_DATE                AS date_debut,
  CURRENT_DATE + 30           AS date_fin_prod_off_by_one,
  CURRENT_DATE + 30 - 1       AS date_fin_correcte;
-- date_fin_prod_off_by_one = 2026-06-01 (1er du mois suivant)
-- date_fin_correcte        = 2026-05-31

-- Confirmation sur structure 203 (données réelles)
SELECT date_debut, date_fin, EXTRACT(DAY FROM date_fin) AS jour_fin
FROM abonnements WHERE id_structure = 203 AND statut = 'ACTIF'
ORDER BY date_fin DESC LIMIT 3;
-- date_fin = 2026-07-01, 2026-06-01, 2026-05-01 → tous au 1er du mois
```

**Impact business** : Abonnements facturés 31 jours au lieu de 30. Les dates de fin glissent progressivement sur le 1er du mois suivant au lieu du dernier du mois courant.

**Correctif proposé** (`prod-renouveler_abonnement-2026-05-02.sql` ligne 67) :
```sql
-- Remplacer :
   v_date_fin := v_date_debut + v_duree_jours;
-- Par :
    v_date_fin := v_date_debut + v_duree_jours - 1;
```

---

### INC-02 — [BLOQUANT] Montant MENSUEL calculé sur 30 jours fixes, non sur les jours réels du mois

**Description** : `add_abonnement_structure_avec_dates` (fichier source ligne 8-11) hardcode le tarif à 100 FCFA/jour et multiplie par `p_nombre_jours` :

```sql
-- ligne 8
v_tarif_jour NUMERIC := 100;  -- 100 FCFA par jour
-- ligne 11
v_montant := p_nombre_jours * v_tarif_jour;
```

`renouveler_abonnement` lui passe `v_duree_jours = 30` pour MENSUEL (ligne 32 de son fichier source), quel que soit le mois. Résultat : montant toujours 3 000 FCFA, alors que mai a 31 jours (3 100 FCFA) et février 28 jours (2 800 FCFA).

**Note importante sur `param_structure.mensualite`** : La colonne `mensualite` existe dans `param_structure` mais aucune fonction de facturation ne la consulte — ni `calculer_montant_abonnement`, ni `add_abonnement_structure`, ni `add_abonnement_structure_avec_dates`. Le bug n'est donc pas lié à la mensualité paramétrée (hypothèse initiale du QA partiellement inexacte) mais à l'utilisation de 30 jours fixes au lieu du nombre de jours réel du mois.

**Incohérence de traitement entre les deux fonctions** :

| Chemin | Calcul montant | Méthode |
|---|---|---|
| Première souscription (`add_abonnement_structure`) | Correct | `calculer_montant_abonnement()` — lit les jours réels |
| Renouvellement (`renouveler_abonnement` → `_avec_dates`) | Incorrect | `30 × 100` hardcodé |

Un même client paie un montant différent selon qu'il souscrit pour la première fois ou renouvelle.

**Reproduction** :
```sql
SELECT
  calculer_montant_abonnement('MENSUEL', '2026-05-01') AS montant_correct_mai,
  -- = 3 100 FCFA (31 jours)
  calculer_montant_abonnement('MENSUEL', '2026-02-01') AS montant_correct_fevrier,
  -- = 2 800 FCFA (28 jours)
  30 * 100 AS montant_via_renouveler_mensuel;
  -- = 3 000 FCFA (30 jours fixes)
  -- Écart mai = -100 FCFA; écart février = +200 FCFA sur le client
```

**Correctif proposé** : Ajouter un appel à `calculer_montant_abonnement` dans `renouveler_abonnement` et passer le montant calculé à `add_abonnement_structure_avec_dates` via un nouveau paramètre optionnel `p_montant` :

```sql
-- Dans renouveler_abonnement, après le calcul de v_date_debut et v_date_fin :
DECLARE
    v_montant NUMERIC;
BEGIN
    ...
    -- Calculer le montant sur les jours réels du mois (si type connu)
    IF v_type_effectif IN ('MENSUEL', 'ANNUEL') THEN
        v_montant := calculer_montant_abonnement(v_type_effectif, v_date_debut);
    ELSE
        v_montant := v_duree_jours * 100;  -- fallback pour durées custom
    END IF;

    RETURN add_abonnement_structure_avec_dates(
        ..., p_montant => v_montant
    );
```

```sql
-- Dans add_abonnement_structure_avec_dates, ajouter un paramètre optionnel :
p_montant numeric DEFAULT NULL
-- Et modifier le calcul :
v_montant := COALESCE(p_montant, p_nombre_jours * v_tarif_jour);
```

---

### INC-03 — [MINEUR] Risque de violation EXCLUDE sur appels directs à `add_abonnement_structure`

**Description** : La contrainte `EXCLUDE USING gist (daterange(date_debut, date_fin, '[]') WITH &&)` utilise des bornes **inclusives**. Deux rangs adjacents `['2026-06-01','2026-07-01']` et `['2026-07-01','2026-07-31']` se chevauchent sur le point `2026-07-01` et violeront la contrainte.

Ce cas ne se produit pas dans le flow `renouveler_abonnement` normal (qui calcule `v_date_debut = date_fin + 1`), mais peut survenir si `add_abonnement_structure` est appelé directement avec `p_date_debut = date_fin_precedent` (ex : depuis un backoffice admin ou un script de migration).

Confirmation empirique : structure 203 n'a pas rencontré de violation car ses renouvellements sont chaînés via `renouveler_abonnement`. La contrainte est contournée naturellement par le `+1` de la ligne 60 du fichier source.

**Impact** : Pas d'impact sur le flow normal. Risque isolé sur usages directs de `add_abonnement_structure`.

**Correctif suggéré** (non urgent) :
```sql
-- Passer la contrainte en borne droite exclusive pour éliminer le risque sur dates adjacentes
ALTER TABLE public.abonnements DROP CONSTRAINT exclude_chevauchement_abonnement;
ALTER TABLE public.abonnements ADD CONSTRAINT exclude_chevauchement_abonnement
  EXCLUDE USING gist (
    id_structure WITH =,
    daterange(date_debut, date_fin, '[)') WITH &&
  ) WHERE (statut = 'ACTIF');
-- Adapter verifier_chevauchement_abonnement en conséquence
```

---

### INC-04 — [MAJEUR] `nombre_jours` corrompu sur 98,98 % des lignes (dette historique)

**Description** : 1 646 des 1 663 lignes de la table `abonnements` ont `nombre_jours = 1` (valeur DEFAULT), alors que la durée réelle (calculée via `date_fin - date_debut`) varie de 27 à 365 jours.

**Cause** : `add_abonnement_structure` (ancien chemin, première souscription) n'inclut pas `nombre_jours` dans son INSERT (la colonne est absente de la liste VALUES de la fonction). La colonne a la valeur DEFAULT `1`. Toutes les lignes créées via ce chemin héritent de cette valeur.

Ce n'est pas un bug du flow actuel de renouvellement (qui, via `_avec_dates`, insère correctement `nombre_jours`), mais une dette de données affectant les rapports et tout futur recalcul basé sur cette colonne.

**Reproduction** :
```sql
SELECT nombre_jours, COUNT(*) FROM abonnements GROUP BY nombre_jours ORDER BY 2 DESC;
-- nombre_jours=1 : 1646 lignes (98.98%)

-- Incohérence: nombre_jours=1 mais la période couvre 27+ jours
SELECT id_abonnement, nombre_jours, date_fin - date_debut AS duree_reelle
FROM abonnements WHERE id_structure = 139;
-- nombre_jours=1 pour tous, duree_reelle = 27/30/30/29/28
```

**Migration corrective proposée** (à valider avant exécution) :
```sql
-- Corriger les lignes où nombre_jours=1 mais la durée réelle est > 1 jour
-- Estimation: ~1 640 lignes impactées
UPDATE public.abonnements
SET nombre_jours = (date_fin - date_debut)
WHERE nombre_jours = 1
  AND (date_fin - date_debut) != 1;

-- En parallèle, corriger add_abonnement_structure pour inclure nombre_jours :
-- Ajouter 'nombre_jours' dans la liste des colonnes INSERT
-- et (date_fin - date_debut) dans les VALUES
```

---

### INC-05 — [MAJEUR] Vue `list_structures` : `etat_abonnement` faux pour 1 626 structures

**Description** : La vue `list_structures` retourne `a.statut` (valeur brute en base) sans recalcul temporel. Aucun trigger ni job ne met à jour `statut` de `'ACTIF'` à `'EXPIRE'` quand `date_fin` est dépassée. 1 626 structures affichent `etat_abonnement = 'ACTIF'` alors que leur dernier abonnement est expiré (confirmé par count de la requête de contrôle).

**Sous-clause de la vue** (extrait) :
```sql
LEFT JOIN (
  SELECT DISTINCT ON (id_structure) id_structure, statut, date_fin, type_abonnement
  FROM abonnements
  ORDER BY id_structure, date_fin DESC  -- → dernier par date, mais statut brut
) a ON s.id_structure = a.id_structure
-- a.statut exposé directement, pas de CASE WHEN date_fin < NOW()
```

`get_une_structure` recalcule correctement l'état (donc pas de bug sur cette fonction), mais `list_structures` ne le fait pas.

**Reproduction** :
```sql
SELECT ls.id_structure, ls.etat_abonnement,
       ls.date_limite_abonnement,
       ls.date_limite_abonnement < CURRENT_DATE AS est_expire
FROM list_structures ls WHERE ls.id_structure = 139;
-- etat_abonnement='ACTIF', est_expire=true → contradiction
```

**Correctif proposé** :
```sql
-- Corriger la vue pour recalculer l'état à la volée
CREATE OR REPLACE VIEW public.list_structures AS
SELECT s.id_structure, ...,
  CASE
    WHEN a.date_fin IS NULL      THEN 'AUCUN'
    WHEN a.date_fin >= CURRENT_DATE THEN a.statut   -- ACTIF ou autre valeur exacte
    ELSE 'EXPIRE'
  END AS etat_abonnement,
  a.date_fin AS date_limite_abonnement,
  a.type_abonnement,
  ...
FROM structures s
JOIN type_structure t ON s.id_type = t.id_type
LEFT JOIN (
  SELECT DISTINCT ON (id_structure) id_structure, statut, date_fin, type_abonnement
  FROM abonnements
  ORDER BY id_structure, date_fin DESC
) a ON s.id_structure = a.id_structure
LEFT JOIN pays p ON p.code_iso = s.code_iso_pays;
```

---

### INC-06 — [MINEUR] Absence de traçabilité dans les fonctions de renouvellement

**Description** : Ni `renouveler_abonnement` ni `add_abonnement_structure_avec_dates` n'émettent de `RAISE LOG`. Les exceptions sont capturées silencieusement et retournées en JSON `success: false`. Si le frontend ne gère pas ce retour, l'erreur est invisible dans les logs PostgreSQL.

**Correctif proposé** : Ajouter dans `add_abonnement_structure_avec_dates` après la ligne 41 (`RETURNING id_abonnement INTO v_id_abonnement`) :
```sql
RAISE LOG '[add_abonnement_structure_avec_dates] structure=%, abo=%, debut=%, fin=%, montant=%',
  p_id_structure, v_id_abonnement, p_date_debut, p_date_fin, v_montant;
```
Et dans le bloc `EXCEPTION WHEN OTHERS` (ligne 55) :
```sql
RAISE LOG '[add_abonnement_structure_avec_dates] ERREUR structure=%, code=%, msg=%',
  p_id_structure, SQLSTATE, SQLERRM;
```

---

## 6. Tableau de synthèse

| ID | Sévérité | Fonction / Ligne | Impact | Correctif |
|---|---|---|---|---|
| INC-01 | **BLOQUANT** | `renouveler_abonnement` L.67 | `date_fin` +1 jour, cascade glissement | Ajouter `-1` |
| INC-02 | **BLOQUANT** | `add_abonnement_structure_avec_dates` L.8/L.11 | Montant 30j fixes vs jours réels | Appeler `calculer_montant_abonnement()` |
| INC-03 | MINEUR | Contrainte `exclude_chevauchement_abonnement` | Blocage si appel direct `add_abonnement_structure` avec date adjacente | Passer `daterange` en `[)` |
| INC-04 | **MAJEUR** | `add_abonnement_structure` (INSERT sans `nombre_jours`) | 1 646 lignes avec valeur fausse | Migration UPDATE + corriger INSERT |
| INC-05 | **MAJEUR** | Vue `list_structures` | 1 626 structures faussement ACTIF | Recalculer `etat_abonnement` dans la vue |
| INC-06 | MINEUR | `add_abonnement_structure_avec_dates` L.55 | Traçabilité nulle sur erreur | Ajouter `RAISE LOG` |

---

## 7. Comparaison prod vs dump `REnouvellement.txt`

| Point de comparaison | Dump local | Prod 2026-05-02 | Écart |
|---|---|---|---|
| `v_date_fin` calcul | `+ v_duree_jours - 1` (ligne 79 dump) | `+ v_duree_jours` (ligne 67 prod) | **OUI — régression confirmée** |
| Tarif jour `_avec_dates` | `v_tarif_jour := 100` | Identique (ligne 8 prod) | Non |
| Calcul montant `_avec_dates` | `p_nombre_jours * v_tarif_jour` | Identique (ligne 11 prod) | Non |
| Nom table | `public.abonnements` | `public.abonnements` | Non |
| Colonne timestamp | `created_at` (dump) | `tms_create` (prod) | Renommage post-dump |
| Colonne méthode | `methode_paiement` (dump) | `methode` (prod) | Renommage post-dump |
| `compte_prive` + `mensualite` | Non mentionné dans dump | Présents dans `param_structure` (non utilisés par les fonctions) | Non — hypothèse QA sur mensualité non validée |

---

## 8. Recommandations pour `kader_backend`

1. **Identifier la source lue pour `etat_abonnement`** : Si l'UI lit depuis le contexte auth (chargé via `get_une_structure`), le recalcul est correct. Si elle lit depuis `list_structures` directement, le résultat est trompeur (INC-05). Uniformiser sur `get_une_structure`.

2. **Ajouter `refreshAuth()` après renouvellement confirmé** : Dans le handler post-paiement de `subscription.service.ts`, après `response.success === true`, appeler `await refreshAuth()` pour que le contexte auth reflète le nouvel `etat_abonnement`.

3. **Remonter les erreurs `success: false` à l'utilisateur** : Le retour JSON de `renouveler_abonnement` contient un champ `error` ou `message` en cas d'échec. Ce message doit être affiché à l'utilisateur (toast/alerte) pour éviter la perception de « paiement passé mais rien changé ».

4. **Ne pas modifier la signature de `renouveler_abonnement`** : Les correctifs INC-01 et INC-02 seront appliqués côté PostgreSQL sans changement de signature. La couche frontend ne devra pas être modifiée.

---

*Audit produit par dba_master le 2026-05-02. Aucune écriture effectuée sur la base de données de production. Aucun correctif DDL/PL-pgSQL n'a été appliqué — les propositions ci-dessus attendent validation explicite du PO avant exécution en fenêtre de maintenance.*
