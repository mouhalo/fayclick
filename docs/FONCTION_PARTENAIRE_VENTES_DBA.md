# Fonction PostgreSQL : Statistiques Ventes pour Partenaires

## Contexte

Les partenaires doivent voir les statistiques de ventes **uniquement** pour les structures qui ont leur code promo.
Cette fonction est similaire à `get_admin_stats_produits_vendus()` mais avec filtrage par `id_partenaire`.

## Fonction à créer : `get_partenaire_stats_ventes`

### Signature

```sql
CREATE OR REPLACE FUNCTION get_partenaire_stats_ventes(
    p_id_partenaire INTEGER,                        -- OBLIGATOIRE : ID du partenaire
    p_annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_mois INTEGER DEFAULT NULL,                    -- NULL = année complète
    p_limit_top INTEGER DEFAULT 10                  -- Limite pour les top produits
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
```

### Logique de filtrage

```sql
-- Récupérer le code_promo du partenaire
SELECT code_promo INTO v_code_promo
FROM partenaires
WHERE id_partenaire = p_id_partenaire AND actif = TRUE;

-- Filtrer les structures par code_promo
-- Les structures du partenaire sont celles où list_structures.code_promo = v_code_promo
```

### Tables à utiliser

- `partenaires` : Pour récupérer le `code_promo` du partenaire
- `list_structures` : Pour filtrer les structures ayant ce `code_promo`
- `list_detailventes` : Détail des ventes (quantité, prix, marge)
- `facture_com` : Factures commerciales (jointure avec structures)
- `produits` ou table équivalente : Pour les noms et catégories des produits

### Structure JSON de retour

```json
{
  "success": true,
  "code_promo": "SIMULA26",

  "periode": {
    "annee": 2026,
    "mois": null,
    "label": "Année 2026",
    "date_debut": "2026-01-01",
    "date_fin": "2026-12-31"
  },

  "resume_global": {
    "nombre_produits_distincts": 450,
    "nombre_ventes": 12500,
    "quantite_totale_vendue": 25000,
    "chiffre_affaire_total": 45000000,
    "cout_total": 35000000,
    "marge_totale": 10000000,
    "taux_marge_moyen": 22.2,
    "prix_moyen_vente": 1800,
    "panier_moyen": 3600,
    "nombre_factures": 12500,
    "nombre_structures_actives": 85
  },

  "par_categorie": [
    {
      "categorie": "ALIMENTATION",
      "nombre_produits": 120,
      "nombre_ventes": 5000,
      "quantite_vendue": 10000,
      "chiffre_affaire": 28000000,
      "marge_totale": 6000000,
      "taux_marge": 21.4,
      "part_ca": 62.2
    }
  ],

  "par_structure": [
    {
      "id_structure": 1196,
      "nom_structure": "Boutique Dakar Centre",
      "type_structure": "COMMERCIALE",
      "nombre_produits": 45,
      "nombre_ventes": 1200,
      "quantite_vendue": 2500,
      "chiffre_affaire": 15000000,
      "marge_totale": 3500000,
      "taux_marge": 23.3
    }
  ],

  "top_produits": [
    {
      "id_produit": 123,
      "nom_produit": "Riz Brisé 25kg",
      "categorie": "ALIMENTATION",
      "nombre_structures": 45,
      "nombre_ventes": 850,
      "quantite_vendue": 850,
      "prix_moyen": 10000,
      "chiffre_affaire": 8500000,
      "marge_totale": 1700000,
      "taux_marge": 20.0
    }
  ],

  "evolution": [
    {
      "mois": 1,
      "label": "Jan",
      "quantite_vendue": 2000,
      "chiffre_affaire": 3500000,
      "marge": 800000,
      "nombre_ventes": 1000
    }
  ]
}
```

### Comportement selon p_mois

| p_mois | Evolution retournée |
|--------|---------------------|
| NULL | 12 éléments avec `mois` (1-12) et `label` ("Jan", "Fév"...) |
| 1-12 | N éléments avec `jour` (1-31) et `date` (ISO) |

### Exemple d'appel

```sql
-- Ventes annuelles du partenaire 5
SELECT * FROM get_partenaire_stats_ventes(5, 2026, NULL, 10);

-- Ventes de janvier 2026 du partenaire 5
SELECT * FROM get_partenaire_stats_ventes(5, 2026, 1, 10);
```

### Sécurité

- Vérifier que le partenaire existe et est actif
- Si partenaire invalide, retourner `{ "success": false, "message": "Partenaire non trouvé ou inactif" }`
- Le filtrage par `code_promo` garantit que le partenaire ne voit que SES structures

### Notes importantes

1. **Limiter `par_structure`** à 15 structures max (les meilleures par CA)
2. **Limiter `top_produits`** selon `p_limit_top` (défaut 10)
3. **Trier `par_categorie`** par chiffre_affaire DESC
4. **Trier `par_structure`** par chiffre_affaire DESC
5. **Trier `top_produits`** par quantite_vendue DESC (ou chiffre_affaire DESC)

---

## Référence : Structure existante admin

La fonction `get_admin_stats_produits_vendus()` dans `/docs/Admin/Fonctions_StatVentes.txt` peut servir de base.
La différence principale est le **filtrage par code_promo du partenaire** au lieu de toutes les structures.

```sql
-- Admin : toutes les structures (ou filtre par id_structure optionnel)
WHERE (p_id_structure IS NULL OR fc.id_structure = p_id_structure)

-- Partenaire : seulement les structures avec son code_promo
WHERE ls.code_promo = v_code_promo
```
