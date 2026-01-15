# Resume - Fonction get_partenaire_stats_ventes

## Date de creation : 2026-01-15

## Statut : IMPLEMENTEE ET TESTEE

---

## Adaptations par rapport au besoin

### 1. Noms des tables

| Besoin (document) | Realite (base) | Action |
|-------------------|----------------|--------|
| `produits` | `produit_service` | Adapte via `list_detailventes` |
| `list_structures` | `structures` | Utilise `structures` directement |
| `list_detailventes` | `list_detailventes` | OK - Vue existante |
| `facture_com` | `facture_com` | OK |
| `partenaires` | `partenaires` | OK |

### 2. Structure de list_detailventes

La vue `list_detailventes` contient deja :
- `nom_produit`, `nom_categorie` (jointure avec `produit_service`)
- `cout_revient`, `prix`, `quantite`
- `marge` (calculee automatiquement)

**Pas de jointure supplementaire necessaire** avec `produit_service`.

### 3. Jointure pour filtrage par partenaire

```sql
-- Chaine de jointure utilisee :
list_detailventes ldv
  JOIN facture_com fc ON ldv.id_facture = fc.id_facture
  JOIN structures s ON fc.id_structure = s.id_structure
WHERE s.code_promo = v_code_promo
```

---

## Fonction creee

```sql
CREATE OR REPLACE FUNCTION get_partenaire_stats_ventes(
    p_id_partenaire INTEGER,                -- OBLIGATOIRE
    p_annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_mois INTEGER DEFAULT NULL,            -- NULL = annee complete
    p_limit_top INTEGER DEFAULT 10          -- Limite top produits
)
RETURNS JSON
```

---

## Tests effectues

### Test 1 : Statistiques annuelles 2025

```sql
SELECT get_partenaire_stats_ventes(5, 2025, NULL, 10);
```

**Resultat :**
| Metrique | Valeur |
|----------|--------|
| Produits distincts | 54,522 |
| Nombre ventes | 291,682 |
| Quantite totale | 883,489 |
| CA Total | 4.58 Milliards FCFA |
| Marge totale | 1.67 Milliards FCFA |
| Taux marge moyen | 36.51% |
| Panier moyen | 81,159 FCFA |
| Factures | 56,476 |
| Structures actives | 1,267 |

### Test 2 : Statistiques mois (Aout 2025)

```sql
SELECT get_partenaire_stats_ventes(5, 2025, 8, 5);
```

**Resultat :**
| Metrique | Valeur |
|----------|--------|
| CA mensuel | 485.9M FCFA |
| Ventes | 29,621 |
| Structures actives | 1,249 |

**Evolution journaliere OK** (31 jours avec details)

---

## Structure JSON retournee

```json
{
  "success": true,
  "code_promo": "SIMULA26",
  "periode": {
    "annee": 2025,
    "mois": null,
    "label": "Annee 2025",
    "date_debut": "2025-01-01",
    "date_fin": "2025-12-31"
  },
  "resume_global": {
    "nombre_produits_distincts": 54522,
    "nombre_ventes": 291682,
    "quantite_totale_vendue": 883489,
    "chiffre_affaire_total": 4583555408,
    "cout_total": 2910182141,
    "marge_totale": 1673373267,
    "taux_marge_moyen": 36.51,
    "prix_moyen_vente": 15714.22,
    "panier_moyen": 81159.35,
    "nombre_factures": 56476,
    "nombre_structures_actives": 1267
  },
  "par_categorie": [...],     // Toutes categories, triees par CA DESC
  "par_structure": [...],     // Top 15 structures par CA
  "top_produits": [...],      // Top N selon p_limit_top
  "evolution": [...]          // Par mois (12) ou par jour (N)
}
```

---

## Comportement evolution

| p_mois | Evolution |
|--------|-----------|
| `NULL` | 12 elements : `mois` (1-12), `label` ("Jan"..."Dec") |
| `1-12` | N elements : `jour` (1-31), `date` (ISO) |

---

## Securite

- Verification partenaire actif ET `valide_jusqua >= CURRENT_DATE`
- Filtrage strict par `code_promo` du partenaire
- Retourne `{"success": false, "message": "..."}` si partenaire invalide

---

## Fonctions partenaire disponibles

| Fonction | Description | Statut |
|----------|-------------|--------|
| `get_partenaire_by_user(id_utilisateur)` | Info partenaire par user | OK |
| `get_partenaire_stats(id_partenaire)` | Stats globales | OK |
| `get_partenaire_structures(id_partenaire, ...)` | Liste structures paginee | OK |
| `get_partenaire_detail_structure(id_partenaire, id_structure)` | Detail structure | OK |
| `get_partenaire_stats_ventes(id_partenaire, ...)` | Stats ventes detaillees | OK |

---

## Exemple d'appel frontend

```javascript
// Stats annuelles
const statsAnnee = await db.query('SELECT get_partenaire_stats_ventes($1, $2, NULL, 10)', [idPartenaire, 2025]);

// Stats mensuelles
const statsMois = await db.query('SELECT get_partenaire_stats_ventes($1, $2, $3, 10)', [idPartenaire, 2025, 8]);
```
