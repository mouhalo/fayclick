CREATE OR REPLACE FUNCTION public.renouveler_abonnement(p_id_structure integer, p_type_abonnement character varying, p_methode character varying, p_ref_abonnement character varying DEFAULT NULL::character varying, p_numrecu character varying DEFAULT NULL::character varying, p_uuid_paiement uuid DEFAULT NULL::uuid, p_nombre_jours integer DEFAULT NULL::integer)
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
        -- Priorité au nombre de jours explicite
        v_duree_jours := p_nombre_jours;
        
        -- Adapter le type d'abonnement selon la durée
        v_type_effectif := CASE 
            WHEN p_nombre_jours = 1 THEN 'JOURNALIER'
            WHEN p_nombre_jours <= 7 THEN 'HEBDOMADAIRE'
            WHEN p_nombre_jours <= 31 THEN 'MENSUEL'
            WHEN p_nombre_jours <= 93 THEN 'TRIMESTRIEL'
            WHEN p_nombre_jours <= 186 THEN 'SEMESTRIEL'
            ELSE 'ANNUEL'
        END;
    ELSE
        -- Utiliser le type d'abonnement classique
        v_type_effectif := UPPER(p_type_abonnement);
        v_duree_jours := CASE v_type_effectif
            WHEN 'JOURNALIER' THEN 1
            WHEN 'HEBDOMADAIRE' THEN 7
            WHEN 'MENSUEL' THEN 30
            WHEN 'TRIMESTRIEL' THEN 90
            WHEN 'SEMESTRIEL' THEN 180
            WHEN 'ANNUEL' THEN 365
            ELSE 30  -- Par défaut mensuel
        END;
    END IF;

    -- Validation: minimum 1 jour
    IF v_duree_jours < 1 THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'La durée minimale est de 1 jour',
            'code', 'DUREE_INVALIDE'
        );
    END IF;

    -- Récupérer le dernier abonnement (actif ou expiré)
    SELECT date_fin
    INTO v_dernier_abonnement
    FROM public.abonnements
    WHERE id_structure = p_id_structure
    ORDER BY date_fin DESC
    LIMIT 1;

    -- Déterminer la date de début
    IF FOUND AND v_dernier_abonnement.date_fin >= CURRENT_DATE THEN
        -- Abonnement encore actif: commencer le jour suivant la fin
        v_date_debut := v_dernier_abonnement.date_fin + 1;
    ELSE
        -- Pas d'abonnement ou expiré: commencer aujourd'hui
        v_date_debut := CURRENT_DATE;
    END IF;

    -- Calculer la date de fin
   v_date_fin := v_date_debut + v_duree_jours;

    -- Créer le nouvel abonnement avec les dates calculées
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
$function$
