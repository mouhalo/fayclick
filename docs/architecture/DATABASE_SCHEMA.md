# FayClick V2 - Schéma Base de Données

> **Document BMAD** | Version: 2.0 | Dernière mise à jour: 2026-01-21
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
| Tables | 54 |
| Vues | 10 |

---

## 2. Liste Complète des Tables

### 2.1 Tables par Domaine

#### 🏢 Core & Authentification (10 tables)

| Table | Description |
|-------|-------------|
| `structures` | Structures clientes (commerces, écoles, etc.) |
| `type_structure` | Types de structures (SCOLAIRE, COMMERCIALE, etc.) |
| `utilisateur` | Utilisateurs de l'application |
| `profil` | Profils utilisateurs (ADMIN, MANAGER, etc.) |
| `profil_droits` | Droits associés aux profils |
| `control_access` | Contrôle d'accès et permissions |
| `auth_logs` | Logs d'authentification |
| `history_users` | Historique des modifications utilisateurs |
| `demande_password` | Demandes de réinitialisation mot de passe |
| `demande_auth` | Demandes d'autorisation |

#### 🛒 Commerce & Facturation (12 tables)

| Table | Description |
|-------|-------------|
| `facture_com` | Factures commerciales |
| `detail_facture_com` | Lignes de détail des factures |
| `client_facture` | Clients associés aux factures |
| `etat_facture` | États des factures (IMPAYEE, PAYEE, etc.) |
| `devis` | Devis clients |
| `detail_devis` | Lignes de détail des devis |
| `produit_service` | Produits et services |
| `produit_photos` | Photos des produits |
| `produit_unite` | Unités de mesure produits |
| `categorie` | Catégories de produits |
| `mouvement_stock` | Mouvements de stock (entrées/sorties) |
| `facture` | Factures (module scolaire) |

#### 💰 Paiements & Transactions (7 tables)

| Table | Description |
|-------|-------------|
| `transactions` | Transactions wallet (OM/WAVE/FREE) |
| `recus_paiement` | Reçus de paiement |
| `historique_paiement` | Historique des paiements |
| `versement` | Versements effectués |
| `demande_paiement` | Demandes de paiement en attente |
| `demande_caurix` | Demandes via Caurix |
| `temp_code` | Codes temporaires (OTP) |

#### 🏦 Finance & Comptabilité (6 tables)

| Table | Description |
|-------|-------------|
| `compte_structure` | Comptes des structures (soldes wallet) |
| `journal_compte` | Journal comptable des mouvements |
| `banque` | Référentiel des banques |
| `banque_structure` | Banques associées aux structures |
| `frais_virement` | Grille des frais de virement |
| `depense` | Dépenses des structures |
| `type_depense` | Types de dépenses |

#### 📚 Module Scolaire (5 tables)

| Table | Description |
|-------|-------------|
| `etudiant` | Élèves/Étudiants |
| `groupe` | Classes/Groupes |
| `progression` | Progression des élèves |
| `niveau_progression` | Niveaux de progression |
| `grille_tarif` | Grilles tarifaires scolarité |

#### 🤝 Partenaires & Abonnements (5 tables)

| Table | Description |
|-------|-------------|
| `partenaires` | Partenaires commerciaux |
| `conventions` | Conventions partenaires |
| `abonnements` | Abonnements des structures |
| `modalite_frais` | Modalités de frais |
| `periodicite` | Périodicités (MENSUEL, ANNUEL, etc.) |

#### ⚙️ Système & Logs (8 tables)

| Table | Description |
|-------|-------------|
| `app_info` | Informations application |
| `notifications` | Notifications utilisateurs |
| `journal_activite` | Journal d'activité |
| `import_data` | Données d'import |
| `fonctionnalite` | Fonctionnalités de l'application |
| `product_embeddings` | Embeddings produits (IA) |
| `logs_doublons_journal` | Logs des doublons détectés |
| `SequelizeMeta` | Migrations Sequelize |

#### 📋 Référentiels (2 tables)

| Table | Description |
|-------|-------------|
| `type_service` | Types de services |
| `type_structure` | Types de structures |

---

## 3. Tables Principales (Détails)

### 3.1 STRUCTURES (Table centrale)

```sql
CREATE TABLE structures (
  id_structure SERIAL PRIMARY KEY,
  nom_structure VARCHAR(255) NOT NULL,
  adresse TEXT,
  telephone VARCHAR(50),
  email VARCHAR(255),
  logo TEXT,
  mobile_om VARCHAR(50),           -- Numéro Orange Money
  mobile_wave VARCHAR(50),         -- Numéro Wave
  mobile_free VARCHAR(50),         -- Numéro Free Money
  nummarchand VARCHAR(100),
  numautorisatioon VARCHAR(100),
  id_type INTEGER REFERENCES type_structure(id_type),
  actif BOOLEAN DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);
```

**Relations** :
- 1 structure → N utilisateurs
- 1 structure → N factures (facture_com)
- 1 structure → N produits (produit_service)
- 1 structure → 1 compte (compte_structure)
- 1 structure → N abonnements

---

### 3.2 UTILISATEUR

```sql
CREATE TABLE utilisateur (
  id_utilisateur SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_profil INTEGER REFERENCES profil(id_profil),
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255),
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

### 3.3 CLIENT_FACTURE

```sql
CREATE TABLE client_facture (
  id_client SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  nom_client VARCHAR(255) NOT NULL,
  tel_client VARCHAR(50) NOT NULL,  -- Format 9 chiffres (771234567)
  adresse TEXT,
  email VARCHAR(255),
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);
```

---

### 3.4 PRODUIT_SERVICE

```sql
CREATE TABLE produit_service (
  id_produit SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_categorie INTEGER REFERENCES categorie(id_categorie),
  nom_produit VARCHAR(255) NOT NULL,
  description TEXT,
  prix_vente NUMERIC(10,2) NOT NULL,
  prix_achat NUMERIC(10,2),
  niveau_stock NUMERIC(10,2) DEFAULT 0,
  seuil_min_stock INTEGER DEFAULT 0,
  seuil_max_stock INTEGER,
  code_barre VARCHAR(100),
  presente_au_public BOOLEAN DEFAULT TRUE,
  actif BOOLEAN DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);
```

---

### 3.5 FACTURE_COM

```sql
CREATE TABLE facture_com (
  id_facture SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_utilisateur INTEGER REFERENCES utilisateur(id_utilisateur),
  num_facture VARCHAR(50),          -- Auto-généré
  date_facture DATE NOT NULL,
  tel_client VARCHAR(50) NOT NULL,
  nom_client_payeur VARCHAR(255) NOT NULL,
  montant NUMERIC(10,2) NOT NULL,   -- Sous-total brut
  description TEXT,
  mt_remise NUMERIC(10,2) DEFAULT 0,
  mt_acompte NUMERIC(10,2) DEFAULT 0,
  mt_restant NUMERIC(10,2),         -- Calculé: montant - remise - acompte
  avec_frais BOOLEAN DEFAULT FALSE,
  est_devis BOOLEAN DEFAULT FALSE,
  id_etat INTEGER REFERENCES etat_facture(id_etat) DEFAULT 1,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_modification TIMESTAMP DEFAULT NOW()
);
```

**États facture (etat_facture)** :
| id_etat | Libellé |
|---------|---------|
| 1 | IMPAYEE |
| 2 | PARTIELLEMENT_PAYEE |
| 3 | PAYEE |

---

### 3.6 DETAIL_FACTURE_COM

```sql
CREATE TABLE detail_facture_com (
  id_detail SERIAL PRIMARY KEY,
  id_facture INTEGER REFERENCES facture_com(id_facture) ON DELETE CASCADE,
  id_produit INTEGER REFERENCES produit_service(id_produit),
  quantite NUMERIC(10,2) NOT NULL,
  prix NUMERIC(10,2) NOT NULL,      -- Prix unitaire au moment de la vente
  sous_total NUMERIC(10,2)          -- quantite * prix
);
```

---

### 3.7 TRANSACTIONS (Wallet)

```sql
CREATE TABLE transactions (
  id_transaction SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_facture INTEGER REFERENCES facture_com(id_facture),
  type_transaction VARCHAR(50),     -- PAIEMENT, RETRAIT, VIREMENT
  montant NUMERIC(10,2) NOT NULL,
  methode VARCHAR(20),              -- OM, WAVE, FREE, CASH
  telephone VARCHAR(50),
  transaction_id VARCHAR(100),
  uuid VARCHAR(100),
  reference_externe VARCHAR(100),
  statut VARCHAR(20) DEFAULT 'COMPLETED',
  date_transaction TIMESTAMP DEFAULT NOW()
);
```

---

### 3.8 COMPTE_STRUCTURE (Soldes Wallet)

```sql
CREATE TABLE compte_structure (
  id_compte SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure) UNIQUE,
  solde_om NUMERIC(10,2) DEFAULT 0,
  solde_wave NUMERIC(10,2) DEFAULT 0,
  solde_free NUMERIC(10,2) DEFAULT 0,
  solde_total NUMERIC(10,2) DEFAULT 0,  -- Calculé
  date_modification TIMESTAMP DEFAULT NOW()
);
```

---

### 3.9 ABONNEMENTS

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

### 3.10 DEPENSE

```sql
CREATE TABLE depense (
  id_depense SERIAL PRIMARY KEY,
  id_structure INTEGER REFERENCES structures(id_structure),
  id_type_depense INTEGER REFERENCES type_depense(id_type_depense),
  libelle VARCHAR(255) NOT NULL,
  montant NUMERIC(10,2) NOT NULL,
  date_depense DATE NOT NULL,
  description TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);
```

---

### 3.11 MOUVEMENT_STOCK

```sql
CREATE TABLE mouvement_stock (
  id_mouvement SERIAL PRIMARY KEY,
  id_produit INTEGER REFERENCES produit_service(id_produit),
  id_structure INTEGER REFERENCES structures(id_structure),
  type_mouvement VARCHAR(20),       -- ENTREE, SORTIE, AJUSTEMENT
  quantite NUMERIC(10,2) NOT NULL,
  motif TEXT,
  id_facture INTEGER REFERENCES facture_com(id_facture),
  date_mouvement TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Vues Principales (10 vues)

| Vue | Description | Usage |
|-----|-------------|-------|
| `list_structures` | Structures avec infos complètes | Login, dashboard |
| `list_utilisateurs` | Utilisateurs avec profil et structure | Gestion users |
| `list_produits` | Produits avec catégorie et stock | Catalogue |
| `list_factures_com` | Factures avec détails client | Liste factures |
| `list_factures_payees` | Factures payées uniquement | Rapports |
| `list_detailventes` | Détails des ventes | Analyse ventes |
| `list_solde_structure` | Soldes wallet par structure | KALPE |
| `list_journal_structures` | Journal comptable | Comptabilité |
| `list_banques` | Liste des banques | Virements |
| `journalisation_factures` | Historique factures | Audit |

---

## 5. Diagramme ERD Simplifié

```
┌─────────────────┐
│ type_structure  │
│   id_type (PK)  │
└────────┬────────┘
         │ 1:N
┌────────▼────────────────────┐
│      structures             │
│   id_structure (PK)         │◄──────────────────────────────┐
│   nom_structure             │                               │
│   mobile_om/wave/free       │                               │
└──┬──────────┬───────────┬───┘                               │
   │          │           │                                   │
   │ 1:N      │ 1:N       │ 1:1                              │
   │          │           │                                   │
┌──▼────────┐ │  ┌────────▼─────────┐    ┌──────────────────┴──┐
│utilisateur│ │  │ compte_structure │    │    abonnements      │
│id_utilisat│ │  │ solde_om/wave/   │    │  type_abonnement    │
│id_profil  │ │  │ free             │    │  date_debut/fin     │
└───────────┘ │  └──────────────────┘    └─────────────────────┘
              │
        ┌─────▼──────────┐
        │ produit_service│
        │  id_produit    │◄─────────────────┐
        │  prix_vente    │                  │
        │  niveau_stock  │                  │
        └───────┬────────┘                  │
                │ 1:N                       │
         ┌──────▼───────┐           ┌───────┴───────┐
         │mouvement_stock│           │detail_facture │
         │ type_mouvement│           │  _com         │
         │ quantite      │           │ id_produit    │
         └───────────────┘           │ quantite      │
                                     └───────┬───────┘
                                             │ N:1
┌───────────────┐                    ┌───────▼───────┐
│ client_facture│◄───────────────────│  facture_com  │
│  nom_client   │   (tel_client)     │  id_facture   │
│  tel_client   │                    │  montant      │
└───────────────┘                    │  mt_acompte   │
                                     └───────┬───────┘
                                             │ 1:N
                                     ┌───────▼───────┐
                                     │ transactions  │
                                     │ methode       │
                                     │ montant       │
                                     └───────────────┘
```

---

## 6. Tables de Référence

### TYPE_STRUCTURE

| id_type | nom_type |
|---------|----------|
| 1 | SCOLAIRE |
| 2 | COMMERCIALE |
| 3 | IMMOBILIER |
| 4 | PRESTATAIRE DE SERVICES |
| 5 | FORMATION PRO |

### PROFIL

| id_profil | nom_profil | niveau_acces |
|-----------|------------|--------------|
| 1 | SUPER_ADMIN | 10 |
| 2 | ADMIN | 8 |
| 3 | MANAGER | 6 |
| 4 | COMPTABLE | 4 |
| 5 | USER | 2 |

### ETAT_FACTURE

| id_etat | libelle |
|---------|---------|
| 1 | IMPAYEE |
| 2 | PARTIELLEMENT_PAYEE |
| 3 | PAYEE |
| 4 | ANNULEE |

---

## 7. Index Recommandés

```sql
-- Factures
CREATE INDEX idx_facture_com_structure_date ON facture_com(id_structure, date_facture DESC);
CREATE INDEX idx_facture_com_client ON facture_com(tel_client);
CREATE INDEX idx_facture_com_etat ON facture_com(id_etat);

-- Détails factures
CREATE INDEX idx_detail_facture_com_facture ON detail_facture_com(id_facture);
CREATE INDEX idx_detail_facture_com_produit ON detail_facture_com(id_produit);

-- Produits
CREATE INDEX idx_produit_service_structure ON produit_service(id_structure, actif);
CREATE INDEX idx_produit_service_categorie ON produit_service(id_categorie);

-- Transactions
CREATE INDEX idx_transactions_structure ON transactions(id_structure, date_transaction DESC);
CREATE INDEX idx_transactions_facture ON transactions(id_facture);

-- Stock
CREATE INDEX idx_mouvement_stock_produit ON mouvement_stock(id_produit, date_mouvement DESC);

-- Utilisateurs
CREATE INDEX idx_utilisateur_structure ON utilisateur(id_structure, actif);
CREATE INDEX idx_utilisateur_login ON utilisateur(login);

-- Abonnements
CREATE INDEX idx_abonnements_structure ON abonnements(id_structure, statut);
```

---

## 8. Fonctions PostgreSQL (213 fonctions)

> **Source**: `.claude/agents/liste_fonctions_db.csv` - Extraction complète du 21/01/2026

### 8.1 Authentification & Sécurité (15 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `check_user_credentials` | `(login, pwd, session_id?)` | TABLE (user + structure + abonnement) |
| `verifier_connexion` | `(email, password)` | TABLE (utilisateur complet) |
| `get_mes_droits` | `(id_structure, id_profil)` | JSON |
| `change_user_password` | `(id_utilisateur, old_pwd, new_pwd)` | BOOLEAN |
| `reset_user_password` | `(id_utilisateur)` | VARCHAR (nouveau pwd) |
| `add_demande_password` | `(login, telephone)` | JSON |
| `add_check_demande` | `(login, telephone, password_temp)` | JSON |
| `check_otp_sms` | `(id_structure, nom_agent, code_otp)` | VARCHAR |
| `block_deblock_user` | `(id_utilisateur, action)` | VARCHAR |
| `log_auth_step` | `(function_name, step, login, message, ...)` | VOID |
| `log_user_action` | `(id_user, action_type, ip, user_agent, ...)` | VOID |
| `log_user_login` | `(id_user, ip, user_agent, session_id, success)` | VOID |
| `get_auth_logs_summary` | `(hours?, login?)` | TABLE (stats connexions) |

### 8.2 Gestion Structures (8 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_structure` | `(id_type, nom, adresse, mobile_om, ...)` | VARCHAR |
| `add_edit_inscription` | `(id_type, nom, adresse, mobile_om, ..., code_promo?)` | VARCHAR |
| `get_une_structure` | `(id_structure)` | JSON |
| `save_my_logo` | `(id_structure, url_logo)` | JSON |
| `get_admin_list_structures` | `(limit?, offset?, search?, type?, statut?)` | JSON |
| `get_admin_detail_structure` | `(id_structure)` | JSON |

### 8.3 Gestion Utilisateurs (10 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_utilisateur` | `(id_structure, id_profil, username, tel, id_user?)` | JSON |
| `get_list_utilisateurs` | `(id_structure)` | JSON |
| `get_admin_all_utilisateurs` | `(limit?, offset?, search?, id_structure?, ...)` | JSON |
| `get_admin_detail_utilisateur` | `(id_utilisateur)` | JSON |
| `delete_caissier` | `(id_user)` | JSON |
| `add_droits_profils` | `(id_structure)` | VOID |

### 8.4 Gestion Clients (6 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_client` | `(id_structure, nom, tel, adresse?, id_client?)` | TABLE |
| `get_list_clients` | `(id_structure, telephone?)` | JSON |
| `check_one_client` | `(id_structure, tel_or_name)` | JSON |
| `get_client_facture_details` | `(id_structure, id_facture?, id_client?)` | JSON |
| `sync_clients_existants` | `()` | JSON |

### 8.5 Gestion Produits/Services (15 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_produit` | `(id_structure, nom, cout_revient, prix_vente, ...)` | TABLE |
| `add_edit_service` | `(id_structure, nom, prix_vente, categorie?, ...)` | TABLE |
| `add_edit_photo` | `(id_structure, id_produit, url_photo, id_photo?)` | JSON |
| `add_multiproduit` | `(id_structure, all_produits_text)` | JSON |
| `get_mes_produits` | `(id_structure, id_produit?)` | JSON |
| `get_mes_services` | `(id_structure, id_produit?)` | JSON |
| `get_all_produits_publics` | `()` | JSON |
| `get_produits_by_structure_name` | `(nom_structure)` | JSON |
| `del_produit_photo` | `(id_photo, id_structure)` | JSON |
| `supprimer_produit` | `(id_structure, id_produit, id_utilisateur)` | JSON |
| `maj_published_product` | `(id_produit, id_structure, presente_au_public)` | JSON |
| `save_product_embedding` | `(id_produit, id_structure, embedding, hash, ...)` | JSONB |
| `get_product_embeddings` | `(id_structure, limit?)` | JSONB |
| `delete_product_embedding` | `(id_produit, id_structure)` | JSONB |

### 8.6 Gestion Stock & Inventaire (7 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_mouvement_stock` | `(id_produit, id_structure, type_mouv, qte, desc?, created_by?)` | JSON |
| `gere_stock` | `(id_structure, id_produit, type_mouv, qte, prix, desc?)` | INTEGER |
| `get_etat_stock` | `(id_structure)` | TABLE (stock théorique vs réel) |
| `get_inventaire` | `(id_structure, annee?, periode?)` | JSON |
| `get_inventaire_periodique` | `(id_structure, annee?, mois?, semaine?, jour?)` | JSON |
| `regulariser_stock` | `(id_structure, mode_simulation?)` | TABLE |

### 8.7 Gestion Factures (25 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `create_facture_complete1` | `(date, id_structure, tel, nom, montant, desc, articles_string, remise?, acompte?, avec_frais?, est_devis?, id_user?)` | TABLE (id_facture, success, message) |
| `add_new_facture` | `(date, id_structure, tel, nom, montant, desc, remise?, acompte?, avec_frais?)` | INTEGER |
| `add_new_facture_ticket` | `(id_structure, tel, nom, montant, avec_frais?)` | VARCHAR |
| `add_acompte_facture` | `(id_structure, id_facture, montant, txn_id?, uuid?, mode_paiement?, tel?)` | JSON |
| `get_my_factures` | `(id_structure, id_facture?)` | JSON |
| `get_my_factures1` | `(id_structure, annee, mois?, id_facture?)` | JSON |
| `get_one_payement` | `(nom_structure, num_facture)` | TABLE |
| `get_etat_facture` | `(num_facture)` | JSON |
| `maj_une_facture` | `(ref_facture, txn_id, created_at, montant?, table?)` | JSON |
| `maj_all_factures` | `(id_structure, uuid, all_factures, txn_id, montant, update_time, table?, est_cashin?)` | JSON |
| `maj_detail_facture_com` | `(id_facture, id_detail, quantite, prix)` | JSON |
| `del_detail_facture_com` | `(id_facture, id_detail)` | JSON |
| `supprimer_facturecom` | `(id_structure, id_facture, id_utilisateur)` | JSON |
| `rechercher_multifacturecom` | `(num_factures?, id_facture?)` | JSON |
| `generate_invoices_for_single_structure` | `(id_structure, nb_factures?, date_debut?, date_fin?)` | JSON |
| `generate_random_invoices_for_structures` | `(code_promo?, nb_min?, nb_max?, ...)` | JSON |

### 8.8 Gestion Devis (5 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_new_devis_complet` | `(date, id_structure, tel, nom, adresse, montant, articles, equipements?, id_user?)` | JSON |
| `get_my_devis` | `(id_structure, annee, mois?, id_devis?)` | JSON |
| `maj_devis` | `(date, id_structure, tel, nom, adresse, montant, services, equipements?, id_user?, id_devis?)` | JSON |
| `del_my_devis` | `(id_devis)` | JSON |
| `calcul_devis_frais` | `(id_structure)` | TABLE |

### 8.9 Gestion Paiements & Wallet (18 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `get_wallet_structure` | `(id_structure)` | JSON (soldes + historique) |
| `get_soldes_wallet_structure` | `(id_structure)` | JSON (soldes uniquement) |
| `add_retrait_marchand` | `(id_structure, txn_id, tel, montant, mode_paiement?, id_compte?)` | TABLE (versement_id, message) |
| `add_versement_wallet` | `(id_structure, txn_id, tel, montant, frais, avec_sms, id_compte)` | TABLE |
| `add_versement_bank` | `(nom_app, nom_structure, num_facture, tel, montant, frais, avec_sms, others, mode, id_compte)` | TABLE |
| `add_new_recupaiement` | `(id_facture, id_structure, num_recu, methode, montant, ref_txn, tel?, date?)` | JSON |
| `get_historic_recu` | `(id_structure, date_debut?, date_fin?, limit?)` | JSON |
| `get_historique_paiement_facture` | `(id_facture)` | TABLE |
| `get_montant_net` | `(id_structure, montant, wallet?)` | NUMERIC |
| `get_montant_ttc` | `(id_structure, montant, wallet?)` | NUMERIC |
| `get_real_montant` | `(id_structure, montant, wallet?)` | JSON |
| `get_tarif_montant` | `(id_structure, montant)` | NUMERIC |
| `get_compte_depot` | `(id_structure, nom_prenom, num_tel)` | TABLE |

### 8.10 Gestion Abonnements (10 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `calculer_montant_abonnement` | `(type_abonnement, date_debut?)` | NUMERIC |
| `add_abonnement_structure` | `(id_structure, type, methode, date_debut?, ref?, numrecu?, uuid?, forcer?)` | JSON |
| `add_abonnement_gratuit_initial` | `(id_structure, periode?)` | JSON |
| `renouveler_abonnement` | `(id_structure, type, methode, ref?, numrecu?, uuid?)` | JSON |
| `verifier_abonnement_actif` | `(id_structure)` | JSON |
| `verifier_chevauchement_abonnement` | `(id_structure, date_debut, date_fin, id_exclu?)` | JSON |
| `expirer_abonnements` | `()` | JSON |
| `historique_abonnements_structure` | `(id_structure, limite?)` | JSON |
| `get_admin_list_abonnements` | `(limit?, offset?, statut?, type?, date_debut?, date_fin?)` | JSON |

### 8.11 Gestion Dépenses (6 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_depense` | `(id_structure, date, id_type, montant, desc, id_depense?)` | TABLE |
| `get_list_depenses` | `(id_structure, annee?, periode?)` | JSON |
| `delete_depense` | `(id_structure, id_depense)` | JSON |
| `add_edit_type_depense` | `(id_structure, nom_type, id_type?)` | TABLE |
| `get_types_depense_structure` | `(id_structure)` | TABLE |
| `delete_type_depense` | `(id_structure, id_type)` | JSON |

### 8.12 Module Scolaire (5 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_eleve` | `(id_structure, nom_prenom, telephone, nom_classe, photo?, id_etudiant?)` | TABLE |
| `get_grille_structure` | `(id_structure)` | JSON |
| `create_grille_tarif_for_existing_structures` | `(code_promo?)` | JSON |

### 8.13 Gestion Partenaires (12 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_edit_partenaire` | `(nom, telephone, email?, adresse?, code_promo?, commission?, valide_jusqua?, id?)` | JSON |
| `create_user_for_partenaire` | `(id_partenaire)` | JSON |
| `get_partenaire_by_user` | `(id_utilisateur)` | JSON |
| `get_partenaire_stats` | `(id_partenaire)` | JSON |
| `get_partenaire_stats_ventes` | `(id_partenaire, annee?, mois?, limit_top?)` | JSON |
| `get_partenaire_structures` | `(id_partenaire, limit?, offset?, search?, type?, statut?)` | JSON |
| `get_partenaire_detail_structure` | `(id_partenaire, id_structure)` | JSON |
| `get_admin_list_partenaires` | `(limit?, offset?, search?, actif?)` | JSON |
| `toggle_partenaire_actif` | `(id_partenaire, actif?)` | JSON |
| `prolonger_partenaire` | `(id_partenaire, nouvelle_date?, duree_mois?)` | JSON |
| `validate_code_promo` | `(code_promo)` | JSON |

### 8.14 Dashboard & Statistiques (15 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `get_dashboard` | `(id_structure)` | JSON |
| `get_etat_global` | `(id_structure, annee?)` | JSON |
| `get_superadmin_dashboard` | `(admin_id?)` | JSONB |
| `get_admin_stats_global` | `()` | JSON |
| `get_admin_stats_ventes` | `(annee?, mois?, id_structure?)` | JSON |
| `get_admin_stats_produits_vendus` | `(annee?, mois?, id_structure?, categorie?, limit?)` | JSON |
| `get_admin_produits_vendus_details` | `(limit?, offset?, annee?, mois?, id_structure?, categorie?, search?, order_by?, order_dir?)` | JSON |
| `get_admin_stats_codes_promo` | `(annee?, mois?)` | JSON |
| `get_admin_reference_data` | `()` | JSON |
| `get_journal_structure` | `(id_structure, date_debut?, date_fin?, periode?)` | JSON |
| `get_journal_structure_resume_mensuel` | `(id_structure, annee?)` | JSON |
| `get_journal_structure_simple` | `(id_structure, date_debut?, date_fin?, periode?)` | JSON |

### 8.15 Notifications (5 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_new_notification` | `(id_user, titre, message, type)` | JSON |
| `get_my_notifications` | `(id_utilisateur, limit?, offset?, only_unread?)` | JSONB |
| `edit_read_notification` | `(id_notification)` | JSONB |
| `mark_all_notifications_read` | `(id_utilisateur)` | JSONB |
| `delete_my_notifications` | `(id_utilisateur, id_notification?)` | JSONB |

### 8.16 Demandes de Paiement (10 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_new_demande` | `(type_op, nom_app, nom_structure, num_facture, tel, montant, frais, avec_sms, autres?, mode?, id_compte?)` | INTEGER |
| `ajouter_demande_ticket` | `(nom_app, id_structure, tel, montant, frais)` | VARCHAR |
| `get_demandes_caurix` | `(attempts, limit)` | TABLE |
| `update_achat` | `(code_demande, transaction_id, telephone)` | TABLE |
| `update_caurix_facture` | `(update_time, num_factures, transaction_id, id_demande)` | JSON |
| `maj_reclamation_factures` | `(ref_structure, uuid, all_factures, txn_id, montant, update_time, table?, est_cashin?)` | JSON |
| `update_recu_by_reference` | `(id_structure, factures_selected, reference)` | JSON |
| `clean_expired_demandes` | `()` | JSON |
| `maj_payment_status` | `(id_demande)` | VOID |

### 8.17 SMS & Codes (3 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `add_send_sms` | `(client, tel, message, data_origin)` | INTEGER |
| `creer_code` | `(type, longueur)` | VARCHAR |

### 8.18 Utilitaires (8 fonctions)

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| `date_dist` | `(date1, date2)` | INTEGER (jours) |
| `remove_accents` | `(text)` | TEXT |
| `gen_random_uuid` | `()` | UUID |
| `gen_random_bytes` | `(integer)` | BYTEA |
| `crypt` | `(text, text)` | TEXT |
| `digest` | `(text/bytea, text)` | BYTEA |

### 8.19 Triggers (35 triggers)

| Trigger | Table | Description |
|---------|-------|-------------|
| `create_admin_user` | structures | Créer user admin à la création structure |
| `trg_create_grille_tarif_for_structure` | structures | Créer grille tarif automatique |
| `trg_create_user_for_partenaire` | partenaires | Créer user pour nouveau partenaire |
| `trg_facture_com_set_annee_mois` | facture_com | Extraire année/mois de la date |
| `update_facture_com_status` | facture_com | Mettre à jour statut selon acompte |
| `detail_facture_stock_trigger` | detail_facture_com | Décrémenter stock après vente |
| `recalculer_montant_facture` | detail_facture_com | Recalculer montant facture |
| `check_update_numrecu` | facture_com | Vérifier numéro reçu |
| `update_tms_update_column` | (multiple) | Mettre à jour timestamp modification |
| `add_paiement` | transactions | Actions post-paiement |
| `update_compte_info_on_versement` | versement | Mettre à jour soldes compte |
| `update_montant_retrait` | retraits | Calculer frais retrait |
| `versement_before_insert` | versement | Validation avant versement |
| `update_photo_disponible` | produit_photos | Flag photo disponible |
| `update_date_maj_photo` | produit_photos | Date modification photo |
| `trg_produit_unite_normalize` | produit_unite | Normaliser unités |
| `update_produit_service` | produit_service | Actions post-modification |
| `ctrl_utilisateur_fn` | utilisateur | Contrôle utilisateur |
| `manage_db_user` | utilisateur | Gérer user BD |
| `trigger_sync_client_facture` | client_facture | Sync clients |
| `generer_matricule_etudiant` | etudiant | Générer matricule auto |
| `update_facture_on_etudiant_change` | etudiant | MAJ factures élève |
| `update_or_insert_etudiant` | etudiant | Upsert élève |
| `force_uppercase_*` | (multiple) | Forcer majuscules |
| `uppercase_nom_banque` | banque | Nom banque en majuscules |

---

## 9. Règles Métier en BD

### Contraintes CHECK
- `prix_vente >= 0` (produit_service)
- `montant > 0` (facture_com, transactions)
- `quantite > 0` (detail_facture_com)
- `mt_remise <= montant` (facture_com)

### Transactions Atomiques
- Création facture + détails via `create_facture_complete1()`
- Mise à jour stock automatique après vente
- Mise à jour soldes wallet après transaction

### Multi-tenant
- Toutes les requêtes filtrent par `id_structure`
- Vues pré-filtrées pour isolation des données

---

## 10. Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-01-21 | 1.0 | dba_master | Extraction initiale (avec erreurs) |
| 2026-01-21 | 2.0 | Claude | Correction avec vraies tables (54 tables, 10 vues) |
| 2026-01-21 | 2.1 | Claude | Ajout liste complète des 213 fonctions PostgreSQL |

