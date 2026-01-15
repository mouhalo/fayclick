# Modification Fonction Connexion pour Partenaires

## Problème Actuel

La fonction `check_user_credentials` exclut les partenaires car elle utilise :
```sql
AND u.id_structure > 0  -- Exclut tous les utilisateurs avec id_structure = 0
```

Les partenaires ont :
- `id_structure = 0` (comme admin système)
- `id_groupe = 4` (différent de admin qui a -1)
- Email en `@partner.fay`

## Solution : Ajouter un cas spécial PARTENAIRES

### Modifications à apporter à `check_user_credentials`

#### 1. Ajouter les constantes partenaire (après ligne 12)

```sql
-- Après ADMIN_SYSTEM_LOGIN CONSTANT VARCHAR := 'admin@system.fay';
PARTNER_GROUPE_ID CONSTANT INTEGER := 4;
PARTNER_EMAIL_SUFFIX CONSTANT VARCHAR := '@partner.fay';
```

#### 2. Ajouter la détection partenaire (après ligne 61)

```sql
-- Après v_is_phone := ...
v_is_partner_email BOOLEAN;

-- Dans le bloc de détection (après ligne 61)
v_is_partner_email := (v_normalized_login LIKE '%' || PARTNER_EMAIL_SUFFIX);
```

#### 3. Ajouter le bloc PARTENAIRES (après le bloc ADMIN SYSTEM, ligne 151)

Insérer ce bloc **AVANT** le commentaire `-- CAS STANDARD : UTILISATEURS NORMAUX` :

```sql
-- =====================================================
-- CAS SPÉCIAL : PARTENAIRES (id_structure = 0, id_groupe = 4)
-- Emails en @partner.fay
-- =====================================================
IF v_is_partner_email THEN
    PERFORM log_auth_step(FUNCTION_NAME, 'PARTNER_AUTH', p_login,
                         '🤝 Authentification Partenaire - Accès direct table utilisateur',
                         'INFO', v_session_id);

    -- Vérifier que le partenaire existe et est actif
    SELECT COUNT(*) INTO v_test_count
    FROM utilisateur u
    WHERE u.id_structure = 0
      AND u.id_groupe = PARTNER_GROUPE_ID
      AND LOWER(u.login) = v_normalized_login
      AND u.actif = TRUE;

    IF v_test_count = 0 THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'PARTNER_AUTH', p_login,
                             '❌ Partenaire non trouvé ou inactif',
                             'WARNING', v_session_id, FALSE);
        RETURN;
    END IF;

    -- Authentification Partenaire avec vérification du partenariat actif
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        'PARTENAIRE'::VARCHAR AS nom_groupe,
        u.id_structure,
        COALESCE(p.nom_partenaire, u.username)::VARCHAR AS nom_structure,
        u.pwd_changed,
        u.actif,
        'PARTENAIRE'::VARCHAR AS type_structure,
        ''::TEXT AS logo,
        u.login,
        u.tel_user AS telephone,
        'Partenaire'::VARCHAR AS nom_profil,
        u.id_groupe,
        u.id_profil,
        p.valide_jusqua AS date_limite_abonnement,
        CASE
            WHEN p.actif = FALSE THEN 'INACTIF'
            WHEN p.valide_jusqua < CURRENT_DATE THEN 'EXPIRE'
            ELSE 'ACTIF'
        END::VARCHAR AS etat_abonnement,
        (p.actif = TRUE AND p.valide_jusqua >= CURRENT_DATE) AS abonnement_valide,
        GREATEST(0, p.valide_jusqua - CURRENT_DATE)::INTEGER AS jours_restants_abonnement
    FROM utilisateur u
    LEFT JOIN partenaires p ON p.id_utilisateur = u.id
    WHERE u.id_structure = 0
      AND u.id_groupe = PARTNER_GROUPE_ID
      AND LOWER(u.login) = v_normalized_login
      AND u.actif = TRUE
      AND (v_is_admin_access OR u.pwd = crypt(p_pwd, u.pwd))
    LIMIT 1;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_user_found := (v_row_count > 0);

    IF v_user_found THEN
        PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
                             '✅ SUCCÈS - Partenaire authentifié (' ||
                             EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)::INTEGER || 'ms)',
                             'INFO', v_session_id, TRUE);
    ELSE
        PERFORM log_auth_step(FUNCTION_NAME, 'AUTH_RESULT', p_login,
                             '❌ ÉCHEC - Mot de passe Partenaire incorrect',
                             'WARNING', v_session_id, FALSE);
    END IF;

    RETURN;  -- Sortie après traitement partenaire
END IF;
```

---

## Alternative : Nouvelle Fonction Dédiée

Si vous préférez ne pas modifier la fonction existante, voici une fonction dédiée pour les partenaires :

```sql
CREATE OR REPLACE FUNCTION public.check_partenaire_credentials(
    p_login VARCHAR,
    p_pwd VARCHAR
)
RETURNS TABLE(
    id INTEGER,
    username VARCHAR,
    nom_groupe VARCHAR,
    id_structure INTEGER,
    nom_structure VARCHAR,
    pwd_changed BOOLEAN,
    actif BOOLEAN,
    type_structure VARCHAR,
    logo TEXT,
    login VARCHAR,
    telephone VARCHAR,
    nom_profil VARCHAR,
    id_groupe INTEGER,
    id_profil INTEGER,
    -- Champs partenaire spécifiques
    id_partenaire INTEGER,
    code_promo VARCHAR,
    commission_pct NUMERIC,
    date_limite_abonnement DATE,
    etat_abonnement VARCHAR,
    abonnement_valide BOOLEAN,
    jours_restants_abonnement INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    PARTNER_GROUPE_ID CONSTANT INTEGER := 4;
    v_normalized_login VARCHAR;
    v_row_count INTEGER;
BEGIN
    -- Normalisation du login
    v_normalized_login := LOWER(TRIM(p_login));

    -- Vérifier que c'est un email partenaire
    IF NOT (v_normalized_login LIKE '%@partner.fay') THEN
        RAISE NOTICE 'Login non partenaire: %', p_login;
        RETURN;
    END IF;

    -- Authentification Partenaire
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        'PARTENAIRE'::VARCHAR AS nom_groupe,
        u.id_structure,
        COALESCE(p.nom_partenaire, u.username)::VARCHAR AS nom_structure,
        u.pwd_changed,
        u.actif,
        'PARTENAIRE'::VARCHAR AS type_structure,
        ''::TEXT AS logo,
        u.login,
        u.tel_user AS telephone,
        'Partenaire'::VARCHAR AS nom_profil,
        u.id_groupe,
        u.id_profil,
        -- Champs partenaire
        p.id_partenaire,
        p.code_promo,
        p.commission_pct,
        p.valide_jusqua AS date_limite_abonnement,
        CASE
            WHEN p.actif = FALSE THEN 'INACTIF'
            WHEN p.valide_jusqua < CURRENT_DATE THEN 'EXPIRE'
            ELSE 'ACTIF'
        END::VARCHAR AS etat_abonnement,
        (p.actif = TRUE AND p.valide_jusqua >= CURRENT_DATE) AS abonnement_valide,
        GREATEST(0, p.valide_jusqua - CURRENT_DATE)::INTEGER AS jours_restants_abonnement
    FROM utilisateur u
    INNER JOIN partenaires p ON p.id_utilisateur = u.id
    WHERE u.id_structure = 0
      AND u.id_groupe = PARTNER_GROUPE_ID
      AND LOWER(u.login) = v_normalized_login
      AND u.actif = TRUE
      AND u.pwd = crypt(p_pwd, u.pwd);

    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    IF v_row_count = 0 THEN
        RAISE NOTICE 'Échec authentification partenaire: %', p_login;
    END IF;
END;
$function$;

COMMENT ON FUNCTION public.check_partenaire_credentials(VARCHAR, VARCHAR)
IS 'Authentification dédiée aux partenaires (id_groupe=4, email @partner.fay)';
```

---

## Recommandation

**Option 1 (Recommandée)** : Modifier `check_user_credentials` pour ajouter le cas partenaire
- Avantage : Un seul point d'entrée pour l'authentification
- Le frontend n'a pas besoin de changement

**Option 2** : Créer `check_partenaire_credentials` séparée
- Avantage : Pas de risque de casser l'existant
- Inconvénient : Le frontend doit détecter et appeler la bonne fonction

---

## Test après modification

```sql
-- Tester la connexion partenaire
SELECT * FROM check_user_credentials('simulateur26@partner.fay', '0000');

-- Vérifier que l'utilisateur existe
SELECT u.id, u.login, u.id_groupe, u.id_structure, p.code_promo, p.nom_partenaire
FROM utilisateur u
LEFT JOIN partenaires p ON p.id_utilisateur = u.id
WHERE u.login LIKE '%@partner.fay';
```
