-- ============================================================================
-- Schéma : Module Fournisseurs — Phase 1 / EPIC 1
-- Version : v1.0
-- Date    : 2026-05-25
-- DBA     : dba_master
-- Base    : fayclick_db (154.12.224.173:3253)
-- PRD     : docs/prd-bons-commande-fournisseurs-2026-05-25.md (FR-001)
-- Description :
--   Création de la table fournisseur et de la table de référence etat_bon_commande.
--   La table fournisseur est la première dans FayClick permettant la gestion CRUD
--   des fournisseurs, réutilisable pour les futures évolutions (paiement fournisseur,
--   comptabilité, statistiques d'approvisionnement).
--   La table etat_bon_commande est seedée ici car elle est requise en FK par
--   bon_commande (EPIC 2) ; la créer en Phase 1 évite une migration séparée.
-- ============================================================================

-- ============================================================================
-- SECTION 1 — TABLE RÉFÉRENCE : etat_bon_commande
-- (Seedée en Phase 1 pour préparer l'EPIC 2 sans migration supplémentaire)
-- ============================================================================

CREATE TABLE IF NOT EXISTS etat_bon_commande (
  id_etat  INTEGER      PRIMARY KEY,
  libelle  VARCHAR(30)  NOT NULL UNIQUE,
  couleur  VARCHAR(20)
);

COMMENT ON TABLE etat_bon_commande
  IS 'Table de référence des statuts du cycle de vie d''un bon de commande fournisseur. Immuable : les id sont câblés dans la logique métier.';
COMMENT ON COLUMN etat_bon_commande.id_etat
  IS 'Identifiant numérique fixe du statut (1=BROUILLON, 2=CONFIRME, 3=LIVRE, 4=ANNULE). Ne jamais renuméroter.';
COMMENT ON COLUMN etat_bon_commande.libelle
  IS 'Libellé affiché dans l''interface et retourné dans les JSONs des fonctions PG.';
COMMENT ON COLUMN etat_bon_commande.couleur
  IS 'Code couleur Tailwind CSS (ex: slate, blue, emerald, red) utilisé par les badges statut frontend.';

INSERT INTO etat_bon_commande (id_etat, libelle, couleur) VALUES
  (1, 'BROUILLON', 'slate'),
  (2, 'CONFIRME',  'blue'),
  (3, 'LIVRE',     'emerald'),
  (4, 'ANNULE',    'red')
ON CONFLICT (id_etat) DO NOTHING;

-- ============================================================================
-- SECTION 2 — TABLE PRINCIPALE : fournisseur
-- ============================================================================

CREATE TABLE IF NOT EXISTS fournisseur (
  id_fournisseur    SERIAL        PRIMARY KEY,
  id_structure      INTEGER       NOT NULL
                      REFERENCES structures(id_structure)
                      ON DELETE RESTRICT,
  nom_fournisseur   VARCHAR(200)  NOT NULL,
  tel_fournisseur   VARCHAR(20),
  email_fournisseur VARCHAR(150),
  adresse           TEXT,
  ninea             VARCHAR(50),
  notes             TEXT,
  actif             BOOLEAN       NOT NULL DEFAULT TRUE,
  date_creation     TIMESTAMP     NOT NULL DEFAULT NOW(),
  date_modification TIMESTAMP,
  CONSTRAINT uq_fournisseur_struct_nom UNIQUE (id_structure, nom_fournisseur)
);

-- ---------------------------------------------------------------------------
-- Commentaires colonnes (documentation embarquée en BD)
-- ---------------------------------------------------------------------------

COMMENT ON TABLE fournisseur
  IS 'Répertoire des fournisseurs par structure FayClick. Chaque fournisseur est isolé par id_structure (pas d''accès cross-structure possible). Soft delete via actif=FALSE pour préserver l''historique des bons de commande.';

COMMENT ON COLUMN fournisseur.id_fournisseur
  IS 'Clé primaire auto-incrémentée. Référencée en FK par bon_commande.id_fournisseur (EPIC 2).';

COMMENT ON COLUMN fournisseur.id_structure
  IS 'FK vers structures.id_structure. Clé de sécurité obligatoire : toutes les fonctions PG vérifient que id_structure correspond avant toute opération.';

COMMENT ON COLUMN fournisseur.nom_fournisseur
  IS 'Nom commercial du fournisseur. Contrainte UNIQUE sur (id_structure, nom_fournisseur) pour éviter les doublons au sein d''une même structure. La recherche utilise LOWER() pour être insensible à la casse.';

COMMENT ON COLUMN fournisseur.tel_fournisseur
  IS 'Numéro de téléphone du fournisseur. Format libre (max 20 chars). Dénormalisé en snapshot dans bon_commande au moment de la création du BC pour résilience historique.';

COMMENT ON COLUMN fournisseur.email_fournisseur
  IS 'Adresse email du fournisseur. Optionnelle. Pas de contrainte CHECK format en BD (validation côté service frontend).';

COMMENT ON COLUMN fournisseur.adresse
  IS 'Adresse physique du fournisseur. Champ texte libre (rue, quartier, ville). Dénormalisé dans le bloc fournisseur du document BC imprimé.';

COMMENT ON COLUMN fournisseur.ninea
  IS 'Numéro d''Identification Nationale des Entreprises et Associations (NINEA) du fournisseur. Optionnel. Affiché sur le bon de commande imprimé.';

COMMENT ON COLUMN fournisseur.notes
  IS 'Champ notes internes sur le fournisseur (délais de livraison habituels, conditions de paiement, contacts secondaires, etc.). Non imprimé sur le BC.';

COMMENT ON COLUMN fournisseur.actif
  IS 'Indicateur de soft delete. TRUE = fournisseur actif visible dans les listes. FALSE = fournisseur désactivé masqué des listes mais conservé en BD pour préserver l''historique des BC. Jamais de DELETE physique en V1.';

COMMENT ON COLUMN fournisseur.date_creation
  IS 'Horodatage de création de la fiche fournisseur. Automatique (DEFAULT NOW()). Non modifiable après création.';

COMMENT ON COLUMN fournisseur.date_modification
  IS 'Horodatage de la dernière modification. NULL à la création. Mis à jour à chaque appel à edit_fournisseur().';

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------

-- Index 1 : Performances des requêtes de liste (WHERE id_structure = ? AND actif = TRUE)
-- Index PARTIEL sur actif=TRUE : exclut les fournisseurs désactivés (soft delete),
-- allégeant la taille de l'index et les scans de liste (cas d'usage majoritaire).
CREATE INDEX IF NOT EXISTS idx_fournisseur_structure
  ON fournisseur(id_structure)
  WHERE actif = TRUE;

-- Index 2 : Recherche insensible à la casse par nom dans une structure.
-- Pattern établi lors du correctif login 26/04/2026 (bug Seq Scan sur LOWER(username)
-- → CREATE INDEX sur lower(username) → temps login 27s → 18ms).
-- Ici : permet à la fonction get_list_fournisseurs() et à une future recherche
-- par nom de bénéficier d'un Index Scan au lieu d'un Seq Scan + LOWER(nom).
-- Note : index NON partiel volontairement (inclut actif=FALSE)
-- pour permettre future fonction get_fournisseur_by_nom incluant les désactivés.
CREATE INDEX IF NOT EXISTS idx_fournisseur_nom_lower
  ON fournisseur(id_structure, LOWER(nom_fournisseur));
