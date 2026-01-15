# Fonctions PostgreSQL pour Dashboard Partenaires

> **Pour le DBA** : Ce document décrit les fonctions PostgreSQL nécessaires pour permettre aux partenaires d'accéder à leurs données filtrées.

## Contexte

Les partenaires ont des comptes utilisateur (`id_groupe = 4`, `id_structure = 0`).
Ils doivent pouvoir voir **uniquement** les structures ayant leur `code_promo`.

## Tables Concernées

```sql
-- Partenaires (existante)
partenaires (id_partenaire, code_promo, id_utilisateur, nom_partenaire, ...)

-- Structures (existante)
list_structures (id_structure, code_promo, nom_structure, type_structure, ...)

-- Utilisateurs (existante)
utilisateur (id, login, id_groupe, id_structure, ...)
```

---

## Fonction 1 : `get_partenaire_by_user`

**Objectif** : Récupérer les infos du partenaire à partir de l'ID utilisateur (pour la connexion).

### Signature
```sql
get_partenaire_by_user(p_id_utilisateur INTEGER)
RETURNS JSON
```

### Paramètres
| Paramètre | Type | Description |
|-----------|------|-------------|
| p_id_utilisateur | INTEGER | ID de l'utilisateur connecté |

### Retour Attendu
```json
{
  "success": true,
  "data": {
    "id_partenaire": 5,
    "nom_partenaire": "ORANGE SÉNÉGAL",
    "code_promo": "ORANGE2026",
    "commission_pct": 10.00,
    "telephone": "800001234",
    "email": "orangesanagal@partner.fay",
    "adresse": "Dakar, Sénégal",
    "actif": true,
    "valide_jusqua": "2027-01-10",
    "jours_restants": 365,
    "est_expire": false
  }
}
```

### Cas d'Erreur
```json
{
  "success": false,
  "message": "Partenaire non trouvé ou inactif"
}
```

### Logique
1. Rechercher dans `partenaires` où `id_utilisateur = p_id_utilisateur`
2. Vérifier que `actif = true` et `valide_jusqua >= CURRENT_DATE`
3. Calculer `jours_restants` et `est_expire`

---

## Fonction 2 : `get_partenaire_stats`

**Objectif** : Statistiques globales du partenaire pour les 4 StatCards du dashboard.

### Signature
```sql
get_partenaire_stats(p_id_partenaire INTEGER)
RETURNS JSON
```

### Paramètres
| Paramètre | Type | Description |
|-----------|------|-------------|
| p_id_partenaire | INTEGER | ID du partenaire |

### Retour Attendu
```json
{
  "success": true,
  "data": {
    "structures": {
      "total": 25,
      "actives": 20,
      "avec_abonnement_actif": 15,
      "ce_mois": 3,
      "par_type": {
        "COMMERCIALE": 12,
        "SCOLAIRE": 5,
        "IMMOBILIER": 3,
        "PRESTATAIRE DE SERVICES": 5
      }
    },
    "finances": {
      "ca_total": 2500000,
      "ca_mois_courant": 450000,
      "factures_total": 150,
      "factures_mois_courant": 25
    },
    "abonnements": {
      "revenus_total": 500000,
      "revenus_mois_courant": 75000,
      "commission_estimee": 50000
    }
  },
  "generated_at": "2026-01-15T10:30:00Z"
}
```

### Logique
1. Récupérer le `code_promo` du partenaire
2. Compter les structures avec ce `code_promo` dans `list_structures`
3. Agréger les stats financières depuis `vw_factures` pour ces structures
4. Calculer les revenus d'abonnements depuis `abonnement_structure`

---

## Fonction 3 : `get_partenaire_structures`

**Objectif** : Liste paginée des structures du partenaire avec filtres.

### Signature
```sql
get_partenaire_structures(
  p_id_partenaire INTEGER,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search VARCHAR DEFAULT NULL,
  p_type_structure VARCHAR DEFAULT NULL,
  p_statut_abonnement VARCHAR DEFAULT NULL
)
RETURNS JSON
```

### Paramètres
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| p_id_partenaire | INTEGER | - | ID du partenaire (requis) |
| p_limit | INTEGER | 20 | Nombre de résultats par page |
| p_offset | INTEGER | 0 | Décalage pour pagination |
| p_search | VARCHAR | NULL | Recherche par nom structure |
| p_type_structure | VARCHAR | NULL | Filtre par type (COMMERCIALE, SCOLAIRE, etc.) |
| p_statut_abonnement | VARCHAR | NULL | Filtre par statut (ACTIF, EXPIRE, SANS_ABONNEMENT) |

### Retour Attendu
```json
{
  "success": true,
  "data": {
    "code_promo": "ORANGE2026",
    "structures": [
      {
        "id_structure": 183,
        "code_structure": "STR-2026-0183",
        "nom_structure": "Boutique Dakar Centre",
        "type_structure": "COMMERCIALE",
        "telephone": "771234567",
        "email": "boutique@example.com",
        "adresse": "Dakar, Plateau",
        "logo": "/logos/183.png",
        "actif": true,
        "date_creation": "2026-01-05",
        "abonnement": {
          "statut": "ACTIF",
          "type": "MENSUEL",
          "date_fin": "2026-02-05",
          "jours_restants": 21
        },
        "stats": {
          "nombre_produits": 45,
          "nombre_factures": 120,
          "chiffre_affaire": 850000
        }
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "pages": 2,
      "current_page": 1
    }
  }
}
```

### Logique
1. Récupérer le `code_promo` du partenaire (vérifier `actif` et `valide_jusqua`)
2. Filtrer `list_structures` par `code_promo`
3. Appliquer les filtres optionnels (search, type, statut)
4. Joindre avec `abonnement_structure` pour le statut abonnement
5. Calculer les stats par structure (produits, factures, CA)
6. Paginer les résultats

---

## Fonction 4 : `get_partenaire_detail_structure` (Optionnelle)

**Objectif** : Détail complet d'une structure (vérifie que c'est bien une structure du partenaire).

### Signature
```sql
get_partenaire_detail_structure(
  p_id_partenaire INTEGER,
  p_id_structure INTEGER
)
RETURNS JSON
```

### Paramètres
| Paramètre | Type | Description |
|-----------|------|-------------|
| p_id_partenaire | INTEGER | ID du partenaire |
| p_id_structure | INTEGER | ID de la structure à consulter |

### Retour Attendu
```json
{
  "success": true,
  "data": {
    "structure": {
      "id_structure": 183,
      "nom_structure": "Boutique Dakar Centre",
      "type_structure": "COMMERCIALE",
      "telephone": "771234567",
      "email": "boutique@example.com",
      "adresse": "Dakar, Plateau",
      "logo": "/logos/183.png",
      "cachet": null,
      "date_creation": "2026-01-05",
      "actif": true
    },
    "proprietaire": {
      "nom": "Mamadou Diallo",
      "telephone": "771234567",
      "email": "mamadou@example.com"
    },
    "abonnement": {
      "statut": "ACTIF",
      "type": "MENSUEL",
      "date_debut": "2026-01-05",
      "date_fin": "2026-02-05",
      "jours_restants": 21,
      "montant": 5000
    },
    "stats": {
      "nombre_produits": 45,
      "nombre_clients": 30,
      "nombre_factures": 120,
      "chiffre_affaire_total": 850000,
      "chiffre_affaire_mois": 125000
    }
  }
}
```

### Cas d'Erreur
```json
{
  "success": false,
  "message": "Structure non trouvée ou non autorisée"
}
```

### Logique
1. Récupérer le `code_promo` du partenaire
2. Vérifier que la structure a bien ce `code_promo`
3. Si non autorisé, retourner erreur (sécurité)
4. Si autorisé, retourner les détails complets

---

## Résumé des Fonctions

| # | Fonction | Usage | Priorité |
|---|----------|-------|----------|
| 1 | `get_partenaire_by_user(id_utilisateur)` | Connexion - récupérer infos partenaire | **Haute** |
| 2 | `get_partenaire_stats(id_partenaire)` | Dashboard - 4 StatCards | **Haute** |
| 3 | `get_partenaire_structures(id_partenaire, ...)` | Dashboard - Liste structures | **Haute** |
| 4 | `get_partenaire_detail_structure(id_partenaire, id_structure)` | Détail structure | Moyenne |

---

## Sécurité Importante

1. **Toujours vérifier** que le partenaire est `actif = true`
2. **Toujours vérifier** que `valide_jusqua >= CURRENT_DATE`
3. **Toujours filtrer** par `code_promo` du partenaire (jamais d'accès direct par id_structure)
4. **Fonction 4** : Vérifier que la structure appartient bien au partenaire avant de retourner les données

---

## Tests Suggérés

```sql
-- Test fonction 1 : Partenaire existant
SELECT * FROM get_partenaire_by_user(327);  -- ibramihalo@partner.fay

-- Test fonction 2 : Stats partenaire
SELECT * FROM get_partenaire_stats(5);  -- ID partenaire ORANGE

-- Test fonction 3 : Liste structures avec filtres
SELECT * FROM get_partenaire_structures(5, 10, 0, NULL, 'COMMERCIALE', 'ACTIF');

-- Test fonction 4 : Détail structure autorisée
SELECT * FROM get_partenaire_detail_structure(5, 183);

-- Test fonction 4 : Détail structure NON autorisée (doit échouer)
SELECT * FROM get_partenaire_detail_structure(5, 999);
```
