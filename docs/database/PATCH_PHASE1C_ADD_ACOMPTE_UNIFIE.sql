-- ============================================================================
-- PATCH PHASE 1C — Unification add_acompte_facture / fix mutation add_acompte_facture1
-- Base       : fayclick_db @ 154.12.224.173:3253
-- Date       : 2026-07-24
-- Auteur     : dba_master (préparé) — exécuté par PO/coordinateur (système de permission
--              bloque l'exécution DDL directe par l'agent dba_master pour cette action)
-- Décision PO (mot pour mot) : « On va faire propre avec add_acompte_facture pour la
--              mettre à jour afin qu'elle soit identique à add_acompte_facture1. Ensuite
--              côté frontend, on remplace add_acompte_facture1 par add_acompte_facture. »
-- ============================================================================
--
-- CONTEXTE
-- --------
-- En relisant le patch Phase 1B (exécuté et committé par le PO, 579ms, vérifs OK), on a
-- découvert qu'add_acompte_facture1 contient ENCORE la mutation `montant = montant - mt_remise`
-- dans son UPDATE facture_com. Le fix "montant BRUT immuable" du 2026-07-23 n'avait couvert QUE
-- add_acompte_facture (sans le "1"). Résultat : CORRUPTION ACTIVE sur toute facture remisée
-- payée via un canal qui appelle add_acompte_facture1 :
--   - facture-publique.service.ts:150 (paiement lien public wallet OM/WAVE/FREE)
--   - online-seller.service.ts:287, :392, :492 (catalogue public, panier, paiement différé)
-- Les canaux qui appellent add_acompte_facture (v0, SAIN) ne sont PAS affectés :
--   - facture.service.ts, prestation.service.ts, PanierVenteFlashInline.tsx, PanierVenteFlash.tsx
--
-- DIFF add_acompte_facture (v0) vs add_acompte_facture1 (v1) — sources post-Phase1B
-- ------------------------------------------------------------------------------------
-- Identique dans les 2 : validation params, génération UUID, fetch facture, garde ALREADY_PAID,
--   INSERT journal_compte, génération numrecu + INSERT recus_paiement, FETCH recus_paiement,
--   FETCH details (remise_pct/prix_origine ajoutés en Phase1B), forme du JSON de retour
--   (facture.*, paiement.*, detail_facture, recus_paiement, timestamp_operation — MÊMES clés).
--
-- Diffère :
--   1. CALCULS :
--      - v0 (SAIN) : v_montant_net := montant - mt_remise ; validation acompte vs NET ;
--        restant = GREATEST(0, net - acompte) ; etat=2 ssi restant=0.
--      - v1 (BUG)  : validation acompte vs montant BRUT (avant mutation) ; restant = montant -
--        acompte (pas de GREATEST, incohérent une fois le montant muté à l'appel suivant) ;
--        branche spéciale "IF restant = mt_remise THEN etat=2, restant=0" — replâtrage du
--        symptôme de la mutation, plus nécessaire une fois le calcul basé sur le net.
--   2. UPDATE facture_com :
--      - v0 (SAIN) : ne touche JAMAIS la colonne `montant`.
--      - v1 (BUG)  : `SET montant = montant - mt_remise` — dérive cumulative : si la facture
--        encaisse un acompte partiel puis un complément, `montant` est décrémenté DEUX FOIS
--        (une fois par appel), corrompant durablement le brut de la facture.
--   3. Fonctionnalité additionnelle EXCLUSIVE à v1 (à conserver, aucun équivalent dans v0) :
--      bloc "NOTIFICATIONS DE TOUS LES UTILISATEURS DE LA STRUCTURE" — boucle sur les
--      utilisateurs actifs de la structure et appelle add_new_notification(id, titre, message,
--      'paiement') pour chacun. Effet de bord uniquement (aucun champ JSON retourné en lien),
--      donc fusionnable dans v0 SANS changement de contrat JSON pour aucun appelant.
--
-- STRATÉGIE
-- ---------
-- ÉTAPE 1 : add_acompte_facture (v0) devient la version CONSOLIDÉE : logique montant SAINE de
--           v0 (déjà en place) + ajout du bloc NOTIFICATIONS de v1 (seul ajout fonctionnel réel).
--           Signature 7 paramètres INCHANGÉE. JSON de retour = SURENSEMBLE compatible (mêmes
--           clés qu'avant, aucune suppression) — voir §"Contrat JSON unifié" ci-dessous.
-- ÉTAPE 2 : add_acompte_facture1 reçoit le MÊME fix montant que celui appliqué hier sur v0
--           (suppression de `montant = montant - mt_remise`, restant calculé sur le net avec
--           GREATEST(0,...)) — copie minimale, RIEN d'autre modifié (notifications, journal,
--           reçu, JSON de retour, tout le reste identique bit à bit à la version post-Phase1B).
--           Nécessaire le temps de la transition : les fronts PWA déployés continuent d'appeler
--           v1 jusqu'au redéploiement qui basculera vers add_acompte_facture (décision PO ci-dessus).
--
-- CONTRAT JSON UNIFIÉ (les 2 fonctions, avant et après ce patch, exposent EXACTEMENT) :
--   { success, code, message,
--     facture: { id_facture, num_facture, client, tel_client, montant_facture, ancien_acompte,
--                montant_verse, nouveau_acompte, ancien_restant, nouveau_restant, ancien_etat,
--                nouvel_etat, statut },
--     paiement: { mode_paiement, reference_transaction, telephone, numero_recu, uuid },
--     detail_facture: [ { id_detail, nom_produit, quantite, prix, remise_pct, prix_origine,
--                          sous_total } ],
--     recus_paiement: [ { id_recu, id_facture, numero_recu, methode_paiement, montant_paye,
--                          reference_transaction, date_paiement, telephone_client } ],
--     timestamp_operation }
-- Vérifié compatible avec TOUS les appelants front lus dans le repo :
--   - facture.service.ts (ligne ~420) : lit parsedData.facture.id_facture/montant_verse/
--     nouveau_restant/statut → présents, inchangés.
--   - ModalPaiement.tsx (factures + services-factures) : lit response.recus_paiement[0]
--     .numero_recu/.id_recu/.montant_paye/.methode_paiement + response.paiement.numero_recu
--     → présents, inchangés.
--   - facture-publique.service.ts:150 : ne lit que .success/.message côté FacturePubliqueClient.tsx
--     → inchangé.
--   - online-seller.service.ts:287/392/492 : lit acompteData.facture.num_facture → présent,
--     inchangé.
--   - prestation.service.ts, PanierVenteFlashInline.tsx, PanierVenteFlash.tsx : appellent v0,
--     déjà ce contrat.
-- AUCUN breaking change de contrat JSON dans ce patch. Seul le comportement interne (montant
-- immuable au lieu de muté) change — invisible pour le front qui ne relit jamais
-- facture.montant_facture pour le comparer entre 2 appels successifs.
--
-- IMPACT DONNÉES EXISTANTES (hors périmètre d'exécution de ce patch, à documenter pour le PO) :
-- Les factures remisées déjà payées via add_acompte_facture1 EN DEUX TEMPS (acompte partiel +
-- complément) ont potentiellement un `facture_com.montant` déjà corrompu (décrémenté 1 ou 2 fois
-- selon le nombre d'appels). Ce patch corrige le COMPORTEMENT FUTUR uniquement — une régularisation
-- des données historiques nécessiterait un script de diagnostic séparé (hors mandat de cette session,
-- à traiter dans un chantier dédié si le PO le demande).
-- ============================================================================

\set ON_ERROR_STOP on
BEGIN;

-- ============================================================================
-- ETAPE 1/2 — add_acompte_facture CONSOLIDÉE (logique montant saine + notifications de v1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_acompte_facture(pid_structure integer, pid_facture integer, pmontant_acompte numeric, ptransactionid character varying DEFAULT ''::character varying, puuid character varying DEFAULT 'face2face'::character varying, pmode_paiement character varying DEFAULT 'CASH'::character varying, ptel_client character varying DEFAULT '771234567'::character varying)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_facture_record RECORD;
    v_montant_net numeric(10,2);
    v_nouveau_acompte numeric(10,2);
    v_nouveau_restant numeric(10,2);
    v_nouvel_etat integer;
    v_result_json json;
    v_details_json JSON;
    v_numrecugenere varchar;
    v_recus_json json;
    v_uuid varchar;
    v_recu_result json;
    v_step varchar := 'INIT';
    v_user_record RECORD;              -- [PHASE1C] fusion notifications (issu de v1)
    v_notif_result json;               -- [PHASE1C] fusion notifications (issu de v1)
BEGIN
    -- ========================================
    -- LOG: PARAMÈTRES D'ENTRÉE
    -- ========================================
    v_step := 'PARAMS';
    RAISE NOTICE '=== ÉTAPE 1: PARAMÈTRES ===';
    RAISE NOTICE 'pid_structure: %', pid_structure;
    RAISE NOTICE 'pid_facture: %', pid_facture;
    RAISE NOTICE 'pmontant_acompte: %', pmontant_acompte;
    RAISE NOTICE 'ptransactionid: %', ptransactionid;
    RAISE NOTICE 'puuid: %', puuid;
    RAISE NOTICE 'pmode_paiement: %', pmode_paiement;
    RAISE NOTICE 'ptel_client: %', ptel_client;

    -- ========================================
    -- GÉNÉRATION UUID
    -- ========================================
    v_step := 'UUID_GEN';
    RAISE NOTICE '=== ÉTAPE 2: GÉNÉRATION UUID ===';

    IF puuid = 'face2face' OR puuid = '' OR puuid IS NULL THEN
        v_uuid := gen_random_uuid()::text;
        RAISE NOTICE 'UUID généré automatiquement: %', v_uuid;
    ELSE
        v_uuid := puuid;
        RAISE NOTICE 'UUID fourni utilisé: %', v_uuid;
    END IF;

    RAISE NOTICE 'Type v_uuid: %', pg_typeof(v_uuid);

    -- ========================================
    -- VALIDATION DES PARAMÈTRES D'ENTRÉE
    -- ========================================
    v_step := 'VALIDATION';
    RAISE NOTICE '=== ÉTAPE 3: VALIDATION ===';

    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RAISE NOTICE 'ERREUR: pid_structure invalide';
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_STRUCTURE',
            'message', 'L''ID structure doit être un entier positif valide',
            'step', v_step
        );
    END IF;
    RAISE NOTICE 'pid_structure OK';

    IF pid_facture IS NULL OR pid_facture <= 0 THEN
        RAISE NOTICE 'ERREUR: pid_facture invalide';
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_FACTURE',
            'message', 'L''ID facture doit être un entier positif valide',
            'step', v_step
        );
    END IF;
    RAISE NOTICE 'pid_facture OK';

    IF pmontant_acompte IS NULL OR pmontant_acompte <= 0 THEN
        RAISE NOTICE 'ERREUR: pmontant_acompte invalide';
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_AMOUNT',
            'message', 'Le montant de l''acompte doit être supérieur à 0',
            'step', v_step
        );
    END IF;
    RAISE NOTICE 'pmontant_acompte OK';

    -- ========================================
    -- RÉCUPÉRATION DE LA FACTURE
    -- ========================================
    v_step := 'FETCH_FACTURE';
    RAISE NOTICE '=== ÉTAPE 4: RÉCUPÉRATION FACTURE ===';

    SELECT
        fc.id_facture,
        fc.num_facture,
        fc.id_structure,
        fc.montant,
        fc.mt_remise,
        fc.mt_acompte,
        fc.mt_restant,
        fc.id_etat,
        fc.tel_client,
        fc.nom_client_payeur
    INTO v_facture_record
    FROM public.facture_com fc
    WHERE fc.id_facture = pid_facture
      AND fc.id_structure = pid_structure;

    IF NOT FOUND THEN
        RAISE NOTICE 'ERREUR: Facture non trouvée';
        RETURN json_build_object(
            'success', false,
            'code', 'FACTURE_NOT_FOUND',
            'message', 'Aucune facture trouvée avec l''ID ' || pid_facture,
            'step', v_step
        );
    END IF;

    RAISE NOTICE 'Facture trouvée:';
    RAISE NOTICE '  - id_facture: %', v_facture_record.id_facture;
    RAISE NOTICE '  - num_facture: %', v_facture_record.num_facture;
    RAISE NOTICE '  - montant (BRUT): %', v_facture_record.montant;
    RAISE NOTICE '  - mt_remise: %', v_facture_record.mt_remise;
    RAISE NOTICE '  - mt_acompte: %', v_facture_record.mt_acompte;
    RAISE NOTICE '  - mt_restant: %', v_facture_record.mt_restant;
    RAISE NOTICE '  - id_etat: %', v_facture_record.id_etat;

    -- Vérifier que la facture n'est pas déjà payée
    IF v_facture_record.id_etat = 2 THEN
        RAISE NOTICE 'ERREUR: Facture déjà payée';
        RETURN json_build_object(
            'success', false,
            'code', 'ALREADY_PAID',
            'message', 'La facture est déjà entièrement payée',
            'step', v_step
        );
    END IF;

    -- ========================================
    -- CALCULS DES MONTANTS
    -- ========================================
    -- CONVENTION (patch 2026-07-23, confirmée Phase1C) : facture_com.montant = BRUT IMMUABLE
    -- (= SUM des lignes détail). Le NET à payer = montant - mt_remise. On ne modifie JAMAIS
    -- "montant" ici.
    v_step := 'CALCULS';
    RAISE NOTICE '=== ÉTAPE 5: CALCULS ===';

    v_montant_net := v_facture_record.montant - v_facture_record.mt_remise;
    RAISE NOTICE 'v_montant_net (brut - remise): % - % = %', v_facture_record.montant, v_facture_record.mt_remise, v_montant_net;

    v_nouveau_acompte := v_facture_record.mt_acompte + pmontant_acompte;
    RAISE NOTICE 'v_nouveau_acompte: % + % = %', v_facture_record.mt_acompte, pmontant_acompte, v_nouveau_acompte;

    IF v_nouveau_acompte > v_montant_net THEN
        RAISE NOTICE 'ERREUR: Montant dépassé (% > net %)', v_nouveau_acompte, v_montant_net;
        RETURN json_build_object(
            'success', false,
            'code', 'AMOUNT_EXCEEDED',
            'message', 'Montant dépassé',
            'step', v_step
        );
    END IF;

    v_nouveau_restant := GREATEST(0, v_montant_net - v_nouveau_acompte);
    RAISE NOTICE 'v_nouveau_restant (net - acompte): % - % = %', v_montant_net, v_nouveau_acompte, v_nouveau_restant;

    IF v_nouveau_restant = 0 THEN
        v_nouvel_etat := 2;
    ELSE
        v_nouvel_etat := 1;
    END IF;
    RAISE NOTICE 'v_nouvel_etat: %', v_nouvel_etat;

    -- ========================================
    -- MISE À JOUR DE LA FACTURE
    -- ========================================
    -- ⚠️ "montant" (BRUT) N'EST JAMAIS MODIFIÉ ICI (fix dérive cumulative bug historique)
    v_step := 'UPDATE_FACTURE';
    RAISE NOTICE '=== ÉTAPE 6: UPDATE FACTURE ===';

    UPDATE public.facture_com
    SET mt_acompte = v_nouveau_acompte,
        mt_restant = v_nouveau_restant,
        id_etat = v_nouvel_etat,
        numrecu = ptransactionid,
        tms_update = NOW()::varchar
    WHERE id_facture = pid_facture;

    RAISE NOTICE 'UPDATE facture_com OK - Rows affected: %', FOUND;

    -- ========================================
    -- INSERTION JOURNAL COMPTE
    -- ========================================
    v_step := 'INSERT_JOURNAL';
    RAISE NOTICE '=== ÉTAPE 7: INSERT JOURNAL_COMPTE ===';
    RAISE NOTICE 'Valeurs à insérer:';
    RAISE NOTICE '  - date_journal: %', CURRENT_DATE;
    RAISE NOTICE '  - id_structure: %', v_facture_record.id_structure;
    RAISE NOTICE '  - reference_trx: %', ptransactionid;
    RAISE NOTICE '  - mt_credit: %', pmontant_acompte;
    RAISE NOTICE '  - mt_debit: 0';
    RAISE NOTICE '  - uuid_trx: %', v_uuid;
    RAISE NOTICE '  - Type uuid_trx: %', pg_typeof(v_uuid);

    INSERT INTO public.journal_compte (
        date_journal,
        id_structure,
        reference_trx,
        mt_credit,
        mt_debit,
        uuid_trx
    )
    VALUES (
        CURRENT_DATE,
        v_facture_record.id_structure,
        ptransactionid,
        pmontant_acompte,
        0,
        v_uuid
    );

    RAISE NOTICE 'INSERT journal_compte OK';

    -- ========================================
    -- CRÉATION DU REÇU DE PAIEMENT
    -- ========================================
    v_step := 'INSERT_RECU';
    RAISE NOTICE '=== ÉTAPE 8: INSERT RECUS_PAIEMENT ===';

    v_numrecugenere := 'REC-' ||
                       pid_structure || '-' ||
                       pid_facture || '-' ||
                       FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    RAISE NOTICE 'Numéro reçu généré: %', v_numrecugenere;

    RAISE NOTICE 'Valeurs à insérer:';
    RAISE NOTICE '  - id_facture: %', pid_facture;
    RAISE NOTICE '  - id_structure: %', pid_structure;
    RAISE NOTICE '  - numero_recu: %', v_numrecugenere;
    RAISE NOTICE '  - methode_paiement: %', pmode_paiement;
    RAISE NOTICE '  - montant_paye: %', pmontant_acompte;
    RAISE NOTICE '  - reference_transaction: %', ptransactionid;
    RAISE NOTICE '  - numero_telephone: %', ptel_client;

    INSERT INTO public.recus_paiement (
        id_facture,
        id_structure,
        numero_recu,
        methode_paiement,
        montant_paye,
        reference_transaction,
        numero_telephone
    ) VALUES (
        pid_facture,
        pid_structure,
        v_numrecugenere,
        pmode_paiement,
        pmontant_acompte,
        ptransactionid,
        ptel_client
    );

    RAISE NOTICE 'INSERT recus_paiement OK';

    -- ========================================
    -- [PHASE1C] NOTIFICATION DE TOUS LES UTILISATEURS DE LA STRUCTURE (fusionné depuis v1)
    -- ========================================
    v_step := 'NOTIFICATIONS';
    RAISE NOTICE '=== ÉTAPE 8bis: NOTIFICATIONS UTILISATEURS ===';

    FOR v_user_record IN
        SELECT id, username
        FROM public.utilisateur
        WHERE id_structure = pid_structure
          AND actif = true
    LOOP
        RAISE NOTICE 'Notification pour utilisateur ID: %, Nom: %', v_user_record.id, v_user_record.username;

        SELECT add_new_notification(
            v_user_record.id,
            'Paiement reçu',
            'Paiement de ' || ptel_client || ' de ' || pmontant_acompte || ' FCFA reçu par ' || pmode_paiement || ' sur la facture ' || v_facture_record.num_facture,
            'paiement'
        ) INTO v_notif_result;

        RAISE NOTICE 'Résultat notification: %', v_notif_result;
    END LOOP;

    -- ========================================
    -- RÉCUPÉRATION DE TOUS LES REÇUS
    -- ========================================
    v_step := 'FETCH_RECUS';
    RAISE NOTICE '=== ÉTAPE 9: FETCH RECUS ===';

    SELECT COALESCE(
        json_agg(
            json_build_object(
                'id_recu', rp.id_recu,
                'id_facture', rp.id_facture,
                'numero_recu', rp.numero_recu,
                'methode_paiement', rp.methode_paiement,
                'montant_paye', rp.montant_paye,
                'reference_transaction', rp.reference_transaction,
                'date_paiement', rp.date_creation,
                'telephone_client', rp.numero_telephone
            )
            ORDER BY rp.id_recu DESC
        ),
        '[]'::JSON
    ) INTO v_recus_json
    FROM public.recus_paiement rp
    WHERE rp.id_facture = pid_facture;

    RAISE NOTICE 'FETCH recus OK: %', v_recus_json;

     -- Récupérer les détails de la facture
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'id_detail', ldv.id_detail,
                    'nom_produit', ldv.nom_produit,
                    'quantite', ldv.quantite,
                    'prix', ldv.prix,
                    'remise_pct', ldv.remise_pct,       -- [PHASE1B]
                    'prix_origine', ldv.prix_origine,   -- [PHASE1B]
                    'sous_total', (ldv.quantite * ldv.prix)
                )
            ),
            '[]'::JSON
        ) INTO v_details_json
        FROM public.list_detailventes ldv
        WHERE ldv.id_facture = pid_facture;


    -- ========================================
    -- CONSTRUCTION DU JSON DE RETOUR
    -- ========================================
    v_step := 'BUILD_JSON';
    RAISE NOTICE '=== ÉTAPE 10: BUILD JSON ===';

    v_result_json := json_build_object(
        'success', true,
        'code', CASE WHEN v_nouvel_etat = 2 THEN 'FULLY_PAID' ELSE 'PARTIAL_PAYMENT' END,
        'message', CASE WHEN v_nouvel_etat = 2 THEN 'Facture entièrement payée' ELSE 'Acompte ajouté avec succès' END,
        'facture', json_build_object(
            'id_facture', v_facture_record.id_facture,
            'num_facture', v_facture_record.num_facture,
            'client', v_facture_record.nom_client_payeur,
            'tel_client', v_facture_record.tel_client,
            'montant_facture', v_facture_record.montant,
            'ancien_acompte', v_facture_record.mt_acompte,
            'montant_verse', pmontant_acompte,
            'nouveau_acompte', v_nouveau_acompte,
            'ancien_restant', v_facture_record.mt_restant,
            'nouveau_restant', v_nouveau_restant,
            'ancien_etat', v_facture_record.id_etat,
            'nouvel_etat', v_nouvel_etat,
            'statut', CASE WHEN v_nouvel_etat = 2 THEN 'PAYEE' ELSE 'IMPAYEE' END
        ),
        'paiement', json_build_object(
            'mode_paiement', pmode_paiement,
            'reference_transaction', ptransactionid,
            'telephone', ptel_client,
            'numero_recu', v_numrecugenere,
            'uuid', v_uuid
        ),
        'detail_facture', v_details_json,
        'recus_paiement', v_recus_json,
        'timestamp_operation', NOW()
    );

    RAISE NOTICE '=== ÉTAPE 11: SUCCÈS ===';
    RAISE NOTICE 'Résultat: %', v_result_json;

    RETURN v_result_json;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '=== ERREUR EXCEPTION ===';
        RAISE NOTICE 'Étape: %', v_step;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'SQLERRM: %', SQLERRM;

        RETURN json_build_object(
            'success', false,
            'code', 'ERROR',
            'message', 'Erreur: ' || SQLERRM,
            'step', v_step,
            'data', json_build_object('sqlstate', SQLSTATE),
            'timestamp_operation', NOW()
        );
END;
$function$;


-- ============================================================================
-- ETAPE 2/2 — add_acompte_facture1 : FIX MINIMAL de la mutation montant
--             (copie du fix v0 uniquement — CALCULS + UPDATE facture_com. RIEN d'autre
--             modifié : notifications, journal, reçu, details, JSON retour identiques
--             bit à bit à la version post-Phase1B)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_acompte_facture1(pid_structure integer, pid_facture integer, pmontant_acompte numeric, ptransactionid character varying DEFAULT ''::character varying, puuid character varying DEFAULT 'face2face'::character varying, pmode_paiement character varying DEFAULT 'CASH'::character varying, ptel_client character varying DEFAULT '771234567'::character varying)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_facture_record RECORD;
    v_montant_net numeric(10,2);       -- [PHASE1C] ajouté pour calcul sain (copie du fix v0)
    v_nouveau_acompte numeric(10,2);
    v_nouveau_restant numeric(10,2);
    v_nouvel_etat integer;
    v_result_json json;
    v_details_json JSON;
    v_numrecugenere varchar;
    v_recus_json json;
    v_uuid varchar;
    v_recu_result json;
    v_step varchar := 'INIT';
v_user_record RECORD;
v_notif_result json;
BEGIN
    -- ========================================
    -- LOG: PARAMÈTRES D'ENTRÉE
    -- ========================================
    v_step := 'PARAMS';
    RAISE NOTICE '=== ÉTAPE 1: PARAMÈTRES ===';
    RAISE NOTICE 'pid_structure: %', pid_structure;
    RAISE NOTICE 'pid_facture: %', pid_facture;
    RAISE NOTICE 'pmontant_acompte: %', pmontant_acompte;
    RAISE NOTICE 'ptransactionid: %', ptransactionid;
    RAISE NOTICE 'puuid: %', puuid;
    RAISE NOTICE 'pmode_paiement: %', pmode_paiement;
    RAISE NOTICE 'ptel_client: %', ptel_client;

    -- ========================================
    -- GÉNÉRATION UUID
    -- ========================================
    v_step := 'UUID_GEN';
    RAISE NOTICE '=== ÉTAPE 2: GÉNÉRATION UUID ===';

    IF puuid = 'face2face' OR puuid = '' OR puuid IS NULL THEN
        v_uuid := gen_random_uuid()::text;
        RAISE NOTICE 'UUID généré automatiquement: %', v_uuid;
    ELSE
        v_uuid := puuid;
        RAISE NOTICE 'UUID fourni utilisé: %', v_uuid;
    END IF;

    RAISE NOTICE 'Type v_uuid: %', pg_typeof(v_uuid);

    -- ========================================
    -- VALIDATION DES PARAMÈTRES D'ENTRÉE
    -- ========================================
    v_step := 'VALIDATION';
    RAISE NOTICE '=== ÉTAPE 3: VALIDATION ===';

    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RAISE NOTICE 'ERREUR: pid_structure invalide';
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_STRUCTURE',
            'message', 'L''ID structure doit être un entier positif valide',
            'step', v_step
        );
    END IF;
    RAISE NOTICE 'pid_structure OK';

    IF pid_facture IS NULL OR pid_facture <= 0 THEN
        RAISE NOTICE 'ERREUR: pid_facture invalide';
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_FACTURE',
            'message', 'L''ID facture doit être un entier positif valide',
            'step', v_step
        );
    END IF;
    RAISE NOTICE 'pid_facture OK';

    IF pmontant_acompte IS NULL OR pmontant_acompte <= 0 THEN
        RAISE NOTICE 'ERREUR: pmontant_acompte invalide';
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_AMOUNT',
            'message', 'Le montant de l''acompte doit être supérieur à 0',
            'step', v_step
        );
    END IF;
    RAISE NOTICE 'pmontant_acompte OK';

    -- ========================================
    -- RÉCUPÉRATION DE LA FACTURE
    -- ========================================
    v_step := 'FETCH_FACTURE';
    RAISE NOTICE '=== ÉTAPE 4: RÉCUPÉRATION FACTURE ===';

    SELECT
        fc.id_facture,
        fc.num_facture,
        fc.id_structure,
        fc.montant,
        fc.mt_remise,
        fc.mt_acompte,
        fc.mt_restant,
        fc.id_etat,
        fc.tel_client,
        fc.nom_client_payeur
    INTO v_facture_record
    FROM public.facture_com fc
    WHERE fc.id_facture = pid_facture
      AND fc.id_structure = pid_structure;

    IF NOT FOUND THEN
        RAISE NOTICE 'ERREUR: Facture non trouvée';
        RETURN json_build_object(
            'success', false,
            'code', 'FACTURE_NOT_FOUND',
            'message', 'Aucune facture trouvée avec l''ID ' || pid_facture,
            'step', v_step
        );
    END IF;

    RAISE NOTICE 'Facture trouvée:';
    RAISE NOTICE '  - id_facture: %', v_facture_record.id_facture;
    RAISE NOTICE '  - num_facture: %', v_facture_record.num_facture;
    RAISE NOTICE '  - montant: %', v_facture_record.montant;
    RAISE NOTICE '  - mt_remise: %', v_facture_record.mt_remise;
    RAISE NOTICE '  - mt_acompte: %', v_facture_record.mt_acompte;
    RAISE NOTICE '  - mt_restant: %', v_facture_record.mt_restant;
    RAISE NOTICE '  - id_etat: %', v_facture_record.id_etat;

    -- Vérifier que la facture n'est pas déjà payée
    IF v_facture_record.id_etat = 2 THEN
        RAISE NOTICE 'ERREUR: Facture déjà payée';
        RETURN json_build_object(
            'success', false,
            'code', 'ALREADY_PAID',
            'message', 'La facture est déjà entièrement payée',
            'step', v_step
        );
    END IF;

    -- ========================================
    -- CALCULS DES MONTANTS
    -- ========================================
    -- [PHASE1C FIX] Copie minimale du fix v0 2026-07-23 : calcul sur le NET (montant - remise),
    -- plus de mutation de "montant". Suppression de la branche spéciale
    -- "IF restant = mt_remise THEN etat=2" (symptôme de l'ancien bug, plus nécessaire).
    v_step := 'CALCULS';
    RAISE NOTICE '=== ÉTAPE 5: CALCULS ===';

    v_montant_net := v_facture_record.montant - v_facture_record.mt_remise;
    RAISE NOTICE 'v_montant_net (brut - remise): % - % = %', v_facture_record.montant, v_facture_record.mt_remise, v_montant_net;

    v_nouveau_acompte := v_facture_record.mt_acompte + pmontant_acompte;
    RAISE NOTICE 'v_nouveau_acompte: % + % = %', v_facture_record.mt_acompte, pmontant_acompte, v_nouveau_acompte;

    IF v_nouveau_acompte > v_montant_net THEN
        RAISE NOTICE 'ERREUR: Montant dépassé (% > net %)', v_nouveau_acompte, v_montant_net;
        RETURN json_build_object(
            'success', false,
            'code', 'AMOUNT_EXCEEDED',
            'message', 'Montant dépassé',
            'step', v_step
        );
    END IF;

    v_nouveau_restant := GREATEST(0, v_montant_net - v_nouveau_acompte);
    RAISE NOTICE 'v_nouveau_restant (net - acompte): % - % = %', v_montant_net, v_nouveau_acompte, v_nouveau_restant;

    IF v_nouveau_restant = 0 THEN
        v_nouvel_etat := 2;
    ELSE
        v_nouvel_etat := 1;
    END IF;
    RAISE NOTICE 'v_nouvel_etat: %', v_nouvel_etat;

    -- ========================================
    -- MISE À JOUR DE LA FACTURE
    -- ========================================
    -- [PHASE1C FIX] "montant" (BRUT) N'EST PLUS JAMAIS MODIFIÉ ICI (suppression de
    -- `montant = montant - v_facture_record.mt_remise`)
    v_step := 'UPDATE_FACTURE';
    RAISE NOTICE '=== ÉTAPE 6: UPDATE FACTURE ===';

    UPDATE public.facture_com
    SET mt_acompte = v_nouveau_acompte,
        mt_restant = v_nouveau_restant,
        id_etat = v_nouvel_etat,
        numrecu = ptransactionid,
        tms_update = NOW()::varchar
    WHERE id_facture = pid_facture;

    RAISE NOTICE 'UPDATE facture_com OK - Rows affected: %', FOUND;

    -- ========================================
    -- INSERTION JOURNAL COMPTE
    -- ========================================
    v_step := 'INSERT_JOURNAL';
    RAISE NOTICE '=== ÉTAPE 7: INSERT JOURNAL_COMPTE ===';
    RAISE NOTICE 'Valeurs à insérer:';
    RAISE NOTICE '  - date_journal: %', CURRENT_DATE;
    RAISE NOTICE '  - id_structure: %', v_facture_record.id_structure;
    RAISE NOTICE '  - reference_trx: %', ptransactionid;
    RAISE NOTICE '  - mt_credit: %', pmontant_acompte;
    RAISE NOTICE '  - mt_debit: 0';
    RAISE NOTICE '  - uuid_trx: %', v_uuid;
    RAISE NOTICE '  - Type uuid_trx: %', pg_typeof(v_uuid);

    INSERT INTO public.journal_compte (
        date_journal,
        id_structure,
        reference_trx,
        mt_credit,
        mt_debit,
        uuid_trx
    )
    VALUES (
        CURRENT_DATE,
        v_facture_record.id_structure,
        ptransactionid,
        pmontant_acompte,
        0,
        v_uuid
    );

    RAISE NOTICE 'INSERT journal_compte OK';

    -- ========================================
    -- CRÉATION DU REÇU DE PAIEMENT
    -- ========================================
    v_step := 'INSERT_RECU';
    RAISE NOTICE '=== ÉTAPE 8: INSERT RECUS_PAIEMENT ===';

    v_numrecugenere := 'REC-' ||
                       pid_structure || '-' ||
                       pid_facture || '-' ||
                       FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    RAISE NOTICE 'Numéro reçu généré: %', v_numrecugenere;

    RAISE NOTICE 'Valeurs à insérer:';
    RAISE NOTICE '  - id_facture: %', pid_facture;
    RAISE NOTICE '  - id_structure: %', pid_structure;
    RAISE NOTICE '  - numero_recu: %', v_numrecugenere;
    RAISE NOTICE '  - methode_paiement: %', pmode_paiement;
    RAISE NOTICE '  - montant_paye: %', pmontant_acompte;
    RAISE NOTICE '  - reference_transaction: %', ptransactionid;
    RAISE NOTICE '  - numero_telephone: %', ptel_client;

    INSERT INTO public.recus_paiement (
        id_facture,
        id_structure,
        numero_recu,
        methode_paiement,
        montant_paye,
        reference_transaction,
        numero_telephone
    ) VALUES (
        pid_facture,
        pid_structure,
        v_numrecugenere,
        pmode_paiement,
        pmontant_acompte,
        ptransactionid,
        ptel_client
    );

    RAISE NOTICE 'INSERT recus_paiement OK';
-- ========================================
    -- NOTIFICATION DE TOUS LES UTILISATEURS DE LA STRUCTURE
    -- ========================================
    v_step := 'NOTIFICATIONS';
    RAISE NOTICE '=== ÉTAPE 8bis: NOTIFICATIONS UTILISATEURS ===';

    FOR v_user_record IN
        SELECT id, username
        FROM public.utilisateur
        WHERE id_structure = pid_structure
          AND actif = true
    LOOP
        RAISE NOTICE 'Notification pour utilisateur ID: %, Nom: %', v_user_record.id, v_user_record.username;

        SELECT add_new_notification(
            v_user_record.id,
            'Paiement reçu',
            'Paiement de ' || ptel_client || ' de ' || pmontant_acompte || ' FCFA reçu par ' || pmode_paiement || ' sur la facture ' || v_facture_record.num_facture,
            'paiement'
        ) INTO v_notif_result;

        RAISE NOTICE 'Résultat notification: %', v_notif_result;
    END LOOP;
    -- ========================================
    -- RÉCUPÉRATION DE TOUS LES REÇUS
    -- ========================================
    v_step := 'FETCH_RECUS';
    RAISE NOTICE '=== ÉTAPE 9: FETCH RECUS ===';

    SELECT COALESCE(
        json_agg(
            json_build_object(
                'id_recu', rp.id_recu,
                'id_facture', rp.id_facture,
                'numero_recu', rp.numero_recu,
                'methode_paiement', rp.methode_paiement,
                'montant_paye', rp.montant_paye,
                'reference_transaction', rp.reference_transaction,
                'date_paiement', rp.date_creation,
                'telephone_client', rp.numero_telephone
            )
            ORDER BY rp.id_recu DESC
        ),
        '[]'::JSON
    ) INTO v_recus_json
    FROM public.recus_paiement rp
    WHERE rp.id_facture = pid_facture;

    RAISE NOTICE 'FETCH recus OK: %', v_recus_json;

	 -- Récupérer les détails de la facture
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'id_detail', ldv.id_detail,
                    'nom_produit', ldv.nom_produit,
                    'quantite', ldv.quantite,
                    'prix', ldv.prix,
                    'remise_pct', ldv.remise_pct,       -- [PHASE1B]
                    'prix_origine', ldv.prix_origine,   -- [PHASE1B]
                    'sous_total', (ldv.quantite * ldv.prix)
                )
            ),
            '[]'::JSON
        ) INTO v_details_json
        FROM public.list_detailventes ldv
        WHERE ldv.id_facture = pid_facture;


    -- ========================================
    -- CONSTRUCTION DU JSON DE RETOUR
    -- ========================================
    v_step := 'BUILD_JSON';
    RAISE NOTICE '=== ÉTAPE 10: BUILD JSON ===';

    v_result_json := json_build_object(
        'success', true,
        'code', CASE WHEN v_nouvel_etat = 2 THEN 'FULLY_PAID' ELSE 'PARTIAL_PAYMENT' END,
        'message', CASE WHEN v_nouvel_etat = 2 THEN 'Facture entièrement payée' ELSE 'Acompte ajouté avec succès' END,
        'facture', json_build_object(
            'id_facture', v_facture_record.id_facture,
            'num_facture', v_facture_record.num_facture,
            'client', v_facture_record.nom_client_payeur,
            'tel_client', v_facture_record.tel_client,
            'montant_facture', v_facture_record.montant,
            'ancien_acompte', v_facture_record.mt_acompte,
            'montant_verse', pmontant_acompte,
            'nouveau_acompte', v_nouveau_acompte,
            'ancien_restant', v_facture_record.mt_restant,
            'nouveau_restant', v_nouveau_restant,
            'ancien_etat', v_facture_record.id_etat,
            'nouvel_etat', v_nouvel_etat,
            'statut', CASE WHEN v_nouvel_etat = 2 THEN 'PAYEE' ELSE 'IMPAYEE' END
        ),
        'paiement', json_build_object(
            'mode_paiement', pmode_paiement,
            'reference_transaction', ptransactionid,
            'telephone', ptel_client,
            'numero_recu', v_numrecugenere,
            'uuid', v_uuid
        ),
		'detail_facture', v_details_json,
        'recus_paiement', v_recus_json,
        'timestamp_operation', NOW()
    );

    RAISE NOTICE '=== ÉTAPE 11: SUCCÈS ===';
    RAISE NOTICE 'Résultat: %', v_result_json;

    RETURN v_result_json;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '=== ERREUR EXCEPTION ===';
        RAISE NOTICE 'Étape: %', v_step;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'SQLERRM: %', SQLERRM;

        RETURN json_build_object(
            'success', false,
            'code', 'ERROR',
            'message', 'Erreur: ' || SQLERRM,
            'step', v_step,
            'data', json_build_object('sqlstate', SQLSTATE),
            'timestamp_operation', NOW()
        );
END;
$function$;

COMMIT;

-- ============================================================================
-- SMOKE QUERIES POST-PATCH (read-only)
-- ============================================================================
\echo '--- Signatures inchangées (2 fonctions, 7 params chacune) ---'
SELECT proname, pg_get_function_identity_arguments(oid) AS identity_args
FROM pg_proc WHERE proname IN ('add_acompte_facture','add_acompte_facture1')
  AND pronamespace='public'::regnamespace
ORDER BY proname;

\echo '--- Verifier absence de la mutation montant dans les 2 sources ---'
SELECT proname,
       (prosrc ILIKE '%montant = montant - v_facture_record.mt_remise%'
        OR prosrc ILIKE '%SET montant = montant%') AS mutation_montant_presente
FROM pg_proc WHERE proname IN ('add_acompte_facture','add_acompte_facture1')
  AND pronamespace='public'::regnamespace;
-- ATTENDU : mutation_montant_presente = false pour les 2 lignes

\echo '--- Verifier presence bloc NOTIFICATIONS dans les 2 sources ---'
SELECT proname, (prosrc ILIKE '%NOTIFICATIONS UTILISATEURS%') AS a_notifications
FROM pg_proc WHERE proname IN ('add_acompte_facture','add_acompte_facture1')
  AND pronamespace='public'::regnamespace;
-- ATTENDU : a_notifications = true pour les 2 lignes
