CREATE OR REPLACE FUNCTION public.get_une_structure(pid_structure integer)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSON;
    v_structure RECORD;
    v_abonnement RECORD;
    v_utilisateur RECORD;
    v_abonnements RECORD;
BEGIN
    SELECT
        s.id_structure,
        s.code_structure,
        s.nom_structure,
        s.adresse,
        s.mobile_om,
        s.mobile_wave,
        s.numautorisatioon,
        s.nummarchand,
        s.email,
        s.id_localite,
        s.actif,
        s.logo,
        s.createdat,
        s.updatedat,
        t.id_type,
        t.nom_type AS type_structure,
        s.num_unik_reversement,
        s.cachet,
        ps.credit_autorise, ps.limite_credit, ps.acompte_autorise, ps.prix_engros, ps.nombre_produit_max, ps.nombre_caisse_max,
        ps.compte_prive,
        ps.mensualite, ps.taux_wallet, ps.info_facture, ps.config_facture,
        ps.inclure_tva, ps.taux_tva, ps.wallet_paiement, ps.live_autorise
    INTO v_structure
    FROM public.structures s
    JOIN public.type_structure t ON s.id_type = t.id_type
    LEFT JOIN public.param_structure ps ON ps.id_structure = s.id_structure
    WHERE s.id_structure = pid_structure;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Structure non trouvee',
            'id_structure', pid_structure
        );
    END IF;

    SELECT
        a.id_abonnement,
        a.date_debut,
        a.date_fin,
        a.montant,
        a.ref_abonnement,
        a.type_abonnement,
        a.methode,
        a.statut,
        CASE
            WHEN a.statut = 'ACTIF' AND a.date_fin >= CURRENT_DATE THEN 'ACTIF'
            WHEN a.statut = 'ACTIF' AND a.date_fin < CURRENT_DATE THEN 'EXPIRE'
            ELSE a.statut
        END AS etat_reel
    INTO v_abonnement
    FROM public.abonnements a
    WHERE a.id_structure = pid_structure
    ORDER BY
        CASE WHEN a.statut = 'ACTIF' THEN 0 ELSE 1 END,
        a.date_fin DESC,
        a.id_abonnement DESC
    LIMIT 1;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id_utilisateur', lu.id,
            'nom_utilisateur', lu.username,
            'login', lu.login,
            'pwd', '***MASKED***',
            'pwd_changed', lu.pwd_changed,
            'telephone', lu.telephone,
            'id_profil', lu.id_profil,
            'nom_du_profil', lu.nom_du_profil
        ) ORDER BY lu.id
    ), '[]'::json)
    INTO v_utilisateur
    FROM list_utilisateurs lu
    WHERE lu.id_structure = pid_structure;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id_abonnement', lu.id_abonnement,
            'date_debut', lu.date_debut,
            'date_fin', lu.date_fin,
            'montant', lu.montant,
            'numrecu', lu.numrecu,
            'methode', lu.methode,
            'status', lu.statut,
            'tms_create', lu.tms_create
        ) ORDER BY lu.id_abonnement desc
    ), '[]'::json)
    INTO v_abonnements
    FROM abonnements lu
    WHERE lu.id_structure = pid_structure;

    v_result := json_build_object(
        'success', true,
        'data', json_build_object(
            'id_structure',          v_structure.id_structure,
            'code_structure',        v_structure.code_structure,
            'nom_structure',         v_structure.nom_structure,
            'adresse',               v_structure.adresse,
            'mobile_om',             v_structure.mobile_om,
            'mobile_wave',           v_structure.mobile_wave,
            'numautorisatioon',      v_structure.numautorisatioon,
            'nummarchand',           v_structure.nummarchand,
            'email',                 v_structure.email,
            'id_localite',           v_structure.id_localite,
            'actif',                 v_structure.actif,
            'logo',                  v_structure.logo,
            'cachet',                v_structure.cachet,
            'createdat',             v_structure.createdat,
            'updatedat',             v_structure.updatedat,
            'id_type',               v_structure.id_type,
            'type_structure',        v_structure.type_structure,
            'utilisateurs',          v_utilisateur,
            'abonnements',           v_abonnements,
            'num_unik_reversement',  v_structure.num_unik_reversement,
            'credit_autorise',       v_structure.credit_autorise,
            'limite_credit',         v_structure.limite_credit,
            'acompte_autorise',      v_structure.acompte_autorise,
            'prix_engros',           v_structure.prix_engros,
            'nombre_produit_max',    v_structure.nombre_produit_max,
            'nombre_caisse_max',     v_structure.nombre_caisse_max,
            'compte_prive',          v_structure.compte_prive,
            'mensualite',            v_structure.mensualite,
            'taux_wallet',           v_structure.taux_wallet,
            'info_facture',          json_build_object(
                'adresse_complete',  v_structure.info_facture->>'adresse_complete',
                'tel_contact',       v_structure.info_facture->>'tel_contact',
                'site_web',          v_structure.info_facture->>'site_web',
                'email',             v_structure.info_facture->>'email',
                'compte_bancaire',   v_structure.info_facture->>'compte_bancaire',
                'ninea_rc',          v_structure.info_facture->>'ninea_rc'
            ),
            'config_facture',        v_structure.config_facture,
            'inclure_tva',           COALESCE(v_structure.inclure_tva, false),
            'taux_tva',              COALESCE(v_structure.taux_tva, 18.00),
            'wallet_paiement',       COALESCE(v_structure.wallet_paiement, true),
			'live_autorise',       v_structure.live_autorise,
            'etat_abonnement', CASE
                WHEN v_abonnement.id_abonnement IS NULL THEN
                    json_build_object(
                        'statut', 'AUCUN',
                        'message', 'Aucun abonnement enregistre'
                    )
                ELSE
                    json_build_object(
                        'id_abonnement',   v_abonnement.id_abonnement,
                        'statut',          v_abonnement.etat_reel,
                        'type_abonnement', v_abonnement.type_abonnement,
                        'date_debut',      v_abonnement.date_debut,
                        'date_fin',        v_abonnement.date_fin,
                        'montant',         v_abonnement.montant,
                        'methode',         v_abonnement.methode,
                        'jours_restants',  GREATEST(0, v_abonnement.date_fin - CURRENT_DATE)
                    )
            END
        )
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Erreur lors de la recuperation de la structure',
            'error_detail', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$function$
