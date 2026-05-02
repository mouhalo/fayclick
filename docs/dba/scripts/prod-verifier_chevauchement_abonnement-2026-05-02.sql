CREATE OR REPLACE FUNCTION public.verifier_chevauchement_abonnement(p_id_structure integer, p_date_debut date, p_date_fin date, p_id_abonnement_exclu integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSON;
    v_chevauchement RECORD;
BEGIN
    -- Rechercher un abonnement actif qui chevauche la période
    SELECT 
        id_abonnement,
        date_debut,
        date_fin,
        type_abonnement,
        ref_abonnement
    INTO v_chevauchement
    FROM public.abonnements
    WHERE id_structure = p_id_structure
      AND statut = 'ACTIF'
      AND (p_id_abonnement_exclu IS NULL OR id_abonnement != p_id_abonnement_exclu)
      AND daterange(date_debut, date_fin, '[]') && daterange(p_date_debut, p_date_fin, '[]')
    LIMIT 1;
    
    IF FOUND THEN
        v_result := json_build_object(
            'chevauchement', true,
            'message', 'Un abonnement actif existe déjà pour cette période',
            'abonnement_existant', json_build_object(
                'id_abonnement', v_chevauchement.id_abonnement,
                'date_debut', v_chevauchement.date_debut,
                'date_fin', v_chevauchement.date_fin,
                'type_abonnement', v_chevauchement.type_abonnement,
                'ref_abonnement', v_chevauchement.ref_abonnement
            )
        );
    ELSE
        v_result := json_build_object(
            'chevauchement', false,
            'message', 'Aucun chevauchement détecté'
        );
    END IF;
    
    RETURN v_result;
END;
$function$
