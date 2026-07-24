-- ============================================================================
-- PATCH PHASE 1 — Persistance de la remise par ligne
-- Base       : fayclick_db @ 154.12.224.173:3253
-- Date       : 2026-07-24
-- Auteur     : dba_master
-- PO         : validation 24/07/2026 (4 décisions tranchées)
-- Référence  : PLAN_PHASE0_PERSISTANCE_REMISE_LIGNE.md
-- Périmètre  : 4 tables + 14 surcharges de fonctions + 1 vue + 1 patch affichage
-- Nature     : transactionnel + idempotent (ré-exécutable sans erreur)
-- Impact     : AUCUN sur montants/stock/wallet (vérifié triggers + recalcul)
-- Volume     : detail_facture_com = 548 593 lignes (ALTER metadata-only, instantané)
-- ============================================================================
--
-- PRÉ-REQUIS (à exécuter AVANT ce script par le PO) — cf. RAPPORT_PHASE1 §3
--   1. Backup physique des 4 tables (pg_dump --data-only --table=...)
--   2. Export des pg_get_functiondef des 14 fonctions (cf. backup_functions.sql)
--   3. Dump du schéma (\d+ detail_facture_com, etc.)
--
-- EXÉCUTION :
--   psql "postgresql://$DB_USER:$DB_PASS@154.12.224.173:3253/fayclick_db" \
--        -v ON_ERROR_STOP=1 -f PATCH_PHASE1_REMISE_LIGNE.sql
--
-- LEVER UN AMBIGUÏTÉ : si une seule étape échoue, ROLLBACK automatique (ON_ERROR_STOP=1
-- combiné à BEGIN/COMMIT). Tout est atomique.
-- ============================================================================

\set ON_ERROR_STOP on
SET client_min_messages TO notice;
\echo ==== DEBUT Patch Phase 1 — Persistance remise par ligne ====

BEGIN;

-- ============================================================================
-- ÉTAPE 1 — DDL : ajout colonnes remise_pct / prix_origine (4 tables)
-- ============================================================================
-- Métadata-only (NULL, pas de DEFAULT) → instantané même sur 548k lignes (PG 11+)
-- Idempotent via ADD COLUMN IF NOT EXISTS

\echo ETAPE 1/15 — DDL : ajout colonnes remise_pct/prix_origine (4 tables)

-- 1a) detail_facture_com (548 593 lignes)
ALTER TABLE public.detail_facture_com
    ADD COLUMN IF NOT EXISTS remise_pct   NUMERIC(5,2)  NULL,
    ADD COLUMN IF NOT EXISTS prix_origine NUMERIC(10,2) NULL;

-- 1b) proforma_details (876 lignes)
ALTER TABLE public.proforma_details
    ADD COLUMN IF NOT EXISTS remise_pct   NUMERIC(5,2)  NULL,
    ADD COLUMN IF NOT EXISTS prix_origine NUMERIC(10,2) NULL;

-- 1c) bon_commande_details (decision 1 du PO)
ALTER TABLE public.bon_commande_details
    ADD COLUMN IF NOT EXISTS remise_pct   NUMERIC(5,2)  NULL,
    ADD COLUMN IF NOT EXISTS prix_origine NUMERIC(10,2) NULL;

-- 1d) detail_devis (decision 1 du PO)
ALTER TABLE public.detail_devis
    ADD COLUMN IF NOT EXISTS remise_pct   NUMERIC(5,2)  NULL,
    ADD COLUMN IF NOT EXISTS prix_origine NUMERIC(10,2) NULL;


-- ============================================================================
-- ÉTAPE 2 — Contraintes CHECK remise_pct ∈ [0;100] (idempotent via DO block)
-- ============================================================================
\echo ETAPE 2/15 — Contraintes CHECK (4 tables)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_detail_facture_remise_pct'
          AND conrelid = 'public.detail_facture_com'::regclass
    ) THEN
        ALTER TABLE public.detail_facture_com
            ADD CONSTRAINT chk_detail_facture_remise_pct
            CHECK (remise_pct IS NULL OR (remise_pct >= 0 AND remise_pct <= 100));
        RAISE NOTICE '  + chk_detail_facture_remise_pct créé';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_proforma_remise_pct'
          AND conrelid = 'public.proforma_details'::regclass
    ) THEN
        ALTER TABLE public.proforma_details
            ADD CONSTRAINT chk_proforma_remise_pct
            CHECK (remise_pct IS NULL OR (remise_pct >= 0 AND remise_pct <= 100));
        RAISE NOTICE '  + chk_proforma_remise_pct créé';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_bon_commande_remise_pct'
          AND conrelid = 'public.bon_commande_details'::regclass
    ) THEN
        ALTER TABLE public.bon_commande_details
            ADD CONSTRAINT chk_bon_commande_remise_pct
            CHECK (remise_pct IS NULL OR (remise_pct >= 0 AND remise_pct <= 100));
        RAISE NOTICE '  + chk_bon_commande_remise_pct créé';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_detail_devis_remise_pct'
          AND conrelid = 'public.detail_devis'::regclass
    ) THEN
        ALTER TABLE public.detail_devis
            ADD CONSTRAINT chk_detail_devis_remise_pct
            CHECK (remise_pct IS NULL OR (remise_pct >= 0 AND remise_pct <= 100));
        RAISE NOTICE '  + chk_detail_devis_remise_pct créé';
    END IF;
END
$$;


-- ============================================================================
-- ÉTAPE 3 — Vue list_detailventes (Option A — exposer les 2 colonnes)
-- ============================================================================
\echo ETAPE 3/15 — Vue list_detailventes (Option A)

-- [PHASE1 FIX 2026-07-24] CREATE OR REPLACE VIEW interdit de réordonner/insérer des colonnes
-- au milieu d'une vue existante (seul un ajout en FIN de liste est autorisé). La version initiale
-- de ce patch insérait remise_pct/prix_origine entre prix et marge, ce qui décalait "marge" de la
-- position 8 à 10 -> ERREUR "cannot change name of view column marge to remise_pct". Corrigé en
-- conservant l'ordre EXACT des 11 colonnes d'origine et en ajoutant les 2 nouvelles colonnes en fin.
-- get_my_factures1/rechercher_multifacturecom lisent ces colonnes par NOM (json_build_object),
-- donc l'ordre physique de la vue est indifférent pour ces consommateurs.
CREATE OR REPLACE VIEW public.list_detailventes AS
SELECT
    df.id_detail,
    df.id_facture,
    df.date_facture,
    ps.nom_produit,
    ps.cout_revient,
    df.quantite,
    df.prix,
    (((df.prix - ps.cout_revient))::double precision * df.quantite) AS marge,
    df.id_produit,
    ps.nom_categorie,
    ps.description,
    df.remise_pct,
    df.prix_origine
FROM detail_facture_com df
JOIN produit_service ps ON (df.id_produit = ps.id_produit);


-- ============================================================================
-- ETAPE 4 — create_proforma (1 surcharge)
-- ============================================================================
\echo ETAPE 4/15 — create_proforma

CREATE OR REPLACE FUNCTION public.create_proforma(
    p_id_structure integer,
    p_date_proforma date DEFAULT CURRENT_DATE,
    p_tel_client character varying DEFAULT ''::character varying,
    p_nom_client character varying DEFAULT ''::character varying,
    p_description text DEFAULT ''::text,
    p_montant numeric DEFAULT 0,
    p_articles_string text DEFAULT ''::text,
    p_mt_remise numeric DEFAULT 0,
    p_id_utilisateur integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id_proforma INTEGER;
  v_num_proforma VARCHAR;
  v_sequence INTEGER;
  v_montant_net NUMERIC;
  v_articles TEXT[];
  v_article TEXT;
  v_parts TEXT[];
  v_id_produit INTEGER;
  v_quantite INTEGER;
  v_prix NUMERIC;
  v_nom_produit VARCHAR;
  v_nb_details INTEGER := 0;
  v_remise_pct   NUMERIC(5,2);   -- [PHASE1] remise par ligne (pct)
  v_prix_origine NUMERIC(10,2);  -- [PHASE1] prix avant remise
BEGIN
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_sequence FROM proforma WHERE id_structure = p_id_structure;
  v_num_proforma := 'PRO-' || p_id_structure || '-' || LPAD(v_sequence::TEXT, 4, '0');
  v_montant_net := p_montant - p_mt_remise;

  INSERT INTO proforma (num_proforma, id_structure, date_proforma, tel_client, nom_client, description, montant, mt_remise, montant_net, id_utilisateur)
  VALUES (v_num_proforma, p_id_structure, p_date_proforma, p_tel_client, p_nom_client, p_description, p_montant, p_mt_remise, v_montant_net, p_id_utilisateur)
  RETURNING id_proforma INTO v_id_proforma;

  IF p_articles_string IS NOT NULL AND p_articles_string != '' THEN
    v_articles := string_to_array(RTRIM(p_articles_string, '#'), '#');
    FOREACH v_article IN ARRAY v_articles LOOP
      IF v_article IS NOT NULL AND v_article != '' THEN
        v_parts := string_to_array(v_article, '-');
        IF array_length(v_parts, 1) NOT BETWEEN 3 AND 5 THEN
          RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix[-remise[-prix_origine]])', v_article;
        END IF;
        IF array_length(v_parts, 1) >= 3 THEN
          v_id_produit := v_parts[1]::INTEGER;
          v_quantite := v_parts[2]::INTEGER;
          v_prix := v_parts[3]::NUMERIC;

          v_remise_pct   := CASE WHEN array_length(v_parts,1) >= 4 AND v_parts[4] IS NOT NULL AND v_parts[4] <> ''
                                 THEN v_parts[4]::NUMERIC(5,2) ELSE NULL END;
          v_prix_origine := CASE WHEN array_length(v_parts,1) >= 5 AND v_parts[5] IS NOT NULL AND v_parts[5] <> ''
                                 THEN v_parts[5]::NUMERIC(10,2) ELSE NULL END;

          SELECT COALESCE(nom_produit, 'Produit #' || v_id_produit) INTO v_nom_produit
          FROM list_produits WHERE id_produit = v_id_produit LIMIT 1;

          IF v_nom_produit IS NULL THEN
            v_nom_produit := 'Produit #' || v_id_produit;
          END IF;

          INSERT INTO proforma_details (id_proforma, id_produit, nom_produit, quantite, prix_unitaire, sous_total, remise_pct, prix_origine)
          VALUES (v_id_proforma, v_id_produit, v_nom_produit, v_quantite, v_prix, v_quantite * v_prix, v_remise_pct, v_prix_origine);

          v_nb_details := v_nb_details + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'id_proforma', v_id_proforma,
    'num_proforma', v_num_proforma,
    'message', 'Proforma créée avec succès',
    'nb_details', v_nb_details
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'Erreur: ' || SQLERRM);
END;
$function$;


-- ============================================================================
-- ETAPE 5 — edit_proforma (1 surcharge)
-- ============================================================================
\echo ETAPE 5/15 — edit_proforma

CREATE OR REPLACE FUNCTION public.edit_proforma(
    p_id_proforma integer,
    p_id_structure integer,
    p_tel_client character varying DEFAULT NULL::character varying,
    p_nom_client character varying DEFAULT NULL::character varying,
    p_description text DEFAULT NULL::text,
    p_montant numeric DEFAULT NULL::numeric,
    p_articles_string text DEFAULT NULL::text,
    p_mt_remise numeric DEFAULT NULL::numeric,
    p_id_etat integer DEFAULT NULL::integer
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_etat INTEGER;
  v_articles TEXT[];
  v_article TEXT;
  v_parts TEXT[];
  v_id_produit INTEGER;
  v_quantite INTEGER;
  v_prix NUMERIC;
  v_nom_produit VARCHAR;
  v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
  v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
  SELECT id_etat INTO v_current_etat FROM proforma WHERE id_proforma = p_id_proforma AND id_structure = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Proforma introuvable');
  END IF;

  IF v_current_etat = 3 THEN
    RETURN json_build_object('success', false, 'message', 'Impossible de modifier une proforma convertie');
  END IF;

  UPDATE proforma SET
    tel_client = COALESCE(p_tel_client, tel_client),
    nom_client = COALESCE(p_nom_client, nom_client),
    description = COALESCE(p_description, description),
    montant = COALESCE(p_montant, montant),
    mt_remise = COALESCE(p_mt_remise, mt_remise),
    id_etat = COALESCE(p_id_etat, id_etat),
    date_modification = NOW()
  WHERE id_proforma = p_id_proforma AND id_structure = p_id_structure;

  UPDATE proforma SET montant_net = montant - mt_remise
  WHERE id_proforma = p_id_proforma;

  IF p_articles_string IS NOT NULL AND p_articles_string != '' THEN
    DELETE FROM proforma_details WHERE id_proforma = p_id_proforma;

    v_articles := string_to_array(RTRIM(p_articles_string, '#'), '#');
    FOREACH v_article IN ARRAY v_articles LOOP
      IF v_article IS NOT NULL AND v_article != '' THEN
        v_parts := string_to_array(v_article, '-');
        IF array_length(v_parts, 1) NOT BETWEEN 3 AND 5 THEN
          RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix[-remise[-prix_origine]])', v_article;
        END IF;
        IF array_length(v_parts, 1) >= 3 THEN
          v_id_produit := v_parts[1]::INTEGER;
          v_quantite := v_parts[2]::INTEGER;
          v_prix := v_parts[3]::NUMERIC;

          v_remise_pct   := CASE WHEN array_length(v_parts,1) >= 4 AND v_parts[4] IS NOT NULL AND v_parts[4] <> ''
                                 THEN v_parts[4]::NUMERIC(5,2) ELSE NULL END;
          v_prix_origine := CASE WHEN array_length(v_parts,1) >= 5 AND v_parts[5] IS NOT NULL AND v_parts[5] <> ''
                                 THEN v_parts[5]::NUMERIC(10,2) ELSE NULL END;

          SELECT COALESCE(nom_produit, 'Produit #' || v_id_produit) INTO v_nom_produit
          FROM list_produits WHERE id_produit = v_id_produit LIMIT 1;

          IF v_nom_produit IS NULL THEN
            v_nom_produit := 'Produit #' || v_id_produit;
          END IF;

          INSERT INTO proforma_details (id_proforma, id_produit, nom_produit, quantite, prix_unitaire, sous_total, remise_pct, prix_origine)
          VALUES (p_id_proforma, v_id_produit, v_nom_produit, v_quantite, v_prix, v_quantite * v_prix, v_remise_pct, v_prix_origine);
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Proforma modifiée avec succès');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'Erreur: ' || SQLERRM);
END;
$function$;


-- ============================================================================
-- ETAPE 6 — convert_proforma_to_facture (propagation 5 champs)
-- ============================================================================
\echo ETAPE 6/15 — convert_proforma_to_facture (propagation 5 champs)

CREATE OR REPLACE FUNCTION public.convert_proforma_to_facture(
    p_id_proforma integer,
    p_id_structure integer,
    p_id_utilisateur integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_proforma RECORD;
  v_articles_string TEXT := '';
  v_detail RECORD;
  v_result JSON;
  v_id_facture INTEGER;
  v_success BOOLEAN;
  v_message TEXT;
BEGIN
  SELECT * INTO v_proforma FROM proforma WHERE id_proforma = p_id_proforma AND id_structure = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Proforma introuvable');
  END IF;

  IF v_proforma.id_etat = 3 THEN
    RETURN json_build_object('success', false, 'message', 'Proforma déjà convertie');
  END IF;

  -- [PHASE1] Propagation 5 champs : ligne sans remise -> "id-qt-prix#"
  --          ligne remisée -> "id-qt-prix-remise[-prix_origine]#"
  FOR v_detail IN SELECT * FROM proforma_details WHERE id_proforma = p_id_proforma LOOP
    v_articles_string := v_articles_string
      || v_detail.id_produit || '-' || v_detail.quantite || '-' || v_detail.prix_unitaire;
    IF v_detail.remise_pct IS NOT NULL THEN
      v_articles_string := v_articles_string || '-' || v_detail.remise_pct;
      IF v_detail.prix_origine IS NOT NULL THEN
        v_articles_string := v_articles_string || '-' || v_detail.prix_origine;
      END IF;
    END IF;
    v_articles_string := v_articles_string || '#';
  END LOOP;

  IF v_articles_string = '' THEN
    RETURN json_build_object('success', false, 'message', 'Aucun article dans la proforma');
  END IF;

  SELECT row_to_json(r) INTO v_result
  FROM (
    SELECT * FROM create_facture_complete1(
      v_proforma.date_proforma,
      p_id_structure,
      v_proforma.tel_client,
      v_proforma.nom_client,
      v_proforma.montant,
      COALESCE(v_proforma.description, 'Conversion proforma ' || v_proforma.num_proforma),
      v_articles_string,
      v_proforma.mt_remise,
      0,
      false,
      false,
      p_id_utilisateur
    )
  ) r;

  v_success := (v_result->>'success')::BOOLEAN;
  v_message := v_result->>'message';

  IF NOT v_success THEN
    RETURN json_build_object('success', false, 'message', 'Erreur création facture: ' || COALESCE(v_message, 'inconnue'));
  END IF;

  v_id_facture := (v_result->>'id_facture')::INTEGER;

  UPDATE proforma SET
    id_etat = 3,
    id_facture_liee = v_id_facture,
    date_modification = NOW()
  WHERE id_proforma = p_id_proforma;

  RETURN json_build_object(
    'success', true,
    'id_facture', v_id_facture,
    'message', 'Proforma convertie en facture avec succès'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'Erreur: ' || SQLERRM);
END;
$function$;


-- ============================================================================
-- ETAPE 7 — create_facture_complete1 — SURCHARGE p_description VARCHAR
--           (R1 ÉLEVÉ : ne pas casser l'identité. Retourne detail_ids/detail_count)
-- ============================================================================
\echo ETAPE 7/15 — create_facture_complete1 (varchar)

CREATE OR REPLACE FUNCTION public.create_facture_complete1(
    p_date_facture date,
    p_id_structure integer,
    p_tel_client character varying,
    p_nom_client_payeur character varying,
    p_montant numeric,
    p_description character varying,
    p_articles_string text,
    p_mt_remise numeric DEFAULT 0,
    p_mt_acompte numeric DEFAULT 0,
    p_avec_frais boolean DEFAULT false,
    p_est_devis boolean DEFAULT false,
    p_id_utilisateur integer DEFAULT 0
)
RETURNS TABLE(
    id_facture integer,
    success boolean,
    message text,
    detail_ids integer[],
    detail_count integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_new_document_id INTEGER;
    v_articles_array TEXT[];
    v_article_parts TEXT[];
    v_article_string TEXT;
    v_detail_ids INTEGER[] := '{}';
    v_detail_id INTEGER;
    v_count INTEGER := 0;
    v_expected_count INTEGER;
    v_id_produit INTEGER;
    v_quantite FLOAT;
    v_prix NUMERIC(10,2);
    v_type_document VARCHAR(10);
    v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
    v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
    v_type_document := CASE WHEN p_est_devis THEN 'Devis' ELSE 'Facture' END;

    IF p_articles_string IS NULL OR LENGTH(TRIM(p_articles_string)) = 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Aucun article fourni'::TEXT, '{}'::INTEGER[], 0;
        RETURN;
    END IF;

    v_articles_array := string_to_array(TRIM(p_articles_string, '#'), '#');
    v_expected_count := array_length(v_articles_array, 1);

    IF v_expected_count IS NULL OR v_expected_count = 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Format articles invalide'::TEXT, '{}'::INTEGER[], 0;
        RETURN;
    END IF;

    BEGIN
        IF p_est_devis THEN
            SELECT public.add_new_devis(
                p_date_facture, p_id_structure, p_tel_client, p_nom_client_payeur,
                p_montant, p_id_utilisateur
            ) INTO v_new_document_id;
        ELSE
            SELECT public.add_new_facture(
                p_date_facture, p_id_structure, p_tel_client, p_nom_client_payeur,
                p_montant, p_description, p_mt_remise, p_mt_acompte, p_avec_frais, p_id_utilisateur
            ) INTO v_new_document_id;
        END IF;

        IF v_new_document_id IS NULL OR v_new_document_id <= 0 THEN
            RAISE EXCEPTION 'Échec création % principal', v_type_document;
        END IF;

        FOR i IN 1..v_expected_count LOOP
            v_article_string := v_articles_array[i];
            v_article_parts := string_to_array(v_article_string, '-');

            -- [PHASE1] garde élargie 3..5 (au lieu de =3)
            IF array_length(v_article_parts, 1) NOT BETWEEN 3 AND 5 THEN
                RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix[-remise[-prix_origine]])', v_article_string;
            END IF;

            BEGIN
                v_id_produit := v_article_parts[1]::INTEGER;
                v_quantite := v_article_parts[2]::FLOAT;
                v_prix := v_article_parts[3]::NUMERIC(10,2);

                -- [PHASE1] lecture 4-5 NULL-safe
                v_remise_pct   := CASE WHEN array_length(v_article_parts,1) >= 4 AND v_article_parts[4] IS NOT NULL AND v_article_parts[4] <> ''
                                       THEN v_article_parts[4]::NUMERIC(5,2) ELSE NULL END;
                v_prix_origine := CASE WHEN array_length(v_article_parts,1) >= 5 AND v_article_parts[5] IS NOT NULL AND v_article_parts[5] <> ''
                                       THEN v_article_parts[5]::NUMERIC(10,2) ELSE NULL END;

                IF v_id_produit <= 0 OR v_quantite <= 0 OR v_prix < 0 THEN
                    RAISE EXCEPTION 'Valeurs invalides pour article: ID=%, QTE=%, PRIX=%', v_id_produit, v_quantite, v_prix;
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'Conversion impossible pour article: "%"', v_article_string;
            END;

            IF p_est_devis THEN
                -- [PHASE1] INSERT detail_devis étendu
                INSERT INTO public.detail_devis (id_devis, id_produit, quantite, prix, remise_pct, prix_origine)
                VALUES (v_new_document_id, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
                RETURNING id_detail INTO v_detail_id;
            ELSE
                -- [PHASE1] INSERT detail_facture_com étendu
                INSERT INTO public.detail_facture_com (id_facture, date_facture, id_produit, quantite, prix, remise_pct, prix_origine)
                VALUES (v_new_document_id, p_date_facture, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
                RETURNING id_detail INTO v_detail_id;
            END IF;

            IF v_detail_id IS NULL OR v_detail_id <= 0 THEN
                RAISE EXCEPTION 'Échec insertion détail pour produit ID %', v_id_produit;
            END IF;

            v_detail_ids := array_append(v_detail_ids, v_detail_id);
            v_count := v_count + 1;
        END LOOP;

        IF v_count != v_expected_count THEN
            RAISE EXCEPTION 'Nombre de détails créés (%) différent du nombre attendu (%)', v_count, v_expected_count;
        END IF;

        RETURN QUERY SELECT v_new_document_id, TRUE,
            format('%s créé avec %s détails', v_type_document, v_count)::TEXT,
            v_detail_ids, v_count;

    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT NULL::INTEGER, FALSE,
                format('Erreur création %s: %s', v_type_document, SQLERRM)::TEXT,
                '{}'::INTEGER[], 0;
    END;
END;
$function$;


-- ============================================================================
-- ETAPE 8 — create_facture_complete1 — SURCHARGE p_description TEXT
--           (R1 ÉLEVÉ : retourne details_ids/nb_details — ne pas confondre)
-- ============================================================================
\echo ETAPE 8/15 — create_facture_complete1 (text)

CREATE OR REPLACE FUNCTION public.create_facture_complete1(
    p_date_facture date,
    p_id_structure integer,
    p_tel_client character varying,
    p_nom_client_payeur character varying,
    p_montant numeric,
    p_description text,
    p_articles_string text,
    p_mt_remise numeric DEFAULT 0,
    p_mt_acompte numeric DEFAULT 0,
    p_avec_frais boolean DEFAULT false,
    p_est_devis boolean DEFAULT false,
    p_id_utilisateur integer DEFAULT 0
)
RETURNS TABLE(
    id_facture integer,
    success boolean,
    message text,
    details_ids integer[],
    nb_details integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_new_document_id INTEGER;
    v_articles_array TEXT[];
    v_article_parts TEXT[];
    v_article_string TEXT;
    v_detail_ids INTEGER[] := '{}';
    v_detail_id INTEGER;
    v_count INTEGER := 0;
    v_expected_count INTEGER;
    v_id_produit INTEGER;
    v_quantite FLOAT;
    v_prix NUMERIC(10,2);
    v_type_document VARCHAR(10);
    v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
    v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
    v_type_document := CASE WHEN p_est_devis THEN 'Devis' ELSE 'Facture' END;

    IF p_articles_string IS NULL OR LENGTH(TRIM(p_articles_string)) = 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Aucun article fourni'::TEXT, '{}'::INTEGER[], 0;
        RETURN;
    END IF;

    v_articles_array := string_to_array(TRIM(p_articles_string, '#'), '#');
    v_expected_count := array_length(v_articles_array, 1);

    IF v_expected_count IS NULL OR v_expected_count = 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Format articles invalide'::TEXT, '{}'::INTEGER[], 0;
        RETURN;
    END IF;

    BEGIN
        IF p_est_devis THEN
            SELECT public.add_new_devis(
                p_date_facture,
                p_id_structure,
                p_tel_client,
                p_nom_client_payeur,
                p_montant,
                p_id_utilisateur
            ) INTO v_new_document_id;
        ELSE
            SELECT public.add_new_facture(
                p_date_facture,
                p_id_structure,
                p_tel_client,
                p_nom_client_payeur,
                p_montant,
                p_description,
                p_mt_remise,
                p_mt_acompte,
                p_avec_frais,
                p_id_utilisateur
            ) INTO v_new_document_id;
        END IF;

        IF v_new_document_id IS NULL OR v_new_document_id <= 0 THEN
            RAISE EXCEPTION 'Echec creation % principal', v_type_document;
        END IF;

        FOR i IN 1..v_expected_count LOOP
            v_article_string := v_articles_array[i];
            v_article_parts := string_to_array(v_article_string, '-');

            -- [PHASE1] garde élargie 3..5
            IF array_length(v_article_parts, 1) NOT BETWEEN 3 AND 5 THEN
                RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix[-remise[-prix_origine]])', v_article_string;
            END IF;

            BEGIN
                v_id_produit := v_article_parts[1]::INTEGER;
                v_quantite := v_article_parts[2]::FLOAT;
                v_prix := v_article_parts[3]::NUMERIC(10,2);

                -- [PHASE1] lecture 4-5 NULL-safe
                v_remise_pct   := CASE WHEN array_length(v_article_parts,1) >= 4 AND v_article_parts[4] IS NOT NULL AND v_article_parts[4] <> ''
                                       THEN v_article_parts[4]::NUMERIC(5,2) ELSE NULL END;
                v_prix_origine := CASE WHEN array_length(v_article_parts,1) >= 5 AND v_article_parts[5] IS NOT NULL AND v_article_parts[5] <> ''
                                       THEN v_article_parts[5]::NUMERIC(10,2) ELSE NULL END;

                IF v_id_produit <= 0 OR v_quantite <= 0 OR v_prix < 0 THEN
                    RAISE EXCEPTION 'Valeurs invalides pour article: ID=%, QTE=%, PRIX=%', v_id_produit, v_quantite, v_prix;
                END IF;

            EXCEPTION
                WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'Conversion impossible pour article: "%"', v_article_string;
            END;

            IF p_est_devis THEN
                -- [PHASE1] INSERT detail_devis étendu
                INSERT INTO public.detail_devis (id_devis, id_produit, quantite, prix, remise_pct, prix_origine)
                VALUES (v_new_document_id, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
                RETURNING id_detail INTO v_detail_id;
            ELSE
                -- [PHASE1] INSERT detail_facture_com étendu
                INSERT INTO public.detail_facture_com (id_facture, date_facture, id_produit, quantite, prix, remise_pct, prix_origine)
                VALUES (v_new_document_id, p_date_facture, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
                RETURNING id_detail INTO v_detail_id;
            END IF;

            IF v_detail_id IS NULL OR v_detail_id <= 0 THEN
                RAISE EXCEPTION 'Echec insertion detail pour produit ID %', v_id_produit;
            END IF;

            v_detail_ids := array_append(v_detail_ids, v_detail_id);
            v_count := v_count + 1;
        END LOOP;

        IF v_count != v_expected_count THEN
            RAISE EXCEPTION 'Nombre de details crees (%) different du nombre attendu (%)', v_count, v_expected_count;
        END IF;

        RETURN QUERY SELECT
            v_new_document_id,
            TRUE,
            format('%s #%s cree avec succes (%s produit%s)',
                v_type_document, v_new_document_id, v_count,
                CASE WHEN v_count > 1 THEN 's' ELSE '' END
            ),
            v_detail_ids,
            v_count;

    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT
                NULL::INTEGER, FALSE,
                format('Erreur creation %s: %s', v_type_document, SQLERRM)::TEXT,
                '{}'::INTEGER[], 0;
    END;
END;
$function$;


-- ============================================================================
-- ETAPE 9 — create_facture_complete (ancienne version, sans le 1)
--           Decision 3 du PO : patcher par sécurité même si non appelée
-- ============================================================================
\echo ETAPE 9/15 — create_facture_complete (ancien)

CREATE OR REPLACE FUNCTION public.create_facture_complete(
    p_date_facture date,
    p_id_structure integer,
    p_tel_client character varying,
    p_nom_client_payeur character varying,
    p_montant numeric,
    p_description text,
    p_articles_string text,
    p_mt_remise numeric DEFAULT 0,
    p_mt_acompte numeric DEFAULT 0,
    p_avec_frais boolean DEFAULT false
)
RETURNS TABLE(
    id_facture integer,
    success boolean,
    message text,
    details_ids integer[],
    nb_details integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_new_facture_id INTEGER;
  v_articles_array TEXT[];
  v_article_parts TEXT[];
  v_article_string TEXT;
  v_detail_ids INTEGER[] := '{}';
  v_detail_id INTEGER;
  v_count INTEGER := 0;
  v_expected_count INTEGER;
  v_id_produit INTEGER;
  v_quantite FLOAT;
  v_prix NUMERIC(10,2);
  v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
  v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
  -- Validation des paramètres d'entrée
  IF p_articles_string IS NULL OR LENGTH(TRIM(p_articles_string)) = 0 THEN
    RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Aucun article fourni'::TEXT, '{}'::INTEGER[], 0;
    RETURN;
  END IF;

  -- Parser la string en séparant par '#'
  v_articles_array := string_to_array(TRIM(p_articles_string, '#'), '#');
  v_expected_count := array_length(v_articles_array, 1);

  -- Vérifier qu'on a au moins un article
  IF v_expected_count IS NULL OR v_expected_count = 0 THEN
    RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Format articles invalide'::TEXT, '{}'::INTEGER[], 0;
    RETURN;
  END IF;

  -- Début de la transaction (implicite dans une fonction)
  BEGIN
    -- 1. Créer la facture principale
    SELECT add_new_facture(
      p_date_facture::DATE,
      p_id_structure,
      p_tel_client,
      p_nom_client_payeur,
      p_montant,
      p_description,
      p_mt_remise,
      p_mt_acompte,
      p_avec_frais
    ) INTO v_new_facture_id;

    -- Vérifier que la facture a été créée
    IF v_new_facture_id IS NULL OR v_new_facture_id <= 0 THEN
      RAISE EXCEPTION 'Échec création facture principale';
    END IF;

    -- 2. Insérer tous les détails de la facture avec parsing string
    FOR i IN 1..v_expected_count LOOP
      v_article_string := v_articles_array[i];

      v_article_parts := string_to_array(v_article_string, '-');

      -- [PHASE1] garde élargie 3..5
      IF array_length(v_article_parts, 1) NOT BETWEEN 3 AND 5 THEN
        RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix[-remise[-prix_origine]])', v_article_string;
      END IF;

      -- Extraire et valider les valeurs
      BEGIN
        v_id_produit := v_article_parts[1]::INTEGER;
        v_quantite := v_article_parts[2]::FLOAT;
        v_prix := v_article_parts[3]::NUMERIC(10,2);

        -- [PHASE1] lecture 4-5 NULL-safe
        v_remise_pct   := CASE WHEN array_length(v_article_parts,1) >= 4 AND v_article_parts[4] IS NOT NULL AND v_article_parts[4] <> ''
                               THEN v_article_parts[4]::NUMERIC(5,2) ELSE NULL END;
        v_prix_origine := CASE WHEN array_length(v_article_parts,1) >= 5 AND v_article_parts[5] IS NOT NULL AND v_article_parts[5] <> ''
                               THEN v_article_parts[5]::NUMERIC(10,2) ELSE NULL END;

        -- Validation des valeurs
        IF v_id_produit <= 0 OR v_quantite <= 0 OR v_prix < 0 THEN
          RAISE EXCEPTION 'Valeurs invalides pour article: ID=%, QTE=%, PRIX=%', v_id_produit, v_quantite, v_prix;
        END IF;

      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE EXCEPTION 'Conversion impossible pour article: "%"', v_article_string;
      END;

      -- [PHASE1] INSERT étendu
      INSERT INTO detail_facture_com (id_facture, id_produit, quantite, prix, remise_pct, prix_origine)
      VALUES (v_new_facture_id, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
      RETURNING id_detail INTO v_detail_id;

      -- Vérifier l'insertion
      IF v_detail_id IS NULL OR v_detail_id <= 0 THEN
        RAISE EXCEPTION 'Échec insertion détail pour produit ID %', v_id_produit;
      END IF;

      -- Ajouter l'ID à la liste
      v_detail_ids := array_append(v_detail_ids, v_detail_id);
      v_count := v_count + 1;
    END LOOP;

    -- Vérification finale
    IF v_count != v_expected_count THEN
      RAISE EXCEPTION 'Nombre de détails créés (%) différent du nombre attendu (%)', v_count, v_expected_count;
    END IF;

    -- Succès : retourner les résultats
    RETURN QUERY SELECT
      v_new_facture_id,
      TRUE,
      format('Facture #%s créée avec succès (%s produit%s)',
        v_new_facture_id,
        v_count,
        CASE WHEN v_count > 1 THEN 's' ELSE '' END
      ),
      v_detail_ids,
      v_count;

  EXCEPTION
    -- En cas d'erreur, PostgreSQL annule automatiquement la transaction
    WHEN OTHERS THEN
      RETURN QUERY SELECT
        NULL::INTEGER,
        FALSE,
        format('Erreur création facture: %s', SQLERRM)::TEXT,
        '{}'::INTEGER[],
        0;
  END;
END;
$function$;


-- ============================================================================
-- ETAPE 10 — create_facture_online
-- ============================================================================
\echo ETAPE 10/15 — create_facture_online

CREATE OR REPLACE FUNCTION public.create_facture_online(
    p_date_facture date,
    p_id_structure integer,
    p_tel_client character varying,
    p_nom_client_payeur character varying,
    p_montant numeric,
    p_description character varying,
    p_articles_string text
)
RETURNS TABLE(
    id_facture integer,
    success boolean,
    message text,
    detail_ids integer[],
    detail_count integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_new_document_id INTEGER;
    v_articles_array TEXT[];
    v_article_parts TEXT[];
    v_article_string TEXT;
    v_detail_ids INTEGER[] := '{}';
    v_detail_id INTEGER;
    v_count INTEGER := 0;
    v_expected_count INTEGER;
    v_id_produit INTEGER;
    v_quantite FLOAT;
    v_prix NUMERIC(10,2);
    v_type_document VARCHAR(10);
    v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
    v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
    v_type_document :=  'Facture';

    IF p_articles_string IS NULL OR LENGTH(TRIM(p_articles_string)) = 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Aucun article fourni'::TEXT, '{}'::INTEGER[], 0;
        RETURN;
    END IF;

    v_articles_array := string_to_array(TRIM(p_articles_string, '#'), '#');
    v_expected_count := array_length(v_articles_array, 1);

    IF v_expected_count IS NULL OR v_expected_count = 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, FALSE, 'Format articles invalide'::TEXT, '{}'::INTEGER[], 0;
        RETURN;
    END IF;

    BEGIN

            SELECT public.add_new_facture(
                p_date_facture, p_id_structure, p_tel_client, p_nom_client_payeur,
                p_montant, p_description
            ) INTO v_new_document_id;



        FOR i IN 1..v_expected_count LOOP
            v_article_string := v_articles_array[i];
            v_article_parts := string_to_array(v_article_string, '-');

            -- [PHASE1] garde élargie 3..5
            IF array_length(v_article_parts, 1) NOT BETWEEN 3 AND 5 THEN
                RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix[-remise[-prix_origine]])', v_article_string;
            END IF;

            BEGIN
                v_id_produit := v_article_parts[1]::INTEGER;
                v_quantite := v_article_parts[2]::FLOAT;
                v_prix := v_article_parts[3]::NUMERIC(10,2);

                -- [PHASE1] lecture 4-5 NULL-safe
                v_remise_pct   := CASE WHEN array_length(v_article_parts,1) >= 4 AND v_article_parts[4] IS NOT NULL AND v_article_parts[4] <> ''
                                       THEN v_article_parts[4]::NUMERIC(5,2) ELSE NULL END;
                v_prix_origine := CASE WHEN array_length(v_article_parts,1) >= 5 AND v_article_parts[5] IS NOT NULL AND v_article_parts[5] <> ''
                                       THEN v_article_parts[5]::NUMERIC(10,2) ELSE NULL END;

                IF v_id_produit <= 0 OR v_quantite <= 0 OR v_prix < 0 THEN
                    RAISE EXCEPTION 'Valeurs invalides pour article: ID=%, QTE=%, PRIX=%', v_id_produit, v_quantite, v_prix;
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'Conversion impossible pour article: "%"', v_article_string;
            END;


                -- [PHASE1] INSERT étendu
                INSERT INTO public.detail_facture_com (id_facture, date_facture, id_produit, quantite, prix, remise_pct, prix_origine)
                VALUES (v_new_document_id, p_date_facture, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
                RETURNING id_detail INTO v_detail_id;


            IF v_detail_id IS NULL OR v_detail_id <= 0 THEN
                RAISE EXCEPTION 'Échec insertion détail pour produit ID %', v_id_produit;
            END IF;

            v_detail_ids := array_append(v_detail_ids, v_detail_id);
            v_count := v_count + 1;
        END LOOP;

        IF v_count != v_expected_count THEN
            RAISE EXCEPTION 'Nombre de détails créés (%) différent du nombre attendu (%)', v_count, v_expected_count;
        END IF;

        RETURN QUERY SELECT v_new_document_id, TRUE,
            format('%s créé avec %s détails', v_type_document, v_count)::TEXT,
            v_detail_ids, v_count;

    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT NULL::INTEGER, FALSE,
                format('Erreur création %s: %s', v_type_document, SQLERRM)::TEXT,
                '{}'::INTEGER[], 0;
    END;
END;
$function$;


-- ============================================================================
-- ETAPE 11 — create_bon_commande (decision 1 PO : étendre BC aussi)
-- ============================================================================
\echo ETAPE 11/15 — create_bon_commande

CREATE OR REPLACE FUNCTION public.create_bon_commande(
    p_id_structure integer,
    p_date_bon_commande date,
    p_id_fournisseur integer,
    p_description text,
    p_montant_net numeric,
    p_articles_string text,
    p_mt_remise numeric DEFAULT 0,
    p_id_utilisateur integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id_bon_commande   INTEGER;
  v_seq               INTEGER;
  v_num_bc            VARCHAR(30);
  v_nom_fourn_snap    VARCHAR(200);
  v_tel_fourn_snap    VARCHAR(20);
  v_tokens            TEXT[];
  v_token             TEXT;
  v_parts             TEXT[];
  v_id_produit        INTEGER;
  v_quantite          NUMERIC;
  v_cout_revient      NUMERIC;
  v_nom_produit_snap  VARCHAR(200);
  v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
  v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
  IF p_date_bon_commande IS NULL THEN
    RETURN json_build_object('success', false, 'id_bon_commande', NULL, 'num_bc', NULL,
      'message', 'La date du bon de commande est obligatoire');
  END IF;
  IF p_montant_net IS NULL OR p_montant_net < 0 THEN
    RETURN json_build_object('success', false, 'id_bon_commande', NULL, 'num_bc', NULL,
      'message', 'Le montant net doit être supérieur ou égal à 0');
  END IF;
  IF COALESCE(p_mt_remise, 0) < 0 THEN
    RETURN json_build_object('success', false, 'id_bon_commande', NULL, 'num_bc', NULL,
      'message', 'La remise doit être supérieure ou égale à 0');
  END IF;
  IF p_articles_string IS NULL OR TRIM(p_articles_string) = '' THEN
    RETURN json_build_object('success', false, 'id_bon_commande', NULL, 'num_bc', NULL,
      'message', 'La liste des articles est obligatoire');
  END IF;

  SELECT nom_fournisseur, tel_fournisseur
  INTO v_nom_fourn_snap, v_tel_fourn_snap
  FROM fournisseur
  WHERE id_fournisseur = p_id_fournisseur
    AND id_structure   = p_id_structure
    AND actif          = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'id_bon_commande', NULL, 'num_bc', NULL,
      'message', 'Fournisseur introuvable, inactif ou accès refusé');
  END IF;

  INSERT INTO bon_commande_compteur (id_structure, dernier_seq)
  VALUES (p_id_structure, 1)
  ON CONFLICT (id_structure) DO UPDATE
    SET dernier_seq = bon_commande_compteur.dernier_seq + 1
  RETURNING dernier_seq INTO v_seq;

  v_num_bc := 'BC-' || p_id_structure::TEXT
              || '-' || TO_CHAR(p_date_bon_commande, 'YYYYMMDD')
              || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO bon_commande (
    id_structure, id_fournisseur, id_etat, num_bc, date_bon_commande,
    description, montant_net, mt_remise, nom_fournisseur_snap, tel_fournisseur_snap, id_utilisateur
  )
  VALUES (
    p_id_structure, p_id_fournisseur, 1, v_num_bc, p_date_bon_commande,
    NULLIF(TRIM(p_description), ''), p_montant_net, COALESCE(p_mt_remise, 0),
    v_nom_fourn_snap, v_tel_fourn_snap, COALESCE(p_id_utilisateur, 0)
  )
  RETURNING id_bon_commande INTO v_id_bon_commande;

  v_tokens := string_to_array(p_articles_string, '#');

  FOREACH v_token IN ARRAY v_tokens
  LOOP
    CONTINUE WHEN TRIM(v_token) = '';
    v_parts := string_to_array(v_token, '-');
    -- [PHASE1] garde élargie 3..5
    IF array_length(v_parts, 1) NOT BETWEEN 3 AND 5 THEN
      RAISE EXCEPTION 'Format article invalide : %. Attendu: id-qty-cout[-remise[-prix_origine]]', v_token;
    END IF;
    BEGIN
      v_id_produit   := v_parts[1]::INTEGER;
      v_quantite     := v_parts[2]::NUMERIC;
      v_cout_revient := v_parts[3]::NUMERIC;

      -- [PHASE1] lecture 4-5 NULL-safe
      v_remise_pct   := CASE WHEN array_length(v_parts,1) >= 4 AND v_parts[4] IS NOT NULL AND v_parts[4] <> ''
                             THEN v_parts[4]::NUMERIC(5,2) ELSE NULL END;
      v_prix_origine := CASE WHEN array_length(v_parts,1) >= 5 AND v_parts[5] IS NOT NULL AND v_parts[5] <> ''
                             THEN v_parts[5]::NUMERIC(10,2) ELSE NULL END;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Valeur numérique invalide dans le token article : %', v_token;
    END;
    IF v_quantite <= 0 THEN
      RAISE EXCEPTION 'Quantité doit être > 0 pour l''article id_produit=%', v_id_produit;
    END IF;
    IF v_cout_revient < 0 THEN
      RAISE EXCEPTION 'Coût de revient doit être ≥ 0 pour l''article id_produit=%', v_id_produit;
    END IF;

    SELECT nom_produit INTO v_nom_produit_snap
    FROM produit_service
    WHERE id_produit   = v_id_produit
      AND id_structure = p_id_structure;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit id=% introuvable dans la structure %', v_id_produit, p_id_structure;
    END IF;

    -- [PHASE1] INSERT étendu
    INSERT INTO bon_commande_details (
      id_bon_commande, id_structure, id_produit, nom_produit_snap, quantite, cout_revient, remise_pct, prix_origine
    )
    VALUES (
      v_id_bon_commande, p_id_structure, v_id_produit, v_nom_produit_snap, v_quantite, v_cout_revient, v_remise_pct, v_prix_origine
    );
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM bon_commande_details WHERE id_bon_commande = v_id_bon_commande) THEN
    RAISE EXCEPTION 'Aucune ligne article valide trouvée dans articles_string';
  END IF;

  RETURN json_build_object(
    'success', true, 'id_bon_commande', v_id_bon_commande,
    'num_bc', v_num_bc, 'message', 'Bon de commande créé avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'id_bon_commande', NULL, 'num_bc', NULL,
      'message', 'Erreur interne : ' || SQLERRM);
END;
$function$;


-- ============================================================================
-- ETAPE 12 — edit_bon_commande (decision 1 PO)
-- ============================================================================
\echo ETAPE 12/15 — edit_bon_commande

CREATE OR REPLACE FUNCTION public.edit_bon_commande(
    p_id_bon_commande integer,
    p_id_structure integer,
    p_date_bon_commande date DEFAULT NULL::date,
    p_id_fournisseur integer DEFAULT NULL::integer,
    p_description text DEFAULT NULL::text,
    p_montant_net numeric DEFAULT NULL::numeric,
    p_articles_string text DEFAULT NULL::text,
    p_mt_remise numeric DEFAULT NULL::numeric,
    p_id_etat integer DEFAULT NULL::integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_etat_actuel       INTEGER;
  v_nom_fourn_snap    VARCHAR(200);
  v_tel_fourn_snap    VARCHAR(20);
  v_tokens            TEXT[];
  v_token             TEXT;
  v_parts             TEXT[];
  v_id_produit        INTEGER;
  v_quantite          NUMERIC;
  v_cout_revient      NUMERIC;
  v_nom_produit_snap  VARCHAR(200);
  v_transition_ok     BOOLEAN := FALSE;
  v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
  v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
  SELECT id_etat INTO v_etat_actuel
  FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Bon de commande introuvable ou accès refusé');
  END IF;

  IF v_etat_actuel IN (3, 4) THEN
    RETURN json_build_object('success', false, 'message',
      'Ce bon de commande est ' ||
      CASE v_etat_actuel WHEN 3 THEN 'livré' ELSE 'annulé' END ||
      ' et ne peut plus être modifié');
  END IF;

  IF p_id_etat IS NOT NULL AND p_id_etat <> v_etat_actuel THEN
    v_transition_ok := (v_etat_actuel = 1 AND p_id_etat = 2)
                    OR (v_etat_actuel = 1 AND p_id_etat = 4)
                    OR (v_etat_actuel = 2 AND p_id_etat = 1)
                    OR (v_etat_actuel = 2 AND p_id_etat = 3)
                    OR (v_etat_actuel = 2 AND p_id_etat = 4);
    IF NOT v_transition_ok THEN
      RETURN json_build_object('success', false, 'message',
        'Transition de statut non autorisée : ' || v_etat_actuel::TEXT || ' → ' || p_id_etat::TEXT);
    END IF;
  END IF;

  IF p_montant_net IS NOT NULL AND p_montant_net < 0 THEN
    RETURN json_build_object('success', false, 'message', 'Le montant net doit être supérieur ou égal à 0');
  END IF;
  IF p_mt_remise IS NOT NULL AND p_mt_remise < 0 THEN
    RETURN json_build_object('success', false, 'message', 'La remise doit être supérieure ou égale à 0');
  END IF;

  IF p_id_fournisseur IS NOT NULL THEN
    SELECT nom_fournisseur, tel_fournisseur
    INTO v_nom_fourn_snap, v_tel_fourn_snap
    FROM fournisseur
    WHERE id_fournisseur = p_id_fournisseur
      AND id_structure   = p_id_structure
      AND actif          = TRUE;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'Fournisseur introuvable, inactif ou accès refusé');
    END IF;
  END IF;

  UPDATE bon_commande
  SET
    date_bon_commande    = COALESCE(p_date_bon_commande,  date_bon_commande),
    id_fournisseur       = COALESCE(p_id_fournisseur,     id_fournisseur),
    nom_fournisseur_snap = COALESCE(v_nom_fourn_snap,     nom_fournisseur_snap),
    tel_fournisseur_snap = COALESCE(v_tel_fourn_snap,     tel_fournisseur_snap),
    description          = COALESCE(NULLIF(TRIM(p_description), ''), description),
    montant_net          = COALESCE(p_montant_net,         montant_net),
    mt_remise            = COALESCE(p_mt_remise,           mt_remise),
    id_etat              = COALESCE(p_id_etat,             id_etat),
    date_modification    = NOW()
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF p_articles_string IS NOT NULL AND TRIM(p_articles_string) <> '' THEN
    DELETE FROM bon_commande_details WHERE id_bon_commande = p_id_bon_commande;
    v_tokens := string_to_array(p_articles_string, '#');
    FOREACH v_token IN ARRAY v_tokens
    LOOP
      CONTINUE WHEN TRIM(v_token) = '';
      v_parts := string_to_array(v_token, '-');
      -- [PHASE1] garde élargie 3..5
      IF array_length(v_parts, 1) NOT BETWEEN 3 AND 5 THEN
        RAISE EXCEPTION 'Format article invalide : %. Attendu: id-qty-cout[-remise[-prix_origine]]', v_token;
      END IF;
      BEGIN
        v_id_produit   := v_parts[1]::INTEGER;
        v_quantite     := v_parts[2]::NUMERIC;
        v_cout_revient := v_parts[3]::NUMERIC;

        -- [PHASE1] lecture 4-5 NULL-safe
        v_remise_pct   := CASE WHEN array_length(v_parts,1) >= 4 AND v_parts[4] IS NOT NULL AND v_parts[4] <> ''
                               THEN v_parts[4]::NUMERIC(5,2) ELSE NULL END;
        v_prix_origine := CASE WHEN array_length(v_parts,1) >= 5 AND v_parts[5] IS NOT NULL AND v_parts[5] <> ''
                               THEN v_parts[5]::NUMERIC(10,2) ELSE NULL END;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Valeur numérique invalide dans le token article : %', v_token;
      END;
      IF v_quantite <= 0 THEN
        RAISE EXCEPTION 'Quantité doit être > 0 pour l''article id_produit=%', v_id_produit;
      END IF;
      IF v_cout_revient < 0 THEN
        RAISE EXCEPTION 'Coût de revient doit être ≥ 0 pour l''article id_produit=%', v_id_produit;
      END IF;

      SELECT nom_produit INTO v_nom_produit_snap
      FROM produit_service
      WHERE id_produit   = v_id_produit
        AND id_structure = p_id_structure;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit id=% introuvable dans la structure %', v_id_produit, p_id_structure;
      END IF;

      -- [PHASE1] INSERT étendu
      INSERT INTO bon_commande_details (
        id_bon_commande, id_structure, id_produit, nom_produit_snap, quantite, cout_revient, remise_pct, prix_origine
      )
      VALUES (
        p_id_bon_commande, p_id_structure, v_id_produit, v_nom_produit_snap, v_quantite, v_cout_revient, v_remise_pct, v_prix_origine
      );
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM bon_commande_details WHERE id_bon_commande = p_id_bon_commande) THEN
      RAISE EXCEPTION 'Aucune ligne article valide après remplacement';
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Bon de commande modifié avec succès');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Erreur interne : ' || SQLERRM);
END;
$function$;


-- ============================================================================
-- ETAPE 13 — add_new_devis_complet (decision 1 PO)
-- ============================================================================
\echo ETAPE 13/15 — add_new_devis_complet

CREATE OR REPLACE FUNCTION public.add_new_devis_complet(
    p_date_devis date,
    p_id_structure integer,
    p_tel_client character varying,
    p_nom_client_payeur character varying,
    p_adresse_client character varying,
    p_montant numeric,
    p_articles_string text,
    p_lignes_equipements jsonb DEFAULT NULL::jsonb,
    p_id_utilisateur integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_id_devis INTEGER;
    v_articles_array TEXT[];
    v_article_parts TEXT[];
    v_article_string TEXT;
    v_detail_ids INTEGER[] := '{}';
    v_detail_id INTEGER;
    v_num_devis VARCHAR(19);
    v_month INTEGER;
    v_year INTEGER;
    v_nb_lignes_equipements INTEGER := 0;
    v_nb_lignes_articles INTEGER := 0;
    v_montant_equipement NUMERIC(10,2) := 0;
    v_montant_articles NUMERIC(10,2) := 0;
    v_ligne JSONB;

    v_count INTEGER := 0;
    v_expected_count INTEGER;
    v_id_produit INTEGER;
    v_quantite NUMERIC(10,3);
    v_prix NUMERIC(10,2);
    v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
    v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
    -- ========================================
    -- VALIDATION DES PARAMÈTRES OBLIGATOIRES
    -- ========================================

    IF p_id_structure IS NULL OR p_id_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_STRUCTURE',
            'message', 'L''ID structure doit être un entier positif valide',
            'data', NULL
        );
    END IF;

    IF p_tel_client IS NULL OR LENGTH(TRIM(p_tel_client)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_PHONE',
            'message', 'Le numéro de téléphone client est obligatoire',
            'data', NULL
        );
    END IF;

    IF p_nom_client_payeur IS NULL OR LENGTH(TRIM(p_nom_client_payeur)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_NAME',
            'message', 'Le nom du client est obligatoire',
            'data', NULL
        );
    END IF;

    -- Vérifier que la structure existe
    IF NOT EXISTS (SELECT 1 FROM public.structures WHERE id_structure = p_id_structure) THEN
        RETURN json_build_object(
            'success', false,
            'code', 'STRUCTURE_NOT_FOUND',
            'message', 'La structure avec l''ID ' || p_id_structure || ' n''existe pas',
            'data', NULL
        );
    END IF;

    -- ========================================
    -- VALIDATION DE p_articles_string
    -- ========================================

    IF p_articles_string IS NULL OR LENGTH(TRIM(p_articles_string)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_ARTICLES',
            'message', 'La liste des articles est obligatoire (format: id-qte-prix#id-qte-prix)',
            'data', NULL
        );
    END IF;

    -- ========================================
    -- VALIDATION DES LIGNES D'ÉQUIPEMENTS
    -- ========================================

    IF p_lignes_equipements IS NOT NULL AND jsonb_array_length(p_lignes_equipements) > 0 THEN
        v_nb_lignes_equipements := jsonb_array_length(p_lignes_equipements);

        FOR i IN 0..v_nb_lignes_equipements - 1 LOOP
            v_ligne := p_lignes_equipements->i;

            IF NOT (v_ligne ? 'designation') OR COALESCE(v_ligne->>'designation', '') = '' THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'INVALID_LINE',
                    'message', 'Équipement ligne ' || (i + 1) || ': la désignation est obligatoire',
                    'data', NULL
                );
            END IF;

            IF NOT (v_ligne ? 'qte') OR COALESCE((v_ligne->>'qte')::NUMERIC, 0) <= 0 THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'INVALID_LINE',
                    'message', 'Équipement ligne ' || (i + 1) || ': la quantité doit être supérieure à 0',
                    'data', NULL
                );
            END IF;

            IF NOT (v_ligne ? 'pu') OR COALESCE((v_ligne->>'pu')::NUMERIC, 0) < 0 THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'INVALID_LINE',
                    'message', 'Équipement ligne ' || (i + 1) || ': le prix unitaire doit être positif',
                    'data', NULL
                );
            END IF;

            v_montant_equipement := v_montant_equipement + (
                COALESCE((v_ligne->>'qte')::NUMERIC, 0) * COALESCE((v_ligne->>'pu')::NUMERIC, 0)
            );
        END LOOP;
    END IF;

    -- ========================================
    -- PRÉ-VALIDATION DES ARTICLES
    -- ========================================

    v_articles_array := string_to_array(TRIM(BOTH '#' FROM p_articles_string), '#');
    v_expected_count := COALESCE(array_length(v_articles_array, 1), 0);

    IF v_expected_count = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'NO_ARTICLES',
            'message', 'Aucun article valide trouvé dans la chaîne',
            'data', NULL
        );
    END IF;

    -- Pré-validation de tous les articles avant insertion
    FOR i IN 1..v_expected_count LOOP
        v_article_string := v_articles_array[i];
        v_article_parts := string_to_array(v_article_string, '-');

        -- [PHASE1] garde élargie 3..5
        IF array_length(v_article_parts, 1) NOT BETWEEN 3 AND 5 THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_FORMAT',
                'message', 'Format article invalide: "' || v_article_string || '" (attendu: id-quantite-prix[-remise[-prix_origine]])',
                'data', NULL
            );
        END IF;

        BEGIN
            v_id_produit := v_article_parts[1]::INTEGER;
            v_quantite := v_article_parts[2]::NUMERIC(10,3);
            v_prix := v_article_parts[3]::NUMERIC(10,2);
        EXCEPTION
            WHEN invalid_text_representation THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'CONVERSION_ERROR',
                    'message', 'Conversion impossible pour article: "' || v_article_string || '"',
                    'data', NULL
                );
        END;

        IF v_id_produit <= 0 OR v_quantite <= 0 OR v_prix < 0 THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_VALUES',
                'message', 'Valeurs invalides - Article ' || i || ': ID=' || v_id_produit || ', QTE=' || v_quantite || ', PRIX=' || v_prix,
                'data', NULL
            );
        END IF;

        -- Vérifier que le produit existe
        IF NOT EXISTS (
            SELECT 1 FROM public.produit_service
            WHERE id_produit = v_id_produit AND id_structure = p_id_structure
        ) THEN
            RETURN json_build_object(
                'success', false,
                'code', 'PRODUCT_NOT_FOUND',
                'message', 'Le produit avec l''ID ' || v_id_produit || ' n''existe pas pour cette structure',
                'data', NULL
            );
        END IF;

        -- Calculer le montant des articles
        v_montant_articles := v_montant_articles + (v_quantite * v_prix);
    END LOOP;

    v_nb_lignes_articles := v_expected_count;

    -- ========================================
    -- GÉNÉRATION DU NUMÉRO DE DEVIS
    -- ========================================

    v_month := EXTRACT(MONTH FROM p_date_devis);
    v_year := EXTRACT(YEAR FROM p_date_devis);

    v_num_devis := 'DEV-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-' ||
                   p_id_structure::TEXT || '-' ||
                   LPAD((
                       SELECT COALESCE(MAX(SUBSTRING(num_devis FROM '-(\d+)$')::INTEGER), 0) + 1
                       FROM public.devis
                       WHERE id_structure = p_id_structure
                         AND nmois = v_month
                         AND nannee = v_year
                   )::TEXT, 4, '0');

    -- ========================================
    -- INSERTION DU DEVIS
    -- ========================================

    INSERT INTO public.devis (
        date_devis,
        num_devis,
        id_structure,
        nannee,
        nmois,
        tel_client,
        nom_client_payeur,adresse,
        montant,
        montant_equipement,
        lignes_equipements,
        id_utilisateur
    )
    VALUES (
        p_date_devis,
        v_num_devis,
        p_id_structure,
        v_year,
        v_month,
        TRIM(p_tel_client),
        TRIM(p_nom_client_payeur),
        TRIM(p_adresse_client),
        COALESCE(p_montant, v_montant_articles),
        v_montant_equipement,
        p_lignes_equipements,
        p_id_utilisateur
    )
    RETURNING id_devis INTO v_id_devis;

    -- ========================================
    -- INSERTION DES DÉTAILS D'ARTICLES
    -- ========================================

    FOR i IN 1..v_expected_count LOOP
        v_article_string := v_articles_array[i];
        v_article_parts := string_to_array(v_article_string, '-');

        v_id_produit := v_article_parts[1]::INTEGER;
        v_quantite := v_article_parts[2]::NUMERIC(10,3);
        v_prix := v_article_parts[3]::NUMERIC(10,2);

        -- [PHASE1] lecture 4-5 NULL-safe
        v_remise_pct   := CASE WHEN array_length(v_article_parts,1) >= 4 AND v_article_parts[4] IS NOT NULL AND v_article_parts[4] <> ''
                               THEN v_article_parts[4]::NUMERIC(5,2) ELSE NULL END;
        v_prix_origine := CASE WHEN array_length(v_article_parts,1) >= 5 AND v_article_parts[5] IS NOT NULL AND v_article_parts[5] <> ''
                               THEN v_article_parts[5]::NUMERIC(10,2) ELSE NULL END;

        -- [PHASE1] INSERT étendu
        INSERT INTO public.detail_devis (id_devis, id_produit, quantite, prix, remise_pct, prix_origine)
        VALUES (v_id_devis, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
        RETURNING id_detail INTO v_detail_id;

        v_detail_ids := array_append(v_detail_ids, v_detail_id);
        v_count := v_count + 1;
    END LOOP;

    -- ========================================
    -- RETOUR DU RÉSULTAT
    -- ========================================

    RETURN json_build_object(
        'success', true,
        'code', 'DEVIS_CREATED',
        'message', 'Devis ' || v_num_devis || ' créé avec succès',
        'data', json_build_object(
            'id_devis', v_id_devis,
            'num_devis', v_num_devis,
            'date_devis', p_date_devis,
            'nom_client', TRIM(p_nom_client_payeur),
            'adresse_client', TRIM(p_adresse_client),
            'tel_client', TRIM(p_tel_client),
            'montant_articles', v_montant_articles,
            'montant_equipement', v_montant_equipement,
            'montant_total', v_montant_articles + v_montant_equipement,
            'nb_articles', v_nb_lignes_articles,
            'nb_equipements', v_nb_lignes_equipements,
            'detail_ids', v_detail_ids
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'code', 'ERROR',
            'message', 'Erreur lors de la création du devis: ' || SQLERRM,
            'data', json_build_object('sqlstate', SQLSTATE)
        );
END;
$function$;


-- ============================================================================
-- ETAPE 14 — maj_devis (decision 1 PO)
-- ============================================================================
\echo ETAPE 14/15 — maj_devis

CREATE OR REPLACE FUNCTION public.maj_devis(
    p_date_devis date,
    p_id_structure integer,
    p_tel_client character varying,
    p_nom_client_payeur character varying,
    p_adresse_client character varying,
    p_montant numeric,
    p_services_string text,
    p_lignes_equipements jsonb DEFAULT NULL::jsonb,
    p_id_utilisateur integer DEFAULT 0,
    pid_devis integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_services_array TEXT[];
    v_service_parts TEXT[];
    v_service_string TEXT;
    v_detail_ids INTEGER[] := '{}';
    v_detail_id INTEGER;
    v_num_devis VARCHAR(19);
    v_nb_lignes_equipements INTEGER := 0;
    v_nb_lignes_services INTEGER := 0;
    v_montant_equipement NUMERIC(10,2) := 0;
    v_montant_services NUMERIC(10,2) := 0;
    v_ligne JSONB;
    v_deleted_count INTEGER;

    v_count INTEGER := 0;
    v_expected_count INTEGER;
    v_id_produit INTEGER;
    v_quantite NUMERIC(10,3);
    v_prix NUMERIC(10,2);
    v_remise_pct   NUMERIC(5,2);   -- [PHASE1]
    v_prix_origine NUMERIC(10,2);  -- [PHASE1]
BEGIN
    -- ========================================
    -- VALIDATION DU DEVIS EXISTANT
    -- ========================================

    IF pid_devis IS NULL OR pid_devis <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_DEVIS_ID',
            'message', 'L''ID du devis doit être un entier positif valide',
            'data', NULL
        );
    END IF;

    SELECT num_devis INTO v_num_devis
    FROM public.devis
    WHERE id_devis = pid_devis AND id_structure = p_id_structure;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'code', 'DEVIS_NOT_FOUND',
            'message', 'Le devis avec l''ID ' || pid_devis || ' n''existe pas pour la structure ' || p_id_structure,
            'data', NULL
        );
    END IF;

    -- ========================================
    -- VALIDATION DES PARAMÈTRES OBLIGATOIRES
    -- ========================================

    IF p_id_structure IS NULL OR p_id_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_STRUCTURE',
            'message', 'L''ID structure doit être un entier positif valide',
            'data', NULL
        );
    END IF;

    IF p_tel_client IS NULL OR LENGTH(TRIM(p_tel_client)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_PHONE',
            'message', 'Le numéro de téléphone client est obligatoire',
            'data', NULL
        );
    END IF;

    IF p_nom_client_payeur IS NULL OR LENGTH(TRIM(p_nom_client_payeur)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_NAME',
            'message', 'Le nom du client est obligatoire',
            'data', NULL
        );
    END IF;

    -- ========================================
    -- VALIDATION DE p_services_string
    -- ========================================

    IF p_services_string IS NULL OR LENGTH(TRIM(p_services_string)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_SERVICES',
            'message', 'La liste des services est obligatoire (format: id-qte-prix#id-qte-prix)',
            'data', NULL
        );
    END IF;

    -- ========================================
    -- VALIDATION DES LIGNES D'ÉQUIPEMENTS
    -- ========================================

    IF p_lignes_equipements IS NOT NULL AND jsonb_array_length(p_lignes_equipements) > 0 THEN
        v_nb_lignes_equipements := jsonb_array_length(p_lignes_equipements);

        FOR i IN 0..v_nb_lignes_equipements - 1 LOOP
            v_ligne := p_lignes_equipements->i;

            IF NOT (v_ligne ? 'designation') OR COALESCE(v_ligne->>'designation', '') = '' THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'INVALID_LINE',
                    'message', 'Équipement ligne ' || (i + 1) || ': la désignation est obligatoire',
                    'data', NULL
                );
            END IF;

            IF NOT (v_ligne ? 'qte') OR COALESCE((v_ligne->>'qte')::NUMERIC, 0) <= 0 THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'INVALID_LINE',
                    'message', 'Équipement ligne ' || (i + 1) || ': la quantité doit être supérieure à 0',
                    'data', NULL
                );
            END IF;

            IF NOT (v_ligne ? 'pu') OR COALESCE((v_ligne->>'pu')::NUMERIC, 0) < 0 THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'INVALID_LINE',
                    'message', 'Équipement ligne ' || (i + 1) || ': le prix unitaire doit être positif',
                    'data', NULL
                );
            END IF;

            v_montant_equipement := v_montant_equipement + (
                COALESCE((v_ligne->>'qte')::NUMERIC, 0) * COALESCE((v_ligne->>'pu')::NUMERIC, 0)
            );
        END LOOP;
    END IF;

    -- ========================================
    -- PRÉ-VALIDATION DES SERVICES
    -- ========================================

    v_services_array := string_to_array(TRIM(BOTH '#' FROM p_services_string), '#');
    v_expected_count := COALESCE(array_length(v_services_array, 1), 0);

    IF v_expected_count = 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'NO_SERVICES',
            'message', 'Aucun service valide trouvé dans la chaîne',
            'data', NULL
        );
    END IF;

    -- Pré-validation de tous les services avant modification
    FOR i IN 1..v_expected_count LOOP
        v_service_string := v_services_array[i];
        v_service_parts := string_to_array(v_service_string, '-');

        -- [PHASE1] garde élargie 3..5
        IF array_length(v_service_parts, 1) NOT BETWEEN 3 AND 5 THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_FORMAT',
                'message', 'Format service invalide: "' || v_service_string || '" (attendu: id-quantite-prix[-remise[-prix_origine]])',
                'data', NULL
            );
        END IF;

        BEGIN
            v_id_produit := v_service_parts[1]::INTEGER;
            v_quantite := v_service_parts[2]::NUMERIC(10,3);
            v_prix := v_service_parts[3]::NUMERIC(10,2);
        EXCEPTION
            WHEN invalid_text_representation THEN
                RETURN json_build_object(
                    'success', false,
                    'code', 'CONVERSION_ERROR',
                    'message', 'Conversion impossible pour service: "' || v_service_string || '"',
                    'data', NULL
                );
        END;

        IF v_id_produit <= 0 OR v_quantite <= 0 OR v_prix < 0 THEN
            RETURN json_build_object(
                'success', false,
                'code', 'INVALID_VALUES',
                'message', 'Valeurs invalides - Service ' || i || ': ID=' || v_id_produit || ', QTE=' || v_quantite || ', PRIX=' || v_prix,
                'data', NULL
            );
        END IF;

        -- Vérifier que le produit/service existe
        IF NOT EXISTS (
            SELECT 1 FROM public.produit_service
            WHERE id_produit = v_id_produit AND id_structure = p_id_structure
        ) THEN
            RETURN json_build_object(
                'success', false,
                'code', 'SERVICE_NOT_FOUND',
                'message', 'Le service avec l''ID ' || v_id_produit || ' n''existe pas pour cette structure',
                'data', NULL
            );
        END IF;

        -- Calculer le montant des services
        v_montant_services := v_montant_services + (v_quantite * v_prix);
    END LOOP;

    v_nb_lignes_services := v_expected_count;

    -- ========================================
    -- SUPPRESSION DES ANCIENS DÉTAILS
    -- ========================================

    DELETE FROM public.detail_devis
    WHERE id_devis = pid_devis;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- ========================================
    -- MISE À JOUR DU DEVIS
    -- ========================================

    UPDATE public.devis SET
        date_devis = p_date_devis,
        tel_client = TRIM(p_tel_client),
        nom_client_payeur = TRIM(p_nom_client_payeur),
        adresse = TRIM(p_adresse_client),
        montant = COALESCE(p_montant, v_montant_services),
        montant_equipement = v_montant_equipement,
        lignes_equipements = p_lignes_equipements,
        id_utilisateur = p_id_utilisateur,
        tms_update = NOW()
    WHERE id_devis = pid_devis;

    -- ========================================
    -- INSERTION DES NOUVEAUX DÉTAILS
    -- ========================================

    FOR i IN 1..v_expected_count LOOP
        v_service_string := v_services_array[i];
        v_service_parts := string_to_array(v_service_string, '-');

        v_id_produit := v_service_parts[1]::INTEGER;
        v_quantite := v_service_parts[2]::NUMERIC(10,3);
        v_prix := v_service_parts[3]::NUMERIC(10,2);

        -- [PHASE1] lecture 4-5 NULL-safe
        v_remise_pct   := CASE WHEN array_length(v_service_parts,1) >= 4 AND v_service_parts[4] IS NOT NULL AND v_service_parts[4] <> ''
                               THEN v_service_parts[4]::NUMERIC(5,2) ELSE NULL END;
        v_prix_origine := CASE WHEN array_length(v_service_parts,1) >= 5 AND v_service_parts[5] IS NOT NULL AND v_service_parts[5] <> ''
                               THEN v_service_parts[5]::NUMERIC(10,2) ELSE NULL END;

        -- [PHASE1] INSERT étendu
        INSERT INTO public.detail_devis (id_devis, id_produit, quantite, prix, remise_pct, prix_origine)
        VALUES (pid_devis, v_id_produit, v_quantite, v_prix, v_remise_pct, v_prix_origine)
        RETURNING id_detail INTO v_detail_id;

        v_detail_ids := array_append(v_detail_ids, v_detail_id);
        v_count := v_count + 1;
    END LOOP;

    -- ========================================
    -- RETOUR DU RÉSULTAT
    -- ========================================

    RETURN json_build_object(
        'success', true,
        'code', 'DEVIS_UPDATED',
        'message', 'Devis ' || v_num_devis || ' mis à jour avec succès',
        'data', json_build_object(
            'id_devis', pid_devis,
            'num_devis', v_num_devis,
            'date_devis', p_date_devis,
            'nom_client', TRIM(p_nom_client_payeur),
            'tel_client', TRIM(p_tel_client),
            'adresse', TRIM(p_adresse_client),
            'montant_services', v_montant_services,
            'montant_equipement', v_montant_equipement,
            'montant_total', v_montant_services + v_montant_equipement,
            'nb_services', v_nb_lignes_services,
            'nb_equipements', v_nb_lignes_equipements,
            'lignes_supprimees', v_deleted_count,
            'lignes_ajoutees', v_count,
            'detail_ids', v_detail_ids
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'code', 'ERROR',
            'message', 'Erreur lors de la mise à jour du devis: ' || SQLERRM,
            'data', json_build_object('sqlstate', SQLSTATE)
        );
END;
$function$;


-- ============================================================================
-- ETAPE 15 — modifier_facturecom (decision 4 PO : log audit étendu)
--            Garde élargie + lecture 4-5 + UPDATE/INSERT étendus + snapshots
--            étendus (articles_avant/articles_apres avec remise_pct/prix_origine)
-- ============================================================================
\echo ETAPE 15/15 — modifier_facturecom

CREATE OR REPLACE FUNCTION public.modifier_facturecom(
    pid_structure integer,
    pid_facture integer,
    pid_utilisateur integer,
    p_articles_string character varying,
    p_mt_remise numeric
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_fac                   RECORD;
    v_login_user            VARCHAR(100);
    v_tel_client            VARCHAR(9);

    v_articles_avant        JSONB;
    v_montant_avant         NUMERIC(10,2);
    v_remise_avant          NUMERIC(10,2);
    v_acompte_avant         NUMERIC(10,2);
    v_net_avant             NUMERIC(10,2);

    v_articles_array        TEXT[];
    v_article_parts         TEXT[];
    v_article_str           TEXT;
    v_new_articles          JSONB := '[]'::JSONB;
    v_brut_cible            NUMERIC(10,2) := 0;

    v_new_id_produit        INTEGER;
    v_new_quantite          REAL;
    v_new_prix              NUMERIC(10,2);
    v_new_remise_pct        NUMERIC(5,2);    -- [PHASE1]
    v_new_prix_origine      NUMERIC(10,2);   -- [PHASE1]
    v_delta_qte             REAL;
    v_old_map               JSONB := '{}'::JSONB;
    v_new_entry             JSONB;
    v_new_art               JSONB;

    v_montant_apres         NUMERIC(10,2);
    v_net_apres             NUMERIC(10,2);
    v_acompte_apres         NUMERIC(10,2);
    v_articles_apres        JSONB;

    v_ecart                 NUMERIC(10,2);
    v_type_ajustement       VARCHAR(20);
    v_num_recu              VARCHAR(75);
    v_uuid_trx              VARCHAR(75);
    v_epoch_ms              BIGINT;

    v_step                  VARCHAR(50) := 'INIT';
    r                       RECORD;
    v_i                     INTEGER;
BEGIN
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

    -- ETAPE 2 : Garde-fou date
    v_step := 'DATE_GUARD';
    IF v_fac.date_facture <> CURRENT_DATE THEN
        RETURN json_build_object('success', false, 'code', 'DATE_LOCKED',
            'message', 'Seules les ventes du jour sont modifiables', 'step', v_step);
    END IF;

    -- ETAPE 3 : Vérifier PAYEE
    v_step := 'CHECK_ETAT';
    IF v_fac.id_etat <> 2 THEN
        RETURN json_build_object('success', false, 'code', 'NOT_PAID',
            'message', 'Seules les ventes payees sont modifiables en V1', 'step', v_step);
    END IF;

    -- ETAPE 4 : Bloquer si reversée
    v_step := 'CHECK_REVERSER';
    IF v_fac.mt_reverser = TRUE THEN
        RETURN json_build_object('success', false, 'code', 'INVOICE_REVERSED',
            'message', 'Vente deja reversee, modification interdite', 'step', v_step);
    END IF;

    -- ETAPE 5 : Récupérer login
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

    -- ETAPE 6 : Snapshot AVANT + old_map
    v_step := 'SNAPSHOT_AVANT';
    v_montant_avant := v_fac.montant;
    v_remise_avant  := v_fac.mt_remise;
    v_acompte_avant := v_fac.mt_acompte;
    v_net_avant     := v_montant_avant - v_remise_avant;

    -- [PHASE1] snapshot AVANT étendu : + remise_pct, prix_origine
    SELECT COALESCE(
        json_agg(json_build_object(
            'id_produit', d.id_produit, 'quantite', d.quantite,
            'prix', d.prix, 'sous_total', (d.quantite * d.prix),
            'remise_pct', d.remise_pct, 'prix_origine', d.prix_origine
        ) ORDER BY d.id_produit), '[]'
    )::JSONB INTO v_articles_avant
    FROM public.detail_facture_com d WHERE d.id_facture = pid_facture;

    FOR r IN SELECT d.id_produit, d.quantite, d.prix
             FROM public.detail_facture_com d WHERE d.id_facture = pid_facture
    LOOP
        v_old_map := jsonb_set(v_old_map, ARRAY[r.id_produit::TEXT],
            json_build_object('qte', r.quantite, 'prix', r.prix)::JSONB, TRUE);
    END LOOP;

    -- ETAPE 7 : Parser nouveaux articles
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

        -- [PHASE1] garde élargie 3..5
        IF array_length(v_article_parts, 1) NOT BETWEEN 3 AND 5 THEN
            RETURN json_build_object('success', false, 'code', 'INVALID_ARTICLE_FORMAT',
                'message', 'Format article invalide: ' || v_article_str, 'step', v_step);
        END IF;

        BEGIN
            v_new_id_produit := v_article_parts[1]::INTEGER;
            v_new_quantite   := v_article_parts[2]::REAL;
            v_new_prix       := v_article_parts[3]::NUMERIC(10,2);

            -- [PHASE1] lecture 4-5 NULL-safe
            v_new_remise_pct   := CASE WHEN array_length(v_article_parts,1) >= 4 AND v_article_parts[4] IS NOT NULL AND v_article_parts[4] <> ''
                                       THEN v_article_parts[4]::NUMERIC(5,2) ELSE NULL END;
            v_new_prix_origine := CASE WHEN array_length(v_article_parts,1) >= 5 AND v_article_parts[5] IS NOT NULL AND v_article_parts[5] <> ''
                                       THEN v_article_parts[5]::NUMERIC(10,2) ELSE NULL END;
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object('success', false, 'code', 'INVALID_ARTICLE_FORMAT',
                'message', 'Conversion impossible: ' || v_article_str, 'step', v_step);
        END;

        IF v_new_id_produit <= 0 OR v_new_quantite <= 0 OR v_new_prix < 0 THEN
            RETURN json_build_object('success', false, 'code', 'INVALID_ARTICLE_FORMAT',
                'message', 'Valeurs invalides: ' || v_article_str, 'step', v_step);
        END IF;

        -- [PHASE1] JSON étendu (transporte remise_pct/prix_origine dans v_new_articles)
        v_new_articles := v_new_articles || json_build_object(
            'id_produit', v_new_id_produit, 'quantite', v_new_quantite, 'prix', v_new_prix,
            'remise_pct', v_new_remise_pct, 'prix_origine', v_new_prix_origine
        )::JSONB;
        v_brut_cible := v_brut_cible + (v_new_quantite * v_new_prix);
    END LOOP;

    -- ETAPE 8 : Valider remise
    v_step := 'CHECK_REMISE';
    IF p_mt_remise < 0 OR p_mt_remise >= v_brut_cible THEN
        RETURN json_build_object('success', false, 'code', 'INVALID_REMISE',
            'message', 'Remise invalide (doit etre >= 0 et < sous-total)', 'step', v_step);
    END IF;

    -- ETAPE 9 : Mutations stock + détails
    v_step := 'STOCK_AND_DETAILS';

    -- 9a : produits anciens
    FOR r IN SELECT d.id_produit, d.quantite, d.prix
             FROM public.detail_facture_com d WHERE d.id_facture = pid_facture
    LOOP
        SELECT elem INTO v_new_entry
        FROM jsonb_array_elements(v_new_articles) elem
        WHERE (elem->>'id_produit')::INTEGER = r.id_produit LIMIT 1;

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
            -- [PHASE1] récupération remise_pct/prix_origine du JSON
            v_new_remise_pct   := COALESCE((v_new_entry->>'remise_pct')::NUMERIC(5,2), NULL);
            v_new_prix_origine := COALESCE((v_new_entry->>'prix_origine')::NUMERIC(10,2), NULL);
            v_delta_qte    := v_new_quantite - r.quantite;

            -- [PHASE1] UPDATE étendu (remise_pct/prix_origine)
            -- NB : trigger WHEN exclut ces colonnes → recalcul seulement si qt/prix/id_facture changent.
            UPDATE public.detail_facture_com
            SET quantite = v_new_quantite, prix = v_new_prix,
                remise_pct = v_new_remise_pct, prix_origine = v_new_prix_origine
            WHERE id_facture = pid_facture AND id_produit = r.id_produit;

            IF v_delta_qte > 0 THEN
                INSERT INTO public.mouvement_stock (
                    id_produit, id_structure, type_mouvement, date_mouvement,
                    quantite, prix_unitaire, description, tms_create, created_by
                ) VALUES (r.id_produit, pid_structure, 'SORTIE', CURRENT_DATE,
                    v_delta_qte, v_new_prix::REAL,
                    'Modification vente - Facture ' || v_fac.num_facture,
                    NOW(), 'MODIF-' || v_login_user);
            ELSIF v_delta_qte < 0 THEN
                INSERT INTO public.mouvement_stock (
                    id_produit, id_structure, type_mouvement, date_mouvement,
                    quantite, prix_unitaire, description, tms_create, created_by
                ) VALUES (r.id_produit, pid_structure, 'ENTREE', CURRENT_DATE,
                    -v_delta_qte, v_new_prix::REAL,
                    'Modification vente - Facture ' || v_fac.num_facture,
                    NOW(), 'MODIF-' || v_login_user);
            END IF;
        END IF;
    END LOOP;

    -- 9b : produits nouveaux (trigger SORTIE auto sur INSERT)
    FOR v_new_art IN SELECT * FROM jsonb_array_elements(v_new_articles)
    LOOP
        v_new_id_produit := (v_new_art->>'id_produit')::INTEGER;
        v_new_quantite   := (v_new_art->>'quantite')::REAL;
        v_new_prix       := (v_new_art->>'prix')::NUMERIC(10,2);
        -- [PHASE1] lecture remise_pct/prix_origine pour INSERT nouveaux produits
        v_new_remise_pct   := COALESCE((v_new_art->>'remise_pct')::NUMERIC(5,2), NULL);
        v_new_prix_origine := COALESCE((v_new_art->>'prix_origine')::NUMERIC(10,2), NULL);

        IF NOT (v_old_map ? v_new_id_produit::TEXT) THEN
            -- [PHASE1] INSERT étendu
            INSERT INTO public.detail_facture_com
                (id_facture, date_facture, id_produit, quantite, prix, remise_pct, prix_origine)
            VALUES (pid_facture, v_fac.date_facture, v_new_id_produit, v_new_quantite, v_new_prix,
                    v_new_remise_pct, v_new_prix_origine);
        END IF;
    END LOOP;

    -- ETAPE 10 : Appliquer nouvelle remise (trigger recalcule montant)
    v_step := 'APPLY_REMISE';
    UPDATE public.facture_com
    SET mt_remise = p_mt_remise, tms_update = NOW()::VARCHAR
    WHERE id_facture = pid_facture;

    -- ETAPE 11 : Lire montant recalculé par les triggers
    v_step := 'READ_AFTER_TRIGGERS';
    SELECT fc.montant INTO v_montant_apres
    FROM public.facture_com fc WHERE fc.id_facture = pid_facture;

    v_net_apres := v_montant_apres - p_mt_remise;

    v_ecart := v_net_apres - v_acompte_avant;

    -- [PHASE1] snapshot APRES étendu : + remise_pct, prix_origine
    SELECT COALESCE(
        json_agg(json_build_object(
            'id_produit', d.id_produit, 'quantite', d.quantite,
            'prix', d.prix, 'sous_total', (d.quantite * d.prix),
            'remise_pct', d.remise_pct, 'prix_origine', d.prix_origine
        ) ORDER BY d.id_produit), '[]'
    )::JSONB INTO v_articles_apres
    FROM public.detail_facture_com d WHERE d.id_facture = pid_facture;

    -- ETAPE 12 : Réconciliation paiement — ledger append-only
    v_step := 'RECONCILIATION';
    v_epoch_ms := FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_num_recu := 'MODIF-' || pid_structure || '-' || pid_facture || '-' || v_epoch_ms;
    v_uuid_trx := gen_random_uuid()::TEXT;

    IF v_ecart > 0 THEN
        v_type_ajustement := 'COMPLEMENT';
        v_acompte_apres   := v_acompte_avant + v_ecart;

        INSERT INTO public.recus_paiement (
            id_facture, id_structure, numero_recu,
            methode_paiement, montant_paye, reference_transaction, numero_telephone
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

    -- ETAPE 13 : Forcer mt_acompte / mt_restant=0 / id_etat=2
    v_step := 'FORCE_PAID';
    UPDATE public.facture_com
    SET mt_acompte = v_acompte_apres,
        mt_restant = 0,
        id_etat    = 2,
        tms_update = NOW()::VARCHAR
    WHERE id_facture = pid_facture;

    -- ETAPE 14 : Log append-only (articles_avant/apres désormais étendus)
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

    -- ETAPE 15 : Retour JSON
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
        'success', false, 'code', 'MODIFICATION_ERROR',
        'message', 'Erreur: ' || SQLERRM,
        'step', v_step, 'sql_state', SQLSTATE,
        'timestamp_operation', NOW()
    );
END;
$function$;


-- ============================================================================
-- ETAPE 16 — rechercher_multifacturecom (2 branches json_build_object)
-- ============================================================================
\echo ETAPE 16/17 — rechercher_multifacturecom (2 branches)

CREATE OR REPLACE FUNCTION public.rechercher_multifacturecom(
    pnum_factures character varying DEFAULT NULL::character varying,
    pid_facture integer DEFAULT NULL::integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_num_array text[];
    v_structure_id integer;
    v_result json;
BEGIN
    IF (pnum_factures IS NULL OR pnum_factures = '') AND pid_facture IS NULL THEN
        RETURN '{"factures": []}'::json;
    END IF;

    -- BRANCHE 1 : pid_facture renseigné
    IF pid_facture IS NOT NULL THEN
        SELECT json_build_object(
            'factures',
            COALESCE(json_agg(
                json_build_object(
                    'id_facture', f.id_facture,
                    'num_facture', f.num_facture,
                    'id_structure', f.id_structure,
                    'nom_structure', f.nom_structure,
                    'date_facture', f.date_facture,
                    'nannee', f.nannee,
                    'nmois', f.nmois,
                    'description', f.description,
                    'nom_classe', f.nom_classe,
                    'tel_client', f.tel_client,
                    'nom_client', f.nom_client,
                    'montant', f.montant,
                    'id_etat', f.id_etat,
                    'libelle_etat', f.libelle_etat,
                    'numrecu', f.numrecu,
                    'logo', f.logo,
                    'tms_update', f.tms_update,
                    'avec_frais', f.avec_frais,
                    'periode', f.periode,
                    'mt_reverser', f.mt_reverser,
                    'mt_remise', f.mt_remise,
                    'mt_acompte', f.mt_acompte,
                    'mt_restant', f.mt_restant,
                    'photo_url', f.photo_url,
                    'details', COALESCE(f.details, '[]'::json)
                )
            ), '[]'::json)
        ) INTO v_result
        FROM (
            SELECT
                lf.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id_detail', df.id_detail,
                            'id_produit', df.id_produit,
                            'nom_produit', ps.nom_produit,
                            'description_produit', ps.description,
                            'quantite', df.quantite,
                            'prix', df.prix,
                            'sous_total', df.quantite * df.prix,
                            'remise_pct', df.remise_pct,           -- [PHASE1]
                            'prix_origine', df.prix_origine        -- [PHASE1]
                        ) ORDER BY df.id_detail
                    ) FILTER (WHERE df.id_detail IS NOT NULL),
                    '[]'::json
                ) as details
            FROM public.list_factures_com lf
            LEFT JOIN public.detail_facture_com df ON lf.id_facture = df.id_facture
            LEFT JOIN public.produit_service ps ON df.id_produit = ps.id_produit
            WHERE lf.id_facture = pid_facture
            GROUP BY lf.id_facture, lf.num_facture, lf.id_structure, lf.nom_structure,
                     lf.date_facture, lf.nannee, lf.nmois, lf.description, lf.nom_classe,
                     lf.tel_client, lf.nom_client, lf.montant, lf.id_etat, lf.libelle_etat,lf.id_devis,
                     lf.numrecu, lf.logo, lf.tms_update, lf.avec_frais, lf.periode,
                     lf.mt_reverser, lf.mt_remise, lf.mt_acompte, lf.mt_restant, lf.photo_url, lf.id_utilisateur, lf.nom_utilisateur
        ) f;

        RETURN v_result;
    END IF;

    -- BRANCHE 2 : pnum_factures
    v_num_array := string_to_array(pnum_factures, '@');

    WITH first_invoice AS (
        SELECT DISTINCT id_structure
        FROM public.list_factures_com
        WHERE num_facture = ANY(v_num_array)
        AND id_etat = 1
        LIMIT 1
    )
    SELECT id_structure INTO v_structure_id
    FROM first_invoice;

    IF EXISTS (
        SELECT 1
        FROM public.list_factures_com
        WHERE num_facture = ANY(v_num_array)
        AND id_structure != v_structure_id
        AND id_etat = 1
    ) THEN
        RAISE EXCEPTION 'Les factures doivent appartenir à la même structure';
    END IF;

    SELECT json_build_object(
        'factures',
        COALESCE(json_agg(
            json_build_object(
                'id_facture', f.id_facture,
                'num_facture', f.num_facture,
                'id_structure', f.id_structure,
                'nom_structure', f.nom_structure,
                'date_facture', f.date_facture,
                'nannee', f.nannee,
                'nmois', f.nmois,
                'description', f.description,
                'nom_classe', f.nom_classe,
                'tel_client', f.tel_client,
                'nom_client', f.nom_client,
                'montant', f.montant,
                'id_etat', f.id_etat,
                'libelle_etat', f.libelle_etat,
                'numrecu', f.numrecu,
                'logo', f.logo,
                'tms_update', f.tms_update,
                'avec_frais', f.avec_frais,
                'periode', f.periode,
                'mt_reverser', f.mt_reverser,
                'mt_remise', f.mt_remise,
                'mt_acompte', f.mt_acompte,
                'mt_restant', f.mt_restant,
                'photo_url', f.photo_url,
                'details', COALESCE(f.details, '[]'::json)
            ) ORDER BY f.id_facture
        ), '[]'::json)
    ) INTO v_result
    FROM (
        SELECT
            lf.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id_detail', df.id_detail,
                        'id_produit', df.id_produit,
                        'nom_produit', ps.nom_produit,
                        'description_produit', ps.description,
                        'quantite', df.quantite,
                        'prix', df.prix,
                        'sous_total', df.quantite * df.prix,
                        'remise_pct', df.remise_pct,           -- [PHASE1]
                        'prix_origine', df.prix_origine        -- [PHASE1]
                    ) ORDER BY df.id_detail
                ) FILTER (WHERE df.id_detail IS NOT NULL),
                '[]'::json
            ) as details
        FROM public.list_factures_com lf
        LEFT JOIN public.detail_facture_com df ON lf.id_facture = df.id_facture
        LEFT JOIN public.produit_service ps ON df.id_produit = ps.id_produit
        WHERE lf.num_facture = ANY(v_num_array)
        AND lf.id_etat = 1
        GROUP BY lf.id_facture, lf.num_facture, lf.id_structure, lf.nom_structure,
                 lf.date_facture, lf.nannee, lf.nmois, lf.description, lf.nom_classe,
                 lf.tel_client, lf.nom_client, lf.montant, lf.id_etat, lf.libelle_etat,lf.id_devis,
                 lf.numrecu, lf.logo, lf.tms_update, lf.avec_frais, lf.periode,
                 lf.mt_reverser, lf.mt_remise, lf.mt_acompte, lf.mt_restant, lf.photo_url, lf.id_utilisateur, lf.nom_utilisateur
    ) f;

    RETURN v_result;
END;
$function$;


-- ============================================================================
-- ETAPE 17 — get_my_factures1 (2 json_build_object détails via la vue)
-- ============================================================================
\echo ETAPE 17/17 — get_my_factures1 (2 branches)

CREATE OR REPLACE FUNCTION public.get_my_factures1(
    pid_structure integer,
    pannee integer,
    pmois integer DEFAULT 0,
    pid_facture integer DEFAULT 0,
    pid_utilisateur integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_facture_json JSON;
    v_facture_record RECORD;
    v_details_json JSON;
    v_recus_json JSON;
    v_all_factures_json JSON;
    v_date_debut DATE;
    v_date_fin DATE;
    v_label_periode VARCHAR(100);
BEGIN
    IF pid_structure IS NULL OR pid_structure <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_STRUCTURE',
            'error', 'L''ID structure doit être un entier positif valide'
        );
    END IF;

    IF pannee IS NULL OR pannee <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_YEAR',
            'error', 'L''année doit être un entier positif valide'
        );
    END IF;

    IF pmois < 0 OR pmois > 12 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_MONTH',
            'error', 'Le mois doit être entre 0 et 12'
        );
    END IF;

    IF pid_facture IS NULL OR pid_facture < 0 THEN
        RETURN json_build_object(
            'success', false,
            'code', 'INVALID_FACTURE',
            'error', 'L''ID facture doit être supérieur ou égal à 0'
        );
    END IF;

    IF pid_utilisateur IS NULL THEN
        pid_utilisateur := 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.structures s WHERE s.id_structure = pid_structure) THEN
        RETURN json_build_object(
            'success', false,
            'code', 'STRUCTURE_NOT_FOUND',
            'error', 'La structure avec l''ID ' || pid_structure || ' n''existe pas'
        );
    END IF;

    IF pmois > 0 THEN
        v_date_debut := MAKE_DATE(pannee, pmois, 1);
        v_date_fin := (v_date_debut + INTERVAL '1 month - 1 day')::DATE;
        v_label_periode := TO_CHAR(v_date_debut, 'Month YYYY');
    ELSE
        v_date_debut := MAKE_DATE(pannee, 1, 1);
        v_date_fin := MAKE_DATE(pannee, 12, 31);
        v_label_periode := 'Année ' || pannee;
    END IF;

    -- ============================================
    -- CAS 1: Facture spécifique (pid_facture > 0)
    -- ============================================
    IF pid_facture > 0 THEN
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
            lfc.mt_restant, lfc.id_utilisateur,lfc.nom_utilisateur,
            lfc.photo_url,lfc.id_devis
        INTO v_facture_record
        FROM public.list_factures_com lfc
        WHERE lfc.id_facture = pid_facture
          AND lfc.id_structure = pid_structure
          AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur);

        IF NOT FOUND THEN
            RETURN json_build_object(
                'success', false,
                'code', 'FACTURE_NOT_FOUND',
                'error', 'Aucune facture trouvée avec l''ID ' || pid_facture || ' pour la structure ' || pid_structure
            );
        END IF;

        -- [PHASE1] json_build_object détails #1 : + remise_pct, prix_origine
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
                    'remise_pct', ldv.remise_pct,       -- [PHASE1]
                    'prix_origine', ldv.prix_origine,   -- [PHASE1]
                    'marge', ldv.marge,
                    'id_produit', ldv.id_produit,
                    'sous_total', (ldv.quantite * ldv.prix)
                )
            ),
            '[]'::JSON
        ) INTO v_details_json
        FROM public.list_detailventes ldv
        WHERE ldv.id_facture = pid_facture;

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
            ),
            '[]'::JSON
        ) INTO v_recus_json
        FROM public.recus_paiement rp
        WHERE rp.id_facture = pid_facture;

        RETURN json_build_object(
            'success', true,
            'code', 'FACTURE_FOUND',
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
                'id_utilisateur', v_facture_record.id_utilisateur,
                'nom_utilisateur', v_facture_record.nom_utilisateur,
                'photo_url', v_facture_record.photo_url,
                'id_devis', v_facture_record.id_devis
            ),
            'details', v_details_json,
            'recus_paiements', v_recus_json,
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
        );

    -- ============================================
    -- CAS 2: Liste des factures de la période
    -- ============================================
    ELSE
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
                    -- [PHASE1] json_build_object détails #2 : + remise_pct, prix_origine
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
                                    'remise_pct', ldv.remise_pct,       -- [PHASE1]
                                    'prix_origine', ldv.prix_origine,   -- [PHASE1]
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
          AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
          AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur);

        RETURN json_build_object(
            'success', true,
            'code', 'FACTURES_FOUND',
            'periode', json_build_object(
                'label', v_label_periode,
                'annee', pannee,
                'mois', NULLIF(pmois, 0),
                'date_debut', v_date_debut,
                'date_fin', v_date_fin
            ),
            'factures', v_all_factures_json,
            'resume_global', json_build_object(
                'nombre_factures', (
                    SELECT COUNT(*)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'montant_total', (
                    SELECT COALESCE(SUM(lfc.montant), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'montant_remises', (
                    SELECT COALESCE(SUM(lfc.mt_remise), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'montant_acomptes', (
                    SELECT COALESCE(SUM(lfc.mt_acompte), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'montant_paye', (
                    SELECT COALESCE(SUM(lfc.montant - lfc.mt_remise - lfc.mt_restant), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'montant_impaye', (
                    SELECT COALESCE(SUM(lfc.mt_restant), 0)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'nombre_payees', (
                    SELECT COUNT(*)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND lfc.id_etat = 2
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'nombre_impayees', (
                    SELECT COUNT(*)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND lfc.id_etat = 1
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                ),
                'nombre_partielles', (
                    SELECT COUNT(*)
                    FROM public.list_factures_com lfc
                    WHERE lfc.id_structure = pid_structure
                      AND lfc.date_facture BETWEEN v_date_debut AND v_date_fin
                      AND lfc.id_etat = 3
                      AND (pid_utilisateur = 0 OR lfc.id_utilisateur = pid_utilisateur)
                )
            ),
            'timestamp_generation', NOW()
        );
    END IF;

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
-- COMMIT (smoke queries après)
-- ============================================================================
\echo ==== COMMIT Phase 1 ====
COMMIT;

-- ============================================================================
-- SMOKE QUERIES — à lancer après COMMIT pour vérification (read-only)
-- ============================================================================
\echo '=========================================================
\echo 'SMOKE TESTS POST-PATCH (read-only)
\echo '=========================================================

\echo '--- 1) Colonnes remise_pct/prix_origine présentes (4 tables) ---
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('detail_facture_com','proforma_details','bon_commande_details','detail_devis')
  AND column_name IN ('remise_pct','prix_origine')
ORDER BY table_name, column_name;

\echo '--- 2) Contraintes CHECK présentes (4 tables) ---
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE conname LIKE 'chk_%remise_pct'
ORDER BY conname;

\echo '--- 3) R1 CRITIQUE : create_facture_complete1 a bien 2 surcharges distinctes ---
SELECT proname, pg_get_function_identity_arguments(oid) AS identity_args
FROM pg_proc
WHERE proname = 'create_facture_complete1'
  AND pronamespace = 'public'::regnamespace
ORDER BY identity_args;
-- ATTENDU : exactement 2 lignes (varchar + text)

\echo '--- 4) Volumetries post-patch (inchangées) ---
SELECT relname, reltuples::bigint AS nb_lignes, pg_size_pretty(pg_total_relation_size(oid)) AS taille
FROM pg_class
WHERE relname IN ('detail_facture_com','proforma_details','bon_commande_details','detail_devis')
ORDER BY relname;

\echo '--- 5) Vue list_detailventes expose les 2 nouvelles colonnes ---
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='list_detailventes'
  AND column_name IN ('remise_pct','prix_origine');

\echo '--- 6) Comptage lignes historiques NULL (aucune regression) ---
SELECT 'detail_facture_com' AS tbl,
       COUNT(*) FILTER (WHERE remise_pct IS NULL) AS remise_null,
       COUNT(*) FILTER (WHERE prix_origine IS NULL) AS prix_origine_null
FROM public.detail_facture_com
UNION ALL
SELECT 'proforma_details', COUNT(*) FILTER (WHERE remise_pct IS NULL), COUNT(*) FILTER (WHERE prix_origine IS NULL)
FROM public.proforma_details
UNION ALL
SELECT 'bon_commande_details', COUNT(*) FILTER (WHERE remise_pct IS NULL), COUNT(*) FILTER (WHERE prix_origine IS NULL)
FROM public.bon_commande_details
UNION ALL
SELECT 'detail_devis', COUNT(*) FILTER (WHERE remise_pct IS NULL), COUNT(*) FILTER (WHERE prix_origine IS NULL)
FROM public.detail_devis;

\echo '=========================================================
\echo 'FIN DU SCRIPT — exécuter ensuite les tests fonctionnels §5 du rapport
\echo '=========================================================
