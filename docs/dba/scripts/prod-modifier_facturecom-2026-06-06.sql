-- ============================================================================
-- Schéma  : fayclick_db — Module modification vente du jour
-- Version : v1.1
-- Date    : 2026-06-06
-- DBA     : dba_master
-- PRD     : docs/prd-modification-vente-jour-2026-06-06.md
-- Branche : feature/modification-vente-jour
--
-- Description :
--   Permet à un caissier de modifier les articles et la remise d'une vente
--   payée du jour, sans mot de passe, avec journalisation append-only complète.
--   Garde-fou date côté serveur (UTC = GMT+0 Dakar, pas de décalage).
--
-- Objets créés :
--   1. TABLE  public.log_modifications_factures  (+ 2 index)
--   2. FUNCTION public.modifier_facturecom(integer,integer,integer,varchar,numeric)
--
-- Prérequis :
--   - Tables existantes : facture_com, detail_facture_com, mouvement_stock,
--     produit_service, utilisateur, recus_paiement, journal_compte, etat_facture
--   - Triggers existants : detail_facture_stock_trig (AFTER INSERT detail_facture_com)
--                          recalculer_montant_facture (INSERT/UPDATE/DELETE detail_facture_com)
--   - Extension : aucune (gen_random_uuid() natif PG 16+)
--
-- Test E2E validé : 2026-06-06 19:55 UTC, structure 218 (LIBRAIRIE CHEZ KELEFA)
--   Facture FAC-202606-218-0348, scénario P1 conservé qte++, P2 retiré, P3 nouveau
--   Stock delta net P1=SORTIE4 / P2=net0 / P3=SORTIE1 — zéro double-comptage
--   Ledger COMPLEMENT 1000 FCFA, log avant/après cohérents, facture reste PAYEE
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLE : log_modifications_factures
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.log_modifications_factures (
    id                  SERIAL PRIMARY KEY,
    id_structure        INTEGER       NOT NULL,
    id_facture          INTEGER       NOT NULL,
    num_facture         VARCHAR(25),
    id_utilisateur      INTEGER       NOT NULL,
    login_user          VARCHAR(100),
    nom_client_payeur   VARCHAR(150),
    -- AVANT
    montant_avant       NUMERIC(10,2),
    remise_avant        NUMERIC(10,2),
    acompte_avant       NUMERIC(10,2),
    articles_avant      JSONB,
    -- APRES
    montant_apres       NUMERIC(10,2),
    remise_apres        NUMERIC(10,2),
    acompte_apres       NUMERIC(10,2),
    articles_apres      JSONB,
    -- RECONCILIATION
    ecart_net           NUMERIC(10,2),   -- net_apres - net_avant (>0 complément, <0 remboursement)
    type_ajustement     VARCHAR(20),     -- 'COMPLEMENT' | 'REMBOURSEMENT' | 'AUCUN'
    tms_modification    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_mod_fac_structure
    ON public.log_modifications_factures (id_structure, tms_modification DESC);

CREATE INDEX IF NOT EXISTS idx_log_mod_fac_user
    ON public.log_modifications_factures (id_utilisateur, tms_modification DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FUNCTION : modifier_facturecom
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.modifier_facturecom(
    pid_structure    INTEGER,
    pid_facture      INTEGER,
    pid_utilisateur  INTEGER,
    p_articles_string VARCHAR,   -- format "id-qty-prix#id-qty-prix#..."  (identique à create_facture_complete1)
    p_mt_remise      NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_fac                   RECORD;
    v_login_user            VARCHAR(100);
    v_tel_client            VARCHAR(9);

    -- Snapshot avant
    v_articles_avant        JSONB;
    v_montant_avant         NUMERIC(10,2);
    v_remise_avant          NUMERIC(10,2);
    v_acompte_avant         NUMERIC(10,2);
    v_net_avant             NUMERIC(10,2);

    -- Parsing articles nouveaux
    v_articles_array        TEXT[];
    v_article_parts         TEXT[];
    v_article_str           TEXT;
    v_new_articles          JSONB := '[]'::JSONB;
    v_brut_cible            NUMERIC(10,2) := 0;

    -- Iteration
    v_new_id_produit        INTEGER;
    v_new_quantite          REAL;
    v_new_prix              NUMERIC(10,2);
    v_delta_qte             REAL;
    v_old_map               JSONB := '{}'::JSONB;
    v_new_entry             JSONB;
    v_new_art               JSONB;

    -- Après recalcul triggers
    v_montant_apres         NUMERIC(10,2);
    v_net_apres             NUMERIC(10,2);
    v_acompte_apres         NUMERIC(10,2);
    v_articles_apres        JSONB;

    -- Réconciliation ledger
    v_ecart                 NUMERIC(10,2);
    v_type_ajustement       VARCHAR(20);
    v_num_recu              VARCHAR(75);
    v_uuid_trx              VARCHAR(75);
    v_epoch_ms              BIGINT;

    v_step                  VARCHAR(50) := 'INIT';
    r                       RECORD;
    v_i                     INTEGER;
BEGIN
    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 1 : Récupérer la facture + vérif structure
    -- ══════════════════════════════════════════════════════════════
    v_step := 'FETCH_FACTURE';

    SELECT fc.id_facture, fc.id_structure, fc.num_facture, fc.date_facture,
           fc.montant, fc.mt_remise, fc.mt_acompte, fc.mt_restant,
           fc.id_etat, fc.nom_client_payeur, fc.tel_client, fc.mt_reverser
    INTO v_fac
    FROM public.facture_com fc
    WHERE fc.id_facture = pid_facture;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'code', 'INVOICE_NOT_FOUND',
            'message', 'Facture introuvable', 'step', v_step);
    END IF;

    IF v_fac.id_structure <> pid_structure THEN
        RETURN json_build_object('success', false, 'code', 'INVOICE_WRONG_STRUCTURE',
            'message', 'Facture n''appartient pas a cette structure', 'step', v_step);
    END IF;

    v_tel_client := v_fac.tel_client;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 2 : Garde-fou date côté serveur
    --           Serveur = UTC ; Sénégal = GMT+0 → aucun décalage
    -- ══════════════════════════════════════════════════════════════
    v_step := 'DATE_GUARD';

    IF v_fac.date_facture <> CURRENT_DATE THEN
        RETURN json_build_object('success', false, 'code', 'DATE_LOCKED',
            'message', 'Seules les ventes du jour sont modifiables', 'step', v_step);
    END IF;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 3 : Vérifier que la vente est payée (id_etat = 2)
    --           V1 cible les payées uniquement
    -- ══════════════════════════════════════════════════════════════
    v_step := 'CHECK_ETAT';

    IF v_fac.id_etat <> 2 THEN
        RETURN json_build_object('success', false, 'code', 'NOT_PAID',
            'message', 'Seules les ventes payees sont modifiables en V1', 'step', v_step);
    END IF;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 4 : Bloquer si vente déjà reversée (intégrité comptable)
    -- ══════════════════════════════════════════════════════════════
    v_step := 'CHECK_REVERSER';

    IF v_fac.mt_reverser = TRUE THEN
        RETURN json_build_object('success', false, 'code', 'INVOICE_REVERSED',
            'message', 'Vente deja reversee, modification interdite', 'step', v_step);
    END IF;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 5 : Récupérer login utilisateur
    --           Colonnes confirmées : id, actif, login, id_structure
    -- ══════════════════════════════════════════════════════════════
    v_step := 'FETCH_USER';

    SELECT u.login INTO v_login_user
    FROM public.utilisateur u
    WHERE u.id = pid_utilisateur
      AND u.id_structure = pid_structure
      AND u.actif = TRUE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'code', 'USER_NOT_FOUND',
            'message', 'Utilisateur introuvable ou inactif pour cette structure',
            'step', v_step);
    END IF;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 6 : Snapshot AVANT + construction old_map
    --           old_map = JSONB {id_produit::text -> {qte, prix}}
    -- ══════════════════════════════════════════════════════════════
    v_step := 'SNAPSHOT_AVANT';

    v_montant_avant := v_fac.montant;
    v_remise_avant  := v_fac.mt_remise;
    v_acompte_avant := v_fac.mt_acompte;
    v_net_avant     := v_montant_avant - v_remise_avant;

    SELECT COALESCE(
        json_agg(json_build_object(
            'id_produit', d.id_produit,
            'quantite',   d.quantite,
            'prix',       d.prix,
            'sous_total', (d.quantite * d.prix)
        ) ORDER BY d.id_produit),
        '[]'
    )::JSONB
    INTO v_articles_avant
    FROM public.detail_facture_com d
    WHERE d.id_facture = pid_facture;

    FOR r IN
        SELECT d.id_produit, d.quantite, d.prix
        FROM public.detail_facture_com d
        WHERE d.id_facture = pid_facture
    LOOP
        v_old_map := jsonb_set(
            v_old_map,
            ARRAY[r.id_produit::TEXT],
            json_build_object('qte', r.quantite, 'prix', r.prix)::JSONB,
            TRUE
        );
    END LOOP;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 7 : Parser les nouveaux articles
    --           Format identique à create_facture_complete1 : "id-qty-prix#"
    -- ══════════════════════════════════════════════════════════════
    v_step := 'PARSE_ARTICLES';

    IF p_articles_string IS NULL OR LENGTH(TRIM(p_articles_string)) = 0 THEN
        RETURN json_build_object('success', false, 'code', 'EMPTY_ARTICLES',
            'message', 'La liste des articles ne peut pas etre vide', 'step', v_step);
    END IF;

    v_articles_array := string_to_array(TRIM(p_articles_string, '#'), '#');

    IF array_length(v_articles_array, 1) IS NULL OR array_length(v_articles_array, 1) = 0 THEN
        RETURN json_build_object('success', false, 'code', 'EMPTY_ARTICLES',
            'message', 'Aucun article valide fourni', 'step', v_step);
    END IF;

    FOR v_i IN 1..array_length(v_articles_array, 1) LOOP
        v_article_str   := v_articles_array[v_i];
        v_article_parts := string_to_array(v_article_str, '-');

        IF array_length(v_article_parts, 1) <> 3 THEN
            RETURN json_build_object('success', false, 'code', 'INVALID_ARTICLE_FORMAT',
                'message', 'Format article invalide: ' || v_article_str, 'step', v_step);
        END IF;

        BEGIN
            v_new_id_produit := v_article_parts[1]::INTEGER;
            v_new_quantite   := v_article_parts[2]::REAL;
            v_new_prix       := v_article_parts[3]::NUMERIC(10,2);
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object('success', false, 'code', 'INVALID_ARTICLE_FORMAT',
                'message', 'Conversion impossible: ' || v_article_str, 'step', v_step);
        END;

        IF v_new_id_produit <= 0 OR v_new_quantite <= 0 OR v_new_prix < 0 THEN
            RETURN json_build_object('success', false, 'code', 'INVALID_ARTICLE_FORMAT',
                'message', 'Valeurs invalides: ' || v_article_str, 'step', v_step);
        END IF;

        v_new_articles := v_new_articles || json_build_object(
            'id_produit', v_new_id_produit,
            'quantite',   v_new_quantite,
            'prix',       v_new_prix
        )::JSONB;

        v_brut_cible := v_brut_cible + (v_new_quantite * v_new_prix);
    END LOOP;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 8 : Valider la remise (avant toute écriture en base)
    -- ══════════════════════════════════════════════════════════════
    v_step := 'CHECK_REMISE';

    IF p_mt_remise < 0 OR p_mt_remise >= v_brut_cible THEN
        RETURN json_build_object('success', false, 'code', 'INVALID_REMISE',
            'message', 'Remise invalide (doit etre >= 0 et < sous-total)', 'step', v_step);
    END IF;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 9 : Mutations stock + lignes de détail
    --
    -- Technique validée par spike (PRD §5.1) :
    --
    --   Produit RETIRÉ   → DELETE detail_facture_com
    --                       trigger recalculer_montant_facture (DELETE) → OK
    --                       INSERT mouvement_stock ENTREE manuel (retour)
    --
    --   Produit CONSERVÉ → UPDATE detail_facture_com SET quantite, prix
    --                       trigger recalculer_montant_facture (UPDATE) → OK
    --                       trigger stock NE se déclenche PAS sur UPDATE → pas de double-comptage
    --                       INSERT mouvement_stock compensatoire si delta != 0
    --                         SORTIE si delta > 0 (plus vendu)
    --                         ENTREE si delta < 0 (moins vendu, retour partiel)
    --
    --   Produit NOUVEAU  → INSERT detail_facture_com
    --                       trigger detail_facture_stock_trig (AFTER INSERT) → SORTIE auto
    --                       NE PAS écrire mouvement manuel (serait du double-comptage)
    --
    -- Convention mouvement_stock :
    --   created_by = 'MODIF-{login}' pour les compensatoires manuels
    --   created_by = '' pour les mouvements via trigger (gere_stock ne passe pas created_by)
    -- ══════════════════════════════════════════════════════════════
    v_step := 'STOCK_AND_DETAILS';

    -- 9a : Produits anciens — retirés ou modifiés
    FOR r IN
        SELECT d.id_produit, d.quantite, d.prix
        FROM public.detail_facture_com d
        WHERE d.id_facture = pid_facture
    LOOP
        SELECT elem INTO v_new_entry
        FROM jsonb_array_elements(v_new_articles) elem
        WHERE (elem->>'id_produit')::INTEGER = r.id_produit
        LIMIT 1;

        IF v_new_entry IS NULL THEN
            -- PRODUIT RETIRÉ
            DELETE FROM public.detail_facture_com
            WHERE id_facture = pid_facture AND id_produit = r.id_produit;

            INSERT INTO public.mouvement_stock (
                id_produit, id_structure, type_mouvement, date_mouvement,
                quantite, prix_unitaire, description, tms_create, created_by
            ) VALUES (
                r.id_produit, pid_structure, 'ENTREE', CURRENT_DATE,
                r.quantite, r.prix::REAL,
                'Modification vente - Facture ' || v_fac.num_facture,
                NOW(), 'MODIF-' || v_login_user
            );

        ELSE
            -- PRODUIT CONSERVÉ
            v_new_quantite := (v_new_entry->>'quantite')::REAL;
            v_new_prix     := (v_new_entry->>'prix')::NUMERIC(10,2);
            v_delta_qte    := v_new_quantite - r.quantite;

            UPDATE public.detail_facture_com
            SET quantite = v_new_quantite,
                prix     = v_new_prix
            WHERE id_facture = pid_facture AND id_produit = r.id_produit;

            IF v_delta_qte > 0 THEN
                -- Plus de quantité vendue → SORTIE supplémentaire
                INSERT INTO public.mouvement_stock (
                    id_produit, id_structure, type_mouvement, date_mouvement,
                    quantite, prix_unitaire, description, tms_create, created_by
                ) VALUES (
                    r.id_produit, pid_structure, 'SORTIE', CURRENT_DATE,
                    v_delta_qte, v_new_prix::REAL,
                    'Modification vente - Facture ' || v_fac.num_facture,
                    NOW(), 'MODIF-' || v_login_user
                );
            ELSIF v_delta_qte < 0 THEN
                -- Moins de quantité vendue → ENTREE (retour partiel)
                INSERT INTO public.mouvement_stock (
                    id_produit, id_structure, type_mouvement, date_mouvement,
                    quantite, prix_unitaire, description, tms_create, created_by
                ) VALUES (
                    r.id_produit, pid_structure, 'ENTREE', CURRENT_DATE,
                    -v_delta_qte, v_new_prix::REAL,
                    'Modification vente - Facture ' || v_fac.num_facture,
                    NOW(), 'MODIF-' || v_login_user
                );
            END IF;
            -- delta = 0 → aucun mouvement stock
        END IF;
    END LOOP;

    -- 9b : Produits nouveaux (absents de l'ancienne liste)
    FOR v_new_art IN SELECT * FROM jsonb_array_elements(v_new_articles)
    LOOP
        v_new_id_produit := (v_new_art->>'id_produit')::INTEGER;
        v_new_quantite   := (v_new_art->>'quantite')::REAL;
        v_new_prix       := (v_new_art->>'prix')::NUMERIC(10,2);

        IF NOT (v_old_map ? v_new_id_produit::TEXT) THEN
            -- INSERT → trigger detail_facture_stock_trig écrit SORTIE automatiquement
            INSERT INTO public.detail_facture_com
                (id_facture, date_facture, id_produit, quantite, prix)
            VALUES
                (pid_facture, v_fac.date_facture, v_new_id_produit,
                 v_new_quantite, v_new_prix);
        END IF;
        -- Produits conservés déjà traités en 9a
    END LOOP;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 10 : Appliquer la nouvelle remise
    --            Le trigger recalculer_montant_facture a déjà recalculé
    --            montant = SUM(qte*prix) via les opérations étape 9.
    --            Ce UPDATE met à jour mt_remise → nouveau recalcul de
    --            mt_restant = montant - mt_remise - mt_acompte par le trigger.
    -- ══════════════════════════════════════════════════════════════
    v_step := 'APPLY_REMISE';

    UPDATE public.facture_com
    SET mt_remise  = p_mt_remise,
        tms_update = NOW()::VARCHAR
    WHERE id_facture = pid_facture;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 11 : Lire montant recalculé par les triggers
    -- ══════════════════════════════════════════════════════════════
    v_step := 'READ_AFTER_TRIGGERS';

    SELECT fc.montant INTO v_montant_apres
    FROM public.facture_com fc
    WHERE fc.id_facture = pid_facture;

    v_net_apres := v_montant_apres - p_mt_remise;
    v_ecart     := v_net_apres - v_net_avant;

    SELECT COALESCE(
        json_agg(json_build_object(
            'id_produit', d.id_produit,
            'quantite',   d.quantite,
            'prix',       d.prix,
            'sous_total', (d.quantite * d.prix)
        ) ORDER BY d.id_produit),
        '[]'
    )::JSONB
    INTO v_articles_apres
    FROM public.detail_facture_com d
    WHERE d.id_facture = pid_facture;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 12 : Réconciliation paiement (ledger append-only)
    --
    --   ecart > 0 → COMPLEMENT  : recus_paiement montant positif
    --                              journal_compte mt_credit = ecart
    --   ecart < 0 → REMBOURSEMENT : recus_paiement montant négatif
    --                                journal_compte mt_debit = |ecart|
    --   ecart = 0 → AUCUN        : aucune ligne ledger
    --
    --   Note : trg_historique_paiement_acompte (AFTER UPDATE facture_com)
    --   s'active seulement si mt_acompte augmente (complément) → correct,
    --   ne génère pas de ligne historique parasite pour remboursement.
    -- ══════════════════════════════════════════════════════════════
    v_step := 'RECONCILIATION';

    v_epoch_ms := FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_num_recu := 'MODIF-' || pid_structure || '-' || pid_facture || '-' || v_epoch_ms;
    v_uuid_trx := gen_random_uuid()::TEXT;

    IF v_ecart > 0 THEN
        v_type_ajustement := 'COMPLEMENT';
        v_acompte_apres   := v_acompte_avant + v_ecart;

        INSERT INTO public.recus_paiement (
            id_facture, id_structure, numero_recu,
            methode_paiement, montant_paye,
            reference_transaction, numero_telephone
        ) VALUES (
            pid_facture, pid_structure, v_num_recu,
            'CASH', v_ecart, v_num_recu, v_tel_client
        );

        INSERT INTO public.journal_compte (
            date_journal, id_structure, reference_trx,
            mt_credit, mt_debit, uuid_trx, refid_demande
        ) VALUES (
            CURRENT_DATE, pid_structure, v_num_recu,
            v_ecart::DOUBLE PRECISION, 0, v_uuid_trx, 0
        );

    ELSIF v_ecart < 0 THEN
        v_type_ajustement := 'REMBOURSEMENT';
        v_acompte_apres   := v_acompte_avant + v_ecart;

        INSERT INTO public.recus_paiement (
            id_facture, id_structure, numero_recu,
            methode_paiement, montant_paye,
            reference_transaction, numero_telephone
        ) VALUES (
            pid_facture, pid_structure, v_num_recu,
            'CASH', v_ecart,   -- montant négatif = remboursement
            v_num_recu, v_tel_client
        );

        INSERT INTO public.journal_compte (
            date_journal, id_structure, reference_trx,
            mt_credit, mt_debit, uuid_trx, refid_demande
        ) VALUES (
            CURRENT_DATE, pid_structure, v_num_recu,
            0, (-v_ecart)::DOUBLE PRECISION, v_uuid_trx, 0
        );

    ELSE
        v_type_ajustement := 'AUCUN';
        v_acompte_apres   := v_acompte_avant;
    END IF;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 13 : Forcer mt_acompte / mt_restant = 0 / id_etat = 2
    --            La vente reste PAYEE après modification.
    -- ══════════════════════════════════════════════════════════════
    v_step := 'FORCE_PAID';

    UPDATE public.facture_com
    SET mt_acompte = v_acompte_apres,
        mt_restant = 0,
        id_etat    = 2,
        tms_update = NOW()::VARCHAR
    WHERE id_facture = pid_facture;

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 14 : Log append-only (même transaction)
    --            Rollback automatique si cette étape échoue.
    --            La ligne est conservée même si la facture est
    --            ensuite supprimée (pas de FK cascadante — intentionnel).
    -- ══════════════════════════════════════════════════════════════
    v_step := 'LOG';

    INSERT INTO public.log_modifications_factures (
        id_structure, id_facture, num_facture,
        id_utilisateur, login_user, nom_client_payeur,
        montant_avant,  remise_avant,  acompte_avant,  articles_avant,
        montant_apres,  remise_apres,  acompte_apres,  articles_apres,
        ecart_net, type_ajustement, tms_modification
    ) VALUES (
        pid_structure, pid_facture, v_fac.num_facture,
        pid_utilisateur, v_login_user, v_fac.nom_client_payeur,
        v_montant_avant, v_remise_avant, v_acompte_avant, v_articles_avant,
        v_montant_apres, p_mt_remise,   v_acompte_apres, v_articles_apres,
        v_ecart, v_type_ajustement, NOW()
    );

    -- ══════════════════════════════════════════════════════════════
    -- ÉTAPE 15 : Retour JSON succès
    -- ══════════════════════════════════════════════════════════════
    RETURN json_build_object(
        'success',                true,
        'id_facture',             pid_facture,
        'num_facture',            v_fac.num_facture,
        'net_avant',              v_net_avant,
        'net_apres',              v_net_apres,
        'ecart',                  v_ecart,
        'type_ajustement',        v_type_ajustement,
        'complement_a_encaisser', CASE WHEN v_ecart > 0 THEN v_ecart ELSE 0 END,
        'monnaie_a_rendre',       CASE WHEN v_ecart < 0 THEN -v_ecart ELSE 0 END,
        'message',                'Vente modifiee avec succes',
        'timestamp_operation',    NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success',             false,
        'code',                'MODIFICATION_ERROR',
        'message',             'Erreur: ' || SQLERRM,
        'step',                v_step,
        'sql_state',           SQLSTATE,
        'timestamp_operation', NOW()
    );
END;
$$;
