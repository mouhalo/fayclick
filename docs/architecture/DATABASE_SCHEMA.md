# FayClick V2 - Schéma Base de Données

> **Document BMAD** | Version: 1.0 | Dernière mise à jour: 2026-01-21
> **Base**: fayclick_db | **Serveur**: 154.12.224.173:3253

---

## 1. Vue d'Ensemble

La base de données **fayclick_db** est une base PostgreSQL multi-tenant conçue pour gérer 4 types de structures commerciales au Sénégal.

| Caractéristique | Valeur |
|-----------------|--------|
| SGBD | PostgreSQL |
| Schéma principal | `public` |
| Architecture | Multi-tenant (isolation par `id_structure`) |
| Logique métier | Stored Procedures (PL/pgSQL) |
| Format réponses | JSON |

---

## 2. Tables Principales

### 2.1 STRUCTURES (Table centrale)

```sql
CREATE TABLE structures (
  id_structure SERIAL PRIMARY KEY,
  nom_structure VARCHAR(255) NOT NULL UNIQUE,
  adresse TEXT,
  mobile_om VARCHAR(50),           -- Orange Money
  mobile_wave VARCHAR(50),         -- Wave
  mobile_free VARCHAR(50),         -- FreeMoney
  numautorisatioon VARCHAR(100),
  nummarchand VARCHAR(100),
  email VARCHAR(255),
  logo TEXT,
  id_type INTEGER REFERENCES type_structure(id_type),
  actif BOOLEAN DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);
```

**Relations** :
- 1 structure → N utilisateurs
- 1 structure → N clients
- 1 structure → N produits
- 1 structure → N factures
- 1 structure → 1 abonnement actif

---

### 2.2 USERS (Utilisateurs)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_profil INTEGER REFERENCES profils(id_profil),
  username VARCHAR(255) NOT NULL,
  login VARCHAR(100) NOT NULL UNIQUE,
  pwd VARCHAR(255) NOT NULL,        -- Hash bcrypt
  telephone VARCHAR(50),
  email VARCHAR(255),
  actif BOOLEAN DEFAULT TRUE,
  pwd_changed BOOLEAN DEFAULT FALSE,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);
```

---

### 2.3 CLIENTS

```sql
CREATE TABLE clients (
  id_client SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  nom_client VARCHAR(255) NOT NULL,
  tel_client VARCHAR(50) NOT NULL,  -- Format 9 chiffres (771234567)
  adresse TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_client_structure UNIQUE (id_structure, tel_client)
);
```

---

### 2.4 PRODUITS

```sql
CREATE TABLE produits (
  id_produit SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  nom_produit VARCHAR(255) NOT NULL,
  description TEXT,
  prix_vente NUMERIC(10,2) NOT NULL,
  prix_achat NUMERIC(10,2),
  niveau_stock NUMERIC(10,2) DEFAULT 0,
  seuil_min_stock INTEGER DEFAULT 0,
  seuil_max_stock INTEGER,
  nom_categorie VARCHAR(100),
  code_barre VARCHAR(100),
  presente_au_public BOOLEAN DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_prix_positif CHECK (prix_vente >= 0)
);
```

---

### 2.5 FACTURES (facture_com)

```sql
CREATE TABLE facture_com (
  id_facture SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_utilisateur INTEGER REFERENCES users(id),
  num_facture VARCHAR(50),          -- Auto-généré FACT-YYYYMMDD-XXXX
  date_facture DATE NOT NULL,
  tel_client VARCHAR(50) NOT NULL,
  nom_client_payeur VARCHAR(255) NOT NULL,
  montant NUMERIC(10,2) NOT NULL,   -- Sous-total brut
  description TEXT,
  mt_remise NUMERIC(10,2) DEFAULT 0,
  mt_acompte NUMERIC(10,2) DEFAULT 0,
  mt_restant NUMERIC(10,2) GENERATED ALWAYS AS (montant - mt_remise - mt_acompte) STORED,
  avec_frais BOOLEAN DEFAULT FALSE,
  est_devis BOOLEAN DEFAULT FALSE,
  id_etat INTEGER DEFAULT 1,        -- 1=IMPAYEE, 2=PARTIELLEMENT_PAYEE, 3=PAYEE
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);
```

**États facture** :
| id_etat | Libellé |
|---------|---------|
| 1 | IMPAYEE |
| 2 | PARTIELLEMENT_PAYEE |
| 3 | PAYEE |

---

### 2.6 DETAIL_FACTURE_COM

```sql
CREATE TABLE detail_facture_com (
  id_detail SERIAL PRIMARY KEY,
  id_facture INTEGER REFERENCES facture_com(id_facture) ON DELETE CASCADE,
  id_produit INTEGER REFERENCES produits(id_produit),
  quantite NUMERIC(10,2) NOT NULL,
  prix NUMERIC(10,2) NOT NULL,      -- Prix unitaire au moment de la vente
  sous_total NUMERIC(10,2) GENERATED ALWAYS AS (quantite * prix) STORED
);
```

---

### 2.7 PAIEMENTS

```sql
CREATE TABLE paiements (
  id_recu SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_facture INTEGER REFERENCES facture_com(id_facture),
  telephone VARCHAR(50) NOT NULL,
  montant NUMERIC(10,2) NOT NULL,
  mode_paiement VARCHAR(20),        -- OM, WAVE, FREE, CASH
  transaction_id VARCHAR(100) UNIQUE,
  uuid VARCHAR(100),
  date_paiement TIMESTAMP DEFAULT NOW(),
  statut VARCHAR(20) DEFAULT 'COMPLETED'
);
```

**Format transaction_id** :
- Standard : `{WALLET}-{id_structure}-{timestamp}`
- Public : `{WALLET}-PUB-{id_structure}-{timestamp}`
- Cash : `CASH-{id_structure}-{timestamp}`

---

### 2.8 RETRAITS_WALLET

```sql
CREATE TABLE retraits_wallet (
  id_retrait SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  transaction_id VARCHAR(100) NOT NULL,
  telephone VARCHAR(50) NOT NULL,
  montant NUMERIC(10,2) NOT NULL,
  methode VARCHAR(20) NOT NULL,     -- OM, WAVE
  frais INTEGER DEFAULT 0,
  date_retrait TIMESTAMP DEFAULT NOW(),
  statut VARCHAR(20) DEFAULT 'SUCCESS'
);
```

---

### 2.9 ABONNEMENTS

```sql
CREATE TABLE abonnements (
  id_abonnement SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  type_abonnement VARCHAR(20) NOT NULL,  -- MENSUEL, ANNUEL
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  montant NUMERIC(10,2) NOT NULL,
  statut VARCHAR(20) DEFAULT 'ACTIF',
  transaction_id VARCHAR(100),
  uuid_paiement VARCHAR(100),
  methode_paiement VARCHAR(20),
  date_creation TIMESTAMP DEFAULT NOW()
);
```

---

### 2.10 Tables de Référence

#### TYPE_STRUCTURE
```sql
CREATE TABLE type_structure (
  id_type SERIAL PRIMARY KEY,
  nom_type VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  actif BOOLEAN DEFAULT TRUE
);
```

| id_type | nom_type |
|---------|----------|
| 1 | SCOLAIRE |
| 2 | COMMERCIALE |
| 3 | IMMOBILIER |
| 4 | PRESTATAIRE DE SERVICES |
| 5 | FORMATION PRO |

#### PROFILS
```sql
CREATE TABLE profils (
  id_profil SERIAL PRIMARY KEY,
  nom_profil VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  niveau_acces INTEGER DEFAULT 1
);
```

| Profil | Niveau |
|--------|--------|
| ADMIN | 10 |
| MANAGER | 7 |
| COMPTABLE | 5 |
| USER | 3 |

---

## 3. Diagramme ERD

```
┌─────────────────┐
│ type_structure  │
│   id_type (PK)  │
└────────┬────────┘
         │ 1:N
┌────────▼────────────────────┐
│      structures             │
│   id_structure (PK)         │◄─────────────────────────┐
│   nom_structure UNIQUE      │                          │
│   mobile_om/wave/free       │                          │
└─────┬──────────────────┬────┘                          │
      │ 1:N              │ 1:N                           │
┌─────▼──────┐      ┌────▼──────────┐     ┌─────────────┴───┐
│   users    │      │   clients     │     │   abonnements   │
│  id (PK)   │      │ id_client(PK) │     │ id_abonnement   │
│ id_struct  │      │ id_struct(FK) │     │ id_struct (FK)  │
│ id_profil  │      │ tel_client    │     │ type_abonnement │
└──────┬─────┘      └───────┬───────┘     └─────────────────┘
       │ 1:N                │ 1:N
       │              ┌─────▼───────────┐
       │              │  facture_com    │
       └─────────────►│ id_facture(PK)  │
                      │ id_struct (FK)  │
                      │ id_utilisat(FK) │
                      │ tel_client      │
                      └───┬─────────┬───┘
                          │ 1:N     │ 1:N
                    ┌─────▼────┐  ┌─▼──────────┐
                    │ details  │  │ paiements  │
                    │id_facture│  │ id_facture │
                    │id_produit│  │transaction │
                    └──────────┘  └────────────┘
```

---

## 4. Fonctions PostgreSQL Principales

### 4.1 Authentification

| Fonction | Description |
|----------|-------------|
| `check_user_credentials(login, pwd)` | Vérification identifiants |
| `get_mes_droits(id_structure, id_profil)` | Permissions utilisateur |

### 4.2 Gestion Clients

| Fonction | Description |
|----------|-------------|
| `get_list_clients(id_structure, tel_client?)` | Liste clients + stats |
| `add_edit_client(...)` | CRUD client |

### 4.3 Gestion Factures

| Fonction | Description |
|----------|-------------|
| `create_facture_complete1(...)` | Création atomique facture + détails |
| `add_acompte_facture(id_structure, id_facture, montant, transaction_id, uuid)` | Enregistrer paiement |

### 4.4 Gestion Wallet

| Fonction | Description |
|----------|-------------|
| `get_soldes_wallet_structure(id_structure)` | Soldes OM/WAVE/FREE |
| `get_wallet_structure(id_structure)` | Soldes + historique complet |
| `add_retrait_marchand(...)` | Enregistrer retrait (après API send_cash) |

### 4.5 Gestion Abonnements

| Fonction | Description |
|----------|-------------|
| `calculer_montant_abonnement(type, date_debut)` | Calcul montant |
| `add_abonnement_structure(...)` | Créer abonnement |
| `renouveler_abonnement(...)` | Renouvellement |

---

## 5. Index Recommandés

```sql
-- Factures
CREATE INDEX idx_facture_structure_date ON facture_com(id_structure, date_facture DESC);
CREATE INDEX idx_facture_client ON facture_com(tel_client);
CREATE UNIQUE INDEX idx_facture_num ON facture_com(num_facture);

-- Détails
CREATE INDEX idx_detail_facture ON detail_facture_com(id_facture);
CREATE INDEX idx_detail_produit ON detail_facture_com(id_produit);

-- Clients
CREATE INDEX idx_client_structure_tel ON clients(id_structure, tel_client);

-- Paiements
CREATE UNIQUE INDEX idx_paiement_transaction ON paiements(transaction_id);

-- Users
CREATE UNIQUE INDEX idx_user_login ON users(login);
```

---

## 6. Règles Métier en BD

### Contraintes CHECK
- `prix_vente >= 0`
- `mt_remise <= montant`
- `mt_acompte <= (montant - mt_remise)`
- `quantite > 0`

### Transactions Atomiques
- Création facture + détails en 1 requête
- Mise à jour stock automatique
- Calcul mt_restant automatique (GENERATED)

---

## 7. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | dba_master | Extraction initiale |
