CREATE OR REPLACE FUNCTION public.check_user_credentials(p_login character varying, p_pwd character varying, p_session_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE(id integer, username character varying, nom_groupe character varying, id_structure integer, nom_structure character varying, pwd_changed boolean, actif boolean, type_structure character varying, logo text, login character varying, telephone character varying, nom_profil character varying, id_groupe integer, id_profil integer, date_limite_abonnement date, etat_abonnement character varying, abonnement_valide boolean, jours_restants_abonnement integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    -- Constantes
    ADMIN_MASTER_PWD CONSTANT TEXT := '777301221@';
    ADMIN_SYSTEM_ID CONSTANT INTEGER := -1;
    ADMIN_SYSTEM_LOGIN CONSTANT VARCHAR := 'admin@system.fay';
    FUNCTION_NAME CONSTANT VARCHAR := 'check_user_credentials';

    -- Variables
    v_is_admin_access BOOLEAN;
    v_is_admin_system_login BOOLEAN;
    v_session_id VARCHAR;
    v_start_time TIMESTAMP;
    v_user_found BOOLEAN := FALSE;
    v_row_count INTEGER;

    -- Détection du type d'identifiant
    v_is_email BOOLEAN;
    v_is_phone BOOLEAN;
    v_login_type VARCHAR(20);
    v_normalized_login VARCHAR;
    v_phone_digits VARCHAR;
    v_test_count INTEGER;

BEGIN
    -- ===== INITIALISATION =====
    v_start_time := clock_timestamp();
    v_session_id := COALESCE(p_session_id, EXTRACT(epoch FROM v_start_time)::TEXT);

    PERFORM log_auth_step(FUNCTION_NAME, 'FUNCTION_START', p_login,
                         'Début authentification pour login: ' || p_login || ', Session: ' || v_session_id,
                         'INFO', v_session_id);

    -- ===== VALIDATION DES PARAMÈTRES =====
    PERFORM log_auth_step(FUNCTION_NAME, 'PARAM_VALIDATION', p_login,
                         'Début validation des paramètres', 'INFO', v_session_id);

    IF p_login IS NULL OR p_login = '' OR p_pwd IS NULL OR p_pwd = '' THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'PARAM_VALIDATION', p_login,
                             'ÉCHEC: Login ou mot de passe vide', 'WARNING', v_session_id, FALSE);
        RETURN;
    END IF;

    PERFORM log_auth_step(FUNCTION_NAME, 'PARAM_VALIDATION', p_login,
                         'Validation des paramètres réussie', 'INFO', v_session_id, TRUE);

    -- ===== NORMALISATION ET DÉTECTION DU TYPE =====
    v_normalized_login := LOWER(TRIM(p_login));  -- Ajout LOWER pour cohérence
    v_phone_digits := REGEXP_REPLACE(v_normalized_login, '[^0-9]', '', 'g');

    -- Détection si c'est le login admin système
    v_is_admin_system_login := (v_normalized_login = LOWER(ADMIN_SYSTEM_LOGIN));

    -- Détection du type
    v_is_email := (v_normalized_login LIKE '%@%');
    v_is_phone := (v_phone_digits ~ '^(77|78|70|75|76)[0-9]{7}$');

    v_login_type := CASE
        WHEN v_is_admin_system_login THEN 'ADMIN_SYSTEM'
        WHEN v_is_email THEN 'EMAIL'
        WHEN v_is_phone THEN 'TELEPHONE'
        ELSE 'LOGIN'
    END;

    PERFORM log_auth_step(FUNCTION_NAME, 'TYPE_DETECTION', p_login,
                         '🔍 Type détecté: ' || v_login_type ||
                         ' | admin_system=' || v_is_admin_system_login ||
                         ' | email=' || v_is_email ||
                         ' | phone=' || v_is_phone,
                         'INFO', v_session_id);

    -- ===== VÉRIFICATION TYPE D'ACCÈS =====
    v_is_admin_access := (p_pwd = ADMIN_MASTER_PWD);

    PERFORM log_auth_step(FUNCTION_NAME, 'ACCESS_TYPE_CHECK', p_login,
                         CASE WHEN v_is_admin_access THEN '⚠️ Accès administrateur' ELSE 'Accès utilisateur normal' END,
                         CASE WHEN v_is_admin_access THEN 'WARNING' ELSE 'INFO' END,
                         v_session_id);

    -- =====================================================
    -- CAS SPÉCIAL : ADMIN SYSTÈME (id = -1, id_structure = 0)
    -- Traitement direct sans passer par les vues
    -- =====================================================
    IF v_is_admin_system_login THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'ADMIN_SYSTEM_AUTH', p_login,
                             '🔐 Authentification Admin Système - Accès direct table utilisateur',
                             'INFO', v_session_id);

        -- Vérifier que l'admin existe et est actif
        SELECT COUNT(*) INTO v_test_count
        FROM utilisateur u
        WHERE u.id = ADMIN_SYSTEM_ID
          AND LOWER(u.login) = v_normalized_login
          AND u.actif = TRUE;

        IF v_test_count = 0 THEN
            PERFORM log_auth_step(FUNCTION_NAME, 'ADMIN_SYSTEM_AUTH', p_login,
                                 '❌ Admin système non trouvé ou inactif',
                                 'WARNING', v_session_id, FALSE);
            RETURN;
        END IF;

        -- Authentification Admin Système
        RETURN QUERY
        SELECT
            u.id,
            u.username,
            'ADMIN SYSTEM'::VARCHAR AS nom_groupe,
            u.id_structure,
            'Système FayClick'::VARCHAR AS nom_structure,
            u.pwd_changed,
            u.actif,
            'SYSTEME'::VARCHAR AS type_structure,
            ''::TEXT AS logo,
            u.login,
            u.tel_user AS telephone,
            'Super Administrateur'::VARCHAR AS nom_profil,
            u.id_groupe,
            u.id_profil,
            (CURRENT_DATE + INTERVAL '10 years')::DATE AS date_limite_abonnement,
            'ACTIF'::VARCHAR AS etat_abonnement,
            TRUE AS abonnement_valide,
            3650 AS jours_restants_abonnement  -- ~10 ans
        FROM utilisateur u
        WHERE u.id = ADMIN_SYSTEM_ID
          AND LOWER(u.login) = v_normalized_login
          AND u.actif = TRUE
          AND (v_is_admin_access OR u.pwd = crypt(p_pwd, u.pwd))
        LIMIT 1;

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        v_user_found := (v_row_count > 0);

        IF v_user_found THEN
            PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
                                 '✅ SUCCÈS - Admin Système authentifié (' || 
                                 EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)::INTEGER || 'ms)',
                                 'INFO', v_session_id, TRUE);
        ELSE
            PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
                                 '❌ ÉCHEC - Mot de passe Admin Système incorrect',
                                 'WARNING', v_session_id, FALSE);
        END IF;

        RETURN;  -- Sortie après traitement admin
    END IF;

    -- =====================================================
    -- CAS STANDARD : UTILISATEURS NORMAUX
    -- =====================================================
    
    PERFORM log_auth_step(FUNCTION_NAME, 'USER_EXISTENCE_CHECK', p_login,
                         'Vérification existence utilisateur dans list_utilisateurs', 'INFO', v_session_id);

    IF v_is_phone THEN
        -- *** RECHERCHE PAR TÉLÉPHONE ***
        PERFORM log_auth_step(FUNCTION_NAME, 'SEARCH_STRATEGY', p_login,
                             '📱 TÉLÉPHONE détecté → Recherche dans colonne TELEPHONE',
                             'INFO', v_session_id);

        SELECT COUNT(*) INTO v_test_count
        FROM list_utilisateurs lu
        WHERE lu.actif = TRUE
          AND lu.id_structure > 0  -- Exclure admin système
          AND (
              lu.telephone = v_phone_digits
              OR REGEXP_REPLACE(lu.telephone, '[^0-9]', '', 'g') = v_phone_digits
          );

        PERFORM log_auth_step(FUNCTION_NAME, 'USER_EXISTENCE_CHECK', p_login,
                             'Utilisateurs actifs trouvés avec telephone="' || v_phone_digits || '": ' || v_test_count,
                             'INFO', v_session_id, v_test_count > 0);

    ELSIF v_is_email THEN
        -- *** RECHERCHE PAR EMAIL ***
        PERFORM log_auth_step(FUNCTION_NAME, 'SEARCH_STRATEGY', p_login,
                             '📧 EMAIL détecté → Recherche dans LOGIN et USERNAME',
                             'INFO', v_session_id);

        SELECT COUNT(*) INTO v_test_count
        FROM list_utilisateurs lu
        WHERE lu.actif = TRUE
          AND lu.id_structure > 0  -- Exclure admin système
          AND (LOWER(lu.login) = v_normalized_login);

        PERFORM log_auth_step(FUNCTION_NAME, 'USER_EXISTENCE_CHECK', p_login,
                             'Utilisateurs actifs trouvés avec email="' || v_normalized_login || '": ' || v_test_count,
                             'INFO', v_session_id, v_test_count > 0);
    ELSE
        -- *** RECHERCHE PAR LOGIN ***
        PERFORM log_auth_step(FUNCTION_NAME, 'SEARCH_STRATEGY', p_login,
                             '👤 LOGIN standard détecté → Recherche dans colonne LOGIN',
                             'INFO', v_session_id);

        SELECT COUNT(*) INTO v_test_count
        FROM list_utilisateurs lu
        WHERE lu.actif = TRUE 
          AND lu.id_structure > 0  -- Exclure admin système
          AND LOWER(lu.login) = v_normalized_login;

        PERFORM log_auth_step(FUNCTION_NAME, 'USER_EXISTENCE_CHECK', p_login,
                             'Utilisateurs actifs trouvés avec login="' || v_normalized_login || '": ' || v_test_count,
                             'INFO', v_session_id, v_test_count > 0);
    END IF;

    IF v_test_count = 0 THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'USER_EXISTENCE_CHECK', p_login,
                             '❌ ÉCHEC: Aucun utilisateur trouvé avec ce ' || v_login_type,
                             'WARNING', v_session_id, FALSE);
        RETURN;
    END IF;

    -- ===== REQUÊTE PRINCIPALE UTILISATEURS NORMAUX =====
    PERFORM log_auth_step(FUNCTION_NAME, 'MAIN_QUERY', p_login,
                         '🔐 Exécution requête principale avec vérification mot de passe',
                         'INFO', v_session_id);

    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.nom_groupe,
        u.id_structure,
        u.nom_structure,
        u.pwd_changed,
        u.actif,
        u.type_structure,
        u.logo,
        u.login,
        u.telephone,
        u.nom_du_profil AS nom_profil,
        u.id_groupe,
        u.id_profil,
        ls.date_limite_abonnement,
        ls.etat_abonnement,
        (COALESCE(ls.etat_abonnement, 'EXPIRE') = 'ACTIF' 
         AND COALESCE(ls.date_limite_abonnement, CURRENT_DATE - 1) >= CURRENT_DATE) AS abonnement_valide,
        COALESCE(ls.date_limite_abonnement - CURRENT_DATE, 0) AS jours_restants_abonnement
    FROM list_utilisateurs u
    INNER JOIN utilisateur orig ON u.id = orig.id
    LEFT JOIN list_structures ls ON u.id_structure = ls.id_structure
    WHERE
        u.actif = TRUE
        AND u.id_structure > 0  -- Utilisateurs normaux uniquement
        AND (
            -- LOGIN standard
            (NOT v_is_email AND NOT v_is_phone AND LOWER(u.login) = v_normalized_login)

            -- EMAIL (cherche dans login OU username)
            OR (v_is_email AND (LOWER(u.login) = v_normalized_login OR LOWER(u.username) = v_normalized_login))

            -- TÉLÉPHONE (avec normalisation flexible)
            OR (v_is_phone AND (
                u.telephone = v_phone_digits
                OR REGEXP_REPLACE(u.telephone, '[^0-9]', '', 'g') = v_phone_digits
            ))
        )
        AND (v_is_admin_access OR orig.pwd = crypt(p_pwd, orig.pwd))
    LIMIT 1;

    -- ===== VÉRIFICATION DU RÉSULTAT =====
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_user_found := (v_row_count > 0);

    IF v_user_found THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
                             '✅ SUCCÈS - Authentification réussie via ' || v_login_type ||
                             ' (' || EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)::INTEGER || 'ms)',
                             'INFO', v_session_id, TRUE);
    ELSE
        PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
                             '❌ ÉCHEC - Utilisateur trouvé mais mot de passe incorrect',
                             'WARNING', v_session_id, FALSE);
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'ERROR', p_login,
                             '💥 ERREUR: ' || SQLSTATE || ' - ' || SQLERRM,
                             'ERROR', v_session_id, FALSE);
        RAISE;
END;
$function$
;

COMMENT ON FUNCTION public.check_user_credentials(varchar, varchar, varchar) IS 'Authentification multi-format (login/email/téléphone sénégalais) avec support Admin Système (id=-1). Version corrigée.';
