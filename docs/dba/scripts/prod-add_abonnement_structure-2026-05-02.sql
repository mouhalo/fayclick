CREATE OR REPLACE FUNCTION public.add_abonnement_structure(p_id_structure integer, p_type_abonnement character varying, p_methode character varying, p_date_debut date DEFAULT CURRENT_DATE, p_ref_abonnement character varying DEFAULT NULL::character varying, p_numrecu character varying DEFAULT NULL::character varying, p_uuid_paiement uuid DEFAULT NULL::uuid, p_forcer_remplacement boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSON;
    v_date_fin DATE;
    v_montant NUMERIC;
    v_ref_abonnement VARCHAR;
    v_numrecu VARCHAR;
    v_uuid_paiement UUID;
    v_id_abonnement INT;
    v_verification JSON;
    v_anciens_abonnements INT[];
BEGIN
    -- Vérifier que la structure existe et est active
    IF NOT EXISTS (
        SELECT 1 FROM public.structures 
        WHERE id_structure = p_id_structure AND actif = true
    ) THEN
        v_result := json_build_object(
            'success', false,
            'message', 'Structure non trouvée ou inactive',
            'id_structure', p_id_structure
        );
        RETURN v_result;
    END IF;
    
    -- Valider le type d'abonnement
    IF p_type_abonnement NOT IN ('MENSUEL', 'ANNUEL') THEN
        v_result := json_build_object(
            'success', false,
            'message', 'Type d''abonnement invalide. Utilisez MENSUEL ou ANNUEL',
            'type_recu', p_type_abonnement
        );
        RETURN v_result;
    END IF;
    
    -- Valider la méthode de paiement
    IF p_methode NOT IN ('OM', 'WAVE', 'FREE') THEN
        v_result := json_build_object(
            'success', false,
            'message', 'Méthode de paiement invalide. Utilisez OM, WAVE ou FREE',
            'methode_recu', p_methode
        );
        RETURN v_result;
    END IF;
    
    -- Calculer la date de fin
    IF p_type_abonnement = 'MENSUEL' THEN
        v_date_fin := (DATE_TRUNC('MONTH', p_date_debut) + INTERVAL '1 MONTH - 1 DAY')::DATE;
    ELSE -- ANNUEL
        v_date_fin := (p_date_debut + INTERVAL '1 YEAR - 1 DAY')::DATE;
    END IF;
    
    -- Vérifier les chevauchements
    v_verification := verifier_chevauchement_abonnement(p_id_structure, p_date_debut, v_date_fin);
    
    IF (v_verification->>'chevauchement')::BOOLEAN THEN
        IF NOT p_forcer_remplacement THEN
            -- Retourner l'erreur de chevauchement avec les détails
            v_result := json_build_object(
                'success', false,
                'message', 'Un abonnement actif existe déjà pour cette période',
                'chevauchement', v_verification,
                'suggestion', 'Utilisez p_forcer_remplacement = TRUE pour remplacer l''abonnement existant'
            );
            RETURN v_result;
        ELSE
            -- Annuler les abonnements chevauchants
            UPDATE public.abonnements
            SET statut = 'ANNULE',
                tms_update = NOW()
            WHERE id_structure = p_id_structure
              AND statut = 'ACTIF'
              AND daterange(date_debut, date_fin, '[]') && daterange(p_date_debut, v_date_fin, '[]')
            RETURNING id_abonnement INTO v_anciens_abonnements;
        END IF;
    END IF;
    
    -- Calculer le montant
    v_montant := calculer_montant_abonnement(p_type_abonnement, p_date_debut);
    
    -- Générer les références si non fournies
    v_ref_abonnement := COALESCE(
        p_ref_abonnement, 
        'ABO-' || p_id_structure || '-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS')
    );
    
    v_numrecu := COALESCE(
        p_numrecu,
        'REC-' || p_id_structure || '-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS')
    );
    
    v_uuid_paiement := COALESCE(p_uuid_paiement, gen_random_uuid());
    
    -- Insérer l'abonnement
    BEGIN
        INSERT INTO public.abonnements (
            id_structure,
            date_debut,
            date_fin,
            montant,
            ref_abonnement,
            numrecu,
            uuid_paiement,
            methode,
            type_abonnement,
            statut
        ) VALUES (
            p_id_structure,
            p_date_debut,
            v_date_fin,
            v_montant,
            v_ref_abonnement,
            v_numrecu,
            v_uuid_paiement,
            p_methode,
            p_type_abonnement,
            'ACTIF'
        )
        RETURNING id_abonnement INTO v_id_abonnement;
        
    EXCEPTION
        WHEN exclusion_violation THEN
            v_result := json_build_object(
                'success', false,
                'message', 'Conflit de période détecté. Un abonnement actif existe déjà pour cette période.',
                'error_code', 'PERIOD_CONFLICT'
            );
            RETURN v_result;
    END;
    
    -- Construire la réponse de succès
    v_result := json_build_object(
        'success', true,
        'message', CASE 
            WHEN p_forcer_remplacement AND v_anciens_abonnements IS NOT NULL 
            THEN 'Abonnement créé avec succès. Anciens abonnements annulés.'
            ELSE 'Abonnement créé avec succès'
        END,
        'data', json_build_object(
            'id_abonnement', v_id_abonnement,
            'id_structure', p_id_structure,
            'type_abonnement', p_type_abonnement,
            'date_debut', p_date_debut,
            'date_fin', v_date_fin,
            'montant', v_montant,
            'ref_abonnement', v_ref_abonnement,
            'numrecu', v_numrecu,
            'uuid_paiement', v_uuid_paiement,
            'methode', p_methode,
            'statut', 'ACTIF',
            'abonnements_annules', v_anciens_abonnements
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN unique_violation THEN
        v_result := json_build_object(
            'success', false,
            'message', 'Référence, numéro de reçu ou UUID de paiement déjà existant',
            'error_detail', SQLERRM
        );
        RETURN v_result;
        
    WHEN OTHERS THEN
        v_result := json_build_object(
            'success', false,
            'message', 'Erreur lors de la création de l''abonnement',
            'error_detail', SQLERRM,
            'error_code', SQLSTATE
        );
        RETURN v_result;
END;
$function$
