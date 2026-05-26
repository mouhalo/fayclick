-- ============================================================================
-- Schéma : Module Bons de Commande Fournisseurs — Phase 1 / EPIC 2
-- Version : v1.0
-- Date    : 2026-05-25
-- DBA     : dba_master
-- Base    : fayclick_db (154.12.224.173:3253)
-- PRD     : docs/prd-bons-commande-fournisseurs-2026-05-25.md (FR-008 à FR-013)
-- Prérequis : EPIC 1 exécuté (tables etat_bon_commande + fournisseur en place)
-- Description :
--   Création des tables bon_commande, bon_commande_details et
--   bon_commande_compteur pour la gestion des bons de commande fournisseurs.
--   Aucun mouvement de stock automatique — la réception physique est gérée
--   manuellement via le module Inventaire (FR-025, hors périmètre EPIC 2).
--   Activation conditionnée à compte_prive = TRUE sur la structure.
-- ============================================================================

-- ============================================================================
-- SECTION 1 — TABLE COMPTEUR : bon_commande_compteur
-- Option C : numérotation atomique par structure (évite race condition COUNT+1)
-- Pattern : INSERT ... ON CONFLICT DO UPDATE ... RETURNING → valeur atomique
-- ============================================================================

CREATE TABLE IF NOT EXISTS bon_commande_compteur (
  id_structure  INTEGER  PRIMARY KEY
                  REFERENCES structures(id_structure)
                  ON DELETE CASCADE,
  dernier_seq   INTEGER  NOT NULL DEFAULT 0
);

COMMENT ON TABLE bon_commande_compteur
  IS 'Compteur atomique par structure pour la numérotation des bons de commande. Chaque INSERT ou UPDATE sur ce compteur produit un numéro unique garanti même en accès concurrent. Géré exclusivement par create_bon_commande() via ON CONFLICT DO UPDATE RETURNING.';

COMMENT ON COLUMN bon_commande_compteur.id_structure
  IS 'FK vers structures(id_structure). Clé primaire — une ligne par structure.';

COMMENT ON COLUMN bon_commande_compteur.dernier_seq
  IS 'Dernier numéro séquentiel alloué pour cette structure. Incrémenté atomiquement à chaque création de BC. Ne jamais décrémenter (les trous dus aux annulations sont normaux et attendus).';

-- ============================================================================
-- SECTION 2 — TABLE PRINCIPALE : bon_commande
-- ============================================================================

CREATE TABLE IF NOT EXISTS bon_commande (
  id_bon_commande     SERIAL        PRIMARY KEY,
  id_structure        INTEGER       NOT NULL
                        REFERENCES structures(id_structure)
                        ON DELETE RESTRICT,
  id_fournisseur      INTEGER       NOT NULL
                        REFERENCES fournisseur(id_fournisseur)
                        ON DELETE RESTRICT,
  id_etat             INTEGER       NOT NULL DEFAULT 1
                        REFERENCES etat_bon_commande(id_etat),
  num_bc              VARCHAR(30)   NOT NULL,
  date_bon_commande   DATE          NOT NULL,
  description         TEXT,
  montant_net         NUMERIC(15,2) NOT NULL DEFAULT 0,
  mt_remise           NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Snapshot fournisseur au moment de la création (immuable si source modifiée)
  nom_fournisseur_snap    VARCHAR(200),
  tel_fournisseur_snap    VARCHAR(20),
  id_utilisateur          INTEGER       NOT NULL DEFAULT 0,
  date_creation           TIMESTAMP     NOT NULL DEFAULT NOW(),
  date_modification       TIMESTAMP,
  CONSTRAINT chk_bc_montant_net    CHECK (montant_net >= 0),
  CONSTRAINT chk_bc_remise_positive CHECK (mt_remise >= 0),
  CONSTRAINT uq_bc_num_structure   UNIQUE (id_structure, num_bc)
);

-- ---------------------------------------------------------------------------
-- Commentaires colonnes
-- ---------------------------------------------------------------------------

COMMENT ON TABLE bon_commande
  IS 'Table des bons de commande fournisseurs. Chaque BC est isolé par id_structure (pas d''accès cross-structure). Cycle de vie via id_etat (FK → etat_bon_commande). Aucun mouvement de stock automatique — réception gérée via Inventaire (FR-025). Visible uniquement si compte_prive = TRUE.';

COMMENT ON COLUMN bon_commande.id_bon_commande
  IS 'Clé primaire auto-incrémentée. Référencée en FK par bon_commande_details.id_bon_commande.';

COMMENT ON COLUMN bon_commande.id_structure
  IS 'FK vers structures(id_structure). Clé de sécurité obligatoire : toutes les fonctions PG vérifient que id_structure correspond avant toute opération.';

COMMENT ON COLUMN bon_commande.id_fournisseur
  IS 'FK vers fournisseur(id_fournisseur) ON DELETE RESTRICT. Le fournisseur ne peut pas être supprimé (soft delete via actif=FALSE) tant qu''il existe des BC actifs. Stocké pour jointure ; le nom canonique est dans nom_fournisseur_snap.';

COMMENT ON COLUMN bon_commande.id_etat
  IS 'FK vers etat_bon_commande.id_etat. Statuts : 1=BROUILLON (modifiable), 2=CONFIRME (modifiable), 3=LIVRE (figé, aucune modif), 4=ANNULE (figé). Transitions autorisées : 1→2, 1→4, 2→1, 2→3, 2→4. Voir edit_bon_commande() pour la matrice complète.';

COMMENT ON COLUMN bon_commande.num_bc
  IS 'Numéro de BC lisible, format BC-{id_structure}-{YYYYMMDD}-{seq}. Généré atomiquement via bon_commande_compteur. Unique par structure (contrainte UNIQUE sur id_structure, num_bc).';

COMMENT ON COLUMN bon_commande.date_bon_commande
  IS 'Date du bon de commande saisie par l''utilisateur (pas nécessairement la date de création en BD). Peut être rétroactive.';

COMMENT ON COLUMN bon_commande.description
  IS 'Description libre du bon de commande (objet, référence commande fournisseur, etc.). Optionnelle.';

COMMENT ON COLUMN bon_commande.montant_net
  IS 'Montant net de la commande après remise. Calculé côté frontend et transmis : montant_brut - mt_remise. Contraint ≥ 0. En FCFA.';

COMMENT ON COLUMN bon_commande.mt_remise
  IS 'Remise accordée sur le bon de commande. Peut être 0. Contraint ≥ 0. En FCFA.';

COMMENT ON COLUMN bon_commande.nom_fournisseur_snap
  IS 'Snapshot du nom commercial du fournisseur au moment de la création du BC. Immuable : si le fournisseur est renommé ultérieurement, ce champ conserve l''historique. Copié depuis fournisseur.nom_fournisseur à la création.';

COMMENT ON COLUMN bon_commande.tel_fournisseur_snap
  IS 'Snapshot du téléphone du fournisseur au moment de la création du BC. Immuable. Copié depuis fournisseur.tel_fournisseur à la création. Peut être NULL si le fournisseur n''avait pas de téléphone.';

COMMENT ON COLUMN bon_commande.id_utilisateur
  IS 'ID de l''utilisateur ayant créé le BC. Optionnel (DEFAULT 0 si non renseigné). Non modifiable après création. Pour audit trail.';

COMMENT ON COLUMN bon_commande.date_creation
  IS 'Horodatage de création en BD (DEFAULT NOW()). Différent de date_bon_commande qui est la date saisie. Non modifiable.';

COMMENT ON COLUMN bon_commande.date_modification
  IS 'Horodatage de la dernière modification. NULL à la création. Mis à jour à chaque appel à edit_bon_commande().';

-- ============================================================================
-- SECTION 3 — TABLE DÉTAILS : bon_commande_details
-- ============================================================================

CREATE TABLE IF NOT EXISTS bon_commande_details (
  id_detail         SERIAL        PRIMARY KEY,
  id_bon_commande   INTEGER       NOT NULL
                      REFERENCES bon_commande(id_bon_commande)
                      ON DELETE CASCADE,
  id_structure      INTEGER       NOT NULL
                      REFERENCES structures(id_structure)
                      ON DELETE RESTRICT,
  -- id_produit : pas de FK stricte (snapshot historique)
  -- Un produit supprimé ne doit pas casser l'historique des BC
  id_produit        INTEGER       NOT NULL,
  nom_produit_snap  VARCHAR(200)  NOT NULL,
  quantite          NUMERIC(10,3) NOT NULL,
  cout_revient      NUMERIC(15,2) NOT NULL,
  CONSTRAINT chk_bcd_quantite_pos  CHECK (quantite > 0),
  CONSTRAINT chk_bcd_cout_pos      CHECK (cout_revient >= 0)
);

-- ---------------------------------------------------------------------------
-- Commentaires colonnes
-- ---------------------------------------------------------------------------

COMMENT ON TABLE bon_commande_details
  IS 'Lignes articles d''un bon de commande fournisseur. Liées à bon_commande par ON DELETE CASCADE : la suppression du BC parent supprime automatiquement ses lignes. Pas de FK sur id_produit (snapshot historique : un produit supprimé ne doit pas invalider l''historique des commandes).';

COMMENT ON COLUMN bon_commande_details.id_detail
  IS 'Clé primaire auto-incrémentée. Identifiant unique de la ligne article.';

COMMENT ON COLUMN bon_commande_details.id_bon_commande
  IS 'FK vers bon_commande(id_bon_commande) ON DELETE CASCADE. La suppression du BC parent entraîne la suppression automatique de toutes ses lignes.';

COMMENT ON COLUMN bon_commande_details.id_structure
  IS 'Dénormalisé depuis bon_commande pour permettre des requêtes de filtrage rapide sur les détails sans jointure systématique avec la table parent.';

COMMENT ON COLUMN bon_commande_details.id_produit
  IS 'Identifiant du produit commandé. Pas de FK stricte sur la table produits : si un produit est supprimé, l''historique des BC le référençant reste intact. La cohérence est garantie à la création (check d''existence dans create_bon_commande).';

COMMENT ON COLUMN bon_commande_details.nom_produit_snap
  IS 'Snapshot du nom du produit au moment de la création du BC. Immuable. Copié depuis la table produits à la création. Préserve l''historique si le produit est renommé ou supprimé.';

COMMENT ON COLUMN bon_commande_details.quantite
  IS 'Quantité commandée. Type NUMERIC(10,3) pour supporter les quantités fractionnaires (ex: 2.5 kg, 0.5 litre). Contraint > 0.';

COMMENT ON COLUMN bon_commande_details.cout_revient
  IS 'Coût de revient unitaire (prix d''achat fournisseur) au moment de la commande. Contraint ≥ 0. En FCFA. Snapshot — immuable même si le coût du produit est modifié ultérieurement.';

-- ============================================================================
-- SECTION 4 — INDEX
-- ============================================================================

-- Index 1 : Filtre principal des listes par structure et état
-- Couvre la requête la plus fréquente : liste des BC d'une structure filtrée par statut
CREATE INDEX IF NOT EXISTS idx_bc_structure_etat
  ON bon_commande(id_structure, id_etat);

-- Index 2 : Tri chronologique descendant par structure (dashboard / liste récente)
-- Partiel sur BROUILLON + CONFIRME : les BC actifs sont l'affichage majoritaire
CREATE INDEX IF NOT EXISTS idx_bc_structure_date_desc
  ON bon_commande(id_structure, date_creation DESC)
  WHERE id_etat IN (1, 2);

-- Index 3 : Recherche des BC d'un fournisseur donné
-- Utilisé dans la future function get_list_fournisseurs (nb_bons_commandes réel)
-- et dans les vues fournisseur pour historique commandes
CREATE INDEX IF NOT EXISTS idx_bc_fournisseur
  ON bon_commande(id_fournisseur);

-- Index 4 : Accès direct aux détails d'un BC via id_bon_commande
-- Évite Seq Scan sur bon_commande_details lors du get_bon_commande_details()
CREATE INDEX IF NOT EXISTS idx_bcd_bon_commande
  ON bon_commande_details(id_bon_commande);

-- Index 5 : Isolation sécurité sur les détails (id_structure dénormalisé)
-- Sécurise les requêtes directes sur details avec filtrage structure
CREATE INDEX IF NOT EXISTS idx_bcd_structure
  ON bon_commande_details(id_structure);
