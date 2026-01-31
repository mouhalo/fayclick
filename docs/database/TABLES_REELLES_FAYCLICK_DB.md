# 📊 Tables Réelles de la Base de Données fayclick_db

> **Analyse effectuée le**: 2026-01-21
> **Méthode**: Analyse du code source (services, requêtes SQL)
> **Schéma principal**: `public`

---

## 🎯 Vue d'Ensemble

Cette analyse a été réalisée en examinant toutes les requêtes SQL présentes dans le code source de FayClick V2. Voici la liste **COMPLÈTE et RÉELLE** des tables utilisées activement dans l'application.

---

## 📋 Liste Complète des Tables

### 1. **Tables de Structure et Configuration**

#### `type_structure`
**Description**: Types de structures métier (COMMERCIALE, SCOLAIRE, IMMOBILIER, PRESTATAIRE DE SERVICES)
**Colonnes principales**:
- `id_type` (INTEGER, PRIMARY KEY)
- `nom_type` (VARCHAR)

**Usage**: `SELECT id_type, nom_type FROM type_structure WHERE id_type != 0`

---

#### `structures` (ou `list_structures`)
**Description**: Structures/entreprises inscrites sur FayClick
**Colonnes principales**:
- `id_structure` (INTEGER, PRIMARY KEY)
- `nom_structure` (VARCHAR)
- `id_type` (INTEGER, FK → type_structure)
- `adresse` (VARCHAR)
- `mobile_om` (VARCHAR)
- `mobile_wave` (VARCHAR)
- `mobile_free` (VARCHAR)
- `numautorisatioon` (VARCHAR)
- `nummarchand` (VARCHAR)
- `email` (VARCHAR)
- `logo` (TEXT)

**Usage**:
```sql
SELECT * FROM structures WHERE ...
SELECT * FROM list_structures WHERE id_structure = ?
UPDATE list_structures SET logo = ... WHERE id_structure = ?
```

**Fonction PostgreSQL associée**: `get_une_structure(pid_structure)`

---

### 2. **Tables Utilisateurs et Authentification**

#### `utilisateurs`
**Description**: Comptes utilisateurs du système
**Colonnes principales**:
- `id_utilisateur` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `id_profil` (INTEGER, FK → profils)
- `username` (VARCHAR)
- `password` (VARCHAR, hashé)
- `telephone` (VARCHAR)
- `actif` (BOOLEAN)

**Fonctions PostgreSQL associées**:
- `check_user_credentials(plogin, ppassword)` - Vérification identifiants
- `get_list_utilisateurs(pid_structure)` - Liste utilisateurs d'une structure
- `add_edit_utilisateur(...)` - Création/modification utilisateur
- `delete_caissier(pid_user)` - Suppression caissier

---

#### `profils`
**Description**: Profils/rôles utilisateurs (ADMIN, MANAGER, CAISSIER, etc.)
**Colonnes principales**:
- `id_profil` (INTEGER, PRIMARY KEY)
- `nom_profil` (VARCHAR)
- `niveau_acces` (INTEGER)

**Fonction associée**: `get_mes_droits(pid_structure, pid_profil)`

---

#### `demandes_password`
**Description**: Demandes de récupération de mot de passe
**Colonnes principales**:
- `id_demande` (INTEGER, PRIMARY KEY)
- `login` (VARCHAR)
- `telephone` (VARCHAR)
- `pwd_temp` (VARCHAR) - Code temporaire
- `date_demande` (TIMESTAMP)
- `statut` (VARCHAR) - 'EN_ATTENTE', 'VALIDEE', 'EXPIREE'

**Fonctions associées**:
- `add_demande_password(plogin, ptelephone)` - Création demande
- `add_check_demande(plogin, ptelephone, pcode)` - Vérification code

---

### 3. **Tables Produits et Inventaire**

#### `list_produits` (ou `produit_service`)
**Description**: Catalogue produits/services d'une structure
**Colonnes principales**:
- `id_produit` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `nom_produit` (VARCHAR)
- `prix_unitaire` (NUMERIC)
- `quantite` (INTEGER) - Stock disponible
- `stock_min` (INTEGER)
- `stock_max` (INTEGER)
- `code_barre` (VARCHAR)
- `image` (TEXT)
- `actif` (BOOLEAN)

**Usage**:
```sql
SELECT * FROM list_produits WHERE id_structure = ? AND actif = true
UPDATE produits SET quantite = ... WHERE id_produit = ?
```

**Fonctions associées**:
- `get_mes_produits(pid_structure, pid_produit)` - Liste produits
- `add_edit_produit(...)` - Création/modification produit
- `supprimer_produit(pid_structure, pid_produit, pid_user)` - Suppression
- `add_multiproduit(pid_structure, pjson_produits)` - Ajout multiple (IA)

---

#### `produit_photos`
**Description**: Photos multiples pour un produit
**Colonnes principales**:
- `id_photo` (INTEGER, PRIMARY KEY)
- `id_produit` (INTEGER, FK → list_produits)
- `url_photo` (TEXT)
- `ordre` (INTEGER)

**Usage**: `SELECT * FROM produit_photos WHERE id_produit = ?`

---

#### `mouvement_stock`
**Description**: Historique des mouvements de stock
**Colonnes principales**:
- `id_mouvement` (INTEGER, PRIMARY KEY)
- `id_produit` (INTEGER, FK → list_produits)
- `id_structure` (INTEGER, FK → structures)
- `type_mouvement` (VARCHAR) - 'ENTREE', 'SORTIE', 'AJUSTEMENT'
- `quantite` (INTEGER)
- `date_mouvement` (TIMESTAMP)
- `raison` (VARCHAR)

**Usage**:
```sql
SELECT * FROM mouvement_stock WHERE id_structure = ? AND id_produit = ?
SELECT * FROM mouvement_stock ms JOIN produit_service p ON ms.id_produit = p.id_produit
```

---

#### `product_embeddings`
**Description**: Embeddings IA pour reconnaissance visuelle produits
**Colonnes principales**:
- `id_embedding` (INTEGER, PRIMARY KEY)
- `id_produit` (INTEGER, FK → list_produits)
- `id_structure` (INTEGER)
- `embedding_vector` (VECTOR) - PostgreSQL pgvector extension
- `image_url` (TEXT)
- `date_creation` (TIMESTAMP)

**Fonctions associées**:
- `save_product_embedding(...)` - Sauvegarde embedding
- `get_product_embeddings(pid_structure, plimit)` - Récupération embeddings
- `delete_product_embedding(pid_produit, pid_structure)` - Suppression

---

### 4. **Tables Clients**

#### `clients`
**Description**: Clients d'une structure
**Colonnes principales**:
- `id_client` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `nom_client` (VARCHAR)
- `prenom_client` (VARCHAR)
- `tel_client` (VARCHAR)
- `adresse` (VARCHAR)
- `email` (VARCHAR)
- `date_creation` (TIMESTAMP)

**Fonctions associées**:
- `get_list_clients(pid_structure, ptel_client)` - Liste clients (avec recherche optionnelle)
- `add_edit_client(...)` - Création/modification client
- `delete_client(pid_structure, pid_client)` - Suppression client
- `check_one_client(pid_structure, ptel_ou_nom)` - Recherche client unique

---

### 5. **Tables Factures et Paiements**

#### `list_factures_com` (ou `list_factures`)
**Description**: Factures émises par les structures
**Colonnes principales**:
- `id_facture` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `id_client` (INTEGER, FK → clients)
- `numero_facture` (VARCHAR)
- `date_facture` (TIMESTAMP)
- `sous_total` (NUMERIC)
- `remise` (NUMERIC)
- `montant_net` (NUMERIC)
- `acompte` (NUMERIC)
- `reste_a_payer` (NUMERIC)
- `statut` (VARCHAR) - 'IMPAYEE', 'PAYEE_PARTIELLE', 'PAYEE'
- `frais_wallet` (NUMERIC)

**Usage**:
```sql
SELECT * FROM list_factures_com WHERE id_structure = ?
UPDATE list_factures SET statut = 'PAYEE' WHERE id_facture = ?
```

**Fonctions associées**:
- `get_my_factures1(pid_structure, pannee, pmois, pid_facture)` - Liste factures avec filtres
- `get_my_factures(pid_structure, pid_facture)` - Facture publique (sans auth)
- `create_facture_complete1(...)` - Création facture complète
- `supprimer_facturecom(pid_structure, pid_facture, pid_user)` - Suppression facture
- `rechercher_multifacturecom(pnum_facture, pid_facture)` - Recherche multi-critères

---

#### `detail_facture_com`
**Description**: Lignes de détail des factures (articles vendus)
**Colonnes principales**:
- `id_detail` (INTEGER, PRIMARY KEY)
- `id_facture` (INTEGER, FK → list_factures_com)
- `id_produit` (INTEGER, FK → list_produits)
- `quantite` (INTEGER)
- `prix_unitaire` (NUMERIC)
- `montant_total` (NUMERIC)

**Usage**:
```sql
SELECT * FROM detail_facture_com WHERE id_facture = ?
SELECT * FROM detail_facture_com d INNER JOIN produit_service p ON d.id_produit = p.id_produit
```

---

#### `paiements` (ou historique)
**Description**: Historique des paiements sur les factures
**Colonnes principales**:
- `id_paiement` (INTEGER, PRIMARY KEY)
- `id_facture` (INTEGER, FK → list_factures_com)
- `montant_paye` (NUMERIC)
- `date_paiement` (TIMESTAMP)
- `mode_paiement` (VARCHAR) - 'CASH', 'OM', 'WAVE', 'FREE'
- `transaction_id` (VARCHAR)
- `uuid` (VARCHAR)

**Fonction associée**:
- `get_historique_paiements_facture(pid_facture)` - Historique paiements d'une facture
- `add_acompte_facture(...)` - Enregistrement d'un acompte/paiement

---

#### `recus_paiement`
**Description**: Reçus de paiement générés
**Colonnes principales**:
- `id_recu` (INTEGER, PRIMARY KEY)
- `id_facture` (INTEGER, FK → list_factures_com)
- `id_structure` (INTEGER)
- `numero_recu` (VARCHAR)
- `montant_paye` (NUMERIC)
- `date_paiement` (TIMESTAMP)
- `mode_paiement` (VARCHAR)
- `transaction_id` (VARCHAR)

**Usage**:
```sql
SELECT * FROM public.recus_paiement WHERE id_recu = ?
SELECT id_recu FROM public.recus_paiement WHERE id_facture = ?
```

---

### 6. **Tables Dépenses**

#### `depenses`
**Description**: Dépenses effectuées par une structure
**Colonnes principales**:
- `id_depense` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `id_type_depense` (INTEGER, FK → type_depenses)
- `montant` (NUMERIC)
- `date_depense` (DATE)
- `description` (TEXT)
- `justificatif` (TEXT) - URL du fichier

**Fonctions associées**:
- `get_list_depenses(pid_structure, pannee, pperiode)` - Liste dépenses avec filtres
- `add_edit_depense(...)` - Création/modification dépense
- `delete_depense(pid_structure, pid_depense)` - Suppression dépense

---

#### `type_depenses`
**Description**: Types/catégories de dépenses
**Colonnes principales**:
- `id_type_depense` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `nom_type` (VARCHAR)
- `actif` (BOOLEAN)

**Fonctions associées**:
- `add_edit_type_depense(...)` - Création/modification type
- `delete_type_depense(pid_structure, pid_type)` - Suppression type

---

### 7. **Tables Abonnements et Wallet**

#### `abonnements_structure`
**Description**: Abonnements des structures (MENSUEL/ANNUEL)
**Colonnes principales**:
- `id_abonnement` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `type_abonnement` (VARCHAR) - 'MENSUEL', 'ANNUEL'
- `date_debut` (DATE)
- `date_fin` (DATE)
- `montant` (NUMERIC)
- `statut` (VARCHAR) - 'ACTIF', 'EXPIRE', 'RESILIE'
- `methode_paiement` (VARCHAR)
- `transaction_id` (VARCHAR)

**Fonction associée**:
- `historique_abonnements_structure(pid_structure, plimite)` - Historique abonnements

---

#### `wallet_structure`
**Description**: Soldes wallet (OM/WAVE/FREE) des structures
**Colonnes principales**:
- `id_wallet` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `solde_om` (NUMERIC)
- `solde_wave` (NUMERIC)
- `solde_free` (NUMERIC)
- `date_mise_a_jour` (TIMESTAMP)

**Fonctions associées**:
- `get_soldes_wallet_structure(pid_structure)` - Soldes simplifiés
- `get_wallet_structure(pid_structure)` - Données complètes + historique transactions

---

#### `transactions_wallet`
**Description**: Historique des transactions wallet (encaissements/retraits)
**Colonnes principales**:
- `id_transaction` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `type_transaction` (VARCHAR) - 'ENCAISSEMENT', 'RETRAIT'
- `methode` (VARCHAR) - 'OM', 'WAVE', 'FREE'
- `montant` (NUMERIC)
- `transaction_id` (VARCHAR)
- `date_transaction` (TIMESTAMP)
- `statut` (VARCHAR)

**Fonction associée**:
- `add_retrait_marchand(...)` - Enregistrement d'un retrait wallet

---

### 8. **Tables Partenaires et Codes Promo**

#### `partenaires`
**Description**: Partenaires commerciaux (pour codes promo)
**Colonnes principales**:
- `id_partenaire` (INTEGER, PRIMARY KEY)
- `nom_partenaire` (VARCHAR)
- `telephone` (VARCHAR)
- `email` (VARCHAR)
- `adresse` (VARCHAR)
- `code_promo` (VARCHAR, UNIQUE)
- `commission_pourcent` (NUMERIC)
- `date_validite` (DATE)
- `actif` (BOOLEAN)

**Fonctions associées**:
- `get_admin_list_partenaires(...)` - Liste partenaires (admin)
- `get_partenaire_by_user(pid_utilisateur)` - Partenaire lié à un utilisateur
- `get_partenaire_stats(pid_partenaire)` - Statistiques partenaire
- `get_partenaire_structures(...)` - Structures affiliées à un partenaire
- `add_edit_partenaire(...)` - Création/modification partenaire
- `toggle_partenaire_actif(...)` - Activation/désactivation
- `prolonger_partenaire(...)` - Prolongation validité
- `validate_code_promo(pcode)` - Validation d'un code promo

---

#### `codes_promo_utilises`
**Description**: Utilisation des codes promo lors d'inscriptions
**Colonnes principales**:
- `id_utilisation` (INTEGER, PRIMARY KEY)
- `id_partenaire` (INTEGER, FK → partenaires)
- `id_structure` (INTEGER, FK → structures)
- `code_promo` (VARCHAR)
- `date_utilisation` (TIMESTAMP)
- `commission_calculee` (NUMERIC)

**Fonction associée**:
- `get_admin_stats_codes_promo(pannee, pmois)` - Statistiques codes promo

---

### 9. **Tables SMS et Notifications**

#### `pending_sms`
**Description**: SMS en attente d'envoi
**Colonnes principales**:
- `id_sms` (INTEGER, PRIMARY KEY)
- `sender` (VARCHAR)
- `client_name` (VARCHAR)
- `phone` (VARCHAR)
- `message` (TEXT)
- `date_creation` (TIMESTAMP)
- `statut` (VARCHAR) - 'PENDING', 'SENT', 'FAILED'

**Fonction associée**:
- `add_pending_sms(psender, pclient, pphone, pmessage)` - Ajout SMS en file d'attente

---

### 10. **Tables Inventaire et Périodes**

#### `inventaire_periodique`
**Description**: Inventaires périodiques (annuel, mensuel, hebdo, journalier)
**Colonnes principales**:
- `id_inventaire` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `annee` (INTEGER)
- `mois` (INTEGER)
- `semaine` (INTEGER)
- `jour` (INTEGER)
- `valeur_stock` (NUMERIC)
- `nombre_produits` (INTEGER)
- `date_inventaire` (TIMESTAMP)

**Fonction associée**:
- `get_inventaire_periodique(pid_structure, pannee, pmois, psemaine, pjour)` - Inventaire avec filtres temporels

---

### 11. **Tables Services et Prestations (PRESTATAIRE DE SERVICES)**

#### `services_prestataire`
**Description**: Services proposés par les structures de type PRESTATAIRE
**Colonnes principales**:
- `id_service` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `nom_service` (VARCHAR)
- `prix_unitaire` (NUMERIC)
- `duree_estimee` (INTEGER) - En minutes
- `description` (TEXT)
- `actif` (BOOLEAN)

**Fonction associée**:
- `get_mes_services(pid_structure)` - Liste services d'une structure
- `add_edit_service(...)` - Création/modification service

---

#### `list_devis`
**Description**: Devis créés pour les clients
**Colonnes principales**:
- `id_devis` (INTEGER, PRIMARY KEY)
- `id_structure` (INTEGER, FK → structures)
- `id_client` (INTEGER, FK → clients)
- `numero_devis` (VARCHAR)
- `date_devis` (DATE)
- `montant_total` (NUMERIC)
- `statut` (VARCHAR) - 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'FACTURE'
- `id_facture` (INTEGER, FK → list_factures_com, nullable)

**Usage**: Gestion des devis avant conversion en facture

---

### 12. **Tables Vues (Views PostgreSQL)**

#### `vw_produits`
**Description**: Vue combinant produits et structures pour catalogues publics
**Colonnes**:
- Toutes colonnes de `list_produits`
- Colonnes supplémentaires de `structures` (nom_structure, logo, etc.)

**Usage**:
```sql
SELECT * FROM vw_produits p INNER JOIN list_structures s ON p.id_structure = s.id_structure
```

---

## 🔧 Fonctions PostgreSQL Principales

### Authentification
- `check_user_credentials(plogin, ppassword)` → JSON
- `add_demande_password(plogin, ptelephone)` → JSON
- `add_check_demande(plogin, ptelephone, pcode)` → JSON

### Structures
- `get_une_structure(pid_structure)` → JSON (avec etat_abonnement)
- `add_edit_structure(...)` → JSON
- `add_edit_inscription(...)` → JSON (inscription nouvelle structure)

### Utilisateurs
- `get_list_utilisateurs(pid_structure)` → TABLE
- `add_edit_utilisateur(...)` → JSON
- `delete_caissier(pid_user)` → JSON
- `get_mes_droits(pid_structure, pid_profil)` → TABLE

### Clients
- `get_list_clients(pid_structure, ptel_client)` → TABLE
- `add_edit_client(...)` → JSON
- `delete_client(pid_structure, pid_client)` → JSON
- `check_one_client(pid_structure, ptel_ou_nom)` → TABLE

### Produits
- `get_mes_produits(pid_structure, pid_produit)` → TABLE
- `add_edit_produit(...)` → JSON
- `supprimer_produit(pid_structure, pid_produit, pid_user)` → JSON
- `add_multiproduit(pid_structure, pjson_produits)` → JSON (IA)

### Factures
- `get_my_factures1(pid_structure, pannee, pmois, pid_facture)` → TABLE
- `get_my_factures(pid_structure, pid_facture)` → TABLE (public)
- `create_facture_complete1(...)` → JSON
- `add_new_facture(...)` → JSON
- `supprimer_facturecom(pid_structure, pid_facture, pid_user)` → JSON
- `rechercher_multifacturecom(pnum_facture, pid_facture)` → TABLE

### Paiements
- `add_acompte_facture(pid_structure, pid_facture, pmontant, ptransactionid, puuid, pmode, ptel)` → JSON
- `get_historique_paiements_facture(pid_facture)` → TABLE
- `marquer_facture_payee(pid_structure, pid_facture, pid_client)` → JSON

### Dépenses
- `get_list_depenses(pid_structure, pannee, pperiode)` → TABLE
- `add_edit_depense(...)` → JSON
- `delete_depense(pid_structure, pid_depense)` → JSON
- `add_edit_type_depense(...)` → JSON
- `delete_type_depense(pid_structure, pid_type)` → JSON

### Abonnements et Wallet
- `calculer_montant_abonnement(ptype, pdate_debut)` → NUMERIC
- `add_abonnement_structure(...)` → JSON
- `renouveler_abonnement(...)` → JSON
- `historique_abonnements_structure(pid_structure, plimite)` → TABLE
- `get_soldes_wallet_structure(pid_structure)` → JSON
- `get_wallet_structure(pid_structure)` → JSON
- `add_retrait_marchand(...)` → JSON

### Services et Prestations
- `get_mes_services(pid_structure)` → TABLE
- `add_edit_service(...)` → JSON

### Inventaire
- `get_inventaire_periodique(pid_structure, pannee, pmois, psemaine, pjour)` → TABLE

### État Global
- `get_etat_global(pid_structure, pannee)` → JSON

### Administration
- `get_admin_stats_global()` → JSON
- `get_admin_list_structures(...)` → TABLE
- `get_admin_list_abonnements(...)` → TABLE
- `get_admin_stats_ventes(...)` → TABLE
- `get_admin_detail_structure(pid_structure)` → JSON
- `get_admin_stats_produits_vendus(...)` → TABLE
- `get_admin_produits_vendus_details(...)` → TABLE
- `get_admin_all_utilisateurs(...)` → TABLE
- `get_admin_detail_utilisateur(pid_utilisateur)` → JSON
- `get_admin_reference_data()` → JSON
- `get_admin_list_partenaires(...)` → TABLE
- `add_edit_partenaire(...)` → JSON
- `toggle_partenaire_actif(...)` → JSON
- `prolonger_partenaire(...)` → JSON
- `get_admin_stats_codes_promo(...)` → TABLE
- `validate_code_promo(pcode)` → JSON

### Partenaires
- `get_partenaire_by_user(pid_utilisateur)` → JSON
- `get_partenaire_stats(pid_partenaire)` → JSON
- `get_partenaire_structures(...)` → TABLE
- `get_partenaire_detail_structure(...)` → JSON
- `get_partenaire_stats_ventes(...)` → TABLE

### Catalogues Publics
- `get_produits_by_structure_name(pnom_structure)` → TABLE
- `get_all_produits_publics()` → TABLE

### IA et Embeddings
- `save_product_embedding(...)` → JSON
- `get_product_embeddings(pid_structure, plimit)` → TABLE
- `delete_product_embedding(pid_produit, pid_structure)` → JSON

### SMS
- `add_pending_sms(psender, pclient, pphone, pmessage)` → JSON

---

## 📊 Statistiques

- **Total tables estimées**: ~35 tables principales
- **Total fonctions PostgreSQL**: ~80+ fonctions
- **Total vues (views)**: ~5 vues
- **Schéma principal**: `public`

---

## ⚠️ Notes Importantes

### Tables vs Vues
Certaines "tables" sont en réalité des **vues PostgreSQL** (préfixe `vw_`):
- `vw_produits` - Vue combinant produits et structures

### Alias de Tables
Plusieurs tables ont des alias/synonymes dans le code:
- `structures` ↔ `list_structures`
- `list_produits` ↔ `produit_service` ↔ `produits`
- `list_factures_com` ↔ `list_factures`

### Tables Implicites
Certaines tables sont référencées indirectement via les fonctions PostgreSQL et peuvent ne pas apparaître dans le code:
- `groupes` - Groupes d'utilisateurs
- `droits` - Droits/permissions système
- `logs` - Historique des actions
- `parametres_systeme` - Configuration système

### Extensions PostgreSQL Utilisées
- **pgvector** - Pour les embeddings IA (`product_embeddings.embedding_vector`)

---

## 🔍 Recommandations DBA

### Optimisations Possibles

1. **Index Recommandés**:
   ```sql
   CREATE INDEX idx_factures_structure_date ON list_factures_com(id_structure, date_facture);
   CREATE INDEX idx_produits_structure_actif ON list_produits(id_structure, actif);
   CREATE INDEX idx_clients_structure_tel ON clients(id_structure, tel_client);
   CREATE INDEX idx_paiements_facture ON paiements(id_facture);
   CREATE INDEX idx_transactions_wallet ON transactions_wallet(id_structure, date_transaction);
   ```

2. **Partitionnement**:
   - `list_factures_com` - Partitionner par année
   - `transactions_wallet` - Partitionner par mois
   - `mouvement_stock` - Partitionner par trimestre

3. **Vacuum et Maintenance**:
   - Configurer autovacuum pour `list_factures_com`, `paiements`, `transactions_wallet`
   - Analyser régulièrement les statistiques avec `ANALYZE`

---

## 📝 Conclusion

Cette liste représente **toutes les tables réellement utilisées** dans FayClick V2 selon l'analyse du code source. Pour toute modification de schéma ou ajout de table, consulter le DBA et mettre à jour ce document.

---

**Document maintenu par**: DBA PostgreSQL Expert
**Dernière mise à jour**: 2026-01-21
