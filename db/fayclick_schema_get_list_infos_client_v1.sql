-- ============================================================================
-- Schéma   : fayclick
-- Version  : v1 (fonction get_list_infos_client)
-- Date     : 2026-10-14
-- DBA      : dba_master
-- Base     : fayclick_db @ 154.12.224.173:3253 (PostgreSQL 16.14)
-- Description : Fonction légère de listing clients par structure pour la
--               recherche caisse FayClick. Retourne uniquement id_client,
--               nom_client, tel_client, adresse (sans factures ni détails
--               d'articles, contrairement à get_list_clients). Le filtrage
--               nom/téléphone est assuré côté front ; le paramètre optionnel
--               ptelephone_client permet un filtrage serveur par téléphone.
-- Contrainte   : ADDITIF — n'impose AUCUNE modification aux objets existants.
--               Fonction vérifiée inexistante avant création (aucun overload).
-- Droits       : ACL par défaut (EXECUTE à PUBLIC), alignée sur
--               public.get_list_clients (proacl = NULL).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_list_infos_client(
    pid_structure integer,
    ptelephone_client character varying DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_clients_json json;
BEGIN
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'L''ID structure doit être un entier positif valide'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La structure avec l''ID ' || pid_structure || ' n''existe pas'
        );
    END IF;

    SELECT COALESCE(
        json_agg(
            json_build_object(
                'id_client', cf.id_client,
                'nom_client', cf.nom_client,
                'tel_client', cf.tel_client,
                'adresse', cf.adresse
            )
            ORDER BY cf.nom_client
        ),
        '[]'::json
    ) INTO v_clients_json
    FROM public.client_facture cf
    WHERE cf.id_structure = pid_structure
      AND (ptelephone_client = '' OR cf.tel_client = ptelephone_client);

    RETURN json_build_object(
        'success', true,
        'structure_id', pid_structure,
        'clients', v_clients_json,
        'nombre_clients', COALESCE(json_array_length(v_clients_json), 0),
        'filtre_telephone', CASE WHEN ptelephone_client = '' THEN NULL ELSE ptelephone_client END,
        'timestamp_generation', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur lors de la récupération des clients: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$function$;
