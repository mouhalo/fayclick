CREATE OR REPLACE FUNCTION public.add_abonnement_structure_avec_dates(p_id_structure integer, p_type_abonnement character varying, p_methode character varying, p_date_debut date, p_date_fin date, p_nombre_jours integer, p_ref_abonnement character varying DEFAULT NULL::character varying, p_numrecu character varying DEFAULT NULL::character varying, p_uuid_paiement uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_montant NUMERIC;
    v_id_abonnement INTEGER;
    v_tarif_jour NUMERIC := 100;  -- 100 FCFA par jour
BEGIN
    -- Calculer le montant basé sur le nombre de jours
    v_montant := p_nombre_jours * v_tarif_jour;

    -- Insérer le nouvel abonnement
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

    RETURN json_build_object(
        'success', TRUE,
        'id_abonnement', v_id_abonnement,
        'date_debut', p_date_debut,
        'date_fin', p_date_fin,
        'nombre_jours', p_nombre_jours,
        'montant', v_montant,
        'type_abonnement', p_type_abonnement,
        'message', format('Abonnement de %s jour(s) activé du %s au %s pour %s FCFA', 
                         p_nombre_jours, p_date_debut, p_date_fin, v_montant)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'code', SQLSTATE
    );
END;
$function$
