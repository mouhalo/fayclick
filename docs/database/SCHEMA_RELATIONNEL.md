# 🗂️ Schéma Relationnel de la Base de Données fayclick_db

> **Diagramme des Relations entre Tables**
> Analyse effectuée le: 2026-01-21

---

## 📐 Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BASE DE DONNÉES fayclick_db                         │
│                              Schéma: public                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Modèle Entité-Relation Principal

### Niveau 1: Noyau Central (STRUCTURES)

```
┌─────────────────────┐
│  type_structure     │
│─────────────────────│
│ PK id_type         │
│    nom_type        │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐          ┌─────────────────────┐
│  structures         │◄─────────│  abonnements_       │
│  (list_structures)  │  1:N     │  structure          │
│─────────────────────│          │─────────────────────│
│ PK id_structure    │          │ PK id_abonnement   │
│ FK id_type         │          │ FK id_structure    │
│    nom_structure   │          │    type_abonnement │
│    mobile_om       │          │    date_debut      │
│    mobile_wave     │          │    date_fin        │
│    mobile_free     │          │    statut          │
│    logo            │          └─────────────────────┘
└──────────┬──────────┘
           │
           │ 1:N                  ┌─────────────────────┐
           ├──────────────────────►  wallet_structure   │
           │                      │─────────────────────│
           │                      │ PK id_wallet       │
           │                      │ FK id_structure    │
           │                      │    solde_om        │
           │                      │    solde_wave      │
           │                      │    solde_free      │
           │                      └──────────┬──────────┘
           │                                 │
           │                                 │ 1:N
           │                                 │
           │                                 ▼
           │                      ┌─────────────────────┐
           │                      │ transactions_wallet │
           │                      │─────────────────────│
           │                      │ PK id_transaction  │
           │                      │ FK id_structure    │
           │                      │    type_transaction│
           │                      │    methode         │
           │                      │    montant         │
           │                      │    transaction_id  │
           │                      └─────────────────────┘
           │
           │
    ┌──────┴──────────┬───────────────┬──────────────┬─────────────┐
    │                 │               │              │             │
    │ 1:N             │ 1:N           │ 1:N          │ 1:N         │
    ▼                 ▼               ▼              ▼             ▼
┌─────────┐    ┌──────────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐
│utilisateurs│  │ clients  │   │list_     │   │depenses │   │services_│
│         │    │          │   │produits  │   │         │   │presta.  │
└─────────┘    └──────────┘   └──────────┘   └─────────┘   └─────────┘
```

---

### Niveau 2: Utilisateurs et Permissions

```
┌─────────────────────┐          ┌─────────────────────┐
│    structures       │          │     profils         │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                 │
           │ 1:N                             │ 1:N
           │                                 │
           └────────────┬────────────────────┘
                        │
                        │
                        ▼
           ┌─────────────────────┐
           │   utilisateurs      │
           │─────────────────────│
           │ PK id_utilisateur  │
           │ FK id_structure    │
           │ FK id_profil       │
           │    username        │
           │    password        │
           │    telephone       │
           │    actif           │
           └──────────┬──────────┘
                      │
                      │ 1:1
                      │
                      ▼
           ┌─────────────────────┐
           │  demandes_password  │
           │─────────────────────│
           │ PK id_demande      │
           │    login           │
           │    telephone       │
           │    pwd_temp        │
           │    statut          │
           └─────────────────────┘


┌─────────────────────┐          ┌─────────────────────┐
│     profils         │          │      droits         │
└──────────┬──────────┘          └─────────────────────┘
           │                                 ▲
           │ N:N                             │
           └─────────────────────────────────┘
              (via get_mes_droits function)
```

---

### Niveau 3: Gestion Commerciale (FACTURES)

```
┌─────────────────────┐          ┌─────────────────────┐
│   structures        │          │     clients         │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                 │
           │ 1:N                             │
           │                                 │
           └────────────┬────────────────────┘
                        │
                        │ N:1
                        │
                        ▼
           ┌─────────────────────┐
           │ list_factures_com   │
           │─────────────────────│
           │ PK id_facture      │
           │ FK id_structure    │
           │ FK id_client       │
           │    numero_facture  │
           │    sous_total      │
           │    remise          │
           │    montant_net     │
           │    acompte         │
           │    reste_a_payer   │
           │    statut          │
           └──────────┬──────────┘
                      │
           ┌──────────┴──────────┐
           │ 1:N                 │ 1:N
           │                     │
           ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐
│ detail_facture_com  │   │    paiements        │
│─────────────────────│   │─────────────────────│
│ PK id_detail       │   │ PK id_paiement     │
│ FK id_facture      │   │ FK id_facture      │
│ FK id_produit      │   │    montant_paye    │
│    quantite        │   │    mode_paiement   │
│    prix_unitaire   │   │    transaction_id  │
│    montant_total   │   │    uuid            │
└─────────────────────┘   └──────────┬──────────┘
                                     │
                                     │ 1:1
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  recus_paiement     │
                          │─────────────────────│
                          │ PK id_recu         │
                          │ FK id_facture      │
                          │    numero_recu     │
                          │    montant_paye    │
                          │    mode_paiement   │
                          └─────────────────────┘
```

---

### Niveau 4: Gestion Produits et Stock

```
┌─────────────────────┐
│   structures        │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐
│   list_produits     │
│─────────────────────│
│ PK id_produit      │
│ FK id_structure    │
│    nom_produit     │
│    prix_unitaire   │
│    quantite        │
│    stock_min       │
│    stock_max       │
│    code_barre      │
│    image           │
│    actif           │
└──────────┬──────────┘
           │
    ┌──────┴──────────┬───────────────┬─────────────┐
    │ 1:N             │ 1:N           │ 1:N         │
    ▼                 ▼               ▼             ▼
┌─────────┐    ┌──────────┐   ┌──────────┐   ┌─────────┐
│produit_ │    │mouvement_│   │detail_   │   │product_ │
│photos   │    │stock     │   │facture   │   │embeddings│
│         │    │          │   │_com      │   │         │
└─────────┘    └──────────┘   └──────────┘   └─────────┘
```

**Détail mouvement_stock**:
```
┌─────────────────────┐
│  mouvement_stock    │
│─────────────────────│
│ PK id_mouvement    │
│ FK id_produit      │
│ FK id_structure    │
│    type_mouvement  │ ← 'ENTREE', 'SORTIE', 'AJUSTEMENT'
│    quantite        │
│    date_mouvement  │
│    raison          │
└─────────────────────┘
```

**Détail product_embeddings** (IA):
```
┌─────────────────────┐
│  product_embeddings │
│─────────────────────│
│ PK id_embedding    │
│ FK id_produit      │
│ FK id_structure    │
│    embedding_vector│ ← Type VECTOR (pgvector)
│    image_url       │
│    date_creation   │
└─────────────────────┘
```

---

### Niveau 5: Dépenses

```
┌─────────────────────┐          ┌─────────────────────┐
│   structures        │          │  type_depenses      │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                 │
           │ 1:N                             │ 1:N
           │                                 │
           └────────────┬────────────────────┘
                        │
                        │
                        ▼
           ┌─────────────────────┐
           │     depenses        │
           │─────────────────────│
           │ PK id_depense      │
           │ FK id_structure    │
           │ FK id_type_depense │
           │    montant         │
           │    date_depense    │
           │    description     │
           │    justificatif    │
           └─────────────────────┘
```

---

### Niveau 6: Partenaires et Codes Promo

```
┌─────────────────────┐
│    partenaires      │
│─────────────────────│
│ PK id_partenaire   │
│    nom_partenaire  │
│    code_promo      │
│    commission_%    │
│    date_validite   │
│    actif           │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐          ┌─────────────────────┐
│ codes_promo_utilises│◄─────────│   structures        │
│─────────────────────│  N:1     └─────────────────────┘
│ PK id_utilisation  │
│ FK id_partenaire   │
│ FK id_structure    │
│    code_promo      │
│    date_utilisation│
│    commission_calc.│
└─────────────────────┘
```

---

### Niveau 7: Services et Prestations (Type PRESTATAIRE)

```
┌─────────────────────┐
│   structures        │
│ (type PRESTATAIRE)  │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐
│ services_prestataire│
│─────────────────────│
│ PK id_service      │
│ FK id_structure    │
│    nom_service     │
│    prix_unitaire   │
│    duree_estimee   │
│    description     │
│    actif           │
└─────────────────────┘


┌─────────────────────┐          ┌─────────────────────┐
│   structures        │          │     clients         │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                 │
           │ 1:N                             │ N:1
           │                                 │
           └────────────┬────────────────────┘
                        │
                        │
                        ▼
           ┌─────────────────────┐
           │    list_devis       │
           │─────────────────────│
           │ PK id_devis        │
           │ FK id_structure    │
           │ FK id_client       │
           │    numero_devis    │
           │    montant_total   │
           │    statut          │ ← 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'FACTURE'
           │ FK id_facture      │ ← Nullable (conversion devis → facture)
           └─────────────────────┘
```

---

### Niveau 8: SMS et Notifications

```
┌─────────────────────┐
│   pending_sms       │
│─────────────────────│
│ PK id_sms          │
│    sender          │
│    client_name     │
│    phone           │
│    message         │
│    date_creation   │
│    statut          │ ← 'PENDING', 'SENT', 'FAILED'
└─────────────────────┘

(Table autonome, pas de FK explicite)
```

---

### Niveau 9: Inventaire Périodique

```
┌─────────────────────┐
│   structures        │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐
│ inventaire_periodique│
│─────────────────────│
│ PK id_inventaire   │
│ FK id_structure    │
│    annee           │
│    mois            │
│    semaine         │
│    jour            │
│    valeur_stock    │
│    nombre_produits │
│    date_inventaire │
└─────────────────────┘
```

---

## 🔗 Relations Clés (Foreign Keys)

### Table: structures
- `id_type` → `type_structure.id_type`

### Table: utilisateurs
- `id_structure` → `structures.id_structure`
- `id_profil` → `profils.id_profil`

### Table: clients
- `id_structure` → `structures.id_structure`

### Table: list_produits
- `id_structure` → `structures.id_structure`

### Table: list_factures_com
- `id_structure` → `structures.id_structure`
- `id_client` → `clients.id_client`

### Table: detail_facture_com
- `id_facture` → `list_factures_com.id_facture`
- `id_produit` → `list_produits.id_produit`

### Table: paiements
- `id_facture` → `list_factures_com.id_facture`

### Table: recus_paiement
- `id_facture` → `list_factures_com.id_facture`
- `id_structure` → `structures.id_structure`

### Table: depenses
- `id_structure` → `structures.id_structure`
- `id_type_depense` → `type_depenses.id_type_depense`

### Table: type_depenses
- `id_structure` → `structures.id_structure`

### Table: abonnements_structure
- `id_structure` → `structures.id_structure`

### Table: wallet_structure
- `id_structure` → `structures.id_structure`

### Table: transactions_wallet
- `id_structure` → `structures.id_structure`

### Table: mouvement_stock
- `id_produit` → `list_produits.id_produit`
- `id_structure` → `structures.id_structure`

### Table: product_embeddings
- `id_produit` → `list_produits.id_produit`
- `id_structure` → `structures.id_structure`

### Table: services_prestataire
- `id_structure` → `structures.id_structure`

### Table: list_devis
- `id_structure` → `structures.id_structure`
- `id_client` → `clients.id_client`
- `id_facture` → `list_factures_com.id_facture` (NULLABLE)

### Table: codes_promo_utilises
- `id_partenaire` → `partenaires.id_partenaire`
- `id_structure` → `structures.id_structure`

### Table: inventaire_periodique
- `id_structure` → `structures.id_structure`

---

## 📊 Cardinalités Importantes

| Relation | Cardinalité | Description |
|----------|-------------|-------------|
| `type_structure` → `structures` | 1:N | Un type peut avoir plusieurs structures |
| `structures` → `utilisateurs` | 1:N | Une structure a plusieurs utilisateurs |
| `structures` → `clients` | 1:N | Une structure a plusieurs clients |
| `structures` → `list_produits` | 1:N | Une structure a plusieurs produits |
| `structures` → `list_factures_com` | 1:N | Une structure émet plusieurs factures |
| `clients` → `list_factures_com` | 1:N | Un client peut avoir plusieurs factures |
| `list_factures_com` → `detail_facture_com` | 1:N | Une facture contient plusieurs lignes |
| `list_factures_com` → `paiements` | 1:N | Une facture peut avoir plusieurs paiements |
| `list_produits` → `detail_facture_com` | 1:N | Un produit apparaît dans plusieurs lignes de facture |
| `list_produits` → `mouvement_stock` | 1:N | Un produit a plusieurs mouvements de stock |
| `structures` → `wallet_structure` | 1:1 | Une structure a un wallet unique |
| `wallet_structure` → `transactions_wallet` | 1:N | Un wallet a plusieurs transactions |
| `partenaires` → `codes_promo_utilises` | 1:N | Un partenaire a plusieurs utilisations de code |

---

## 🔍 Contraintes d'Intégrité

### Contraintes UNIQUE
- `structures.nom_structure` (UPPER case)
- `partenaires.code_promo`
- `utilisateurs.username` (par structure)
- `clients.tel_client` (par structure)

### Contraintes CHECK
- `list_factures_com.statut` IN ('IMPAYEE', 'PAYEE_PARTIELLE', 'PAYEE')
- `mouvement_stock.type_mouvement` IN ('ENTREE', 'SORTIE', 'AJUSTEMENT')
- `transactions_wallet.type_transaction` IN ('ENCAISSEMENT', 'RETRAIT')
- `abonnements_structure.type_abonnement` IN ('MENSUEL', 'ANNUEL')
- `abonnements_structure.statut` IN ('ACTIF', 'EXPIRE', 'RESILIE')

### Contraintes NOT NULL
Tous les FK (Foreign Keys) sont NOT NULL sauf:
- `list_devis.id_facture` (nullable avant conversion)
- `paiements.uuid` (nullable pour CASH)

---

## 🎯 Vue d'Ensemble Simplifiée

```
                         ┌──────────────┐
                         │ STRUCTURES   │ (Noyau central)
                         └──────┬───────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │UTILISATEURS│       │ CLIENTS  │        │ PRODUITS │
    └──────────┘         └─────┬────┘        └─────┬────┘
                               │                   │
                               └───────┬───────────┘
                                       │
                                       ▼
                               ┌──────────┐
                               │ FACTURES │
                               └─────┬────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                          ▼                     ▼
                   ┌──────────┐         ┌──────────┐
                   │PAIEMENTS │         │ DÉTAILS  │
                   └──────────┘         └──────────┘
```

---

## 🛠️ Extensions PostgreSQL

### pgvector
Utilisée pour `product_embeddings.embedding_vector`
```sql
CREATE EXTENSION vector;
-- Type: vector(dimension)
```

---

## 📝 Notes Techniques

### Triggers Potentiels
- `AFTER INSERT ON paiements` → Mise à jour `list_factures_com.statut`
- `AFTER UPDATE ON list_produits.quantite` → Insertion `mouvement_stock`
- `AFTER INSERT ON transactions_wallet` → Mise à jour `wallet_structure.solde_*`

### Vues Matérialisées Possibles
- `vw_factures_en_retard` - Factures impayées depuis > 30 jours
- `vw_produits_rupture_stock` - Produits avec quantité < stock_min
- `vw_top_clients` - Clients avec CA le plus élevé

---

**Document maintenu par**: DBA PostgreSQL Expert
**Dernière mise à jour**: 2026-01-21
**Version**: 1.0
