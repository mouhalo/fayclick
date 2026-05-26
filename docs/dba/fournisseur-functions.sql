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
