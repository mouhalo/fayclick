-- ============================================================================
-- Patch : get_inventaire_periodique
-- Version : v2.1 (2026-05-19) : fix CASE marge_variation marge_precedente<0
--           v2.0 (2026-05-19) : ajout resume_marges + evolution_marges
-- DBA : dba_master
-- DB  : fayclick_db
-- Spec : docs/spec-marges-inventaire-2026-05-19.md
-- Audit : docs/dba-audit-marges-inventaire-2026-05-19.md
-- ============================================================================
-- DECISIONS D'AUDIT :
--   - Pas de snapshot prix_achat dans detail_facture_com
--     → LEFT JOIN produit_service + COALESCE(cout_revient, 0)
--   - Pas de colonne annulee → filtre mt_acompte > 0 suffisant
--     (suppressions physiques dans FayClick, pas de soft-delete facture)
--   - Pas de soft-delete produit_service → LEFT JOIN obligatoire
--   - montant_net = facture_com.montant (montant après remise, confirmé audit)
--   - Nouveau index idx_facture_com_structure_date_acompte créé avant la fonction
-- ============================================================================
-- NOTES ARCHITECTURE v2 :
--   - Agrégats : CTE intermédiaire marges_par_facture (une ligne/facture) puis
--     agrégation sur buckets → interdit les agrégats imbriqués (SUM(SUM()))
--   - Les sous-requêtes corrélées de v1-draft ont été remplacées par ce pattern
--   - generate_series IDENTIQUE à evolution_ventes → CA-02 garanti
-- ============================================================================

-- ============================================================================
-- BACKUP DDL v1 (sauvegarde avant patch — rollback via pg_proc si besoin)
-- ============================================================================
/*
v1 complète disponible dans pg_proc :
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_inventaire_periodique';
*/

-- ============================================================================
-- ÉTAPE 1 : Index manquant (covering index pour filtre mt_acompte)
-- Créé AVANT la fonction pour que le planner puisse l'utiliser
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_facture_com_structure_date_acompte
    ON public.facture_com (id_structure, date_facture, mt_acompte);

-- ============================================================================
-- ÉTAPE 2 : Patch de la fonction
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_inventaire_periodique(
    pid_structure INTEGER,
    pannee        INTEGER DEFAULT 0,
    pmois         INTEGER DEFAULT 0,
    psemaine      INTEGER DEFAULT 0,
    pjour         INTEGER DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $function$
-- v2.1 (2026-05-19) : fix CASE marge_variation pour marge_precedente < 0 (ABS dénominateur)
-- v2.0 (2026-05-19) : ajout resume_marges + evolution_marges
-- v1.0 (antérieur)  : resume_ventes + evolution_ventes + top_articles + top_clients
DECLARE
    v_result_json          JSON;
    v_resume_ventes        JSON;
    v_evolution_ventes     JSON;
    v_top_articles         JSON;
    v_top_clients          JSON;
    -- Nouveaux en v2
    v_resume_marges        JSON;
    v_evolution_marges     JSON;
    -- Dates
    v_date_debut           DATE;
    v_date_fin             DATE;
    v_date_debut_precedent DATE;
    v_date_fin_precedent   DATE;
    v_annee_effective      INTEGER;
    v_type_periode         VARCHAR(20);
    v_label_periode        VARCHAR(100);
BEGIN
    -- --------------------------------------------------------
    -- Validation des paramètres
    -- --------------------------------------------------------
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code',    'INVALID_STRUCTURE',
            'error',   'L''ID structure doit être un entier positif valide'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RETURN json_build_object(
            'success', false,
            'code',    'STRUCTURE_NOT_FOUND',
            'error',   'La structure avec l''ID ' || pid_structure || ' n''existe pas'
        );
    END IF;

    v_annee_effective := CASE WHEN pannee <= 0 THEN EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER ELSE pannee END;

    IF pmois    < 0 OR pmois    > 12 THEN RETURN json_build_object('success', false, 'code', 'INVALID_MONTH', 'error', 'Le mois doit être entre 0 et 12');   END IF;
    IF psemaine < 0 OR psemaine > 53 THEN RETURN json_build_object('success', false, 'code', 'INVALID_WEEK',  'error', 'La semaine doit être entre 0 et 53'); END IF;
    IF pjour    < 0 OR pjour    > 31 THEN RETURN json_build_object('success', false, 'code', 'INVALID_DAY',   'error', 'Le jour doit être entre 0 et 31');    END IF;

    -- --------------------------------------------------------
    -- LOGIQUE DE DÉTERMINATION DE LA PÉRIODE
    -- Priorité: jour > semaine > mois > année
    -- --------------------------------------------------------
    IF pjour > 0 AND pmois > 0 THEN
        v_type_periode         := 'jour';
        v_date_debut           := MAKE_DATE(v_annee_effective, pmois, pjour);
        v_date_fin             := v_date_debut;
        v_date_debut_precedent := v_date_debut - INTERVAL '1 day';
        v_date_fin_precedent   := v_date_debut_precedent;
        v_label_periode        := TO_CHAR(v_date_debut, 'DD Month YYYY');

    ELSIF psemaine > 0 THEN
        v_type_periode         := 'semaine';
        v_date_debut           := DATE_TRUNC('week', MAKE_DATE(v_annee_effective, 1, 1) + ((psemaine - 1) * 7));
        v_date_fin             := v_date_debut + INTERVAL '6 days';
        v_date_debut_precedent := v_date_debut - INTERVAL '7 days';
        v_date_fin_precedent   := v_date_fin   - INTERVAL '7 days';
        v_label_periode        := 'Semaine ' || psemaine || ' - ' || v_annee_effective;

    ELSIF pmois > 0 THEN
        v_type_periode         := 'mois';
        v_date_debut           := MAKE_DATE(v_annee_effective, pmois, 1);
        v_date_fin             := (v_date_debut + INTERVAL '1 month - 1 day')::DATE;
        v_date_debut_precedent := (v_date_debut - INTERVAL '1 month')::DATE;
        v_date_fin_precedent   := (v_date_debut - INTERVAL '1 day')::DATE;
        v_label_periode        := TO_CHAR(v_date_debut, 'Month YYYY');

    ELSE
        v_type_periode         := 'annee';
        v_date_debut           := MAKE_DATE(v_annee_effective, 1,  1);
        v_date_fin             := MAKE_DATE(v_annee_effective, 12, 31);
        v_date_debut_precedent := MAKE_DATE(v_annee_effective - 1, 1,  1);
        v_date_fin_precedent   := MAKE_DATE(v_annee_effective - 1, 12, 31);
        v_label_periode        := 'Année ' || v_annee_effective;
    END IF;

    -- ============================================================
    -- 1. RÉSUMÉ DES VENTES (inchangé v1)
    -- ============================================================
    WITH ventes_actuelles AS (
        SELECT
            COUNT(DISTINCT f.id_facture)  AS nb_ventes,
            COALESCE(SUM(f.montant), 0)   AS ca_total,
            COUNT(DISTINCT f.tel_client)  AS clients_actifs,
            CASE
                WHEN COUNT(DISTINCT f.id_facture) > 0
                THEN COALESCE(SUM(f.montant), 0) / COUNT(DISTINCT f.id_facture)
                ELSE 0
            END AS panier_moyen
        FROM list_factures_com f
        WHERE f.id_structure = pid_structure
          AND f.date_facture BETWEEN v_date_debut AND v_date_fin
    ),
    ventes_precedentes AS (
        SELECT
            COUNT(DISTINCT f.id_facture)  AS nb_ventes,
            COALESCE(SUM(f.montant), 0)   AS ca_total,
            COUNT(DISTINCT f.tel_client)  AS clients_actifs,
            CASE
                WHEN COUNT(DISTINCT f.id_facture) > 0
                THEN COALESCE(SUM(f.montant), 0) / COUNT(DISTINCT f.id_facture)
                ELSE 0
            END AS panier_moyen
        FROM list_factures_com f
        WHERE f.id_structure = pid_structure
          AND f.date_facture BETWEEN v_date_debut_precedent AND v_date_fin_precedent
    )
    SELECT json_build_object(
        'ca_total',          va.ca_total,
        'ca_variation',      CASE WHEN vp.ca_total     > 0 THEN ROUND(((va.ca_total     - vp.ca_total)     * 100.0 / vp.ca_total),     1) ELSE 0 END,
        'ventes_total',      va.nb_ventes,
        'ventes_variation',  CASE WHEN vp.nb_ventes    > 0 THEN ROUND(((va.nb_ventes    - vp.nb_ventes)    * 100.0 / vp.nb_ventes),    1) ELSE 0 END,
        'panier_moyen',      ROUND(va.panier_moyen, 0),
        'panier_variation',  CASE WHEN vp.panier_moyen > 0 THEN ROUND(((va.panier_moyen - vp.panier_moyen) * 100.0 / vp.panier_moyen), 1) ELSE 0 END,
        'clients_actifs',    va.clients_actifs,
        'clients_variation', CASE WHEN vp.clients_actifs > 0 THEN ROUND(((va.clients_actifs - vp.clients_actifs) * 100.0 / vp.clients_actifs), 1) ELSE 0 END
    ) INTO v_resume_ventes
    FROM ventes_actuelles va, ventes_precedentes vp;

    -- ============================================================
    -- 2. ÉVOLUTION DES VENTES (inchangé v1)
    -- ============================================================
    CASE v_type_periode

        WHEN 'jour' THEN
            SELECT json_agg(
                json_build_object(
                    'periode',       TO_CHAR(gs.heure, 'HH24') || 'h',
                    'label',         TO_CHAR(gs.heure, 'HH24:00'),
                    'montant',       COALESCE(ventes.montant_total, 0),
                    'nombre_ventes', COALESCE(ventes.nb_ventes, 0)
                ) ORDER BY gs.heure
            ) INTO v_evolution_ventes
            FROM generate_series(v_date_debut::TIMESTAMP, v_date_debut::TIMESTAMP + INTERVAL '23 hours', '1 hour') gs(heure)
            LEFT JOIN (
                SELECT DATE_TRUNC('hour', f.date_facture) AS heure_vente,
                       SUM(f.montant) AS montant_total, COUNT(*) AS nb_ventes
                FROM list_factures_com f
                WHERE f.id_structure = pid_structure AND f.date_facture::DATE = v_date_debut
                GROUP BY DATE_TRUNC('hour', f.date_facture)
            ) ventes ON gs.heure = ventes.heure_vente;

        WHEN 'semaine' THEN
            SELECT json_agg(
                json_build_object(
                    'periode',       TO_CHAR(gs.date_jour, 'Dy'),
                    'label',         TO_CHAR(gs.date_jour, 'DD/MM'),
                    'montant',       COALESCE(ventes.montant_total, 0),
                    'nombre_ventes', COALESCE(ventes.nb_ventes, 0)
                ) ORDER BY gs.date_jour
            ) INTO v_evolution_ventes
            FROM generate_series(v_date_debut, v_date_fin, '1 day') gs(date_jour)
            LEFT JOIN (
                SELECT f.date_facture::DATE AS jour_vente,
                       SUM(f.montant) AS montant_total, COUNT(*) AS nb_ventes
                FROM list_factures_com f
                WHERE f.id_structure = pid_structure AND f.date_facture BETWEEN v_date_debut AND v_date_fin
                GROUP BY f.date_facture::DATE
            ) ventes ON gs.date_jour = ventes.jour_vente;

        WHEN 'mois' THEN
            SELECT json_agg(
                json_build_object(
                    'periode',       EXTRACT(DAY FROM gs.date_jour)::TEXT,
                    'label',         TO_CHAR(gs.date_jour, 'DD/MM'),
                    'montant',       COALESCE(ventes.montant_total, 0),
                    'nombre_ventes', COALESCE(ventes.nb_ventes, 0)
                ) ORDER BY gs.date_jour
            ) INTO v_evolution_ventes
            FROM generate_series(v_date_debut, v_date_fin, '1 day') gs(date_jour)
            LEFT JOIN (
                SELECT f.date_facture::DATE AS jour_vente,
                       SUM(f.montant) AS montant_total, COUNT(*) AS nb_ventes
                FROM list_factures_com f
                WHERE f.id_structure = pid_structure AND f.date_facture BETWEEN v_date_debut AND v_date_fin
                GROUP BY f.date_facture::DATE
            ) ventes ON gs.date_jour = ventes.jour_vente;

        WHEN 'annee' THEN
            SELECT json_agg(
                json_build_object(
                    'periode',       TO_CHAR(gs.date_mois, 'Mon'),
                    'label',         TO_CHAR(gs.date_mois, 'Month'),
                    'montant',       COALESCE(ventes.montant_total, 0),
                    'nombre_ventes', COALESCE(ventes.nb_ventes, 0)
                ) ORDER BY gs.date_mois
            ) INTO v_evolution_ventes
            FROM generate_series(v_date_debut, v_date_fin, '1 month') gs(date_mois)
            LEFT JOIN (
                SELECT DATE_TRUNC('month', f.date_facture)::DATE AS mois_vente,
                       SUM(f.montant) AS montant_total, COUNT(*) AS nb_ventes
                FROM list_factures_com f
                WHERE f.id_structure = pid_structure AND f.date_facture BETWEEN v_date_debut AND v_date_fin
                GROUP BY DATE_TRUNC('month', f.date_facture)
            ) ventes ON gs.date_mois = ventes.mois_vente;

    END CASE;

    -- ============================================================
    -- 3. TOP 5 ARTICLES (inchangé v1)
    -- ============================================================
    SELECT json_agg(
        json_build_object(
            'rang',            row_number,
            'nom_produit',     nom_produit,
            'nom_categorie',   nom_categorie,
            'montant_total',   montant_total,
            'nombre_ventes',   nombre_ventes,
            'quantite_totale', quantite_totale
        )
    ) INTO v_top_articles
    FROM (
        SELECT
            ROW_NUMBER() OVER (ORDER BY SUM(dv.quantite * dv.prix) DESC) AS row_number,
            dv.nom_produit, dv.nom_categorie,
            SUM(dv.quantite * dv.prix) AS montant_total,
            COUNT(DISTINCT dv.id_facture) AS nombre_ventes,
            SUM(dv.quantite) AS quantite_totale
        FROM list_detailventes dv
        INNER JOIN list_factures_com f ON dv.id_facture = f.id_facture
        WHERE f.id_structure = pid_structure
          AND f.date_facture BETWEEN v_date_debut AND v_date_fin
        GROUP BY dv.nom_produit, dv.nom_categorie
        ORDER BY montant_total DESC
        LIMIT 5
    ) top_articles;

    -- ============================================================
    -- 4. TOP 5 CLIENTS (inchangé v1)
    -- ============================================================
    SELECT json_agg(
        json_build_object(
            'rang',            row_number,
            'nom_client',      nom_client,
            'tel_client',      tel_client,
            'initiales',       initiales,
            'montant_total',   montant_total,
            'nombre_factures', nombre_factures,
            'statut',          CASE
                                   WHEN montant_total >= 400000 THEN 'VIP'
                                   WHEN montant_total >= 200000 THEN 'Premium'
                                   ELSE 'Standard'
                               END
        )
    ) INTO v_top_clients
    FROM (
        SELECT
            ROW_NUMBER() OVER (ORDER BY SUM(f.montant) DESC) AS row_number,
            cf.nom_client, cf.tel_client,
            UPPER(SUBSTRING(SPLIT_PART(cf.nom_client, ' ', 1), 1, 1)) ||
            COALESCE(UPPER(SUBSTRING(SPLIT_PART(cf.nom_client, ' ', 2), 1, 1)), '') AS initiales,
            SUM(f.montant) AS montant_total,
            COUNT(f.id_facture) AS nombre_factures
        FROM list_factures_com f
        INNER JOIN client_facture cf ON f.tel_client = cf.tel_client AND f.id_structure = cf.id_structure
        WHERE f.id_structure = pid_structure
          AND f.date_facture BETWEEN v_date_debut AND v_date_fin
        GROUP BY cf.nom_client, cf.tel_client
        ORDER BY montant_total DESC
        LIMIT 5
    ) top_clients;

    -- ============================================================
    -- 5. RÉSUMÉ DES MARGES (NOUVEAU v2)
    -- ============================================================
    -- Architecture : CTE marges_par_facture (1 ligne/facture, marge déjà
    --   pondérée par le ratio d'encaissement) puis agrégation.
    --   → Évite les agrégats imbriqués SUM(SUM(...)) interdits en SQL.
    --
    -- Règles métier (spec §1.1-1.4) :
    --   marge_brute    = SUM((prix_vente - COALESCE(cout_revient, 0)) * quantite) / facture
    --   ratio          = LEAST(mt_acompte / NULLIF(montant, 0), 1)  ← cap sur-paiement
    --   marge_realisee = marge_brute * ratio
    --   Périmètre      : mt_acompte > 0 (encaissées totalement ou partiellement)
    --   Annulation     : filtre mt_acompte > 0 suffisant (pas de colonne annulee)
    --   Produit orphelin (supprimé) : LEFT JOIN + COALESCE(cout_revient, 0)
    --                                 → marge = PV × quantité pour ces lignes
    -- --------------------------------------------------------
    WITH marges_par_facture_courant AS (
        -- Une ligne par facture, marge brute pondérée par ratio encaissement
        SELECT
            f.id_facture,
            f.date_facture,
            SUM((df.prix - COALESCE(ps.cout_revient, 0)) * df.quantite)
                * LEAST(f.mt_acompte / NULLIF(f.montant, 0), 1) AS marge_realisee
        FROM facture_com f
        INNER JOIN detail_facture_com df ON df.id_facture = f.id_facture
        LEFT  JOIN produit_service ps     ON ps.id_produit = df.id_produit
        WHERE f.id_structure = pid_structure
          AND f.mt_acompte   > 0
          AND f.date_facture BETWEEN v_date_debut AND v_date_fin
        GROUP BY f.id_facture, f.date_facture, f.mt_acompte, f.montant
    ),
    marges_par_facture_prec AS (
        -- Même calcul sur la période N-1
        SELECT
            f.id_facture,
            SUM((df.prix - COALESCE(ps.cout_revient, 0)) * df.quantite)
                * LEAST(f.mt_acompte / NULLIF(f.montant, 0), 1) AS marge_realisee
        FROM facture_com f
        INNER JOIN detail_facture_com df ON df.id_facture = f.id_facture
        LEFT  JOIN produit_service ps     ON ps.id_produit = df.id_produit
        WHERE f.id_structure = pid_structure
          AND f.mt_acompte   > 0
          AND f.date_facture BETWEEN v_date_debut_precedent AND v_date_fin_precedent
        GROUP BY f.id_facture, f.mt_acompte, f.montant
    ),
    totaux AS (
        SELECT
            COALESCE((SELECT SUM(marge_realisee) FROM marges_par_facture_courant), 0) AS marge_courante,
            COALESCE((SELECT SUM(marge_realisee) FROM marges_par_facture_prec),    0) AS marge_precedente
    )
    SELECT json_build_object(
        'marge_total',     ROUND(t.marge_courante::NUMERIC, 0),
        'marge_variation', CASE
            -- Tableau §4.4 de la spec + extension marge_precedente < 0 (v2.1)
            -- N-1 > 0, N = 0 → -100% exact (évite le calcul général)
            WHEN t.marge_precedente  > 0 AND t.marge_courante  = 0 THEN -100.0
            -- N-1 <> 0 (positif ou négatif) → formule générale sur ABS(N-1)
            WHEN t.marge_precedente <> 0                            THEN ROUND(((t.marge_courante - t.marge_precedente) * 100.0 / ABS(t.marge_precedente))::NUMERIC, 1)
            -- N-1 = 0, N = 0 → pas de variation
            WHEN t.marge_precedente  = 0 AND t.marge_courante  = 0 THEN 0.0
            -- N-1 = 0, N > 0 → NULL (jamais Infinity)
            ELSE NULL
        END
    ) INTO v_resume_marges
    FROM totaux t;

    -- ============================================================
    -- 6. ÉVOLUTION DES MARGES (NOUVEAU v2)
    -- ============================================================
    -- Contrainte forte CA-02 : même generate_series qu'evolution_ventes
    --   → buckets identiques (periode, label) aux mêmes index
    --   → longueurs égales garanties
    --
    -- Architecture : CTE marges_par_facture puis agrégation sur bucket
    --   → un seul niveau d'agrégat à chaque étape, pas de SUM(SUM(...))
    --
    -- nombre_ventes = factures encaissées (mt_acompte > 0) sur le bucket
    --   peut différer de evolution_ventes.nombre_ventes (toutes factures)
    -- --------------------------------------------------------
    CASE v_type_periode

        WHEN 'jour' THEN
            -- Bucket : heure (00h-23h)
            WITH mpf AS (
                SELECT
                    DATE_TRUNC('hour', f.date_facture::TIMESTAMP) AS bucket,
                    SUM((df.prix - COALESCE(ps.cout_revient, 0)) * df.quantite)
                        * LEAST(f.mt_acompte / NULLIF(f.montant, 0), 1) AS marge_realisee
                FROM facture_com f
                INNER JOIN detail_facture_com df ON df.id_facture = f.id_facture
                LEFT  JOIN produit_service ps     ON ps.id_produit = df.id_produit
                WHERE f.id_structure = pid_structure
                  AND f.mt_acompte   > 0
                  AND f.date_facture::DATE = v_date_debut
                GROUP BY f.id_facture, f.mt_acompte, f.montant, DATE_TRUNC('hour', f.date_facture::TIMESTAMP)
            ),
            marges_par_heure AS (
                SELECT bucket, SUM(marge_realisee) AS marge_heure, COUNT(*) AS nb_ventes
                FROM mpf GROUP BY bucket
            )
            SELECT json_agg(
                json_build_object(
                    'periode',       TO_CHAR(gs.heure, 'HH24') || 'h',
                    'label',         TO_CHAR(gs.heure, 'HH24:00'),
                    'marge',         COALESCE(ROUND(mph.marge_heure::NUMERIC, 0), 0),
                    'nombre_ventes', COALESCE(mph.nb_ventes, 0)
                ) ORDER BY gs.heure
            ) INTO v_evolution_marges
            FROM generate_series(v_date_debut::TIMESTAMP, v_date_debut::TIMESTAMP + INTERVAL '23 hours', '1 hour') gs(heure)
            LEFT JOIN marges_par_heure mph ON gs.heure = mph.bucket;

        WHEN 'semaine' THEN
            -- Bucket : jour (Lun-Dim)
            WITH mpf AS (
                SELECT
                    f.date_facture AS bucket,
                    SUM((df.prix - COALESCE(ps.cout_revient, 0)) * df.quantite)
                        * LEAST(f.mt_acompte / NULLIF(f.montant, 0), 1) AS marge_realisee
                FROM facture_com f
                INNER JOIN detail_facture_com df ON df.id_facture = f.id_facture
                LEFT  JOIN produit_service ps     ON ps.id_produit = df.id_produit
                WHERE f.id_structure = pid_structure
                  AND f.mt_acompte   > 0
                  AND f.date_facture BETWEEN v_date_debut AND v_date_fin
                GROUP BY f.id_facture, f.mt_acompte, f.montant, f.date_facture
            ),
            marges_par_jour AS (
                SELECT bucket, SUM(marge_realisee) AS marge_jour, COUNT(*) AS nb_ventes
                FROM mpf GROUP BY bucket
            )
            SELECT json_agg(
                json_build_object(
                    'periode',       TO_CHAR(gs.date_jour, 'Dy'),
                    'label',         TO_CHAR(gs.date_jour, 'DD/MM'),
                    'marge',         COALESCE(ROUND(mpj.marge_jour::NUMERIC, 0), 0),
                    'nombre_ventes', COALESCE(mpj.nb_ventes, 0)
                ) ORDER BY gs.date_jour
            ) INTO v_evolution_marges
            FROM generate_series(v_date_debut, v_date_fin, '1 day') gs(date_jour)
            LEFT JOIN marges_par_jour mpj ON gs.date_jour = mpj.bucket;

        WHEN 'mois' THEN
            -- Bucket : jour du mois (01-31)
            WITH mpf AS (
                SELECT
                    f.date_facture AS bucket,
                    SUM((df.prix - COALESCE(ps.cout_revient, 0)) * df.quantite)
                        * LEAST(f.mt_acompte / NULLIF(f.montant, 0), 1) AS marge_realisee
                FROM facture_com f
                INNER JOIN detail_facture_com df ON df.id_facture = f.id_facture
                LEFT  JOIN produit_service ps     ON ps.id_produit = df.id_produit
                WHERE f.id_structure = pid_structure
                  AND f.mt_acompte   > 0
                  AND f.date_facture BETWEEN v_date_debut AND v_date_fin
                GROUP BY f.id_facture, f.mt_acompte, f.montant, f.date_facture
            ),
            marges_par_jour AS (
                SELECT bucket, SUM(marge_realisee) AS marge_jour, COUNT(*) AS nb_ventes
                FROM mpf GROUP BY bucket
            )
            SELECT json_agg(
                json_build_object(
                    'periode',       EXTRACT(DAY FROM gs.date_jour)::TEXT,
                    'label',         TO_CHAR(gs.date_jour, 'DD/MM'),
                    'marge',         COALESCE(ROUND(mpj.marge_jour::NUMERIC, 0), 0),
                    'nombre_ventes', COALESCE(mpj.nb_ventes, 0)
                ) ORDER BY gs.date_jour
            ) INTO v_evolution_marges
            FROM generate_series(v_date_debut, v_date_fin, '1 day') gs(date_jour)
            LEFT JOIN marges_par_jour mpj ON gs.date_jour = mpj.bucket;

        WHEN 'annee' THEN
            -- Bucket : mois (Jan-Déc)
            WITH mpf AS (
                SELECT
                    DATE_TRUNC('month', f.date_facture)::DATE AS bucket,
                    SUM((df.prix - COALESCE(ps.cout_revient, 0)) * df.quantite)
                        * LEAST(f.mt_acompte / NULLIF(f.montant, 0), 1) AS marge_realisee
                FROM facture_com f
                INNER JOIN detail_facture_com df ON df.id_facture = f.id_facture
                LEFT  JOIN produit_service ps     ON ps.id_produit = df.id_produit
                WHERE f.id_structure = pid_structure
                  AND f.mt_acompte   > 0
                  AND f.date_facture BETWEEN v_date_debut AND v_date_fin
                GROUP BY f.id_facture, f.mt_acompte, f.montant, DATE_TRUNC('month', f.date_facture)
            ),
            marges_par_mois AS (
                SELECT bucket, SUM(marge_realisee) AS marge_mois, COUNT(*) AS nb_ventes
                FROM mpf GROUP BY bucket
            )
            SELECT json_agg(
                json_build_object(
                    'periode',       TO_CHAR(gs.date_mois, 'Mon'),
                    'label',         TO_CHAR(gs.date_mois, 'Month'),
                    'marge',         COALESCE(ROUND(mpm.marge_mois::NUMERIC, 0), 0),
                    'nombre_ventes', COALESCE(mpm.nb_ventes, 0)
                ) ORDER BY gs.date_mois
            ) INTO v_evolution_marges
            FROM generate_series(v_date_debut, v_date_fin, '1 month') gs(date_mois)
            LEFT JOIN marges_par_mois mpm ON gs.date_mois = mpm.bucket;

    END CASE;

    -- ============================================================
    -- CONSTRUCTION DU RÉSULTAT FINAL
    -- ============================================================
    SELECT json_build_object(
        'success',     true,
        'code',        'INVENTAIRE_OK',
        'structure_id', pid_structure,
        'periode',      json_build_object(
            'type',    v_type_periode,
            'label',   v_label_periode,
            'annee',   v_annee_effective,
            'mois',    NULLIF(pmois,    0),
            'semaine', NULLIF(psemaine, 0),
            'jour',    NULLIF(pjour,    0)
        ),
        'date_debut',          v_date_debut,
        'date_fin',            v_date_fin,
        'periode_precedente',  json_build_object(
            'date_debut', v_date_debut_precedent,
            'date_fin',   v_date_fin_precedent
        ),
        -- Données v1 (inchangées — compatibilité ascendante garantie)
        'resume_ventes',    v_resume_ventes,
        'evolution_ventes', COALESCE(v_evolution_ventes,  '[]'::JSON),
        'top_articles',     COALESCE(v_top_articles,       '[]'::JSON),
        'top_clients',      COALESCE(v_top_clients,        '[]'::JSON),
        -- Données v2 (nouvelles clés)
        'resume_marges',    COALESCE(v_resume_marges,      json_build_object('marge_total', 0, 'marge_variation', NULL)),
        'evolution_marges', COALESCE(v_evolution_marges,   '[]'::JSON),
        'timestamp_generation', NOW()
    ) INTO v_result_json;

    RETURN v_result_json;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'code',    'ERROR',
            'error',   'Erreur lors de la génération des statistiques: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$function$;

-- ============================================================================
-- VÉRIFICATION POST-DÉPLOIEMENT (copier-coller dans psql)
-- ============================================================================
-- Test CA-01 : Présence des nouvelles clés
-- SELECT (get_inventaire_periodique(1675, 2026, 0, 20, 0))::jsonb ? 'resume_marges'   AS ok_resume_marges;
-- SELECT (get_inventaire_periodique(1675, 2026, 0, 20, 0))::jsonb ? 'evolution_marges' AS ok_evolution_marges;
--
-- Test CA-02 : Longueurs égales evolution_ventes vs evolution_marges
-- SELECT
--   json_array_length(r->'evolution_ventes')  AS len_ventes,
--   json_array_length(r->'evolution_marges')  AS len_marges,
--   json_array_length(r->'evolution_ventes') = json_array_length(r->'evolution_marges') AS ok
-- FROM (SELECT get_inventaire_periodique(1675, 2026, 0, 20, 0) AS r) t;
--
-- Test CA-12 : Performance
-- EXPLAIN ANALYZE SELECT * FROM get_inventaire_periodique(1675, 2026, 0, 20, 0);
-- EXPLAIN ANALYZE SELECT * FROM get_inventaire_periodique(1675, 2026, 5, 0, 0);
-- EXPLAIN ANALYZE SELECT * FROM get_inventaire_periodique(1675, 2026, 0, 0, 0);
-- ============================================================================
