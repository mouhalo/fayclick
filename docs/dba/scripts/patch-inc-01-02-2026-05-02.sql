-- =====================================================================
-- PATCH INC-01 + INC-02 — Fix off-by-one date_fin + montant correct
-- Date    : 2026-05-02
-- Branche : fix/audit-reabonnement-2026-05-02
-- Auteur  : dba_master
-- Statut  : NON APPLIQUÉ — en attente de validation PO
--
-- Objectif :
--   INC-01 [BLOQUANT] — Off-by-one sur v_date_fin dans renouveler_abonnement
--   INC-02 [BLOQUANT] — Montant MENSUEL/ANNUEL ne reflète pas les jours
--                       réels du mois dans add_abonnement_structure_avec_dates
--
-- Stratégie :
--   - INC-01 : remplacer "+ v_duree_jours" par "+ v_duree_jours - 1" (L.67)
--   - INC-02 : appeler calculer_montant_abonnement() pour MENSUEL/ANNUEL,
--              fallback "p_nombre_jours * 100" pour types custom (HEBDO,
--              JOURNALIER, TRIMESTRIEL, SEMESTRIEL ou nombre_jours arbitraire)
--   - Aucune modification de signature → frontend `kader_backend` non impacté
--
-- Pré-requis :
--   - Fenêtre de maintenance (recompile de fonction → invalidation des plans
--     en cache, négligeable < 50 ms par appel suivant)
--   - Vérifier qu'aucun job batch d'abonnement n'est en cours
--
-- Vérifications post-patch :
--   1. Smoke test sur structure inactive (aucun INSERT en prod) :
--      SELECT calculer_montant_abonnement('MENSUEL', '2026-05-01');  -- 3100
--      SELECT calculer_montant_abonnement('MENSUEL', '2026-02-01');  -- 2800
--      SELECT calculer_montant_abonnement('MENSUEL', '2026-04-01');  -- 3000
--   2. Vérifier que pg_get_functiondef contient bien le "- 1" :
--      SELECT pg_get_functiondef('renouveler_abonnement'::regproc);
--   3. Renouvellement réel sur structure de test (139) :
--      SELECT renouveler_abonnement(139, 'MENSUEL', 'OM');
--      → date_fin attendue : CURRENT_DATE + 30 - 1
--      → montant attendu : 3 100 (mai) ou 2 800 (février) selon mois
--
-- Rollback :
--   Réappliquer les fichiers source figés :
--     - docs/dba/scripts/prod-renouveler_abonnement-2026-05-02.sql
--     - docs/dba/scripts/prod-add_abonnement_structure_avec_dates-2026-05-02.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- INC-01 — renouveler_abonnement : ajout du "- 1" sur le calcul de date_fin
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.renouveler_abonnement(
    p_id_structure integer,
    p_type_abonnement character varying,
    p_methode character varying,
    p_ref_abonnement character varying DEFAULT NULL::character varying,
    p_numrecu character varying DEFAULT NULL::character varying,
    p_uuid_paiement uuid DEFAULT NULL::uuid,
    p_nombre_jours integer DEFAULT NULL::integer
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_dernier_abonnement RECORD;
    v_date_debut DATE;
    v_date_fin DATE;
    v_type_effectif VARCHAR;
    v_duree_jours INTEGER;
BEGIN
    -- Déterminer la durée en jours selon le type ou le paramètre explicite
    IF p_nombre_jours IS NOT NULL AND p_nombre_jours > 0 THEN
        v_duree_jours := p_nombre_jours;
        v_type_effectif := CASE
            WHEN p_nombre_jours = 1   THEN 'JOURNALIER'
            WHEN p_nombre_jours <= 7  THEN 'HEBDOMADAIRE'
            WHEN p_nombre_jours <= 31 THEN 'MENSUEL'
            WHEN p_nombre_jours <= 93 THEN 'TRIMESTRIEL'
            WHEN p_nombre_jours <= 186 THEN 'SEMESTRIEL'
            ELSE 'ANNUEL'
        END;
    ELSE
        v_type_effectif := UPPER(p_type_abonnement);
        v_duree_jours := CASE v_type_effectif
            WHEN 'JOURNALIER'   THEN 1
            WHEN 'HEBDOMADAIRE' THEN 7
            WHEN 'MENSUEL'      THEN 30
            WHEN 'TRIMESTRIEL'  THEN 90
            WHEN 'SEMESTRIEL'   THEN 180
            WHEN 'ANNUEL'       THEN 365
            ELSE 30
        END;
    END IF;

    IF v_duree_jours < 1 THEN
        RETURN json_build_object(
            'success', FALSE,
            'error',   'La durée minimale est de 1 jour',
            'code',    'DUREE_INVALIDE'
        );
    END IF;

    SELECT date_fin
      INTO v_dernier_abonnement
      FROM public.abonnements
     WHERE id_structure = p_id_structure
     ORDER BY date_fin DESC
     LIMIT 1;

    IF FOUND AND v_dernier_abonnement.date_fin >= CURRENT_DATE THEN
        v_date_debut := v_dernier_abonnement.date_fin + 1;
    ELSE
        v_date_debut := CURRENT_DATE;
    END IF;

    -- ★ FIX INC-01 : ajout du "- 1" pour que la fenêtre couvre exactement
    --   v_duree_jours jours calendaires (date_debut + 30 - 1 = date_fin J+29)
    v_date_fin := v_date_debut + v_duree_jours - 1;

    RETURN add_abonnement_structure_avec_dates(
        p_id_structure,
        v_type_effectif,
        p_methode,
        v_date_debut,
        v_date_fin,
        v_duree_jours,
        p_ref_abonnement,
        p_numrecu,
        p_uuid_paiement
    );
END;
$function$;

-- ---------------------------------------------------------------------
-- INC-02 — add_abonnement_structure_avec_dates : montant correct
--          via calculer_montant_abonnement() quand type connu
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_abonnement_structure_avec_dates(
    p_id_structure integer,
    p_type_abonnement character varying,
    p_methode character varying,
    p_date_debut date,
    p_date_fin date,
    p_nombre_jours integer,
    p_ref_abonnement character varying DEFAULT NULL::character varying,
    p_numrecu character varying DEFAULT NULL::character varying,
    p_uuid_paiement uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_montant NUMERIC;
    v_id_abonnement INTEGER;
    v_tarif_jour CONSTANT NUMERIC := 100;
    v_type_norm VARCHAR := UPPER(p_type_abonnement);
BEGIN
    -- ★ FIX INC-02 : MENSUEL et ANNUEL utilisent calculer_montant_abonnement()
    --   pour respecter les jours réels du mois (28-31). Les autres types
    --   conservent le tarif jour fixe (rétrocompatibilité avec l'ancien
    --   comportement et les usages backoffice avec p_nombre_jours custom).
    IF v_type_norm IN ('MENSUEL', 'ANNUEL') THEN
        v_montant := calculer_montant_abonnement(v_type_norm, p_date_debut);
    ELSE
        v_montant := p_nombre_jours * v_tarif_jour;
    END IF;

    INSERT INTO public.abonnements (
        id_structure,
        type_abonnement,
        date_debut,
        date_fin,
        nombre_jours,
        montant,
        methode,
        ref_abonnement,
        numrecu,
        uuid_paiement,
        statut,
        tms_create
    ) VALUES (
        p_id_structure,
        p_type_abonnement,
        p_date_debut,
        p_date_fin,
        p_nombre_jours,
        v_montant,
        p_methode,
        p_ref_abonnement,
        p_numrecu,
        COALESCE(p_uuid_paiement, gen_random_uuid()),
        'ACTIF',
        NOW()
    )
    RETURNING id_abonnement INTO v_id_abonnement;

    -- Trace pour audit (cf. INC-06 — résolution partielle)
    RAISE LOG '[add_abonnement_structure_avec_dates] structure=%, abo=%, debut=%, fin=%, nb_jours=%, montant=%, methode=%',
        p_id_structure, v_id_abonnement, p_date_debut, p_date_fin, p_nombre_jours, v_montant, p_methode;

    RETURN json_build_object(
        'success',         TRUE,
        'id_abonnement',   v_id_abonnement,
        'date_debut',      p_date_debut,
        'date_fin',        p_date_fin,
        'nombre_jours',    p_nombre_jours,
        'montant',         v_montant,
        'type_abonnement', p_type_abonnement,
        'message', format(
            'Abonnement de %s jour(s) activé du %s au %s pour %s FCFA',
            p_nombre_jours, p_date_debut, p_date_fin, v_montant
        )
    );

EXCEPTION WHEN OTHERS THEN
    -- Trace l'erreur pour diagnostic (cf. INC-06)
    RAISE LOG '[add_abonnement_structure_avec_dates] ERREUR structure=%, code=%, msg=%',
        p_id_structure, SQLSTATE, SQLERRM;
    RETURN json_build_object(
        'success', FALSE,
        'error',   SQLERRM,
        'code',    SQLSTATE
    );
END;
$function$;

-- ---------------------------------------------------------------------
-- Vérifications avant COMMIT (à dérouler manuellement)
-- ---------------------------------------------------------------------
-- 1) Le code source contient bien le "- 1" :
--    SELECT pg_get_functiondef('renouveler_abonnement'::regproc) ILIKE '%v_duree_jours - 1%';
-- 2) Le code source contient bien l'appel à calculer_montant_abonnement :
--    SELECT pg_get_functiondef('add_abonnement_structure_avec_dates'::regproc)
--           ILIKE '%calculer_montant_abonnement%';
-- 3) Smoke test sans INSERT (juste calcul) :
--    SELECT calculer_montant_abonnement('MENSUEL', '2026-05-01');  -- attendu 3100
--    SELECT calculer_montant_abonnement('MENSUEL', '2026-02-01');  -- attendu 2800

-- COMMIT;  -- ← décommenter UNIQUEMENT après vérification + accord PO
ROLLBACK;   -- ← par défaut, on ne valide pas tant que les checks ne sont pas verts
