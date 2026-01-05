-- DROP FUNCTION public.get_my_notifications(int4, int4, int4, bool);

CREATE OR REPLACE FUNCTION public.get_my_notifications(pid_utilisateur integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_only_unread boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_result JSONB;
    v_notifications JSONB;
    v_total INTEGER;
    v_total_non_lues INTEGER;
BEGIN
    -- ========================================================================
    -- ÉTAPE 1: Vérifier que l'utilisateur existe
    -- ========================================================================
    IF NOT EXISTS (SELECT 1 FROM utilisateur WHERE id = pid_utilisateur) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Utilisateur non trouvé',
            'data', NULL,
            'timestamp', NOW()
        );
    END IF;

    -- ========================================================================
    -- ÉTAPE 2: Compter le total des notifications
    -- ========================================================================
    SELECT COUNT(*) INTO v_total
    FROM notifications
    WHERE utilisateur_id = pid_utilisateur;

    -- ========================================================================
    -- ÉTAPE 3: Compter les notifications non lues
    -- ========================================================================
    SELECT COUNT(*) INTO v_total_non_lues
    FROM notifications
    WHERE utilisateur_id = pid_utilisateur
    AND lue = FALSE;

    -- ========================================================================
    -- ÉTAPE 4: Récupérer les notifications (avec sous-requête pour pagination)
    -- ========================================================================
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', n.id,
                'titre', n.titre,
                'message', n.message,
                'type', n.type,
                'lue', n.lue,
                'date_creation', n.date_creation,
                'temps_ecoule', CASE
                    WHEN NOW() - n.date_creation < INTERVAL '1 minute' THEN 'À l''instant'
                    WHEN NOW() - n.date_creation < INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM NOW() - n.date_creation)::INTEGER || ' min'
                    WHEN NOW() - n.date_creation < INTERVAL '1 day' THEN EXTRACT(HOUR FROM NOW() - n.date_creation)::INTEGER || ' h'
                    WHEN NOW() - n.date_creation < INTERVAL '7 days' THEN EXTRACT(DAY FROM NOW() - n.date_creation)::INTEGER || ' j'
                    ELSE TO_CHAR(n.date_creation, 'DD/MM/YYYY')
                END
            ) ORDER BY n.date_creation DESC
        ),
        '[]'::jsonb
    ) INTO v_notifications
    FROM (
        SELECT *
        FROM notifications
        WHERE utilisateur_id = pid_utilisateur
        AND (NOT p_only_unread OR lue = FALSE)
        ORDER BY date_creation DESC
        LIMIT p_limit
        OFFSET p_offset
    ) n;

    -- ========================================================================
    -- ÉTAPE 5: Construire le résultat final
    -- ========================================================================
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'Notifications récupérées avec succès',
        'data', jsonb_build_object(
            'utilisateur_id', pid_utilisateur,
            'stats', jsonb_build_object(
                'total', v_total,
                'non_lues', v_total_non_lues,
                'lues', v_total - v_total_non_lues
            ),
            'pagination', jsonb_build_object(
                'limit', p_limit,
                'offset', p_offset,
                'has_more', (p_offset + p_limit) < v_total
            ),
            'notifications', v_notifications
        ),
        'timestamp', NOW()
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Erreur: ' || SQLERRM,
            'data', NULL,
            'timestamp', NOW()
        );
END;
$function$
;

COMMENT ON FUNCTION public.get_my_notifications(int4, int4, int4, bool) IS 'Récupère les notifications d''un utilisateur.
Paramètres:
- pid_utilisateur: ID de l''utilisateur
- p_limit: Nombre max de notifications (défaut: 50)
- p_offset: Décalage pour pagination (défaut: 0)
- p_only_unread: Si TRUE, retourne uniquement les non lues (défaut: FALSE)
Retourne: JSONB avec stats et liste des notifications';
