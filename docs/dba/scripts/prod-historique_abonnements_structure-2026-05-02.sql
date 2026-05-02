CREATE OR REPLACE FUNCTION public.historique_abonnements_structure(p_id_structure integer, p_limite integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSON;
    v_abonnements JSON;
BEGIN
    -- Récupérer l'historique des abonnements
    SELECT json_agg(
        json_build_object(
            'id_abonnement', id_abonnement,
            'type_abonnement', type_abonnement,
            'date_debut', date_debut,
            'date_fin', date_fin,
            'montant', montant,
            'methode', methode,
            'statut', statut,
            'ref_abonnement', ref_abonnement,
            'numrecu', numrecu,
            'tms_create', tms_create
        ) ORDER BY date_debut DESC
    )
    INTO v_abonnements
    FROM (
        SELECT *
        FROM public.abonnements
        WHERE id_structure = p_id_structure
        ORDER BY date_debut DESC
        LIMIT p_limite
    ) sub;
    
    v_result := json_build_object(
        'success', true,
        'id_structure', p_id_structure,
        'nombre_abonnements', COALESCE(json_array_length(v_abonnements), 0),
        'abonnements', COALESCE(v_abonnements, '[]'::json)
    );
    
    RETURN v_result;
END;
$function$
