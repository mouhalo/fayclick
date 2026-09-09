-- ============================================================================
-- FIX 2026-09-09 — supprimer_facturecom : v_num_facture varchar(19) -> varchar(25)
--
-- La variable locale était déclarée varchar(19) alors que facture_com.num_facture
-- est en varchar(25). Depuis le format actuel des numéros (FAC-YYYYMM-SSSS-NNNN,
-- 20 caractères), le SELECT INTO échouait avec « value too long for type
-- character varying(19) » → la suppression de facture était cassée en production
-- pour TOUTES les factures au nouveau format (bouton Supprimer admin Vente Flash).
--
-- Appliqué en prod sur fayclick_db le 2026-09-09 (créé via pg_get_functiondef,
-- seul le type de v_num_facture change ; comportement sinon identique).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.supprimer_facturecom(pid_structure integer, pid_facture integer, pid_utilisateur integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_profil integer; v_user_structure integer;
    v_facture_structure integer; v_mt_acompte numeric(10,2);
    v_num_facture varchar(25); v_nom_client varchar(150);
    v_montant numeric(10,2); v_has_acompte boolean := false;
    v_deleted_details integer := 0;
    v_id_produit integer; v_quantite real; v_prix numeric;
BEGIN
    SELECT id_profil, id_structure INTO v_user_profil, v_user_structure
    FROM public.utilisateur WHERE id = pid_utilisateur AND actif = true;
    IF v_user_profil IS NULL THEN
        RETURN json_build_object('success',false,'message','Utilisateur non trouvé ou inactif','code','USER_NOT_FOUND');
    END IF;
    IF v_user_structure != pid_structure THEN
        RETURN json_build_object('success',false,'message','Utilisateur non autorisé pour cette structure','code','UNAUTHORIZED_STRUCTURE');
    END IF;
    SELECT id_structure, mt_acompte, num_facture, nom_client_payeur, montant
    INTO v_facture_structure, v_mt_acompte, v_num_facture, v_nom_client, v_montant
    FROM public.facture_com WHERE id_facture = pid_facture;
    IF v_facture_structure IS NULL THEN
        RETURN json_build_object('success',false,'message','Facture non trouvée','code','INVOICE_NOT_FOUND');
    END IF;
    IF v_facture_structure != pid_structure THEN
        RETURN json_build_object('success',false,'message','La facture n''appartient pas à cette structure','code','INVOICE_WRONG_STRUCTURE');
    END IF;
    v_has_acompte := (v_mt_acompte > 0);
    IF v_has_acompte AND v_user_profil != 1 THEN
        RETURN json_build_object('success',false,'message','Impossible de supprimer cette facture car elle a reçu un acompte de '||v_mt_acompte||'. Seul un administrateur peut forcer la suppression.','code','INVOICE_HAS_DEPOSIT','details',json_build_object('invoice_number',v_num_facture,'client_name',v_nom_client,'total_amount',v_montant,'deposit_amount',v_mt_acompte));
    END IF;
    SELECT COUNT(*) INTO v_deleted_details FROM public.detail_facture_com WHERE id_facture = pid_facture;
    FOR v_id_produit, v_quantite, v_prix IN
        SELECT id_produit, quantite, prix FROM public.detail_facture_com WHERE id_facture = pid_facture
    LOOP
        INSERT INTO public.mouvement_stock(id_produit,id_structure,type_mouvement,date_mouvement,quantite,prix_unitaire,description,tms_create,created_by)
        VALUES(v_id_produit,pid_structure,'ENTREE',CURRENT_DATE,v_quantite,v_prix::real,'Retour stock - Suppression facture '||v_num_facture,NOW(),'SYSTEM');
    END LOOP;

    -- [PATCH 2026-08-19] Suppression des reçus liés à la facture.
    -- Sans cela, les reçus restent orphelins et les rapports "encaissements par
    -- mode" (get_rapport_encaissements) continuent de compter les paiements
    -- d'une vente supprimée (très visible en paiement multimode : 1 vente = N reçus).
    DELETE FROM public.recus_paiement
     WHERE id_facture = pid_facture AND id_structure = pid_structure;

    -- [PATCH 2026-08-19] Compensation journal (ledger append-only, cf.
    -- modifier_facturecom) : neutralise les crédits d'encaissement par une
    -- écriture au débit. On ne supprime jamais les lignes journal existantes.
    IF v_mt_acompte > 0 THEN
        INSERT INTO public.journal_compte (
            date_journal, id_structure, reference_trx,
            mt_credit, mt_debit, uuid_trx, refid_demande
        ) VALUES (
            CURRENT_DATE, pid_structure, 'SUPPR-' || v_num_facture,
            0, v_mt_acompte::DOUBLE PRECISION, gen_random_uuid()::TEXT, 0
        );
    END IF;

    DELETE FROM public.facture_com WHERE id_facture = pid_facture AND id_structure = pid_structure;
    RETURN json_build_object('success',true,'message','Facture supprimée avec succès','code','INVOICE_DELETED','details',json_build_object('invoice_id',pid_facture,'invoice_number',v_num_facture,'structure_id',pid_structure,'user_id',pid_utilisateur,'user_profile',v_user_profil,'client_name',v_nom_client,'total_amount',v_montant,'had_deposit',v_has_acompte,'deposit_amount',COALESCE(v_mt_acompte,0),'deleted_details_count',v_deleted_details,'forced_deletion',v_has_acompte));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success',false,'message','Erreur lors de la suppression de la facture: '||SQLERRM,'code','DELETION_ERROR','sql_state',SQLSTATE);
END;
$function$
;
