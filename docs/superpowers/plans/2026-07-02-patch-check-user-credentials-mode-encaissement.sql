-- ============================================================================
-- PATCH check_user_credentials — scope ÉLARGI (6 champs REPRESENTANT)
-- STATUT : ✅ APPLIQUÉ en prod (fayclick_db) le 2026-07-02 par l'utilisateur
--          (exécution manuelle). Signature d'appel inchangée, retour étendu de 6 colonnes.
--
-- Base cible : fayclick_db
-- Objet      : public.check_user_credentials(varchar, varchar, varchar)
-- Nature     : DROP + CREATE (ajout de colonnes à RETURNS TABLE — impossible via
--              CREATE OR REPLACE). Dans BEGIN/COMMIT → aucune fenêtre login cassé.
-- Signature d'appel : INCHANGÉE (p_login, p_pwd, p_session_id)
-- Retour             : ÉTENDU de 6 colonnes en fin de liste :
--   mode_encaissement, id_localite, nom_rep, prenom_rep, email_rep, actif_reseau
--
-- Colonnes vérifiées présentes sur `utilisateur` (aucune à créer) :
--   mode_encaissement varchar(20) déf 'WALLET_STRUCTURE' | id_localite int |
--   nom_rep varchar(100) | prenom_rep varchar(100) | email_rep varchar(255) |
--   actif_reseau bool déf true
-- Backup fonction actuelle : C:\tmp\pgquery\backup_check_user_credentials_avant_patch_2026-07-02.sql
-- Exécuter par : admin_icelab (propriétaire). ACL = défauts, rien à restaurer.
--
-- Validation post-application (à faire) : 1 login de chaque type —
--   rep LIBRE   : 711051330 (tech24_rep, 183)  → mode_encaissement = LIBRE
--   rep WALLET  : 721547885 (awadioptest, 183)  → mode_encaissement = WALLET_STRUCTURE
--   admin standard (ex. 218 ADMINISTRATEUR), *@partner.fay, admin@system.fay
-- ============================================================================
BEGIN;

DROP FUNCTION public.check_user_credentials(character varying, character varying, character varying);

CREATE FUNCTION public.check_user_credentials(
    p_login character varying,
    p_pwd character varying,
    p_session_id character varying DEFAULT NULL::character varying
)
 RETURNS TABLE(
    id integer, username character varying, nom_groupe character varying,
    id_structure integer, nom_structure character varying, pwd_changed boolean,
    actif boolean, type_structure character varying, logo text,
    login character varying, telephone character varying, nom_profil character varying,
    id_groupe integer, id_profil integer, date_limite_abonnement date,
    etat_abonnement character varying, abonnement_valide boolean,
    jours_restants_abonnement integer,
    mode_encaissement character varying,   -- ★ AJOUT
    id_localite integer,                   -- ★ AJOUT
    nom_rep character varying,             -- ★ AJOUT
    prenom_rep character varying,          -- ★ AJOUT
    email_rep character varying,           -- ★ AJOUT
    actif_reseau boolean                   -- ★ AJOUT
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    ADMIN_MASTER_PWD CONSTANT TEXT := '777301221@';
    ADMIN_SYSTEM_ID CONSTANT INTEGER := -1;
    ADMIN_SYSTEM_LOGIN CONSTANT VARCHAR := 'admin@system.fay';
    FUNCTION_NAME CONSTANT VARCHAR := 'check_user_credentials';
    PARTNER_GROUPE_ID CONSTANT INTEGER := 4;
    PARTNER_EMAIL_SUFFIX CONSTANT VARCHAR := '@partner.fay';

    v_is_admin_access BOOLEAN;
    v_is_admin_system_login BOOLEAN;
    v_is_partner_email BOOLEAN;
    v_session_id VARCHAR;
    v_start_time TIMESTAMP;
    v_row_count INTEGER;
    v_is_email BOOLEAN;
    v_is_phone BOOLEAN;
    v_login_type VARCHAR(20);
    v_normalized_login VARCHAR;
    v_phone_digits VARCHAR;
BEGIN
    v_start_time := clock_timestamp();
    v_session_id := COALESCE(p_session_id, EXTRACT(epoch FROM v_start_time)::TEXT);

    PERFORM log_auth_step(FUNCTION_NAME, 'FUNCTION_START', p_login,
        'Tentative login: ' || p_login || ' | Session: ' || v_session_id,
        'INFO', v_session_id);

    IF p_login IS NULL OR p_login = '' OR p_pwd IS NULL OR p_pwd = '' THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
            'ECHEC: paramètres login/pwd vides',
            'WARNING', v_session_id, FALSE);
        RETURN;
    END IF;

    v_normalized_login := LOWER(TRIM(p_login));
    v_phone_digits := REGEXP_REPLACE(v_normalized_login, '[^0-9]', '', 'g');
    v_is_admin_system_login := (v_normalized_login = LOWER(ADMIN_SYSTEM_LOGIN));
    v_is_partner_email := (v_normalized_login LIKE '%' || PARTNER_EMAIL_SUFFIX);
    v_is_email := (v_normalized_login LIKE '%@%');
    v_is_phone := (v_phone_digits ~ '^(77|78|70|75|76)[0-9]{7}$');
    v_is_admin_access := (p_pwd = ADMIN_MASTER_PWD);

    v_login_type := CASE
        WHEN v_is_admin_system_login THEN 'ADMIN_SYSTEM'
        WHEN v_is_partner_email THEN 'PARTENAIRE'
        WHEN v_is_email THEN 'EMAIL'
        WHEN v_is_phone THEN 'TELEPHONE'
        ELSE 'LOGIN'
    END;

    -- ===== ADMIN SYSTEME =====
    IF v_is_admin_system_login THEN
        RETURN QUERY
        SELECT u.id, u.username, 'ADMIN SYSTEM'::VARCHAR AS nom_groupe,
            u.id_structure, 'Système FayClick'::VARCHAR AS nom_structure,
            u.pwd_changed, u.actif, 'SYSTEME'::VARCHAR AS type_structure,
            ''::TEXT AS logo, u.login, u.tel_user AS telephone,
            'Super Administrateur'::VARCHAR AS nom_profil,
            u.id_groupe, u.id_profil,
            (CURRENT_DATE + INTERVAL '10 years')::DATE AS date_limite_abonnement,
            'ACTIF'::VARCHAR AS etat_abonnement,
            TRUE AS abonnement_valide,
            3650 AS jours_restants_abonnement,
            u.mode_encaissement,   -- ★ AJOUT
            u.id_localite,         -- ★ AJOUT
            u.nom_rep,             -- ★ AJOUT
            u.prenom_rep,          -- ★ AJOUT
            u.email_rep,           -- ★ AJOUT
            u.actif_reseau         -- ★ AJOUT
        FROM utilisateur u
        WHERE u.id = ADMIN_SYSTEM_ID
          AND LOWER(u.login) = v_normalized_login
          AND u.actif = TRUE
          AND (v_is_admin_access OR u.pwd = crypt(p_pwd, u.pwd))
        LIMIT 1;

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
            CASE WHEN v_row_count > 0 THEN
                'SUCCES Admin Systeme (' || EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)::INTEGER || 'ms)'
            ELSE
                'ECHEC Admin Systeme (mauvais mdp ou inactif)'
            END,
            CASE WHEN v_row_count > 0 THEN 'INFO' ELSE 'WARNING' END,
            v_session_id, v_row_count > 0);
        RETURN;
    END IF;

    -- ===== PARTENAIRE =====
    IF v_is_partner_email THEN
        RETURN QUERY
        SELECT u.id, u.username, 'PARTENAIRE'::VARCHAR AS nom_groupe,
            u.id_structure,
            COALESCE(p.nom_partenaire, u.username)::VARCHAR AS nom_structure,
            u.pwd_changed, u.actif, 'PARTENAIRE'::VARCHAR AS type_structure,
            ''::TEXT AS logo, u.login, u.tel_user AS telephone,
            'Partenaire'::VARCHAR AS nom_profil,
            u.id_groupe, u.id_profil,
            p.valide_jusqua AS date_limite_abonnement,
            CASE
                WHEN p.actif = FALSE THEN 'INACTIF'
                WHEN p.valide_jusqua < CURRENT_DATE THEN 'EXPIRE'
                ELSE 'ACTIF'
            END::VARCHAR AS etat_abonnement,
            (p.actif = TRUE AND p.valide_jusqua >= CURRENT_DATE) AS abonnement_valide,
            GREATEST(0, p.valide_jusqua - CURRENT_DATE)::INTEGER AS jours_restants_abonnement,
            u.mode_encaissement,   -- ★ AJOUT
            u.id_localite,         -- ★ AJOUT
            u.nom_rep,             -- ★ AJOUT
            u.prenom_rep,          -- ★ AJOUT
            u.email_rep,           -- ★ AJOUT
            u.actif_reseau         -- ★ AJOUT
        FROM utilisateur u
        LEFT JOIN partenaires p ON p.id_utilisateur = u.id
        WHERE u.id_structure = 0
          AND u.id_groupe = PARTNER_GROUPE_ID
          AND LOWER(u.login) = v_normalized_login
          AND u.actif = TRUE
          AND (v_is_admin_access OR u.pwd = crypt(p_pwd, u.pwd))
        LIMIT 1;

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
            CASE WHEN v_row_count > 0 THEN
                'SUCCES Partenaire (' || EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)::INTEGER || 'ms)'
            ELSE
                'ECHEC Partenaire (mauvais mdp ou inactif)'
            END,
            CASE WHEN v_row_count > 0 THEN 'INFO' ELSE 'WARNING' END,
            v_session_id, v_row_count > 0);
        RETURN;
    END IF;

    -- ===== UTILISATEUR STANDARD (dont REPRESENTANT) =====
    RETURN QUERY
    SELECT
        u.id, u.username, u.nom_groupe, u.id_structure, u.nom_structure,
        u.pwd_changed, u.actif, u.type_structure, u.logo,
        u.login, u.telephone, u.nom_du_profil AS nom_profil,
        u.id_groupe, u.id_profil,
        ls.date_limite_abonnement, ls.etat_abonnement,
        (COALESCE(ls.etat_abonnement, 'EXPIRE') = 'ACTIF'
         AND COALESCE(ls.date_limite_abonnement, CURRENT_DATE - 1) >= CURRENT_DATE) AS abonnement_valide,
        COALESCE(ls.date_limite_abonnement - CURRENT_DATE, 0) AS jours_restants_abonnement,
        orig.mode_encaissement,   -- ★ AJOUT
        orig.id_localite,         -- ★ AJOUT
        orig.nom_rep,             -- ★ AJOUT
        orig.prenom_rep,          -- ★ AJOUT
        orig.email_rep,           -- ★ AJOUT
        orig.actif_reseau         -- ★ AJOUT
    FROM list_utilisateurs u
    INNER JOIN utilisateur orig ON u.id = orig.id
    LEFT JOIN list_structures ls ON u.id_structure = ls.id_structure
    WHERE u.actif = TRUE
      AND u.id_structure > 0
      AND (
          (NOT v_is_email AND NOT v_is_phone AND LOWER(u.login) = v_normalized_login)
          OR (v_is_email AND (LOWER(u.login) = v_normalized_login OR LOWER(u.username) = v_normalized_login))
          OR (v_is_phone AND (
              u.telephone = v_phone_digits
              OR REGEXP_REPLACE(u.telephone, '[^0-9]', '', 'g') = v_phone_digits
          ))
      )
      AND (v_is_admin_access OR orig.pwd = crypt(p_pwd, orig.pwd))
    LIMIT 1;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
        CASE WHEN v_row_count > 0 THEN
            'SUCCES via ' || v_login_type || ' (' || EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)::INTEGER || 'ms)'
        ELSE
            'ECHEC via ' || v_login_type || ' (utilisateur non trouve ou mdp incorrect)'
        END,
        CASE WHEN v_row_count > 0 THEN 'INFO' ELSE 'WARNING' END,
        v_session_id, v_row_count > 0);

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'ERROR', p_login,
            'ERREUR: ' || SQLSTATE || ' - ' || SQLERRM,
            'ERROR', v_session_id, FALSE);
        RAISE;
END;
$function$;

COMMIT;
