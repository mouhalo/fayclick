# Spécification des Fonctions PostgreSQL - Dashboard Admin

## Contexte
Dashboard d'administration pour l'utilisateur système (id_utilisateur = -1, login = admin@system.fay).
Ce dashboard permet de superviser l'ensemble des structures, abonnements et transactions de l'application FayClick.

---

## 1. Fonction: `get_admin_stats_global()`

### Objectif
Récupérer les statistiques globales pour les 4 StatCards du dashboard admin.

### Signature
```sql
CREATE OR REPLACE FUNCTION get_admin_stats_global()
RETURNS JSON
LANGUAGE plpgsql
AS $$
```

### Paramètres
Aucun paramètre requis (statistiques globales de toute l'application).

### Retour attendu (JSON)
```json
{
  "success": true,
  "data": {
    "structures": {
      "total": 150,
      "actives": 145,
      "inactives": 5,
      "par_type": {
        "COMMERCIALE": 80,
        "PRESTATAIRE DE SERVICES": 40,
        "SCOLAIRE": 20,
        "IMMOBILIER": 10
      }
    },
    "produits": {
      "total": 12500,
      "actifs": 11800,
      "inactifs": 700
    },
    "abonnements": {
      "actifs": 120,
      "expires": 25,
      "en_attente": 5,
      "total": 150,
      "revenus_mois_courant": 450000
    },
    "transactions": {
      "nombre_factures": 8500,
      "montant_total": 125000000,
      "montant_paye": 98000000,
      "montant_impaye": 27000000,
      "factures_mois_courant": 850,
      "montant_mois_courant": 15000000
    }
  }
}
```

### Logique métier
1. Compter toutes les structures (avec répartition par type et statut)
2. Compter tous les produits (avec statut actif/inactif)
3. Compter les abonnements par statut (ACTIF, EXPIRE, EN_ATTENTE)
4. Calculer les statistiques de facturation globales

---

## 2. Fonction: `get_admin_list_structures(p_limit, p_offset, p_search, p_type_structure, p_statut_abonnement)`

### Objectif
Lister les structures avec pagination, recherche et filtres.

### Signature
```sql
CREATE OR REPLACE FUNCTION get_admin_list_structures(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search VARCHAR DEFAULT NULL,
  p_type_structure VARCHAR DEFAULT NULL,  -- 'COMMERCIALE', 'PRESTATAIRE DE SERVICES', etc.
  p_statut_abonnement VARCHAR DEFAULT NULL -- 'ACTIF', 'EXPIRE', 'TOUS'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
```

### Retour attendu (JSON)
```json
{
  "success": true,
  "data": {
    "structures": [
      {
        "id_structure": 183,
        "nom_structure": "Boutique Mamadou",
        "type_structure": "COMMERCIALE",
        "email_structure": "mamadou@email.com",
        "telephone": "771234567",
        "adresse": "Dakar, Sénégal",
        "date_creation": "2025-01-15",
        "actif": true,
        "abonnement": {
          "statut": "ACTIF",
          "type": "MENSUEL",
          "date_fin": "2026-02-15",
          "jours_restants": 36
        },
        "stats": {
          "nombre_produits": 45,
          "nombre_factures": 120,
          "chiffre_affaire": 2500000
        }
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "pages": 8
    }
  }
}
```

### Filtres
- `p_search`: Recherche sur nom_structure, email, téléphone
- `p_type_structure`: Filtrer par type (NULL = tous)
- `p_statut_abonnement`: Filtrer par statut abonnement (NULL = tous)

---

## 3. Fonction: `get_admin_list_abonnements(p_limit, p_offset, p_statut, p_type, p_date_debut, p_date_fin)`

### Objectif
Lister tous les abonnements avec pagination et filtres.

### Signature
```sql
CREATE OR REPLACE FUNCTION get_admin_list_abonnements(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_statut VARCHAR DEFAULT NULL,           -- 'ACTIF', 'EXPIRE', 'EN_ATTENTE', 'ANNULE'
  p_type VARCHAR DEFAULT NULL,             -- 'MENSUEL', 'ANNUEL'
  p_date_debut DATE DEFAULT NULL,          -- Filtre période début
  p_date_fin DATE DEFAULT NULL             -- Filtre période fin
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
```

### Retour attendu (JSON)
```json
{
  "success": true,
  "data": {
    "abonnements": [
      {
        "id_abonnement": 45,
        "structure": {
          "id_structure": 183,
          "nom_structure": "Boutique Mamadou",
          "type_structure": "COMMERCIALE"
        },
        "type_abonnement": "MENSUEL",
        "statut": "ACTIF",
        "date_debut": "2026-01-10",
        "date_fin": "2026-02-09",
        "montant": 3100,
        "methode_paiement": "OM",
        "ref_abonnement": "ABO-183-1736512345",
        "jours_restants": 30,
        "date_creation": "2026-01-10T10:30:00Z"
      }
    ],
    "resume": {
      "total_actifs": 120,
      "total_expires": 25,
      "total_en_attente": 5,
      "revenus_periode": 450000
    },
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "pages": 8
    }
  }
}
```

---

## 4. Fonction: `get_admin_stats_ventes(p_annee, p_mois, p_id_structure)`

### Objectif
Obtenir les statistiques de ventes globales ou par structure.

### Signature
```sql
CREATE OR REPLACE FUNCTION get_admin_stats_ventes(
  p_annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_mois INTEGER DEFAULT NULL,             -- NULL = année complète
  p_id_structure INTEGER DEFAULT NULL      -- NULL = toutes structures
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
```

### Retour attendu (JSON)
```json
{
  "success": true,
  "data": {
    "periode": {
      "annee": 2026,
      "mois": 1,
      "label": "Janvier 2026"
    },
    "resume_global": {
      "nombre_factures": 850,
      "nombre_articles_vendus": 3500,
      "montant_total": 15000000,
      "montant_paye": 12000000,
      "montant_impaye": 3000000,
      "taux_recouvrement": 80.0,
      "panier_moyen": 17647
    },
    "par_type_structure": [
      {
        "type_structure": "COMMERCIALE",
        "nombre_structures": 80,
        "nombre_factures": 600,
        "montant_total": 10000000
      },
      {
        "type_structure": "PRESTATAIRE DE SERVICES",
        "nombre_structures": 40,
        "nombre_factures": 200,
        "montant_total": 4000000
      }
    ],
    "evolution_mensuelle": [
      { "mois": 1, "label": "Jan", "montant": 15000000, "factures": 850 },
      { "mois": 2, "label": "Fév", "montant": 0, "factures": 0 }
    ],
    "top_structures": [
      {
        "id_structure": 183,
        "nom_structure": "Boutique Mamadou",
        "montant_total": 2500000,
        "nombre_factures": 120
      }
    ]
  }
}
```

---

## 5. Fonction: `get_admin_detail_structure(p_id_structure)`

### Objectif
Obtenir les détails complets d'une structure spécifique (pour modal ou page détail).

### Signature
```sql
CREATE OR REPLACE FUNCTION get_admin_detail_structure(
  p_id_structure INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
```

### Retour attendu (JSON)
```json
{
  "success": true,
  "data": {
    "structure": {
      "id_structure": 183,
      "nom_structure": "Boutique Mamadou",
      "type_structure": "COMMERCIALE",
      "email_structure": "mamadou@email.com",
      "telephone": "771234567",
      "adresse": "Dakar, Sénégal",
      "logo": "url_logo.png",
      "date_creation": "2025-01-15",
      "actif": true
    },
    "proprietaire": {
      "id_utilisateur": 45,
      "nom": "Mamadou Diallo",
      "email": "mamadou@email.com",
      "telephone": "771234567"
    },
    "abonnement_actuel": {
      "id_abonnement": 45,
      "type": "MENSUEL",
      "statut": "ACTIF",
      "date_debut": "2026-01-10",
      "date_fin": "2026-02-09",
      "jours_restants": 30,
      "montant": 3100
    },
    "stats": {
      "nombre_produits": 45,
      "nombre_clients": 120,
      "nombre_factures_total": 850,
      "nombre_factures_mois": 45,
      "chiffre_affaire_total": 25000000,
      "chiffre_affaire_mois": 1500000,
      "montant_impaye": 500000
    },
    "historique_abonnements": [
      {
        "id_abonnement": 44,
        "type": "MENSUEL",
        "statut": "ANNULE",
        "date_debut": "2025-12-10",
        "date_fin": "2026-01-09",
        "montant": 3100
      }
    ]
  }
}
```

---

## Résumé des Fonctions à Créer

| # | Fonction | Objectif | Priorité |
|---|----------|----------|----------|
| 1 | `get_admin_stats_global()` | StatCards dashboard | HAUTE |
| 2 | `get_admin_list_structures(...)` | Liste structures paginée | HAUTE |
| 3 | `get_admin_list_abonnements(...)` | Liste abonnements paginée | HAUTE |
| 4 | `get_admin_stats_ventes(...)` | Stats ventes globales | MOYENNE |
| 5 | `get_admin_detail_structure(...)` | Détail structure | MOYENNE |

---

## Notes Techniques

### Tables concernées
- `structures` - Informations structures
- `utilisateurs` - Propriétaires/utilisateurs
- `abonnements` ou table équivalente - Historique abonnements
- `factures` / `facture_com` - Transactions
- `detail_facture` / `detail_facturecom` - Détails articles
- `produits` - Catalogue produits
- `clients` - Clients des structures

### Sécurité
Ces fonctions sont destinées uniquement à l'utilisateur admin système (id_utilisateur = -1).
Aucune vérification de structure n'est nécessaire car l'admin a accès à toutes les données.

### Performance
- Utiliser des index sur les colonnes de filtrage fréquent
- Limiter les résultats avec pagination
- Considérer des vues matérialisées pour les stats agrégées si le volume est important
