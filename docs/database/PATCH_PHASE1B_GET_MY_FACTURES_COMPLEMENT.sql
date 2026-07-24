-- ============================================================================
-- PATCH PHASE 1B (complément) — Exposition remise_pct/prix_origine
-- Fonctions oubliées du périmètre initial Phase 1 : get_my_factures, get_my_factures_filtered
-- Base       : fayclick_db @ 154.12.224.173:3253
-- Date       : 2026-07-24
-- Auteur     : dba_master
-- Contexte   : bug PO — page Factures (front) appelle get_my_factures_filtered et la facture
--              publique appelle get_my_factures(id_structure, id_facture). Ces 2 fonctions
--              (3 surcharges : get_my_factures 2-args, get_my_factures_filtered 6-args et
--              8-args) construisent leur "details" depuis la vue list_detailventes (déjà
--              patchée Phase 1 pour exposer remise_pct/prix_origine) mais n'incluaient pas
--              ces 2 clés dans leur json_build_object. Composant front déjà correct (lit
--              d.remise_pct en priorité) — seul le contrat JSON manquait ces clés.
-- Nature     : lecture seule fonctionnellement (SELECT uniquement dans ces fonctions) — le
--              patch DDL modifie uniquement la définition PL/pgSQL (CREATE OR REPLACE).
-- Impact     : AUCUN sur signatures, filtres, pagination, autres champs — uniquement ajout
--              de 'remise_pct', ldv.remise_pct, 'prix_origine', ldv.prix_origine dans les
--              json_build_object 'details' (mêmes noms de clés que get_my_factures1, déjà
--              patchée/vérifiée en Phase 1).
--
-- EXTENSION (même jour) : périmètre élargi sur feu vert PO à 4 fonctions supplémentaires
-- issues du sweep de complétude (add_acompte_facture, add_acompte_facture1,
-- get_client_facture_details, get_list_clients) — ÉTAPES 4 à 7 ci-dessous. Même règle :
-- ajout SEUL de remise_pct/prix_origine dans le bloc JSON de détails produit, aucune autre
-- modification (en particulier logique de paiement d'add_acompte_facture intouchée).
-- Les 3 autres candidats du sweep (del_detail_facture_com, maj_detail_facture_com,
-- supprimer_facturecom_admin) sont des JSON de confirmation/audit d'opération, pas des
-- listings consultés par le front — laissés INTACTS, hors périmètre.
--
-- ⚠️ STATUT AU MOMENT DE LA RÉDACTION DE CE FICHIER : DDL préparée par substitution ciblée
-- sur les définitions réelles (pg_get_functiondef), backups complets effectués pour les 7
-- fonctions (3 initiales + 4 extension). **Exécution bloquée par le système de permission**
-- (jugée hors du mandat initial explicite de l'utilisateur ; une autorisation relayée par un
-- agent coordinateur n'est pas acceptée comme consentement utilisateur direct). Voir
-- RAPPORT_PHASE1_REMISE_LIGNE.md §13 pour le détail. Ce fichier reflète la DDL prête à être
-- rejouée dès confirmation directe de l'utilisateur — PAS ENCORE EXÉCUTÉE en base.
-- ============================================================================

\set ON_ERROR_STOP on
BEGIN;

-- ============================================================================
-- ETAPE 1/3 — get_my_factures(pid_structure integer, pid_facture integer)
--             2 blocs 'details' à patcher (branche pid_facture=0 "toutes factures"
--             + branche pid_facture>0 "facture unique")
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_factures(pid_structure integer, pid_facture integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_facture_json json;
    v_facture_record RECORD;
    v_details_json json;
    v_all_factures_json json;
BEGIN
    -- Validation des paramètres d'entrée
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RAISE EXCEPTION 'L''ID structure doit être un entier positif valide';
    END IF;

    IF pid_facture IS NULL OR pid_facture < 0 THEN
        RAISE EXCEPTION 'L''ID facture doit être supérieur ou égal à 0';
    END IF;

    -- Vérifier que la structure existe
    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RAISE EXCEPTION 'La structure avec l''ID % n''existe pas', pid_structure;
    END IF;

    -- Si pid_facture = 0, retourner toutes les factures de la structure
    IF pid_facture = 0 THEN
        -- Construire le JSON avec toutes les factures et leurs détails
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'facture', json_build_object(
                        'id_facture', lfc.id_facture,
                        'num_facture', lfc.num_facture,
                        'id_structure', lfc.id_structure,
                        'nom_structure', lfc.nom_structure,
                        'date_facture', lfc.date_facture,
                        'annee', lfc.nannee,
                        'mois', lfc.nmois,
                        'description', lfc.description,
                        'nom_classe', lfc.nom_classe,
                        'tel_client', lfc.tel_client,
                        'nom_client', lfc.nom_client,
                        'montant', lfc.montant,
                        'id_etat', lfc.id_etat,
                        'libelle_etat', lfc.libelle_etat,
                        'numrecu', lfc.numrecu,
                        'logo', lfc.logo,
                        'tms_update', lfc.tms_update,
                        'avec_frais', lfc.avec_frais,
                        'periode', lfc.periode,
                        'mt_reverser', lfc.mt_reverser,
                        'mt_remise', lfc.mt_remise,
                        'mt_acompte', lfc.mt_acompte,
                        'mt_restant', lfc.mt_restant,
                        'photo_url', lfc.photo_url
                    ),
                    'details', COALESCE(
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'id_detail', ldv.id_detail,
                                    'id_facture', ldv.id_facture,
                                    'date_facture', ldv.date_facture,
                                    'nom_produit', ldv.nom_produit,
                                    'cout_revient', ldv.cout_revient,
                                    'quantite', ldv.quantite,
                                    'prix', ldv.prix,
                                    'remise_pct', ldv.remise_pct,       -- [PHASE1B]
                                    'prix_origine', ldv.prix_origine,   -- [PHASE1B]
                                    'marge', ldv.marge,
                                    'id_produit', ldv.id_produit,
                                    'sous_total', (ldv.quantite * ldv.prix)
                                )
                            )
                            FROM public.list_detailventes ldv
                            WHERE ldv.id_facture = lfc.id_facture
                        ),
                        '[]'::json
                    ),
                    'resume', json_build_object(
                        'nombre_articles', (
                            SELECT COUNT(*)
                            FROM public.list_detailventes ldv
                            WHERE ldv.id_facture = lfc.id_facture
                        ),
                        'quantite_totale', (
                            SELECT COALESCE(SUM(ldv.quantite), 0)
                            FROM public.list_detailventes ldv
                            WHERE ldv.id_facture = lfc.id_facture
                        ),
                        'cout_total_revient', (
                            SELECT COALESCE(SUM(ldv.cout_revient * ldv.quantite), 0)
                            FROM public.list_detailventes ldv
                            WHERE ldv.id_facture = lfc.id_facture
                        ),
                        'marge_totale', (
                            SELECT COALESCE(SUM(ldv.marge * ldv.quantite), 0)
                            FROM public.list_detailventes ldv
                            WHERE ldv.id_facture = lfc.id_facture
                        )
                    )
                )
                ORDER BY lfc.date_facture DESC, lfc.id_facture DESC
            ),
            '[]'::json
        ) INTO v_all_factures_json
        FROM public.list_factures_com lfc
        WHERE lfc.id_structure = pid_structure;

        -- Retourner toutes les factures avec résumé global
        SELECT json_build_object(
            'factures', v_all_factures_json,
            'resume_global', json_build_object(
                'nombre_factures', (
                    SELECT COUNT(*)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                ),
                'montant_total', (
                    SELECT COALESCE(SUM(lfc.montant), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                ),
                'montant_paye', (
                    SELECT COALESCE(SUM(lfc.montant - lfc.mt_restant), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                ),
                'montant_impaye', (
                    SELECT COALESCE(SUM(lfc.mt_restant), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                ),
                'nombre_payees', (
                    SELECT COUNT(*)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure AND lfc.id_etat = 2
                ),
                'nombre_impayees', (
                    SELECT COUNT(*)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure AND lfc.id_etat = 1
                )
            ),
            'timestamp_generation', NOW()
        ) INTO v_facture_json;

        RETURN v_facture_json;

    ELSE
        -- Logique originale pour une facture spécifique
        -- Récupérer les informations de la facture
        SELECT
            lfc.id_facture,
            lfc.num_facture,
            lfc.id_structure,
            lfc.nom_structure,
            lfc.date_facture,
            lfc.nannee,
            lfc.nmois,
            lfc.description,
            lfc.nom_classe,
            lfc.tel_client,
            lfc.nom_client,
            lfc.montant,
            lfc.id_etat,
            lfc.libelle_etat,
            lfc.numrecu,
            lfc.logo,
            lfc.tms_update,
            lfc.avec_frais,
            lfc.periode,
            lfc.mt_reverser,
            lfc.mt_remise,
            lfc.mt_acompte,
            lfc.mt_restant,
            lfc.photo_url
        INTO v_facture_record
        FROM public.list_factures_com lfc
        WHERE lfc.id_facture = pid_facture
          AND lfc.id_structure = pid_structure;

        -- Vérifier si la facture existe
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Aucune facture trouvée avec l''ID % pour la structure %', pid_facture, pid_structure;
        END IF;

        -- Récupérer les détails de la facture sous forme de JSON
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'id_detail', ldv.id_detail,
                    'id_facture', ldv.id_facture,
                    'date_facture', ldv.date_facture,
                    'nom_produit', ldv.nom_produit,
                    'cout_revient', ldv.cout_revient,
                    'quantite', ldv.quantite,
                    'prix', ldv.prix,
                    'remise_pct', ldv.remise_pct,       -- [PHASE1B]
                    'prix_origine', ldv.prix_origine,   -- [PHASE1B]
                    'marge', ldv.marge,
                    'id_produit', ldv.id_produit,
                    'sous_total', (ldv.quantite * ldv.prix)
                )
            ),
            '[]'::json
        ) INTO v_details_json
        FROM public.list_detailventes ldv
        WHERE ldv.id_facture = pid_facture;

        -- Construire l'objet JSON final avec la facture et ses détails
        SELECT json_build_object(
            'facture', json_build_object(
                'id_facture', v_facture_record.id_facture,
                'num_facture', v_facture_record.num_facture,
                'id_structure', v_facture_record.id_structure,
                'nom_structure', v_facture_record.nom_structure,
                'date_facture', v_facture_record.date_facture,
                'annee', v_facture_record.nannee,
                'mois', v_facture_record.nmois,
                'description', v_facture_record.description,
                'nom_classe', v_facture_record.nom_classe,
                'tel_client', v_facture_record.tel_client,
                'nom_client', v_facture_record.nom_client,
                'montant', v_facture_record.montant,
                'id_etat', v_facture_record.id_etat,
                'libelle_etat', v_facture_record.libelle_etat,
                'numrecu', v_facture_record.numrecu,
                'logo', v_facture_record.logo,
                'tms_update', v_facture_record.tms_update,
                'avec_frais', v_facture_record.avec_frais,
                'periode', v_facture_record.periode,
                'mt_reverser', v_facture_record.mt_reverser,
                'mt_remise', v_facture_record.mt_remise,
                'mt_acompte', v_facture_record.mt_acompte,
                'mt_restant', v_facture_record.mt_restant,
                'photo_url', v_facture_record.photo_url
            ),
            'details', v_details_json,
            'resume', json_build_object(
                'nombre_articles', (
                    SELECT COUNT(*)
                    FROM public.list_detailventes ldv
                    WHERE ldv.id_facture = pid_facture
                ),
                'quantite_totale', (
                    SELECT COALESCE(SUM(ldv.quantite), 0)
                    FROM public.list_detailventes ldv
                    WHERE ldv.id_facture = pid_facture
                ),
                'cout_total_revient', (
                    SELECT COALESCE(SUM(ldv.cout_revient * ldv.quantite), 0)
                    FROM public.list_detailventes ldv
                    WHERE ldv.id_facture = pid_facture
                ),
                'marge_totale', (
                    SELECT COALESCE(SUM(ldv.marge * ldv.quantite), 0)
                    FROM public.list_detailventes ldv
                    WHERE ldv.id_facture = pid_facture
                )
            ),
            'timestamp_generation', NOW()
        ) INTO v_facture_json;

        RETURN v_facture_json;
    END IF;

END;
$function$;


-- ============================================================================
-- ETAPE 2/3 — get_my_factures_filtered (6 args, sans pagination)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_factures_filtered(pid_structure integer, pdate1 character varying DEFAULT ''::character varying, pdate2 character varying DEFAULT ''::character varying, pnom_client character varying DEFAULT ''::character varying, ptelephone character varying DEFAULT ''::character varying, pstatut character varying DEFAULT ''::character varying)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_all_factures_json JSON;
    v_date_debut DATE;
    v_date_fin DATE;
    v_label_periode VARCHAR(100);
    v_id_etat INTEGER;
BEGIN
    -- Validation des paramètres d'entrée
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_STRUCTURE',
            'error', 'L''ID structure doit être un entier positif valide'
        );
    END IF;

    -- Vérifier que la structure existe
    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RETURN json_build_object(
            'success', false,
            'code', 'STRUCTURE_NOT_FOUND',
            'error', 'La structure avec l''ID ' || pid_structure || ' n''existe pas'
        );
    END IF;

    -- Gestion des dates
    IF pdate1 IS NOT NULL AND pdate1 <> '' THEN
        BEGIN
            v_date_debut := pdate1::DATE;
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_DATE1',
                'error', 'Format de date invalide pour pdate1. Utilisez YYYY-MM-DD'
            );
        END;
    ELSE
        v_date_debut := NULL;
    END IF;

    IF pdate2 IS NOT NULL AND pdate2 <> '' THEN
        BEGIN
            v_date_fin := pdate2::DATE;
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_DATE2',
                'error', 'Format de date invalide pour pdate2. Utilisez YYYY-MM-DD'
            );
        END;
    ELSE
        v_date_fin := NULL;
    END IF;

    -- Validation cohérence des dates
    IF v_date_debut IS NOT NULL AND v_date_fin IS NOT NULL AND v_date_debut > v_date_fin THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_DATE_RANGE',
            'error', 'La date de début doit être antérieure ou égale à la date de fin'
        );
    END IF;

    -- Conversion du statut en id_etat
    IF pstatut IS NOT NULL AND pstatut <> '' THEN
        v_id_etat := CASE LOWER(TRIM(pstatut))
            WHEN 'impayee' THEN 1
            WHEN 'impayé' THEN 1
            WHEN 'impaye' THEN 1
            WHEN '1' THEN 1
            WHEN 'payee' THEN 2
            WHEN 'payé' THEN 2
            WHEN 'paye' THEN 2
            WHEN '2' THEN 2
            WHEN 'partielle' THEN 3
            WHEN 'partiel' THEN 3
            WHEN '3' THEN 3
            ELSE NULL
        END;
    ELSE
        v_id_etat := NULL;
    END IF;

    -- Label de la période
    IF v_date_debut IS NOT NULL AND v_date_fin IS NOT NULL THEN
        v_label_periode := 'Du ' || TO_CHAR(v_date_debut, 'DD/MM/YYYY') || ' au ' || TO_CHAR(v_date_fin, 'DD/MM/YYYY');
    ELSIF v_date_debut IS NOT NULL THEN
        v_label_periode := 'À partir du ' || TO_CHAR(v_date_debut, 'DD/MM/YYYY');
    ELSIF v_date_fin IS NOT NULL THEN
        v_label_periode := 'Jusqu''au ' || TO_CHAR(v_date_fin, 'DD/MM/YYYY');
    ELSE
        v_label_periode := 'Toutes les factures';
    END IF;

    -- Construire le JSON avec toutes les factures filtrées
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'facture', json_build_object(
                    'id_facture', lfc.id_facture,
                    'num_facture', lfc.num_facture,
                    'id_structure', lfc.id_structure,
                    'nom_structure', lfc.nom_structure,
                    'date_facture', lfc.date_facture,
                    'annee', lfc.nannee,
                    'mois', lfc.nmois,
                    'description', lfc.description,
                    'nom_classe', lfc.nom_classe,
                    'tel_client', lfc.tel_client,
                    'nom_client', lfc.nom_client,
                    'montant', lfc.montant,
                    'id_etat', lfc.id_etat,
                    'libelle_etat', lfc.libelle_etat,
                    'numrecu', lfc.numrecu,
                    'logo', lfc.logo,
                    'tms_update', lfc.tms_update,
                    'avec_frais', lfc.avec_frais,
                    'periode', lfc.periode,
                    'mt_reverser', lfc.mt_reverser,
                    'mt_remise', lfc.mt_remise,
                    'mt_acompte', lfc.mt_acompte,
                    'mt_restant', lfc.mt_restant,
                    'id_utilisateur', lfc.id_utilisateur,
                    'nom_utilisateur', lfc.nom_utilisateur,
                    'photo_url', lfc.photo_url,
                    'id_devis', lfc.id_devis
                ),
                'recus_paiements', COALESCE(
                    (
                        SELECT json_agg(
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
                        )
                        FROM public.recus_paiement rp
                        WHERE rp.id_facture = lfc.id_facture
                    ),
                    '[]'::JSON
                ),
                'details', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_detail', ldv.id_detail,
                                'id_facture', ldv.id_facture,
                                'date_facture', ldv.date_facture,
                                'nom_produit', ldv.nom_produit,
                                'cout_revient', ldv.cout_revient,
                                'quantite', ldv.quantite,
                                'prix', ldv.prix,
                                'remise_pct', ldv.remise_pct,       -- [PHASE1B]
                                'prix_origine', ldv.prix_origine,   -- [PHASE1B]
                                'marge', ldv.marge,
                                'id_produit', ldv.id_produit,
                                'sous_total', (ldv.quantite * ldv.prix)
                            )
                        )
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    '[]'::JSON
                ),
                'resume', json_build_object(
                    'nombre_articles', (
                        SELECT COUNT(*)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    'quantite_totale', (
                        SELECT COALESCE(SUM(ldv.quantite), 0)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    'cout_total_revient', (
                        SELECT COALESCE(SUM(ldv.cout_revient * ldv.quantite), 0)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    'marge_totale', (
                        SELECT COALESCE(SUM(ldv.marge * ldv.quantite), 0)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    )
                )
            )
            ORDER BY lfc.date_facture DESC, lfc.id_facture DESC
        ),
        '[]'::JSON
    ) INTO v_all_factures_json
    FROM public.list_factures_com lfc
    WHERE lfc.id_structure = pid_structure
      -- Filtre par plage de dates
      AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
      AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
      -- Filtre par nom client (recherche partielle insensible à la casse)
      AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
      -- Filtre par téléphone (recherche partielle)
      AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
      -- Filtre par statut
      AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat);

    -- Retourner toutes les factures avec résumé global
    RETURN json_build_object(
        'success', true,
        'code', 'FACTURES_FOUND',
        'filtres', json_build_object(
            'date_debut', v_date_debut,
            'date_fin', v_date_fin,
            'nom_client', NULLIF(TRIM(pnom_client), ''),
            'telephone', NULLIF(TRIM(ptelephone), ''),
            'statut', NULLIF(TRIM(pstatut), ''),
            'id_etat', v_id_etat
        ),
        'periode', json_build_object(
            'label', v_label_periode,
            'date_debut', v_date_debut,
            'date_fin', v_date_fin
        ),
        'factures', v_all_factures_json,
        'resume_global', json_build_object(
            'nombre_factures', (
                SELECT COUNT(*)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
            ),
            'montant_total', (
                SELECT COALESCE(SUM(lfc.montant), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
            ),
            'montant_remises', (
                SELECT COALESCE(SUM(lfc.mt_remise), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
            ),
            'montant_acomptes', (
                SELECT COALESCE(SUM(lfc.mt_acompte), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
            ),
            'montant_paye', (
                SELECT COALESCE(SUM(lfc.montant - lfc.mt_remise - lfc.mt_restant), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
            ),
            'montant_impaye', (
                SELECT COALESCE(SUM(lfc.mt_restant), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
            ),
            'nombre_payees', (
                SELECT COUNT(*)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
                  AND lfc.id_etat = 2
            ),
            'nombre_impayees', (
                SELECT COUNT(*)
                FROM public.list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
                  AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
                  AND (v_date_fin IS NULL OR lfc.date_facture <= v_date_fin)
                  AND (pnom_client IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
                  AND (ptelephone IS NULL OR ptelephone = '' OR lfc.tel_client LIKE '%' || TRIM(ptelephone) || '%')
                  AND (v_id_etat IS NULL OR lfc.id_etat = v_id_etat)
                  AND lfc.id_etat = 3
            )
        ),
        'timestamp_generation', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'code', 'ERROR',
            'error', 'Erreur lors de la récupération des factures: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$function$;


-- ============================================================================
-- ETAPE 3/3 — get_my_factures_filtered (8 args, avec pagination)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_factures_filtered(pid_structure integer, pdate1 character varying DEFAULT ''::character varying, pdate2 character varying DEFAULT ''::character varying, pnom_client character varying DEFAULT ''::character varying, ptelephone character varying DEFAULT ''::character varying, pstatut character varying DEFAULT ''::character varying, ppage integer DEFAULT 1, plimit integer DEFAULT 20)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_page_factures_json  JSON;
    v_resume_json         JSON;
    v_date_debut          DATE;
    v_date_fin            DATE;
    v_label_periode       VARCHAR(100);
    v_id_etat             INTEGER;
    v_offset              INTEGER;
    v_page_courante       INTEGER;
    v_taille_page         INTEGER;
BEGIN
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_STRUCTURE',
            'error', 'L ID structure doit etre un entier positif valide'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RETURN json_build_object(
            'success', false,
            'code', 'STRUCTURE_NOT_FOUND',
            'error', 'La structure avec l ID ' || pid_structure || ' n existe pas'
        );
    END IF;

    v_page_courante := GREATEST(1, COALESCE(ppage, 1));
    v_taille_page   := GREATEST(1, LEAST(200, COALESCE(plimit, 20)));
    v_offset        := (v_page_courante - 1) * v_taille_page;

    IF pdate1 IS NOT NULL AND pdate1 <> '' THEN
        BEGIN
            v_date_debut := pdate1::DATE;
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_DATE1',
                'error', 'Format de date invalide pour pdate1. Utilisez YYYY-MM-DD'
            );
        END;
    ELSE
        v_date_debut := NULL;
    END IF;

    IF pdate2 IS NOT NULL AND pdate2 <> '' THEN
        BEGIN
            v_date_fin := pdate2::DATE;
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_DATE2',
                'error', 'Format de date invalide pour pdate2. Utilisez YYYY-MM-DD'
            );
        END;
    ELSE
        v_date_fin := NULL;
    END IF;

    IF v_date_debut IS NOT NULL AND v_date_fin IS NOT NULL AND v_date_debut > v_date_fin THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_DATE_RANGE',
            'error', 'La date de debut doit etre anterieure ou egale a la date de fin'
        );
    END IF;

    IF pstatut IS NOT NULL AND pstatut <> '' THEN
        v_id_etat := CASE LOWER(TRIM(pstatut))
            WHEN 'impayee'    THEN 1
            WHEN 'impaye'     THEN 1
            WHEN '1'          THEN 1
            WHEN 'payee'      THEN 2
            WHEN 'paye'       THEN 2
            WHEN '2'          THEN 2
            WHEN 'partielle'  THEN 3
            WHEN 'partiel'    THEN 3
            WHEN '3'          THEN 3
            ELSE NULL
        END;
    ELSE
        v_id_etat := NULL;
    END IF;

    IF v_date_debut IS NOT NULL AND v_date_fin IS NOT NULL THEN
        v_label_periode := 'Du ' || TO_CHAR(v_date_debut, 'DD/MM/YYYY') || ' au ' || TO_CHAR(v_date_fin, 'DD/MM/YYYY');
    ELSIF v_date_debut IS NOT NULL THEN
        v_label_periode := 'A partir du ' || TO_CHAR(v_date_debut, 'DD/MM/YYYY');
    ELSIF v_date_fin IS NOT NULL THEN
        v_label_periode := 'Jusqu au ' || TO_CHAR(v_date_fin, 'DD/MM/YYYY');
    ELSE
        v_label_periode := 'Toutes les factures';
    END IF;

    -- RESUME GLOBAL : une seule passe, 9 sous-requetes remplacees par COUNT FILTER / SUM
    SELECT json_build_object(
        'nombre_factures',   COUNT(*),
        'montant_total',     COALESCE(SUM(lfc.montant), 0),
        'montant_remises',   COALESCE(SUM(lfc.mt_remise), 0),
        'montant_acomptes',  COALESCE(SUM(lfc.mt_acompte), 0),
        'montant_paye',      COALESCE(SUM(lfc.montant - lfc.mt_remise - lfc.mt_restant), 0),
        'montant_impaye',    COALESCE(SUM(lfc.mt_restant), 0),
        'nombre_payees',     COUNT(*) FILTER (WHERE lfc.id_etat = 2),
        'nombre_impayees',   COUNT(*) FILTER (WHERE lfc.id_etat = 1),
        'nombre_partielles', COUNT(*) FILTER (WHERE lfc.id_etat = 3)
    )
    INTO v_resume_json
    FROM public.list_factures_com lfc
    WHERE lfc.id_structure = pid_structure
      AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
      AND (v_date_fin   IS NULL OR lfc.date_facture <= v_date_fin)
      AND (pnom_client  IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
      AND (ptelephone   IS NULL OR ptelephone  = '' OR lfc.tel_client        LIKE '%' || TRIM(ptelephone)         || '%')
      AND (v_id_etat    IS NULL OR lfc.id_etat = v_id_etat);

    -- PAGE DE FACTURES : OFFSET / LIMIT sur la page demandee
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'facture', json_build_object(
                    'id_facture',      lfc.id_facture,
                    'num_facture',     lfc.num_facture,
                    'id_structure',    lfc.id_structure,
                    'nom_structure',   lfc.nom_structure,
                    'date_facture',    lfc.date_facture,
                    'annee',           lfc.nannee,
                    'mois',            lfc.nmois,
                    'description',     lfc.description,
                    'nom_classe',      lfc.nom_classe,
                    'tel_client',      lfc.tel_client,
                    'nom_client',      lfc.nom_client,
                    'montant',         lfc.montant,
                    'id_etat',         lfc.id_etat,
                    'libelle_etat',    lfc.libelle_etat,
                    'numrecu',         lfc.numrecu,
                    'logo',            lfc.logo,
                    'tms_update',      lfc.tms_update,
                    'avec_frais',      lfc.avec_frais,
                    'periode',         lfc.periode,
                    'mt_reverser',     lfc.mt_reverser,
                    'mt_remise',       lfc.mt_remise,
                    'mt_acompte',      lfc.mt_acompte,
                    'mt_restant',      lfc.mt_restant,
                    'id_utilisateur',  lfc.id_utilisateur,
                    'nom_utilisateur', lfc.nom_utilisateur,
                    'photo_url',       lfc.photo_url,
                    'id_devis',        lfc.id_devis
                ),
                'recus_paiements', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_recu',               rp.id_recu,
                                'id_facture',            rp.id_facture,
                                'numero_recu',           rp.numero_recu,
                                'methode_paiement',      rp.methode_paiement,
                                'montant_paye',          rp.montant_paye,
                                'reference_transaction', rp.reference_transaction,
                                'date_paiement',         rp.date_creation,
                                'telephone_client',      rp.numero_telephone
                            )
                        )
                        FROM public.recus_paiement rp
                        WHERE rp.id_facture = lfc.id_facture
                    ),
                    '[]'::JSON
                ),
                'details', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_detail',    ldv.id_detail,
                                'id_facture',   ldv.id_facture,
                                'date_facture', ldv.date_facture,
                                'nom_produit',  ldv.nom_produit,
                                'cout_revient', ldv.cout_revient,
                                'quantite',     ldv.quantite,
                                'prix',         ldv.prix,
                                'remise_pct',   ldv.remise_pct,       -- [PHASE1B]
                                'prix_origine', ldv.prix_origine,     -- [PHASE1B]
                                'marge',        ldv.marge,
                                'id_produit',   ldv.id_produit,
                                'sous_total',   (ldv.quantite * ldv.prix)
                            )
                        )
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    '[]'::JSON
                ),
                'resume', json_build_object(
                    'nombre_articles',    (SELECT COUNT(*)                                          FROM public.list_detailventes ldv WHERE ldv.id_facture = lfc.id_facture),
                    'quantite_totale',    (SELECT COALESCE(SUM(ldv.quantite), 0)                    FROM public.list_detailventes ldv WHERE ldv.id_facture = lfc.id_facture),
                    'cout_total_revient', (SELECT COALESCE(SUM(ldv.cout_revient * ldv.quantite), 0) FROM public.list_detailventes ldv WHERE ldv.id_facture = lfc.id_facture),
                    'marge_totale',       (SELECT COALESCE(SUM(ldv.marge * ldv.quantite), 0)        FROM public.list_detailventes ldv WHERE ldv.id_facture = lfc.id_facture)
                )
            )
        ),
        '[]'::JSON
    ) INTO v_page_factures_json
    FROM (
        SELECT lfc.*
        FROM public.list_factures_com lfc
        WHERE lfc.id_structure = pid_structure
          AND (v_date_debut IS NULL OR lfc.date_facture >= v_date_debut)
          AND (v_date_fin   IS NULL OR lfc.date_facture <= v_date_fin)
          AND (pnom_client  IS NULL OR pnom_client = '' OR LOWER(lfc.nom_client) LIKE '%' || LOWER(TRIM(pnom_client)) || '%')
          AND (ptelephone   IS NULL OR ptelephone  = '' OR lfc.tel_client        LIKE '%' || TRIM(ptelephone)         || '%')
          AND (v_id_etat    IS NULL OR lfc.id_etat = v_id_etat)
        ORDER BY lfc.date_facture DESC, lfc.id_facture DESC
        LIMIT  v_taille_page
        OFFSET v_offset
    ) lfc;

    RETURN json_build_object(
        'success', true,
        'code',    'FACTURES_FOUND',
        'filtres', json_build_object(
            'date_debut', v_date_debut,
            'date_fin',   v_date_fin,
            'nom_client', NULLIF(TRIM(pnom_client), ''),
            'telephone',  NULLIF(TRIM(ptelephone),  ''),
            'statut',     NULLIF(TRIM(pstatut),     ''),
            'id_etat',    v_id_etat
        ),
        'periode', json_build_object(
            'label',      v_label_periode,
            'date_debut', v_date_debut,
            'date_fin',   v_date_fin
        ),
        'pagination', json_build_object(
            'page_courante',  v_page_courante,
            'taille_page',    v_taille_page,
            'total_factures', (v_resume_json->>'nombre_factures')::INTEGER,
            'total_pages',    CEIL((v_resume_json->>'nombre_factures')::NUMERIC / v_taille_page)
        ),
        'factures',      v_page_factures_json,
        'resume_global', v_resume_json,
        'timestamp_generation', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'code',    'ERROR',
            'error',   'Erreur lors de la recuperation des factures: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$function$;


-- ============================================================================
-- ETAPE 4/7 — add_acompte_facture (ajout remise_pct/prix_origine dans le bloc
--             'detail_facture' UNIQUEMENT — logique de paiement/montant intouchée)
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
    -- CONVENTION (patch 2026-07-23) : facture_com.montant = BRUT IMMUABLE (= SUM des lignes détail).
    -- Le NET à payer = montant - mt_remise. On ne modifie JAMAIS "montant" ici.
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
    -- ⚠️ "montant" (BRUT) N'EST PLUS JAMAIS MODIFIÉ ICI (fix dérive cumulative bug historique)
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
-- ETAPE 5/7 — add_acompte_facture1 (idem — ajout des 2 clés dans 'detail_facture'
--             uniquement, logique de paiement/montant intouchée)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_acompte_facture1(pid_structure integer, pid_facture integer, pmontant_acompte numeric, ptransactionid character varying DEFAULT ''::character varying, puuid character varying DEFAULT 'face2face'::character varying, pmode_paiement character varying DEFAULT 'CASH'::character varying, ptel_client character varying DEFAULT '771234567'::character varying)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_facture_record RECORD;
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
    v_step := 'CALCULS';
    RAISE NOTICE '=== ÉTAPE 5: CALCULS ===';

    v_nouveau_acompte := v_facture_record.mt_acompte + pmontant_acompte;
    RAISE NOTICE 'v_nouveau_acompte: % + % = %', v_facture_record.mt_acompte, pmontant_acompte, v_nouveau_acompte;

    IF v_nouveau_acompte > v_facture_record.montant THEN
        RAISE NOTICE 'ERREUR: Montant dépassé (% > %)', v_nouveau_acompte, v_facture_record.montant;
        RETURN json_build_object(
            'success', false,
            'code', 'AMOUNT_EXCEEDED',
            'message', 'Montant dépassé',
            'step', v_step
        );
    END IF;

    v_nouveau_restant := v_facture_record.montant - v_nouveau_acompte;
    RAISE NOTICE 'v_nouveau_restant: % - % = %', v_facture_record.montant, v_nouveau_acompte, v_nouveau_restant;

    IF v_nouveau_restant = 0 THEN
        v_nouvel_etat := 2;
    ELSIF v_nouveau_restant = v_facture_record.mt_remise THEN
        v_nouvel_etat := 2;
        v_nouveau_restant := 0;
    ELSE
        v_nouvel_etat := 1;
    END IF;
    RAISE NOTICE 'v_nouvel_etat: %', v_nouvel_etat;

    -- ========================================
    -- MISE À JOUR DE LA FACTURE
    -- ========================================
    v_step := 'UPDATE_FACTURE';
    RAISE NOTICE '=== ÉTAPE 6: UPDATE FACTURE ===';

    UPDATE public.facture_com
    SET montant = montant - v_facture_record.mt_remise,
        mt_acompte = v_nouveau_acompte,
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


-- ============================================================================
-- ETAPE 6/7 — get_client_facture_details (ajout des 2 clés dans 'details' UNIQUEMENT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_client_facture_details(pid_structure integer, pid_facture integer DEFAULT 0, pid_client integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_facture_json json;
    v_client_record RECORD;
    v_all_factures_json json;
    v_tel_client varchar(9);
BEGIN
    -- Validation des paramètres d'entrée
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RAISE EXCEPTION 'L''ID structure doit être un entier positif valide';
    END IF;

    IF pid_facture IS NULL OR pid_facture < 0 THEN
        RAISE EXCEPTION 'L''ID facture doit être supérieur ou égal à 0';
    END IF;

    IF pid_client IS NULL OR pid_client < 0 THEN
        RAISE EXCEPTION 'L''ID client doit être supérieur ou égal à 0';
    END IF;

    -- Vérifier que la structure existe
    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RAISE EXCEPTION 'La structure avec l''ID % n''existe pas', pid_structure;
    END IF;

    -- Si pid_client = 0, il faut pid_facture pour identifier le client
    IF pid_client = 0 AND pid_facture = 0 THEN
        RAISE EXCEPTION 'Il faut spécifier soit l''ID client soit l''ID facture';
    END IF;

    -- Récupérer les informations du client
    IF pid_client > 0 THEN
        -- Récupérer le client par son ID
        SELECT
            cf.id_client,
            cf.nom_client,
            cf.tel_client,
            cf.adresse,
            cf.date_creation,
            cf.date_modification
        INTO v_client_record
        FROM public.client_facture cf
        WHERE cf.id_client = pid_client AND cf.id_structure = pid_structure;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Aucun client trouvé avec l''ID % pour la structure %', pid_client, pid_structure;
        END IF;

        v_tel_client := v_client_record.tel_client;
    ELSE
        -- Récupérer le client via la facture
        SELECT
            lfc.tel_client
        INTO v_tel_client
        FROM public.list_factures_com lfc
        WHERE lfc.id_facture = pid_facture AND lfc.id_structure = pid_structure;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Aucune facture trouvée avec l''ID % pour la structure %', pid_facture, pid_structure;
        END IF;

        -- Récupérer les infos du client
        SELECT
            cf.id_client,
            cf.nom_client,
            cf.tel_client,
            cf.adresse,
            cf.date_creation,
            cf.date_modification
        INTO v_client_record
        FROM public.client_facture cf
        WHERE cf.tel_client = v_tel_client AND cf.id_structure = pid_structure;

        -- Si le client n'existe pas dans client_facture, créer un enregistrement temporaire
        IF NOT FOUND THEN
            SELECT
                0 as id_client,
                lfc.nom_client as nom_client,
                lfc.tel_client as tel_client,
                'senegal' as adresse,
                CURRENT_DATE as date_creation,
                CURRENT_DATE as date_modification
            INTO v_client_record
            FROM public.list_factures_com lfc
            WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            LIMIT 1;
        END IF;
    END IF;

    -- Construire le JSON avec toutes les factures du client
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'facture', json_build_object(
                    'id_facture', lfc.id_facture,
                    'num_facture', lfc.num_facture,
                    'id_structure', lfc.id_structure,
                    'nom_structure', lfc.nom_structure,
                    'date_facture', lfc.date_facture,
                    'annee', lfc.nannee,
                    'mois', lfc.nmois,
                    'description', lfc.description,
                    'nom_classe', lfc.nom_classe,
                    'tel_client', lfc.tel_client,
                    'nom_client', lfc.nom_client,
                    'montant', lfc.montant,
                    'id_etat', lfc.id_etat,
                    'libelle_etat', lfc.libelle_etat,
                    'numrecu', lfc.numrecu,
                    'logo', lfc.logo,
                    'tms_update', lfc.tms_update,
                    'avec_frais', lfc.avec_frais,
                    'periode', lfc.periode,
                    'mt_reverser', lfc.mt_reverser,
                    'mt_remise', lfc.mt_remise,
                    'mt_acompte', lfc.mt_acompte,
                    'mt_restant', lfc.mt_restant,
                    'photo_url', lfc.photo_url
                ),
                'details', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_detail', ldv.id_detail,
                                'id_facture', ldv.id_facture,
                                'date_facture', ldv.date_facture,
                                'nom_produit', ldv.nom_produit,
                                'cout_revient', ldv.cout_revient,
                                'quantite', ldv.quantite,
                                'prix', ldv.prix,
                                'remise_pct', ldv.remise_pct,       -- [PHASE1B]
                                'prix_origine', ldv.prix_origine,   -- [PHASE1B]
                                'marge', ldv.marge,
                                'id_produit', ldv.id_produit,
                                'nom_categorie', ldv.nom_categorie,
                                'description', ldv.description,
                                'sous_total', (ldv.quantite * ldv.prix)
                            )
                        )
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    '[]'::json
                ),
                'resume_facture', json_build_object(
                    'nombre_articles', (
                        SELECT COUNT(*)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    'quantite_totale', (
                        SELECT COALESCE(SUM(ldv.quantite), 0)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    'cout_total_revient', (
                        SELECT COALESCE(SUM(ldv.cout_revient * ldv.quantite), 0)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    ),
                    'marge_totale', (
                        SELECT COALESCE(SUM(ldv.marge), 0)
                        FROM public.list_detailventes ldv
                        WHERE ldv.id_facture = lfc.id_facture
                    )
                )
            )
            ORDER BY lfc.date_facture DESC, lfc.id_facture DESC
        ),
        '[]'::json
    ) INTO v_all_factures_json
    FROM public.list_factures_com lfc
    WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure;

    -- Construire le résultat final avec informations client et ses factures
    SELECT json_build_object(
        'client', json_build_object(
            'id_client', v_client_record.id_client,
            'nom_client', v_client_record.nom_client,
            'tel_client', v_client_record.tel_client,
            'adresse', v_client_record.adresse,
            'date_creation', v_client_record.date_creation,
            'date_modification', v_client_record.date_modification
        ),
        'factures', v_all_factures_json,
        'statistiques_client', json_build_object(
            'nombre_factures', (
                SELECT COUNT(*)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'montant_total_factures', (
                SELECT COALESCE(SUM(lfc.montant), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'montant_paye', (
                SELECT COALESCE(SUM(lfc.montant - lfc.mt_restant), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'montant_impaye', (
                SELECT COALESCE(SUM(lfc.mt_restant), 0)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'nombre_factures_payees', (
                SELECT COUNT(*)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure AND lfc.id_etat = 2
            ),
            'nombre_factures_impayees', (
                SELECT COUNT(*)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure AND lfc.id_etat = 1
            ),
            'pourcentage_paiement', (
                SELECT CASE
                    WHEN SUM(lfc.montant) > 0
                    THEN ROUND((SUM(lfc.montant - lfc.mt_restant) * 100.0 / SUM(lfc.montant)), 2)
                    ELSE 0
                END
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'date_premiere_facture', (
                SELECT MIN(lfc.date_facture)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'date_derniere_facture', (
                SELECT MAX(lfc.date_facture)
                FROM public.list_factures_com lfc
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'total_articles_achetes', (
                SELECT COALESCE(SUM(ldv.quantite), 0)
                FROM public.list_detailventes ldv
                INNER JOIN public.list_factures_com lfc ON ldv.id_facture = lfc.id_facture
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            ),
            'marge_totale_realisee', (
                SELECT COALESCE(SUM(ldv.marge), 0)
                FROM public.list_detailventes ldv
                INNER JOIN public.list_factures_com lfc ON ldv.id_facture = lfc.id_facture
                WHERE lfc.tel_client = v_tel_client AND lfc.id_structure = pid_structure
            )
        ),
        'timestamp_generation', NOW()
    ) INTO v_facture_json;

    RETURN v_facture_json;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur lors de la récupération des données client: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$function$;


-- ============================================================================
-- ETAPE 7/7 — get_list_clients (ajout des 2 clés dans 'details_articles' UNIQUEMENT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_list_clients(pid_structure integer, ptelephone_client character varying DEFAULT ''::character varying)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_clients_json json;
    v_stats_globales json;
    v_result_json json;
BEGIN
    -- Validation des paramètres d'entrée
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'L''ID structure doit être un entier positif valide'
        );
    END IF;

    -- Vérifier que la structure existe
    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La structure avec l''ID ' || pid_structure || ' n''existe pas'
        );
    END IF;

    -- Construire le JSON avec tous les clients et leurs données
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'client', json_build_object(
                    'id_client', cf.id_client,
                    'nom_client', cf.nom_client,
                    'tel_client', cf.tel_client,
                    'adresse', cf.adresse,
                    'date_creation', cf.date_creation,
                    'date_modification', cf.date_modification
                ),
                'statistiques_factures', json_build_object(
                    'nombre_factures', COALESCE(stats.nombre_factures, 0),
                    'montant_total_factures', COALESCE(stats.montant_total, 0),
                    'montant_paye', COALESCE(stats.montant_paye, 0),
                    'montant_impaye', COALESCE(stats.montant_impaye, 0),
                    'nombre_factures_payees', COALESCE(stats.nombre_payees, 0),
                    'nombre_factures_impayees', COALESCE(stats.nombre_impayees, 0),
                    'pourcentage_paiement', CASE
                        WHEN COALESCE(stats.montant_total, 0) > 0
                        THEN ROUND((COALESCE(stats.montant_paye, 0) * 100.0 / stats.montant_total), 2)
                        ELSE 0
                    END,
                    'date_premiere_facture', stats.date_premiere_facture,
                    'date_derniere_facture', stats.date_derniere_facture
                ),
                'factures', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_facture', lfc.id_facture,
                                'num_facture', lfc.num_facture,
                                'date_facture', lfc.date_facture,
                                'description', lfc.description,
                                'montant', lfc.montant,
                                'mt_remise', lfc.mt_remise,
                                'mt_acompte', lfc.mt_acompte,
                                'mt_restant', lfc.mt_restant,
                                'libelle_etat', lfc.libelle_etat,
                                'periode', lfc.periode,
                                'nombre_articles', COALESCE((
                                    SELECT COUNT(*)
                                    FROM list_detailventes ldv
                                    WHERE ldv.id_facture = lfc.id_facture
                                ), 0),
                                'details_articles', COALESCE((
                                    SELECT json_agg(
                                        json_build_object(
                                            'nom_produit', ldv.nom_produit,
                                            'quantite', ldv.quantite,
                                            'prix', ldv.prix,
                                            'remise_pct', ldv.remise_pct,       -- [PHASE1B]
                                            'prix_origine', ldv.prix_origine,   -- [PHASE1B]
                                            'sous_total', ldv.quantite * ldv.prix,
                                            'marge', ldv.marge,
                                            'nom_categorie', ldv.nom_categorie
                                        )
                                    )
                                    FROM list_detailventes ldv
                                    WHERE ldv.id_facture = lfc.id_facture
                                ), '[]'::json)
                            )
                            ORDER BY lfc.date_facture DESC
                        )
                        FROM list_factures_com lfc
                        WHERE lfc.tel_client = cf.tel_client
                          AND lfc.id_structure = pid_structure
                    ),
                    '[]'::json
                )
            )
            ORDER BY cf.nom_client
        ),
        '[]'::json
    ) INTO v_clients_json
    FROM public.client_facture cf
    LEFT JOIN (
        -- Sous-requête pour calculer les statistiques par client
        SELECT
            lfc.tel_client,
            COUNT(lfc.id_facture) as nombre_factures,
            SUM(lfc.montant) as montant_total,
            SUM(lfc.montant - lfc.mt_restant) as montant_paye,
            SUM(lfc.mt_restant) as montant_impaye,
            COUNT(CASE WHEN lfc.id_etat = 2 THEN 1 END) as nombre_payees,
            COUNT(CASE WHEN lfc.id_etat = 1 THEN 1 END) as nombre_impayees,
            MIN(lfc.date_facture) as date_premiere_facture,
            MAX(lfc.date_facture) as date_derniere_facture
        FROM list_factures_com lfc
        WHERE lfc.id_structure = pid_structure
        GROUP BY lfc.tel_client
    ) stats ON cf.tel_client = stats.tel_client
    WHERE cf.id_structure = pid_structure
    -- Filtrer par téléphone si le paramètre est fourni
    AND (ptelephone_client = '' OR cf.tel_client = ptelephone_client);

    -- Calculer les statistiques globales (seulement si pas de filtre téléphone)
    IF ptelephone_client = '' THEN
        SELECT json_build_object(
            'nombre_total_clients', (
                SELECT COUNT(*)
                FROM client_facture cf
                WHERE cf.id_structure = pid_structure
            ),
            'clients_avec_factures', (
                SELECT COUNT(DISTINCT lfc.tel_client)
                FROM list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
            ),
            'clients_sans_factures', (
                SELECT COUNT(*)
                FROM client_facture cf
                WHERE cf.id_structure = pid_structure
                  AND NOT EXISTS (
                      SELECT 1 FROM list_factures_com lfc
                      WHERE lfc.tel_client = cf.tel_client
                        AND lfc.id_structure = pid_structure
                  )
            ),
            'clients_nouveaux_aujourd_hui', (
                SELECT COUNT(*)
                FROM client_facture cf
                WHERE cf.date_creation = CURRENT_DATE
                  AND cf.id_structure = pid_structure
            ),
            'clients_modifies_aujourd_hui', (
                SELECT COUNT(*)
                FROM client_facture cf
                WHERE cf.date_modification = CURRENT_DATE
                  AND cf.date_modification != cf.date_creation
                  AND cf.id_structure = pid_structure
            ),
            'total_factures_structure', (
                SELECT COUNT(*)
                FROM list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
            ),
            'montant_total_structure', (
                SELECT COALESCE(SUM(lfc.montant), 0)
                FROM list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
            ),
            'montant_paye_structure', (
                SELECT COALESCE(SUM(lfc.montant - lfc.mt_restant), 0)
                FROM list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
            ),
            'montant_impaye_structure', (
                SELECT COALESCE(SUM(lfc.mt_restant), 0)
                FROM list_factures_com lfc
                WHERE lfc.id_structure = pid_structure
            ),
            'factures_payees_structure', (
                SELECT COUNT(*)
                FROM list_factures_com lfc
                WHERE lfc.id_structure = pid_structure AND lfc.id_etat = 2
            ),
            'factures_impayees_structure', (
                SELECT COUNT(*)
                FROM list_factures_com lfc
                WHERE lfc.id_structure = pid_structure AND lfc.id_etat = 1
            ),
            'client_top_montant', (
                SELECT json_build_object(
                    'nom_client', cf.nom_client,
                    'tel_client', cf.tel_client,
                    'montant_total', stats.montant_total
                )
                FROM client_facture cf
                INNER JOIN (
                    SELECT
                        lfc.tel_client,
                        SUM(lfc.montant) as montant_total
                    FROM list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                    GROUP BY lfc.tel_client
                    ORDER BY montant_total DESC
                    LIMIT 1
                ) stats ON cf.tel_client = stats.tel_client
            ),
            'client_top_factures', (
                SELECT json_build_object(
                    'nom_client', cf.nom_client,
                    'tel_client', cf.tel_client,
                    'nombre_factures', stats.nombre_factures
                )
                FROM client_facture cf
                INNER JOIN (
                    SELECT
                        lfc.tel_client,
                        COUNT(lfc.id_facture) as nombre_factures
                    FROM list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                    GROUP BY lfc.tel_client
                    ORDER BY nombre_factures DESC
                    LIMIT 1
                ) stats ON cf.tel_client = stats.tel_client
            )
        ) INTO v_stats_globales;
    ELSE
        -- Si filtre téléphone, pas de statistiques globales
        v_stats_globales := NULL;
    END IF;

    -- Construire le résultat final
    SELECT json_build_object(
        'success', true,
        'structure_id', pid_structure,
        'clients', v_clients_json,
        'statistiques_globales', v_stats_globales,
        'filtre_telephone', CASE WHEN ptelephone_client = '' THEN NULL ELSE ptelephone_client END,
        'timestamp_generation', NOW()
    ) INTO v_result_json;

    RETURN v_result_json;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur lors de la récupération des clients: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$function$;

COMMIT;
