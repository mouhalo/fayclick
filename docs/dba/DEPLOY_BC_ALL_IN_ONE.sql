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
-- ============================================================================
-- Fonctions PL/pgSQL — Module Fournisseurs Phase 1 / EPIC 1
-- Version : v1.0
-- Date    : 2026-05-25
-- DBA     : dba_master
-- Base    : fayclick_db (154.12.224.173:3253)
-- PRD     : docs/prd-bons-commande-fournisseurs-2026-05-25.md (FR-002 à FR-005)
-- Dépendances :
--   - Table : fournisseur (fournisseur-schema.sql)
--   - Table : structures
-- Contrat interface (kader_backend) : voir fournisseur-spec.md Section 5
-- ============================================================================

-- ============================================================================
-- FONCTION A — create_fournisseur
-- FR-002 | Créer un fournisseur pour une structure donnée
-- ============================================================================

CREATE OR REPLACE FUNCTION create_fournisseur(
  p_id_structure       INTEGER,
  p_nom_fournisseur    VARCHAR,
  p_tel_fournisseur    VARCHAR  DEFAULT NULL,
  p_email_fournisseur  VARCHAR  DEFAULT NULL,
  p_adresse            TEXT     DEFAULT NULL,
  p_ninea              VARCHAR  DEFAULT NULL,
  p_notes              TEXT     DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id_fournisseur  INTEGER;
  v_nom_trimmed     VARCHAR;
BEGIN
  -- Validation nom non vide
  v_nom_trimmed := TRIM(p_nom_fournisseur);
  IF v_nom_trimmed IS NULL OR LENGTH(v_nom_trimmed) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'id_fournisseur', NULL,
      'message', 'Le nom du fournisseur est obligatoire'
    );
  END IF;

  -- Vérification unicité (id_structure, nom insensible à la casse)
  -- On vérifie sur actif=TRUE ET actif=FALSE : un fournisseur désactivé
  -- avec le même nom dans la même structure doit bloquer la création
  -- (évite doublons historiques lors d'une réactivation future).
  IF EXISTS (
    SELECT 1 FROM fournisseur
    WHERE id_structure = p_id_structure
      AND LOWER(nom_fournisseur) = LOWER(v_nom_trimmed)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'id_fournisseur', NULL,
      'message', 'Fournisseur déjà existant pour cette structure'
    );
  END IF;

  -- Insertion
  INSERT INTO fournisseur (
    id_structure,
    nom_fournisseur,
    tel_fournisseur,
    email_fournisseur,
    adresse,
    ninea,
    notes
  )
  VALUES (
    p_id_structure,
    v_nom_trimmed,
    NULLIF(TRIM(p_tel_fournisseur), ''),
    NULLIF(TRIM(p_email_fournisseur), ''),
    NULLIF(TRIM(p_adresse), ''),
    NULLIF(TRIM(p_ninea), ''),
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING id_fournisseur INTO v_id_fournisseur;

  RETURN json_build_object(
    'success', true,
    'id_fournisseur', v_id_fournisseur,
    'message', 'Fournisseur créé avec succès'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Filet de sécurité : race condition entre la vérification et l'INSERT
    RETURN json_build_object(
      'success', false,
      'id_fournisseur', NULL,
      'message', 'Fournisseur déjà existant pour cette structure'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'id_fournisseur', NULL,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION create_fournisseur(INTEGER, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT)
  IS 'Crée un fournisseur pour une structure. Vérifie l''unicité (id_structure, LOWER(nom)) avant insertion. Retourne JSON {success, id_fournisseur, message}. FR-002.';


-- ============================================================================
-- FONCTION B — edit_fournisseur
-- FR-003 | Modifier un fournisseur existant (tous champs optionnels)
-- ============================================================================

CREATE OR REPLACE FUNCTION edit_fournisseur(
  p_id_fournisseur     INTEGER,
  p_id_structure       INTEGER,
  p_nom_fournisseur    VARCHAR  DEFAULT NULL,
  p_tel_fournisseur    VARCHAR  DEFAULT NULL,
  p_email_fournisseur  VARCHAR  DEFAULT NULL,
  p_adresse            TEXT     DEFAULT NULL,
  p_ninea              VARCHAR  DEFAULT NULL,
  p_notes              TEXT     DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated  INTEGER;
  v_nom_trimmed   VARCHAR;
BEGIN
  -- Vérification sécurité : le fournisseur existe ET appartient à la structure
  IF NOT EXISTS (
    SELECT 1 FROM fournisseur
    WHERE id_fournisseur = p_id_fournisseur
      AND id_structure   = p_id_structure
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Fournisseur introuvable ou accès refusé'
    );
  END IF;

  -- Si un nouveau nom est fourni, le valider et vérifier le doublon
  IF p_nom_fournisseur IS NOT NULL THEN
    v_nom_trimmed := TRIM(p_nom_fournisseur);
    IF LENGTH(v_nom_trimmed) = 0 THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Le nom du fournisseur ne peut pas être vide'
      );
    END IF;

    -- Vérifier unicité du nouveau nom (hors le fournisseur lui-même)
    IF EXISTS (
      SELECT 1 FROM fournisseur
      WHERE id_structure    = p_id_structure
        AND LOWER(nom_fournisseur) = LOWER(v_nom_trimmed)
        AND id_fournisseur <> p_id_fournisseur
    ) THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Un autre fournisseur porte déjà ce nom dans votre structure'
      );
    END IF;
  END IF;

  -- Mise à jour avec COALESCE : NULL = conserver valeur existante
  -- Seul le champ nom applique TRIM sur la valeur proposée (v_nom_trimmed).
  -- Pour les autres champs, NULLIF(TRIM(...), '') permet de vider le champ
  -- en passant une chaîne vide, ou de le conserver en passant NULL.
  UPDATE fournisseur
  SET
    nom_fournisseur    = COALESCE(v_nom_trimmed,                          nom_fournisseur),
    tel_fournisseur    = COALESCE(NULLIF(TRIM(p_tel_fournisseur), ''),    tel_fournisseur),
    email_fournisseur  = COALESCE(NULLIF(TRIM(p_email_fournisseur), ''),  email_fournisseur),
    adresse            = COALESCE(NULLIF(TRIM(p_adresse), ''),            adresse),
    ninea              = COALESCE(NULLIF(TRIM(p_ninea), ''),              ninea),
    notes              = COALESCE(NULLIF(TRIM(p_notes), ''),              notes),
    date_modification  = NOW()
  WHERE id_fournisseur = p_id_fournisseur
    AND id_structure   = p_id_structure;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Fournisseur introuvable ou aucun champ modifié'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Fournisseur modifié avec succès'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Filet de sécurité en cas de race condition
    RETURN json_build_object(
      'success', false,
      'message', 'Un autre fournisseur porte déjà ce nom dans votre structure'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION edit_fournisseur(INTEGER, INTEGER, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT)
  IS 'Modifie un fournisseur. Pattern COALESCE : NULL = pas de modification. Vérifie appartenance id_structure. Met à jour date_modification. Retourne JSON {success, message}. FR-003.';


-- ============================================================================
-- FONCTION C — delete_fournisseur
-- FR-004 | Désactivation (soft delete) d'un fournisseur
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_fournisseur(
  p_id_fournisseur  INTEGER,
  p_id_structure    INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated  INTEGER;
BEGIN
  -- Vérification sécurité : le fournisseur existe ET appartient à la structure
  IF NOT EXISTS (
    SELECT 1 FROM fournisseur
    WHERE id_fournisseur = p_id_fournisseur
      AND id_structure   = p_id_structure
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Fournisseur introuvable ou accès refusé'
    );
  END IF;

  -- TODO Phase 2 (EPIC 2) : Ajouter ici la vérification suivante avant le soft delete :
  --
  --   IF EXISTS (
  --     SELECT 1 FROM bon_commande
  --     WHERE id_fournisseur = p_id_fournisseur
  --       AND id_etat NOT IN (4)  -- 4 = ANNULE
  --   ) THEN
  --     RETURN json_build_object(
  --       'success', false,
  --       'message', 'Impossible de désactiver ce fournisseur : il est lié à des bons de commande actifs (BROUILLON, CONFIRMÉ ou LIVRÉ)'
  --     );
  --   END IF;
  --
  -- Remplacer cette fonction (CREATE OR REPLACE) lors du déploiement EPIC 2.

  -- Soft delete : actif = FALSE, date_modification = NOW()
  UPDATE fournisseur
  SET
    actif             = FALSE,
    date_modification = NOW()
  WHERE id_fournisseur = p_id_fournisseur
    AND id_structure   = p_id_structure;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Fournisseur introuvable ou déjà désactivé'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Fournisseur désactivé avec succès (historique BC préservé)'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION delete_fournisseur(INTEGER, INTEGER)
  IS 'Soft delete d''un fournisseur (actif=FALSE). Ne supprime jamais la ligne pour préserver l''historique des BC. TODO Phase 2 : ajouter blocage si BC actif référencé. Retourne JSON {success, message}. FR-004.';


-- ============================================================================
-- FONCTION D — get_list_fournisseurs
-- FR-005 | Liste des fournisseurs actifs d'une structure
-- ============================================================================

CREATE OR REPLACE FUNCTION get_list_fournisseurs(
  p_id_structure  INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result  JSON;
  v_total   INTEGER;
BEGIN
  -- Comptage total fournisseurs actifs pour le résumé
  SELECT COUNT(*) INTO v_total
  FROM fournisseur
  WHERE id_structure = p_id_structure
    AND actif = TRUE;

  -- Construction du résultat JSON
  -- nb_bons_commandes est retourné à 0 en Phase 1 car la table bon_commande
  -- n'existe pas encore (EPIC 2). Cette fonction sera remplacée (CREATE OR REPLACE)
  -- lors du déploiement Phase 2 pour calculer le vrai compteur via jointure agrégée.
  SELECT json_build_object(
    'success', true,
    'fournisseurs', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id_fournisseur',    f.id_fournisseur,
            'id_structure',      f.id_structure,
            'nom_fournisseur',   f.nom_fournisseur,
            'tel_fournisseur',   f.tel_fournisseur,
            'email_fournisseur', f.email_fournisseur,
            'adresse',           f.adresse,
            'ninea',             f.ninea,
            'notes',             f.notes,
            -- TODO Phase 2 : Remplacer 0 par :
            --   (SELECT COUNT(*) FROM bon_commande bc WHERE bc.id_fournisseur = f.id_fournisseur)
            'nb_bons_commandes', 0,
            'date_creation',     TO_CHAR(f.date_creation, 'YYYY-MM-DD"T"HH24:MI:SS')
          )
          ORDER BY f.nom_fournisseur ASC
        )
        FROM fournisseur f
        WHERE f.id_structure = p_id_structure
          AND f.actif = TRUE
      ),
      '[]'::JSON
    ),
    'resume', json_build_object(
      'total_fournisseurs', v_total
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'fournisseurs', '[]'::JSON,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION get_list_fournisseurs(INTEGER)
  IS 'Retourne la liste JSON des fournisseurs actifs (actif=TRUE) d''une structure, triés par nom ASC. nb_bons_commandes = 0 en Phase 1 (TODO Phase 2 : jointure agrégée sur bon_commande). Retourne JSON {success, fournisseurs[], resume}. FR-005.';
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
-- ============================================================================
-- Fonctions PL/pgSQL — Module Bons de Commande Fournisseurs Phase 1 / EPIC 2
-- Version : v1.0
-- Date    : 2026-05-25
-- DBA     : dba_master
-- Base    : fayclick_db (154.12.224.173:3253)
-- PRD     : docs/prd-bons-commande-fournisseurs-2026-05-25.md (FR-009 à FR-013)
-- Dépendances :
--   - Tables EPIC 1 : etat_bon_commande, fournisseur (fournisseur-schema.sql)
--   - Tables EPIC 2 : bon_commande, bon_commande_details, bon_commande_compteur
--                     (bon-commande-schema.sql)
--   - Table : structures
--   - Table produits (pour snapshot nom_produit à la création)
-- Contrat interface (kader_backend) : voir bon-commande-spec.md Section 5
-- ============================================================================

-- ============================================================================
-- FONCTION 1 — create_bon_commande
-- FR-009 | Créer un bon de commande avec ses lignes articles
-- Signature : create_bon_commande(p_id_structure, p_date_bon_commande,
--             p_id_fournisseur, p_description, p_montant_net,
--             p_articles_string, p_mt_remise, p_id_utilisateur)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_bon_commande(
  p_id_structure       INTEGER,
  p_date_bon_commande  DATE,
  p_id_fournisseur     INTEGER,
  p_description        TEXT,
  p_montant_net        NUMERIC,
  p_articles_string    TEXT,           -- Format : "id_produit-qty-cout_revient#..."
  p_mt_remise          NUMERIC  DEFAULT 0,
  p_id_utilisateur     INTEGER  DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id_bon_commande   INTEGER;
  v_seq               INTEGER;
  v_num_bc            VARCHAR(30);
  v_nom_fourn_snap    VARCHAR(200);
  v_tel_fourn_snap    VARCHAR(20);
  v_tokens            TEXT[];
  v_token             TEXT;
  v_parts             TEXT[];
  v_id_produit        INTEGER;
  v_quantite          NUMERIC;
  v_cout_revient      NUMERIC;
  v_nom_produit_snap  VARCHAR(200);
BEGIN
  -- -----------------------------------------------------------------------
  -- Validations préliminaires
  -- -----------------------------------------------------------------------

  -- Date obligatoire
  IF p_date_bon_commande IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'La date du bon de commande est obligatoire'
    );
  END IF;

  -- montant_net ≥ 0
  IF p_montant_net IS NULL OR p_montant_net < 0 THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'Le montant net doit être supérieur ou égal à 0'
    );
  END IF;

  -- mt_remise ≥ 0
  IF COALESCE(p_mt_remise, 0) < 0 THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'La remise doit être supérieure ou égale à 0'
    );
  END IF;

  -- articles_string non vide
  IF p_articles_string IS NULL OR TRIM(p_articles_string) = '' THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'La liste des articles est obligatoire'
    );
  END IF;

  -- Vérification fournisseur : existe ET appartient à la structure ET actif
  SELECT nom_fournisseur, tel_fournisseur
  INTO v_nom_fourn_snap, v_tel_fourn_snap
  FROM fournisseur
  WHERE id_fournisseur = p_id_fournisseur
    AND id_structure   = p_id_structure
    AND actif          = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'Fournisseur introuvable, inactif ou accès refusé'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Numérotation atomique via bon_commande_compteur (Option C)
  -- INSERT ON CONFLICT DO UPDATE garantit l'atomicité sans verrou explicite
  -- RETURNING retourne la NOUVELLE valeur (après incrément)
  -- -----------------------------------------------------------------------
  INSERT INTO bon_commande_compteur (id_structure, dernier_seq)
  VALUES (p_id_structure, 1)
  ON CONFLICT (id_structure) DO UPDATE
    SET dernier_seq = bon_commande_compteur.dernier_seq + 1
  RETURNING dernier_seq INTO v_seq;

  -- Format : BC-{id_structure}-{YYYYMMDD}-{seq sur 4 chiffres min}
  v_num_bc := 'BC-' || p_id_structure::TEXT
              || '-' || TO_CHAR(p_date_bon_commande, 'YYYYMMDD')
              || '-' || LPAD(v_seq::TEXT, 4, '0');

  -- -----------------------------------------------------------------------
  -- Insertion bon de commande (statut initial = 1 = BROUILLON)
  -- -----------------------------------------------------------------------
  INSERT INTO bon_commande (
    id_structure,
    id_fournisseur,
    id_etat,
    num_bc,
    date_bon_commande,
    description,
    montant_net,
    mt_remise,
    nom_fournisseur_snap,
    tel_fournisseur_snap,
    id_utilisateur
  )
  VALUES (
    p_id_structure,
    p_id_fournisseur,
    1,   -- BROUILLON
    v_num_bc,
    p_date_bon_commande,
    NULLIF(TRIM(p_description), ''),
    p_montant_net,
    COALESCE(p_mt_remise, 0),
    v_nom_fourn_snap,
    v_tel_fourn_snap,
    COALESCE(p_id_utilisateur, 0)
  )
  RETURNING id_bon_commande INTO v_id_bon_commande;

  -- -----------------------------------------------------------------------
  -- Parse articles_string : "id-qty-cout#id-qty-cout#"
  -- Découpage sur '#', filtre tokens vides (trailing '#')
  -- Chaque token : "id_produit-quantite-cout_revient"
  -- -----------------------------------------------------------------------
  v_tokens := string_to_array(p_articles_string, '#');

  FOREACH v_token IN ARRAY v_tokens
  LOOP
    -- Ignorer les tokens vides (résidu du '#' final obligatoire)
    CONTINUE WHEN TRIM(v_token) = '';

    -- Découpage du token en 3 parties sur '-'
    v_parts := string_to_array(v_token, '-');

    -- Validation : exactement 3 composants
    IF array_length(v_parts, 1) <> 3 THEN
      -- Rollback implicite via RAISE EXCEPTION capturé par EXCEPTION block
      RAISE EXCEPTION 'Format article invalide : %. Attendu: id-qty-cout', v_token;
    END IF;

    BEGIN
      v_id_produit   := v_parts[1]::INTEGER;
      v_quantite     := v_parts[2]::NUMERIC;
      v_cout_revient := v_parts[3]::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Valeur numérique invalide dans le token article : %', v_token;
    END;

    -- Validation quantité > 0 et cout_revient ≥ 0
    IF v_quantite <= 0 THEN
      RAISE EXCEPTION 'Quantité doit être > 0 pour l''article id_produit=%', v_id_produit;
    END IF;
    IF v_cout_revient < 0 THEN
      RAISE EXCEPTION 'Coût de revient doit être ≥ 0 pour l''article id_produit=%', v_id_produit;
    END IF;

    -- Snapshot nom_produit : recherche dans la table produit_service
    -- Si le produit n'existe pas : RAISE EXCEPTION (fail-fast à la création,
    -- intégrité garantie — il sera éventuellement supprimé après sans casser l'historique)
    SELECT nom_produit INTO v_nom_produit_snap
    FROM produit_service
    WHERE id_produit   = v_id_produit
      AND id_structure = p_id_structure;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit id=% introuvable dans la structure %',
        v_id_produit, p_id_structure;
    END IF;

    -- Insertion ligne détail
    INSERT INTO bon_commande_details (
      id_bon_commande,
      id_structure,
      id_produit,
      nom_produit_snap,
      quantite,
      cout_revient
    )
    VALUES (
      v_id_bon_commande,
      p_id_structure,
      v_id_produit,
      v_nom_produit_snap,
      v_quantite,
      v_cout_revient
    );
  END LOOP;

  -- Vérification qu'au moins une ligne a été insérée
  IF NOT EXISTS (
    SELECT 1 FROM bon_commande_details
    WHERE id_bon_commande = v_id_bon_commande
  ) THEN
    RAISE EXCEPTION 'Aucune ligne article valide trouvée dans articles_string';
  END IF;

  RETURN json_build_object(
    'success',         true,
    'id_bon_commande', v_id_bon_commande,
    'num_bc',          v_num_bc,
    'message',         'Bon de commande créé avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Toute exception lève un rollback complet de la transaction
    -- (bon_commande + bon_commande_details + incrément compteur non rollbacké
    --  intentionnellement : les trous de séquence sont acceptables)
    RETURN json_build_object(
      'success',         false,
      'id_bon_commande', NULL,
      'num_bc',          NULL,
      'message',         'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION create_bon_commande(INTEGER, DATE, INTEGER, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER)
  IS 'Crée un bon de commande fournisseur avec ses lignes articles. Numérotation atomique via bon_commande_compteur. Snapshot fournisseur + produits à la création. Parse articles_string format "id-qty-cout#". Statut initial BROUILLON. Retourne JSON {success, id_bon_commande, num_bc, message}. FR-009.';


-- ============================================================================
-- FONCTION 2 — edit_bon_commande
-- FR-010 | Modifier un BC : champs métier + transition de statut
-- Matrice transitions :
--   BROUILLON(1) → CONFIRME(2) ✅ | ANNULE(4) ✅
--   CONFIRME(2)  → BROUILLON(1) ✅ | LIVRE(3) ✅ | ANNULE(4) ✅
--   LIVRE(3)     → aucune transition ❌ (figé définitivement)
--   ANNULE(4)    → aucune transition ❌ (figé définitivement)
-- ============================================================================

CREATE OR REPLACE FUNCTION edit_bon_commande(
  p_id_bon_commande    INTEGER,
  p_id_structure       INTEGER,
  p_date_bon_commande  DATE     DEFAULT NULL,
  p_id_fournisseur     INTEGER  DEFAULT NULL,
  p_description        TEXT     DEFAULT NULL,
  p_montant_net        NUMERIC  DEFAULT NULL,
  p_articles_string    TEXT     DEFAULT NULL,  -- NULL = ne pas modifier les lignes
  p_mt_remise          NUMERIC  DEFAULT NULL,
  p_id_etat            INTEGER  DEFAULT NULL   -- NULL = ne pas changer le statut
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_etat_actuel       INTEGER;
  v_nom_fourn_snap    VARCHAR(200);
  v_tel_fourn_snap    VARCHAR(20);
  v_tokens            TEXT[];
  v_token             TEXT;
  v_parts             TEXT[];
  v_id_produit        INTEGER;
  v_quantite          NUMERIC;
  v_cout_revient      NUMERIC;
  v_nom_produit_snap  VARCHAR(200);
  v_transition_ok     BOOLEAN := FALSE;
BEGIN
  -- -----------------------------------------------------------------------
  -- Vérification sécurité + récupération état actuel
  -- -----------------------------------------------------------------------
  SELECT id_etat INTO v_etat_actuel
  FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bon de commande introuvable ou accès refusé'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Règle primaire : LIVRE(3) et ANNULE(4) sont figés — aucune modification
  -- Cette règle est vérifiée AVANT la matrice de transition
  -- -----------------------------------------------------------------------
  IF v_etat_actuel IN (3, 4) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Ce bon de commande est ' ||
        CASE v_etat_actuel WHEN 3 THEN 'livré' ELSE 'annulé' END ||
        ' et ne peut plus être modifié'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Validation de la transition de statut demandée (si fournie)
  -- Matrice explicite par paires autorisées
  -- -----------------------------------------------------------------------
  IF p_id_etat IS NOT NULL AND p_id_etat <> v_etat_actuel THEN
    -- Paires autorisées : (from, to)
    v_transition_ok := (v_etat_actuel = 1 AND p_id_etat = 2)   -- BROUILLON → CONFIRME
                    OR (v_etat_actuel = 1 AND p_id_etat = 4)   -- BROUILLON → ANNULE
                    OR (v_etat_actuel = 2 AND p_id_etat = 1)   -- CONFIRME  → BROUILLON
                    OR (v_etat_actuel = 2 AND p_id_etat = 3)   -- CONFIRME  → LIVRE
                    OR (v_etat_actuel = 2 AND p_id_etat = 4);  -- CONFIRME  → ANNULE

    IF NOT v_transition_ok THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Transition de statut non autorisée : ' ||
          v_etat_actuel::TEXT || ' → ' || p_id_etat::TEXT
      );
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  -- Validation montant_net et mt_remise si fournis
  -- -----------------------------------------------------------------------
  IF p_montant_net IS NOT NULL AND p_montant_net < 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Le montant net doit être supérieur ou égal à 0'
    );
  END IF;

  IF p_mt_remise IS NOT NULL AND p_mt_remise < 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'La remise doit être supérieure ou égale à 0'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Si changement de fournisseur : vérifier + récupérer snapshot
  -- -----------------------------------------------------------------------
  IF p_id_fournisseur IS NOT NULL THEN
    SELECT nom_fournisseur, tel_fournisseur
    INTO v_nom_fourn_snap, v_tel_fourn_snap
    FROM fournisseur
    WHERE id_fournisseur = p_id_fournisseur
      AND id_structure   = p_id_structure
      AND actif          = TRUE;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Fournisseur introuvable, inactif ou accès refusé'
      );
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  -- Mise à jour des champs du BC (COALESCE : NULL = conserver existant)
  -- -----------------------------------------------------------------------
  UPDATE bon_commande
  SET
    date_bon_commande    = COALESCE(p_date_bon_commande,  date_bon_commande),
    id_fournisseur       = COALESCE(p_id_fournisseur,     id_fournisseur),
    nom_fournisseur_snap = COALESCE(v_nom_fourn_snap,     nom_fournisseur_snap),
    tel_fournisseur_snap = COALESCE(v_tel_fourn_snap,     tel_fournisseur_snap),
    description          = COALESCE(NULLIF(TRIM(p_description), ''), description),
    montant_net          = COALESCE(p_montant_net,         montant_net),
    mt_remise            = COALESCE(p_mt_remise,           mt_remise),
    id_etat              = COALESCE(p_id_etat,             id_etat),
    date_modification    = NOW()
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  -- -----------------------------------------------------------------------
  -- Si articles_string fourni : remplacement complet des lignes
  -- Stratégie : DELETE toutes les lignes existantes + INSERT nouvelles
  -- (évite UPDATE partiel complexe avec gestion des suppressions de lignes)
  -- -----------------------------------------------------------------------
  IF p_articles_string IS NOT NULL AND TRIM(p_articles_string) <> '' THEN
    -- Suppression des lignes existantes
    DELETE FROM bon_commande_details
    WHERE id_bon_commande = p_id_bon_commande;

    -- Parse et insertion des nouvelles lignes
    v_tokens := string_to_array(p_articles_string, '#');

    FOREACH v_token IN ARRAY v_tokens
    LOOP
      CONTINUE WHEN TRIM(v_token) = '';

      v_parts := string_to_array(v_token, '-');

      IF array_length(v_parts, 1) <> 3 THEN
        RAISE EXCEPTION 'Format article invalide : %. Attendu: id-qty-cout', v_token;
      END IF;

      BEGIN
        v_id_produit   := v_parts[1]::INTEGER;
        v_quantite     := v_parts[2]::NUMERIC;
        v_cout_revient := v_parts[3]::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Valeur numérique invalide dans le token article : %', v_token;
      END;

      IF v_quantite <= 0 THEN
        RAISE EXCEPTION 'Quantité doit être > 0 pour l''article id_produit=%', v_id_produit;
      END IF;
      IF v_cout_revient < 0 THEN
        RAISE EXCEPTION 'Coût de revient doit être ≥ 0 pour l''article id_produit=%', v_id_produit;
      END IF;

      SELECT nom_produit INTO v_nom_produit_snap
      FROM produit_service
      WHERE id_produit   = v_id_produit
        AND id_structure = p_id_structure;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit id=% introuvable dans la structure %',
          v_id_produit, p_id_structure;
      END IF;

      INSERT INTO bon_commande_details (
        id_bon_commande,
        id_structure,
        id_produit,
        nom_produit_snap,
        quantite,
        cout_revient
      )
      VALUES (
        p_id_bon_commande,
        p_id_structure,
        v_id_produit,
        v_nom_produit_snap,
        v_quantite,
        v_cout_revient
      );
    END LOOP;

    -- Vérification qu'au moins une ligne a été insérée après remplacement
    IF NOT EXISTS (
      SELECT 1 FROM bon_commande_details
      WHERE id_bon_commande = p_id_bon_commande
    ) THEN
      RAISE EXCEPTION 'Aucune ligne article valide après remplacement';
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Bon de commande modifié avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION edit_bon_commande(INTEGER, INTEGER, DATE, INTEGER, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER)
  IS 'Modifie un BC. LIVRE(3) et ANNULE(4) sont figés. Matrice de transition : BROUILLON→CONFIRME/ANNULE, CONFIRME→BROUILLON/LIVRE/ANNULE. Remplacement complet des lignes si articles_string fourni. Pattern COALESCE sur tous les champs. Retourne JSON {success, message}. FR-010.';


-- ============================================================================
-- FONCTION 3 — delete_bon_commande
-- FR-011 | Supprimer un BC (DELETE physique + CASCADE sur details)
-- Refus si statut LIVRE(3)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_bon_commande(
  p_id_bon_commande  INTEGER,
  p_id_structure     INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_etat_actuel  INTEGER;
  v_num_bc       VARCHAR(30);
BEGIN
  -- Vérification sécurité + récupération état actuel
  SELECT id_etat, num_bc INTO v_etat_actuel, v_num_bc
  FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bon de commande introuvable ou accès refusé'
    );
  END IF;

  -- LIVRE(3) : suppression interdite — la livraison est une preuve comptable
  IF v_etat_actuel = 3 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Impossible de supprimer un bon de commande livré (statut LIVRE). Annulez-le d''abord si nécessaire.'
    );
  END IF;

  -- DELETE physique (bon_commande_details supprimé en CASCADE par FK)
  DELETE FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  RETURN json_build_object(
    'success', true,
    'message', 'Bon de commande ' || v_num_bc || ' supprimé avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION delete_bon_commande(INTEGER, INTEGER)
  IS 'Suppression physique d''un BC (BROUILLON, CONFIRME, ANNULE autorisés). LIVRE refusé. CASCADE DELETE sur bon_commande_details via FK. Retourne JSON {success, message}. FR-011.';


-- ============================================================================
-- FONCTION 4 — get_list_bons_commandes
-- FR-012 | Liste des BC d'une structure avec résumé financier
-- ============================================================================

CREATE OR REPLACE FUNCTION get_list_bons_commandes(
  p_id_structure  INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result  JSON;
BEGIN
  SELECT json_build_object(
    'success',         true,
    'bons_commandes',  COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id_bon_commande',     bc.id_bon_commande,
            'id_structure',        bc.id_structure,
            'id_fournisseur',      bc.id_fournisseur,
            'id_etat',             bc.id_etat,
            'libelle_etat',        ebc.libelle,
            'couleur_etat',        ebc.couleur,
            'num_bc',              bc.num_bc,
            'date_bon_commande',   TO_CHAR(bc.date_bon_commande, 'YYYY-MM-DD'),
            'description',         bc.description,
            'montant_net',         bc.montant_net,
            'mt_remise',           bc.mt_remise,
            'nom_fournisseur_snap',bc.nom_fournisseur_snap,
            'tel_fournisseur_snap',bc.tel_fournisseur_snap,
            'id_utilisateur',      bc.id_utilisateur,
            'nb_articles',         (
              SELECT COUNT(*)
              FROM bon_commande_details bcd
              WHERE bcd.id_bon_commande = bc.id_bon_commande
            ),
            'date_creation',       TO_CHAR(bc.date_creation, 'YYYY-MM-DD"T"HH24:MI:SS'),
            'date_modification',   TO_CHAR(bc.date_modification, 'YYYY-MM-DD"T"HH24:MI:SS')
          )
          ORDER BY bc.date_creation DESC
        )
        FROM bon_commande bc
        INNER JOIN etat_bon_commande ebc ON ebc.id_etat = bc.id_etat
        WHERE bc.id_structure = p_id_structure
      ),
      '[]'::JSON
    ),
    'resume',          (
      SELECT json_build_object(
        'total_bcs',           COUNT(*),
        'nb_brouillons',       COUNT(*) FILTER (WHERE id_etat = 1),
        'nb_confirmes',        COUNT(*) FILTER (WHERE id_etat = 2),
        'nb_livres',           COUNT(*) FILTER (WHERE id_etat = 3),
        'nb_annules',          COUNT(*) FILTER (WHERE id_etat = 4),
        -- montant_en_attente : cumul des BC non encore livrés ni annulés
        'montant_en_attente',  COALESCE(SUM(montant_net) FILTER (WHERE id_etat IN (1, 2)), 0),
        'montant_total_livre', COALESCE(SUM(montant_net) FILTER (WHERE id_etat = 3), 0)
      )
      FROM bon_commande
      WHERE id_structure = p_id_structure
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success',        false,
      'bons_commandes', '[]'::JSON,
      'message',        'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION get_list_bons_commandes(INTEGER)
  IS 'Retourne la liste JSON de tous les BC d''une structure (tous statuts), triés par date_creation DESC. Inclut libelle_etat, couleur_etat, nb_articles. Résumé : total par statut, montant_en_attente (BROUILLON+CONFIRME), montant_total_livre. Retourne JSON {success, bons_commandes[], resume}. FR-012.';


-- ============================================================================
-- FONCTION 5 — get_bon_commande_details
-- FR-013 | Détail complet d'un BC avec ses lignes articles et infos fournisseur
-- ============================================================================

CREATE OR REPLACE FUNCTION get_bon_commande_details(
  p_id_bon_commande  INTEGER,
  p_id_structure     INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result  JSON;
  v_bc_row  bon_commande%ROWTYPE;
BEGIN
  -- Vérification sécurité + chargement BC
  SELECT * INTO v_bc_row
  FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bon de commande introuvable ou accès refusé'
    );
  END IF;

  SELECT json_build_object(
    'success',     true,
    'bon_commande', json_build_object(
      -- Champs BC
      'id_bon_commande',      v_bc_row.id_bon_commande,
      'id_structure',         v_bc_row.id_structure,
      'id_fournisseur',       v_bc_row.id_fournisseur,
      'id_etat',              v_bc_row.id_etat,
      'libelle_etat',         ebc.libelle,
      'couleur_etat',         ebc.couleur,
      'num_bc',               v_bc_row.num_bc,
      'date_bon_commande',    TO_CHAR(v_bc_row.date_bon_commande, 'YYYY-MM-DD'),
      'description',          v_bc_row.description,
      'montant_net',          v_bc_row.montant_net,
      'mt_remise',            v_bc_row.mt_remise,
      'id_utilisateur',       v_bc_row.id_utilisateur,
      'date_creation',        TO_CHAR(v_bc_row.date_creation, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'date_modification',    TO_CHAR(v_bc_row.date_modification, 'YYYY-MM-DD"T"HH24:MI:SS'),
      -- Snapshot fournisseur (immuable — capturé à la création)
      'nom_fournisseur_snap', v_bc_row.nom_fournisseur_snap,
      'tel_fournisseur_snap', v_bc_row.tel_fournisseur_snap,
      -- Infos fournisseur enrichies (données actuelles pour affichage)
      'fournisseur', (
        SELECT json_build_object(
          'id_fournisseur',    f.id_fournisseur,
          'nom_fournisseur',   f.nom_fournisseur,
          'tel_fournisseur',   f.tel_fournisseur,
          'email_fournisseur', f.email_fournisseur,
          'adresse',           f.adresse,
          'ninea',             f.ninea,
          'actif',             f.actif
        )
        FROM fournisseur f
        WHERE f.id_fournisseur = v_bc_row.id_fournisseur
      ),
      -- Lignes articles
      'articles', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id_detail',        bcd.id_detail,
              'id_produit',       bcd.id_produit,
              'nom_produit_snap', bcd.nom_produit_snap,
              'quantite',         bcd.quantite,
              'cout_revient',     bcd.cout_revient,
              'sous_total',       bcd.quantite * bcd.cout_revient
            )
            ORDER BY bcd.id_detail ASC
          )
          FROM bon_commande_details bcd
          WHERE bcd.id_bon_commande = v_bc_row.id_bon_commande
        ),
        '[]'::JSON
      )
    )
  ) INTO v_result
  FROM etat_bon_commande ebc
  WHERE ebc.id_etat = v_bc_row.id_etat;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION get_bon_commande_details(INTEGER, INTEGER)
  IS 'Retourne le détail complet d''un BC : métadonnées, snapshot fournisseur, infos fournisseur actuelles enrichies (email, adresse, ninea), lignes articles avec sous_total calculé. Vérification id_structure obligatoire. Retourne JSON {success, bon_commande{..., fournisseur{...}, articles[]}}. FR-013.';
-- ============================================================================
-- Patches EPIC 1 — Activation fonctionnalités Phase 2 dans les fonctions
--                  Fournisseur livrées lors de l'EPIC 1
-- Version : v1.0
-- Date    : 2026-05-25
-- DBA     : dba_master
-- Base    : fayclick_db (154.12.224.173:3253)
-- Prérequis : bon-commande-schema.sql + bon-commande-functions.sql exécutés
--             (les tables bon_commande et bon_commande_details doivent exister)
-- Description :
--   EPIC 1 livrait get_list_fournisseurs() avec nb_bons_commandes=0 (TODO Phase 2)
--   et delete_fournisseur() sans vérification des BC actifs (TODO Phase 2).
--   Ces deux fonctions sont remplacées ici (CREATE OR REPLACE) pour activer
--   les comportements corrects maintenant que la table bon_commande existe.
--   Les corps des fonctions sont identiques à l'EPIC 1, seuls les TODO changent.
--
-- !! AVERTISSEMENT AVANT DÉPLOIEMENT EN PRODUCTION !!
--   Vérifier que les fonctions en prod correspondent bien à fournisseur-functions.sql
--   (EPIC 1) avant d'appliquer ce fichier. En cas de doute, extraire le code actuel :
--
--     SELECT pg_get_functiondef(oid)
--     FROM pg_proc
--     WHERE proname IN ('get_list_fournisseurs', 'delete_fournisseur')
--       AND pronamespace = 'public'::regnamespace;
--
--   Comparer visuellement avec fournisseur-functions.sql. Si des modifications ad hoc
--   ont été faites en prod (hotfix, etc.), les intégrer manuellement dans ce fichier
--   AVANT de l'exécuter. Ce fichier est conçu pour des fonctions EPIC 1 intactes.
--
-- Ordre de déploiement :
--   1. fournisseur-schema.sql    (EPIC 1 — prérequis)
--   2. fournisseur-functions.sql (EPIC 1 — prérequis)
--   3. bon-commande-schema.sql   (EPIC 2)
--   4. bon-commande-functions.sql (EPIC 2)
--   5. bon-commande-epic1-patches.sql ← CE FICHIER (après les 4 précédents)
-- ============================================================================


-- ============================================================================
-- PATCH A — get_list_fournisseurs
-- Activation : nb_bons_commandes réel via COUNT sur bon_commande
-- Seul changement vs EPIC 1 : ligne 'nb_bons_commandes', 0
--   remplacée par subquery COUNT(*)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_list_fournisseurs(
  p_id_structure  INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result  JSON;
  v_total   INTEGER;
BEGIN
  -- Comptage total fournisseurs actifs pour le résumé
  SELECT COUNT(*) INTO v_total
  FROM fournisseur
  WHERE id_structure = p_id_structure
    AND actif = TRUE;

  -- Construction du résultat JSON
  SELECT json_build_object(
    'success', true,
    'fournisseurs', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id_fournisseur',    f.id_fournisseur,
            'id_structure',      f.id_structure,
            'nom_fournisseur',   f.nom_fournisseur,
            'tel_fournisseur',   f.tel_fournisseur,
            'email_fournisseur', f.email_fournisseur,
            'adresse',           f.adresse,
            'ninea',             f.ninea,
            'notes',             f.notes,
            -- PATCH Phase 2 : compteur réel des BC (tous statuts) pour ce fournisseur
            'nb_bons_commandes', (
              SELECT COUNT(*)
              FROM bon_commande bc
              WHERE bc.id_fournisseur = f.id_fournisseur
            ),
            'date_creation',     TO_CHAR(f.date_creation, 'YYYY-MM-DD"T"HH24:MI:SS')
          )
          ORDER BY f.nom_fournisseur ASC
        )
        FROM fournisseur f
        WHERE f.id_structure = p_id_structure
          AND f.actif = TRUE
      ),
      '[]'::JSON
    ),
    'resume', json_build_object(
      'total_fournisseurs', v_total
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'fournisseurs', '[]'::JSON,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION get_list_fournisseurs(INTEGER)
  IS 'Retourne la liste JSON des fournisseurs actifs (actif=TRUE) d''une structure, triés par nom ASC. nb_bons_commandes = COUNT réel sur bon_commande (PATCH Phase 2 appliqué). Retourne JSON {success, fournisseurs[], resume}. FR-005.';


-- ============================================================================
-- PATCH B — delete_fournisseur
-- Activation : blocage du soft delete si BC actifs (BROUILLON, CONFIRME, LIVRE)
-- Seul changement vs EPIC 1 : bloc TODO commenté → décommenté et activé
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_fournisseur(
  p_id_fournisseur  INTEGER,
  p_id_structure    INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated  INTEGER;
BEGIN
  -- Vérification sécurité : le fournisseur existe ET appartient à la structure
  IF NOT EXISTS (
    SELECT 1 FROM fournisseur
    WHERE id_fournisseur = p_id_fournisseur
      AND id_structure   = p_id_structure
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Fournisseur introuvable ou accès refusé'
    );
  END IF;

  -- PATCH Phase 2 (activé) : blocage si BC actifs liés à ce fournisseur
  -- Un BC ANNULE (id_etat=4) n'est pas considéré actif — la désactivation est permise
  IF EXISTS (
    SELECT 1 FROM bon_commande
    WHERE id_fournisseur = p_id_fournisseur
      AND id_etat NOT IN (4)  -- 4 = ANNULE uniquement
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Impossible de désactiver ce fournisseur : il est lié à des bons de commande actifs (BROUILLON, CONFIRMÉ ou LIVRÉ). Annulez ou supprimez ces bons de commande avant de désactiver le fournisseur.'
    );
  END IF;

  -- Soft delete : actif = FALSE, date_modification = NOW()
  UPDATE fournisseur
  SET
    actif             = FALSE,
    date_modification = NOW()
  WHERE id_fournisseur = p_id_fournisseur
    AND id_structure   = p_id_structure;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Fournisseur introuvable ou déjà désactivé'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Fournisseur désactivé avec succès (historique BC préservé)'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION delete_fournisseur(INTEGER, INTEGER)
  IS 'Soft delete d''un fournisseur (actif=FALSE). PATCH Phase 2 activé : blocage si BC actifs (BROUILLON/CONFIRME/LIVRE) liés au fournisseur. Seuls les BC ANNULÉS ne bloquent pas. Ne supprime jamais la ligne pour préserver l''historique. Retourne JSON {success, message}. FR-004.';
