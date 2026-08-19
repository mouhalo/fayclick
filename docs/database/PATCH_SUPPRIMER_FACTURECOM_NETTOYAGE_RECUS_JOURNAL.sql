-- ============================================================================
-- PATCH supprimer_facturecom / supprimer_facturecom_admin
-- Objet : nettoyage des reçus + compensation journal lors de la suppression
--         d'une facture/vente.
--
-- Contexte (bug remonté 2026-08-19) :
--   La suppression d'une vente (Vente Flash ou facture) ne supprimait PAS les
--   lignes recus_paiement liées. Sans contrainte FK ni DELETE explicite, les
--   reçus restaient orphelins et les rapports "encaissements par mode"
--   (get_rapport_encaissements, qui agrège recus_paiement directement) continuaient
--   de compter les paiements d'une vente supprimée.
--   Le paiement multimode (1 vente = N reçus, un par tranche) rend le bug très
--   visible : ex. vente 7500 F (5000 CASH + 2500 WAVE) supprimée → la carte WAVE
--   affiche toujours 2500 F.
--
-- Décisions :
--   1. recus_paiement : DELETE des lignes de la facture (transactionnel, rattaché
--      à la facture — on supprime).
--   2. journal_compte : ledger APPEND-ONLY (même convention que modifier_facturecom
--      pour un REMBOURSEMENT) → on N'efface jamais l'historique, on insère une
--      écriture DEBIT de compensation égale à mt_acompte (neutralise les crédits
--      d'encaissement dans le "Journal de compte").
--
-- Périmètre : les 2 fonctions de suppression (utilisées par Vente Flash,
--             Factures Commerce et Factures Prestataires).
-- Auteur : dba_master (propriétaire DDL) — appliqué depuis le patch front.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. supprimer_facturecom (suppression standard)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.supprimer_facturecom(pid_structure integer, pid_facture integer, pid_utilisateur integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_profil integer; v_user_structure integer;
    v_facture_structure integer; v_mt_acompte numeric(10,2);
    v_num_facture varchar(19); v_nom_client varchar(150);
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
$function$;

-- ----------------------------------------------------------------------------
-- 2. supprimer_facturecom_admin (suppression admin avec mot de passe)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.supprimer_facturecom_admin(pid_structure integer, pid_facture integer, pid_utilisateur integer, p_password character varying, p_raison text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_profil       integer;
    v_user_structure    integer;
    v_login             varchar;
    v_facture_structure integer;
    v_mt_acompte        numeric(10,2);
    v_num_facture       varchar(19);
    v_nom_client        varchar(150);
    v_montant           numeric(10,2);
    v_deleted_details   integer := 0;
    v_articles_json     jsonb;
    v_pwd_check         integer;
    v_id_produit        integer;
    v_quantite          real;
    v_prix              numeric;
BEGIN
    -- 1. Verifier utilisateur actif + recuperer login et profil
    SELECT id_profil, id_structure, login
      INTO v_user_profil, v_user_structure, v_login
      FROM public.utilisateur
     WHERE id = pid_utilisateur AND actif = true;

    IF v_user_profil IS NULL THEN
        RETURN json_build_object('success',false,
            'message','Utilisateur non trouve ou inactif',
            'code','USER_NOT_FOUND');
    END IF;

    -- 2. Verifier profil ADMIN (id_profil 1 ou 2)
    IF v_user_profil NOT IN (1, 2) THEN
        RETURN json_build_object('success',false,
            'message','Seul un administrateur peut supprimer une facture payee',
            'code','NOT_ADMIN');
    END IF;

    -- 3. Verifier que l'utilisateur appartient a la bonne structure
    IF v_user_structure != pid_structure THEN
        RETURN json_build_object('success',false,
            'message','Utilisateur non autorise pour cette structure',
            'code','UNAUTHORIZED_STRUCTURE');
    END IF;

    -- 4. Verifier mot de passe via check_user_credentials
    SELECT COUNT(*) INTO v_pwd_check
      FROM check_user_credentials(v_login::varchar, p_password::varchar);

    IF v_pwd_check = 0 THEN
        RETURN json_build_object('success',false,
            'message','Mot de passe administrateur incorrect',
            'code','INVALID_PASSWORD');
    END IF;

    -- 5. Recuperer infos facture
    SELECT id_structure, mt_acompte, num_facture, nom_client_payeur, montant
      INTO v_facture_structure, v_mt_acompte, v_num_facture, v_nom_client, v_montant
      FROM public.facture_com
     WHERE id_facture = pid_facture;

    IF v_facture_structure IS NULL THEN
        RETURN json_build_object('success',false,
            'message','Facture non trouvee',
            'code','INVOICE_NOT_FOUND');
    END IF;

    IF v_facture_structure != pid_structure THEN
        RETURN json_build_object('success',false,
            'message','La facture n''''appartient pas a cette structure',
            'code','INVOICE_WRONG_STRUCTURE');
    END IF;

    -- 6. Snapshot des articles (avant DELETE CASCADE)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id_produit', d.id_produit,
               'nom_produit', ps.nom_produit,
               'quantite', d.quantite,
               'prix', d.prix,
               'montant', d.quantite * d.prix
           )), '[]'::jsonb),
           COUNT(*)
      INTO v_articles_json, v_deleted_details
      FROM public.detail_facture_com d
      LEFT JOIN public.produit_service ps
             ON ps.id_produit = d.id_produit AND ps.id_structure = pid_structure
     WHERE d.id_facture = pid_facture;

    -- 7. Inserer dans le log AVANT la suppression
    INSERT INTO public.log_suppressions_factures(
        id_structure, id_facture, num_facture,
        id_user_admin, login_admin,
        nom_client_payeur, montant, mt_acompte,
        articles_json, raison
    ) VALUES (
        pid_structure, pid_facture, v_num_facture,
        pid_utilisateur, v_login,
        v_nom_client, v_montant, v_mt_acompte,
        v_articles_json, p_raison
    );

    -- 8. Inserer mouvement ENTREE pour chaque ligne (retour stock)
    FOR v_id_produit, v_quantite, v_prix IN
        SELECT id_produit, quantite, prix
          FROM public.detail_facture_com
         WHERE id_facture = pid_facture
    LOOP
        INSERT INTO public.mouvement_stock(
            id_produit, id_structure, type_mouvement, date_mouvement,
            quantite, prix_unitaire, description, tms_create, created_by
        ) VALUES (
            v_id_produit, pid_structure, 'ENTREE', CURRENT_DATE,
            v_quantite, v_prix::real,
            'Retour stock - Suppression ADMIN facture ' || v_num_facture,
            NOW(), 'ADMIN-' || v_login
        );
    END LOOP;

    -- 8bis. [PATCH 2026-08-19] Suppression des reçus liés à la facture
    -- (même correctif que supprimer_facturecom : évite les reçus orphelins
    --  comptés par get_rapport_encaissements après suppression).
    DELETE FROM public.recus_paiement
     WHERE id_facture = pid_facture AND id_structure = pid_structure;

    -- 8ter. [PATCH 2026-08-19] Compensation journal (ledger append-only)
    IF v_mt_acompte > 0 THEN
        INSERT INTO public.journal_compte (
            date_journal, id_structure, reference_trx,
            mt_credit, mt_debit, uuid_trx, refid_demande
        ) VALUES (
            CURRENT_DATE, pid_structure, 'SUPPR-' || v_num_facture,
            0, v_mt_acompte::DOUBLE PRECISION, gen_random_uuid()::TEXT, 0
        );
    END IF;

    -- 9. DELETE facture (CASCADE supprime detail_facture_com)
    DELETE FROM public.facture_com
     WHERE id_facture = pid_facture AND id_structure = pid_structure;

    -- 10. Reponse succes
    RETURN json_build_object(
        'success', true,
        'message', 'Facture payee supprimee avec succes par administrateur',
        'code', 'INVOICE_DELETED_ADMIN',
        'details', json_build_object(
            'invoice_id', pid_facture,
            'invoice_number', v_num_facture,
            'structure_id', pid_structure,
            'admin_user_id', pid_utilisateur,
            'admin_login', v_login,
            'client_name', v_nom_client,
            'total_amount', v_montant,
            'deposit_amount', COALESCE(v_mt_acompte, 0),
            'deleted_details_count', v_deleted_details,
            'raison', p_raison
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Erreur lors de la suppression admin: ' || SQLERRM,
        'code', 'DELETION_ERROR',
        'sql_state', SQLSTATE
    );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3. NETTOYAGE DES DONNÉES DE TEST ORPHELINES (structure 218)
--    Vente multimode de test supprimée le 2026-08-19 : facture 159875
--    (5000 F CASH + 2500 F WAVE). Les 2 reçus + les 2 écritures journal
--    restaient en base après la suppression.
-- ----------------------------------------------------------------------------
DELETE FROM public.recus_paiement WHERE id_facture = 159875 AND id_structure = 218;
DELETE FROM public.journal_compte WHERE id_journal IN (107426, 107427);

-- ----------------------------------------------------------------------------
-- 4. VÉRIFICATION POST-NETTOYAGE
--    Doit retourner 0 ligne (aucun reçu orphelin pour 218 aujourd'hui) :
-- ----------------------------------------------------------------------------
-- SELECT rp.id_recu, rp.id_facture, rp.methode_paiement, rp.montant_paye
-- FROM public.recus_paiement rp
-- LEFT JOIN public.facture_com f ON f.id_facture = rp.id_facture
-- WHERE rp.id_structure = 218 AND rp.date_creation::date = CURRENT_DATE
--   AND f.id_facture IS NULL;
