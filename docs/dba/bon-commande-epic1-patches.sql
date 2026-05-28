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
