-- Fonction PostgreSQL optimisée pour la recherche rapide de client
-- Utilisée dans le panier pour rechercher un client par téléphone
-- Retourne uniquement les informations essentielles (nom, tél, adresse + stats)

CREATE OR REPLACE FUNCTION public.check_one_client(
    pid_structure integer,
    ptel_client character varying
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result json;
    v_client_info json;
    v_stats json;
BEGIN
    -- Validation des paramètres d'entrée
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'L''ID structure doit être un entier positif valide'
        );
    END IF;

    IF ptel_client IS NULL OR trim(ptel_client) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Le téléphone du client ne peut pas être vide'
        );
    END IF;

    -- Vérifier que la structure existe
    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La structure avec l''ID ' || pid_structure || ' n''existe pas'
        );
    END IF;

    -- Récupérer les informations du client
    SELECT json_build_object(
        'nom_client', cf.nom_client,
        'tel_client', cf.tel_client,
        'adresse', cf.adresse,
        'date_creation', cf.date_creation,
        'date_modification', cf.date_modification
    )
    INTO v_client_info
    FROM public.client_facture cf
    WHERE cf.tel_client = trim(ptel_client)
      AND cf.id_structure = pid_structure
    LIMIT 1;

    -- Si le client n'existe pas, retourner une réponse négative
    IF v_client_info IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'client_found', false,
            'structure_id', pid_structure,
            'tel_client_recherche', trim(ptel_client),
            'timestamp_generation', NOW()
        );
    END IF;

    -- Récupérer les statistiques simplifiées du client
    SELECT json_build_object(
        'nombre_total_ventes', COALESCE(COUNT(lfc.id_facture), 0),
        'montant_total_achats', COALESCE(SUM(lfc.montant), 0),
        'montant_paye', COALESCE(SUM(lfc.montant - lfc.mt_restant), 0),
        'montant_restant', COALESCE(SUM(lfc.mt_restant), 0),
        'nombre_factures_payees', COALESCE(COUNT(CASE WHEN lfc.id_etat = 2 THEN 1 END), 0),
        'nombre_factures_impayees', COALESCE(COUNT(CASE WHEN lfc.id_etat = 1 THEN 1 END), 0),
        'pourcentage_paiement', CASE
            WHEN COALESCE(SUM(lfc.montant), 0) > 0
            THEN ROUND((COALESCE(SUM(lfc.montant - lfc.mt_restant), 0) * 100.0 / SUM(lfc.montant)), 2)
            ELSE 0
        END,
        'date_premiere_vente', MIN(lfc.date_facture),
        'date_derniere_vente', MAX(lfc.date_facture)
    )
    INTO v_stats
    FROM public.list_factures_com lfc
    WHERE lfc.tel_client = trim(ptel_client)
      AND lfc.id_structure = pid_structure;

    -- Construire le résultat final
    SELECT json_build_object(
        'success', true,
        'client_found', true,
        'structure_id', pid_structure,
        'client', v_client_info,
        'statistiques', v_stats,
        'timestamp_generation', NOW()
    ) INTO v_result;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur lors de la recherche du client: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$function$;

-- Exemple d'utilisation :
-- SELECT * FROM check_one_client(139, '771234567');
