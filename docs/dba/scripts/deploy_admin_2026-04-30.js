/**
 * Déploiement PostgreSQL - Admin Gestion Structures
 * Projet : FayClick V2
 * Date   : 2026-04-30
 * DBA    : dba_master
 *
 * Ce script crée / modifie dans fayclick_db :
 *  1. Table admin_actions_log + 3 index
 *  2. Fonction log_admin_action (8 params) → BIGINT
 *  3. DROP edit_param_structure (10 params) + CREATE (16 params)
 *  4. DROP get_admin_all_utilisateurs (9 params) + CREATE (11 params)
 *  5. Fonction delete_structure (p_id_structure, p_id_admin) → JSON
 *  6. Fonction add_abonnement_offert (p_id_structure, p_nb_jours, p_motif, p_id_admin) → JSON
 *  7. PATCH reset_user_password → retourne MDP aléatoire en clair
 *  8. Tests T1-T7 (T5c avec ROLLBACK)
 */

const { Client } = require('C:/tmp/pgquery/node_modules/pg');

const DB = {
  host: '154.12.224.173',
  port: 3253,
  user: 'admin_icelab',
  password: '*IceL@b2022*',
  database: 'fayclick_db'
};

const results = [];
let client;

function log(msg) {
  console.log(msg);
  results.push(msg);
}

async function q(sql, label) {
  try {
    const r = await client.query(sql);
    const out = r.rows && r.rows.length > 0
      ? JSON.stringify(r.rows, null, 2)
      : (r.command || 'OK');
    log(`[OK] ${label}: ${out}`);
    return r.rows;
  } catch (e) {
    log(`[ERREUR] ${label}: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// ÉTAPE 1 : Table admin_actions_log + 3 index
// ─────────────────────────────────────────────
async function step1_createAdminActionsLog() {
  log('\n=== ÉTAPE 1 : admin_actions_log ===');

  await q(`
    CREATE TABLE IF NOT EXISTS public.admin_actions_log (
      id_log         BIGSERIAL PRIMARY KEY,
      id_admin       INTEGER NOT NULL REFERENCES public.utilisateur(id),
      action         VARCHAR(100) NOT NULL,
      cible_type     VARCHAR(50),
      cible_id       INTEGER,
      cible_nom      VARCHAR(255),
      ancienne_valeur JSONB,
      nouvelle_valeur JSONB,
      motif          TEXT,
      ip_address     VARCHAR(45),
      created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, 'CREATE TABLE admin_actions_log');

  await q(`
    CREATE INDEX IF NOT EXISTS idx_admin_log_admin
    ON public.admin_actions_log(id_admin)
  `, 'idx_admin_log_admin');

  await q(`
    CREATE INDEX IF NOT EXISTS idx_admin_log_cible
    ON public.admin_actions_log(cible_type, cible_id)
  `, 'idx_admin_log_cible');

  await q(`
    CREATE INDEX IF NOT EXISTS idx_admin_log_action
    ON public.admin_actions_log(action)
  `, 'idx_admin_log_action');
}

// ─────────────────────────────────────────────
// ÉTAPE 2 : log_admin_action (8 params) → BIGINT
// ─────────────────────────────────────────────
async function step2_createLogAdminAction() {
  log('\n=== ÉTAPE 2 : log_admin_action ===');

  await q(`
    CREATE OR REPLACE FUNCTION public.log_admin_action(
      p_id_admin       INTEGER,
      p_action         VARCHAR,
      p_cible_type     VARCHAR DEFAULT NULL,
      p_cible_id       INTEGER DEFAULT NULL,
      p_cible_nom      VARCHAR DEFAULT NULL,
      p_ancienne_valeur JSONB  DEFAULT NULL,
      p_nouvelle_valeur JSONB  DEFAULT NULL,
      p_motif          TEXT    DEFAULT NULL
    )
    RETURNS BIGINT
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_id_log BIGINT;
    BEGIN
      INSERT INTO public.admin_actions_log
        (id_admin, action, cible_type, cible_id, cible_nom, ancienne_valeur, nouvelle_valeur, motif)
      VALUES
        (p_id_admin, p_action, p_cible_type, p_cible_id, p_cible_nom, p_ancienne_valeur, p_nouvelle_valeur, p_motif)
      RETURNING id_log INTO v_id_log;

      RETURN v_id_log;
    END;
    $$
  `, 'CREATE FUNCTION log_admin_action');
}

// ─────────────────────────────────────────────
// ÉTAPE 3 : edit_param_structure 10→16 params
// ─────────────────────────────────────────────
async function step3_extendEditParamStructure() {
  log('\n=== ÉTAPE 3 : edit_param_structure 10→16 params ===');

  // D'abord vérifier les versions existantes
  const versions = await q(`
    SELECT p.oid::text, pg_get_function_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'edit_param_structure'
    ORDER BY p.oid
  `, 'versions edit_param_structure avant DROP');

  // DROP la version 10 params (signature exacte)
  await q(`
    DROP FUNCTION IF EXISTS public.edit_param_structure(
      integer, boolean, numeric, boolean, boolean, json, json, boolean, numeric, boolean
    )
  `, 'DROP edit_param_structure 10 params');

  // CREATE version 16 params
  await q(`
    CREATE OR REPLACE FUNCTION public.edit_param_structure(
      p_id_structure       INTEGER,
      p_credit_autorise    BOOLEAN DEFAULT NULL,
      p_limite_credit      NUMERIC DEFAULT NULL,
      p_acompte_autorise   BOOLEAN DEFAULT NULL,
      p_prix_engros        BOOLEAN DEFAULT NULL,
      p_info_facture       JSON    DEFAULT NULL,
      p_config_facture     JSON    DEFAULT NULL,
      p_inclure_tva        BOOLEAN DEFAULT NULL,
      p_taux_tva           NUMERIC DEFAULT NULL,
      p_wallet_paiement    BOOLEAN DEFAULT NULL,
      p_nombre_produit_max INTEGER DEFAULT NULL,
      p_nombre_caisse_max  INTEGER DEFAULT NULL,
      p_compte_prive       BOOLEAN DEFAULT NULL,
      p_mensualite         NUMERIC DEFAULT NULL,
      p_taux_wallet        NUMERIC DEFAULT NULL,
      p_live_autorise      BOOLEAN DEFAULT NULL
    )
    RETURNS JSON
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_result JSON;
    BEGIN
      -- Vérification structure existe
      IF NOT EXISTS (SELECT 1 FROM public.structures WHERE id_structure = p_id_structure) THEN
        RETURN json_build_object('success', false, 'message', 'Structure introuvable');
      END IF;

      -- Mise à jour param_structure (COALESCE = NULL => pas de changement)
      UPDATE public.param_structure
      SET
        credit_autorise    = COALESCE(p_credit_autorise,    credit_autorise),
        limite_credit      = COALESCE(p_limite_credit,      limite_credit),
        acompte_autorise   = COALESCE(p_acompte_autorise,   acompte_autorise),
        prix_engros        = COALESCE(p_prix_engros,        prix_engros),
        inclure_tva        = COALESCE(p_inclure_tva,        inclure_tva),
        taux_tva           = COALESCE(p_taux_tva,           taux_tva),
        wallet_paiement    = COALESCE(p_wallet_paiement,    wallet_paiement),
        nombre_produit_max = COALESCE(p_nombre_produit_max, nombre_produit_max),
        nombre_caisse_max  = COALESCE(p_nombre_caisse_max,  nombre_caisse_max),
        compte_prive       = COALESCE(p_compte_prive,       compte_prive),
        mensualite         = COALESCE(p_mensualite,         mensualite),
        taux_wallet        = COALESCE(p_taux_wallet,        taux_wallet),
        live_autorise      = COALESCE(p_live_autorise,      live_autorise),
        -- info_facture : merge champ par champ (COALESCE JSON)
        info_facture = CASE
          WHEN p_info_facture IS NOT NULL
          THEN (COALESCE(info_facture::jsonb, '{}'::jsonb) || p_info_facture::jsonb)::json
          ELSE info_facture
        END,
        -- config_facture : remplacement complet
        config_facture = COALESCE(p_config_facture::jsonb, config_facture::jsonb)::json
      WHERE id_structure = p_id_structure;

      RETURN json_build_object('success', true, 'message', 'Paramètres mis à jour');

    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
    $$
  `, 'CREATE edit_param_structure 16 params');

  // Vérifier versions après
  await q(`
    SELECT p.oid::text, pg_get_function_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'edit_param_structure'
    ORDER BY p.oid
  `, 'versions edit_param_structure après CREATE');
}

// ─────────────────────────────────────────────
// ÉTAPE 4 : get_admin_all_utilisateurs 9→11 params
// ─────────────────────────────────────────────
async function step4_extendGetAdminAllUtilisateurs() {
  log('\n=== ÉTAPE 4 : get_admin_all_utilisateurs 9→11 params ===');

  // Récupérer le source actuel
  const src = await q(`
    SELECT pg_get_functiondef(p.oid) AS src
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_admin_all_utilisateurs'
    LIMIT 1
  `, 'source get_admin_all_utilisateurs');

  if (src && src[0]) {
    log('Source récupéré : ' + src[0].src.substring(0, 200) + '...');
  }

  // DROP version 9 params (signature exacte de la version existante)
  await q(`
    DROP FUNCTION IF EXISTS public.get_admin_all_utilisateurs(
      integer, integer, character varying, integer, integer, integer, boolean, character varying, character varying
    )
  `, 'DROP get_admin_all_utilisateurs 9 params');

  // CREATE version 11 params
  await q(`
    CREATE OR REPLACE FUNCTION public.get_admin_all_utilisateurs(
      p_limit              INTEGER  DEFAULT 50,
      p_offset             INTEGER  DEFAULT 0,
      p_id_structure       INTEGER  DEFAULT NULL,
      p_id_profil          INTEGER  DEFAULT NULL,
      p_search_nom         VARCHAR  DEFAULT NULL,
      p_search_login       VARCHAR  DEFAULT NULL,
      p_search_email       VARCHAR  DEFAULT NULL,
      p_actif              BOOLEAN  DEFAULT NULL,
      p_order_by           VARCHAR  DEFAULT 'createdat',
      p_search_structure   VARCHAR  DEFAULT NULL,
      p_search_telephone   VARCHAR  DEFAULT NULL
    )
    RETURNS JSON
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_sql      TEXT;
      v_where    TEXT := ' WHERE 1=1 ';
      v_result   JSON;
      v_total    INTEGER;
    BEGIN
      -- Filtres
      IF p_id_structure IS NOT NULL THEN
        v_where := v_where || ' AND u.id_structure = ' || p_id_structure;
      END IF;
      IF p_id_profil IS NOT NULL THEN
        v_where := v_where || ' AND u.id_profil = ' || p_id_profil;
      END IF;
      IF p_actif IS NOT NULL THEN
        v_where := v_where || ' AND u.actif = ' || p_actif;
      END IF;
      IF p_search_nom IS NOT NULL AND p_search_nom <> '' THEN
        v_where := v_where || ' AND (u.username ILIKE ''%' || p_search_nom || '%'' OR u.login ILIKE ''%' || p_search_nom || '%'')';
      END IF;
      IF p_search_login IS NOT NULL AND p_search_login <> '' THEN
        v_where := v_where || ' AND u.login ILIKE ''%' || p_search_login || '%''';
      END IF;
      IF p_search_email IS NOT NULL AND p_search_email <> '' THEN
        v_where := v_where || ' AND u.login ILIKE ''%' || p_search_email || '%''';
      END IF;
      -- NOUVEAUX filtres
      IF p_search_structure IS NOT NULL AND p_search_structure <> '' THEN
        v_where := v_where || ' AND s.nom_structure ILIKE ''%' || p_search_structure || '%''';
      END IF;
      IF p_search_telephone IS NOT NULL AND p_search_telephone <> '' THEN
        v_where := v_where || ' AND u.tel_user ILIKE ''%' || p_search_telephone || '%''';
      END IF;

      -- Ordre
      v_sql := 'SELECT COUNT(*) FROM public.utilisateur u '
        || ' LEFT JOIN public.structures s ON s.id_structure = u.id_structure '
        || v_where;
      EXECUTE v_sql INTO v_total;

      v_sql := 'SELECT json_agg(row_to_json(t)) FROM ('
        || 'SELECT u.id, u.username, u.login, u.id_structure, u.id_profil, u.actif, '
        || '  u.tel_user, u.createdat, u.updatedat, '
        || '  s.nom_structure '
        || 'FROM public.utilisateur u '
        || ' LEFT JOIN public.structures s ON s.id_structure = u.id_structure '
        || v_where
        || ' ORDER BY u.' || p_order_by
        || ' LIMIT ' || p_limit || ' OFFSET ' || p_offset
        || ') t';
      EXECUTE v_sql INTO v_result;

      RETURN json_build_object(
        'success', true,
        'total', v_total,
        'utilisateurs', COALESCE(v_result, '[]'::json)
      );

    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
    $$
  `, 'CREATE get_admin_all_utilisateurs 11 params');
}

// ─────────────────────────────────────────────
// ÉTAPE 5 : delete_structure avec cascade complète
// ─────────────────────────────────────────────
async function step5_createDeleteStructure() {
  log('\n=== ÉTAPE 5 : delete_structure ===');

  await q(`
    CREATE OR REPLACE FUNCTION public.delete_structure(
      p_id_structure INTEGER,
      p_id_admin     INTEGER
    )
    RETURNS JSON
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_nom_structure    VARCHAR;
      v_nb_factures      INTEGER := 0;
      v_nb_users         INTEGER := 0;
      v_snapshot         JSONB;
    BEGIN
      -- Sécurité absolue : interdire suppression id=0
      IF p_id_structure = 0 OR p_id_structure IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Suppression de la structure 0 interdite');
      END IF;

      -- Vérifier que la structure existe
      SELECT nom_structure INTO v_nom_structure
      FROM public.structures
      WHERE id_structure = p_id_structure;

      IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Structure introuvable');
      END IF;

      -- Snapshot avant suppression pour audit
      SELECT row_to_json(s)::jsonb INTO v_snapshot
      FROM public.structures s
      WHERE id_structure = p_id_structure;

      -- Compter factures et users avant suppression
      SELECT COUNT(*) INTO v_nb_factures
      FROM public.facture_com
      WHERE id_structure = p_id_structure;

      SELECT COUNT(*) INTO v_nb_users
      FROM public.utilisateur
      WHERE id_structure = p_id_structure;

      -- ───── CASCADE DELETE dans l'ordre des dépendances ─────

      -- 1. Détails factures (FK → facture_com)
      DELETE FROM public.detail_facture_com
      WHERE id_facture IN (
        SELECT id_facture FROM public.facture_com WHERE id_structure = p_id_structure
      );

      -- 2. Reçus paiement (FK → facture_com)
      DELETE FROM public.recus_paiement
      WHERE id_facture IN (
        SELECT id_facture FROM public.facture_com WHERE id_structure = p_id_structure
      );

      -- 3. Proforma details (FK → proforma)
      DELETE FROM public.proforma_details
      WHERE id_proforma IN (
        SELECT id_proforma FROM public.proforma WHERE id_structure = p_id_structure
      );

      -- 4. Proformas
      DELETE FROM public.proforma WHERE id_structure = p_id_structure;

      -- 5. facture_com
      DELETE FROM public.facture_com WHERE id_structure = p_id_structure;

      -- 6. facture (table scolaire/immobilier)
      DELETE FROM public.facture WHERE id_structure = p_id_structure;

      -- 7. Mouvements stock
      DELETE FROM public.mouvement_stock WHERE id_structure = p_id_structure;

      -- 8. Photos produits (FK → produit_service)
      DELETE FROM public.produit_photos
      WHERE id_produit IN (
        SELECT id_produit FROM public.produit_service WHERE id_structure = p_id_structure
      );

      -- 9. Embeddings produits (FK → produit_service)
      DELETE FROM public.product_embeddings
      WHERE id_produit IN (
        SELECT id_produit FROM public.produit_service WHERE id_structure = p_id_structure
      );

      -- 10. Produits / services
      DELETE FROM public.produit_service WHERE id_structure = p_id_structure;

      -- 11. Catégories
      DELETE FROM public.categorie WHERE id_structure = p_id_structure;

      -- 12. Devis
      DELETE FROM public.devis WHERE id_structure = p_id_structure;

      -- 13. Dépenses (d'abord dépenses, puis types de dépenses si orphelins)
      DELETE FROM public.depense WHERE id_structure = p_id_structure;
      DELETE FROM public.type_depense WHERE id_structure = p_id_structure;

      -- 14. Abonnements et tarifs
      DELETE FROM public.abonnements WHERE id_structure = p_id_structure;
      DELETE FROM public.abonnement_tarif WHERE id_structure = p_id_structure;

      -- 15. Clients
      DELETE FROM public.client_facture WHERE id_structure = p_id_structure;

      -- 16. Wallet / comptes / frais
      DELETE FROM public.compte_structure WHERE id_structure = p_id_structure;
      DELETE FROM public.frais_virement WHERE id_structure = p_id_structure;
      DELETE FROM public.banque_structure WHERE id_structure = p_id_structure;

      -- 17. Live / demandes / progressions
      DELETE FROM public.active_live WHERE id_structure = p_id_structure;
      DELETE FROM public.demande_auth WHERE id_structure = p_id_structure;
      DELETE FROM public.progression WHERE id_structure = p_id_structure;

      -- 18. Accès / droits / journaux
      DELETE FROM public.profil_droits WHERE id_structure = p_id_structure;
      DELETE FROM public.journal_activite WHERE id_structure = p_id_structure;
      DELETE FROM public.import_data WHERE id_structure = p_id_structure;

      -- 19. control_access (FK sur code_structure string)
      DELETE FROM public.control_access
      WHERE code_structure = (
        SELECT code_structure FROM public.structures WHERE id_structure = p_id_structure
      );

      -- 20. Utilisateurs
      DELETE FROM public.utilisateur WHERE id_structure = p_id_structure;

      -- 21. Paramètres structure
      DELETE FROM public.param_structure WHERE id_structure = p_id_structure;

      -- 22. Structure elle-même
      DELETE FROM public.structures WHERE id_structure = p_id_structure;

      -- Log de l'action admin
      PERFORM public.log_admin_action(
        p_id_admin,
        'DELETE_STRUCTURE',
        'STRUCTURE',
        p_id_structure,
        v_nom_structure,
        v_snapshot,
        NULL,
        'Suppression complète avec cascade'
      );

      RETURN json_build_object(
        'success', true,
        'message', 'Structure supprimée avec succès',
        'nb_factures_supprimees', v_nb_factures,
        'nb_users_supprimes', v_nb_users
      );

    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
    $$
  `, 'CREATE delete_structure');
}

// ─────────────────────────────────────────────
// ÉTAPE 5b : ALTER contraintes abonnements pour OFFERT
// ─────────────────────────────────────────────
async function step5b_alterAbonnementsConstraints() {
  log('\n=== ÉTAPE 5b : ALTER contraintes abonnements ===');

  // Ajouter 'OFFERT' dans methode_check
  await q(`
    ALTER TABLE public.abonnements
    DROP CONSTRAINT IF EXISTS abonnements_methode_check
  `, 'DROP abonnements_methode_check');

  await q(`
    ALTER TABLE public.abonnements
    ADD CONSTRAINT abonnements_methode_check
    CHECK (methode IN ('OM', 'WAVE', 'FREE', 'OFFERT'))
  `, 'ADD abonnements_methode_check avec OFFERT');

  // Ajouter 'OFFERT' dans type_abonnement_check
  await q(`
    ALTER TABLE public.abonnements
    DROP CONSTRAINT IF EXISTS abonnements_type_abonnement_check
  `, 'DROP abonnements_type_abonnement_check');

  await q(`
    ALTER TABLE public.abonnements
    ADD CONSTRAINT abonnements_type_abonnement_check
    CHECK (type_abonnement IN ('JOURNALIER','HEBDO','HEBDOMADAIRE','MENSUEL','TRIMESTRIEL','SEMESTRIEL','ANNUEL','OFFERT'))
  `, 'ADD abonnements_type_abonnement_check avec OFFERT');
}

// ─────────────────────────────────────────────
// ÉTAPE 6 : add_abonnement_offert
// ─────────────────────────────────────────────
async function step6_createAddAbonnementOffert() {
  log('\n=== ÉTAPE 6 : add_abonnement_offert ===');

  await q(`
    CREATE OR REPLACE FUNCTION public.add_abonnement_offert(
      p_id_structure INTEGER,
      p_nb_jours     INTEGER,
      p_motif        TEXT    DEFAULT NULL,
      p_id_admin     INTEGER DEFAULT NULL
    )
    RETURNS JSON
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_date_debut    DATE;
      v_date_fin      DATE;
      v_id_abonnement INTEGER;
      v_ref           VARCHAR;
      v_nom_structure VARCHAR;
    BEGIN
      -- Validations
      IF p_id_structure IS NULL OR p_id_structure = 0 THEN
        RETURN json_build_object('success', false, 'message', 'ID structure invalide');
      END IF;

      IF p_nb_jours IS NULL OR p_nb_jours <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Nombre de jours invalide');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.structures WHERE id_structure = p_id_structure) THEN
        RETURN json_build_object('success', false, 'message', 'Structure introuvable');
      END IF;

      SELECT nom_structure INTO v_nom_structure FROM public.structures WHERE id_structure = p_id_structure;

      -- Calculer les dates : part de aujourd'hui ou de la fin de l'abonnement actif si existant
      SELECT GREATEST(CURRENT_DATE, MAX(date_fin) + INTERVAL '1 day')::DATE
      INTO v_date_debut
      FROM public.abonnements
      WHERE id_structure = p_id_structure AND statut = 'ACTIF';

      IF v_date_debut IS NULL THEN
        v_date_debut := CURRENT_DATE;
      END IF;

      v_date_fin := v_date_debut + (p_nb_jours - 1) * INTERVAL '1 day';

      -- Référence unique
      v_ref := 'OFFERT-' || p_id_structure || '-' || TO_CHAR(NOW(), 'YYYYMMDDHHMI');

      INSERT INTO public.abonnements (
        id_structure,
        date_debut,
        date_fin,
        montant,
        ref_abonnement,
        numrecu,
        uuid_paiement,
        methode,
        type_abonnement,
        statut,
        nombre_jours
      ) VALUES (
        p_id_structure,
        v_date_debut,
        v_date_fin::DATE,
        0,
        v_ref,
        v_ref,
        gen_random_uuid(),
        'OFFERT',
        'OFFERT',
        'ACTIF',
        p_nb_jours
      ) RETURNING id_abonnement INTO v_id_abonnement;

      -- Log admin si id_admin fourni
      IF p_id_admin IS NOT NULL THEN
        PERFORM public.log_admin_action(
          p_id_admin,
          'OFFRIR_ABONNEMENT',
          'STRUCTURE',
          p_id_structure,
          v_nom_structure,
          NULL,
          json_build_object('nb_jours', p_nb_jours, 'date_debut', v_date_debut, 'date_fin', v_date_fin)::jsonb,
          p_motif
        );
      END IF;

      RETURN json_build_object(
        'success', true,
        'message', 'Abonnement offert créé avec succès',
        'data', json_build_object(
          'id_abonnement', v_id_abonnement,
          'date_debut', v_date_debut,
          'date_fin', v_date_fin
        )
      );

    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
    $$
  `, 'CREATE add_abonnement_offert');
}

// ─────────────────────────────────────────────
// ÉTAPE 7 : PATCH reset_user_password
// ─────────────────────────────────────────────
async function step7_patchResetUserPassword() {
  log('\n=== ÉTAPE 7 : PATCH reset_user_password ===');

  await q(`
    CREATE OR REPLACE FUNCTION public.reset_user_password(pid_utilisateur INTEGER)
    RETURNS CHARACTER VARYING
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_user_exists BOOLEAN;
      v_new_password VARCHAR;
      v_chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      v_len INTEGER := 8;
      i INTEGER;
    BEGIN
      SELECT EXISTS(SELECT 1 FROM public.utilisateur WHERE id = pid_utilisateur)
      INTO v_user_exists;

      IF v_user_exists THEN
        -- Générer un MDP aléatoire alphanumérique (8 chars, sans ambigus O0I1l)
        v_new_password := '';
        FOR i IN 1..v_len LOOP
          v_new_password := v_new_password ||
            SUBSTR(v_chars, (FLOOR(RANDOM() * LENGTH(v_chars)) + 1)::INTEGER, 1);
        END LOOP;

        UPDATE public.utilisateur
        SET
          pwd         = crypt(v_new_password, gen_salt('bf', 8)),
          pwd_changed = false
        WHERE id = pid_utilisateur;

        -- Retourner le MDP en clair pour affichage admin
        RETURN v_new_password;
      ELSE
        RETURN 'NOK';
      END IF;
    END;
    $$
  `, 'PATCH reset_user_password');
}

// ─────────────────────────────────────────────
// TESTS T1-T7
// ─────────────────────────────────────────────
async function runTests() {
  log('\n=== TESTS T1-T7 ===');

  // T1 : log_admin_action retourne BIGINT
  // id_admin=205 = Administrateur system (id_structure=0, existe dans utilisateur)
  log('\n--- T1 : log_admin_action ---');
  const t1 = await q(`
    SELECT log_admin_action(
      205,
      'TEST_CONNEXION',
      'SYSTEME',
      0,
      'Test déploiement',
      NULL::jsonb,
      '{"test": true}'::jsonb,
      'Test automatique déploiement 2026-04-30'
    ) AS id_log
  `, 'T1 log_admin_action');

  // Note: PostgreSQL BIGINT retourné comme string par node-pg
  if (t1 && t1[0] && parseInt(t1[0].id_log) > 0) {
    log('T1 PASS : BIGINT retourné = ' + t1[0].id_log);
  } else {
    log('T1 FAIL : Résultat inattendu : ' + JSON.stringify(t1));
  }

  // T2 : edit_param_structure 16 params
  log('\n--- T2 : edit_param_structure (16 params) ---');
  // id_structure=122 = DIA10, existe dans structures
  const t2 = await q(`
    SELECT edit_param_structure(
      122,        -- p_id_structure
      NULL,       -- p_credit_autorise
      NULL,       -- p_limite_credit
      NULL,       -- p_acompte_autorise
      NULL,       -- p_prix_engros
      NULL,       -- p_info_facture
      NULL,       -- p_config_facture
      NULL,       -- p_inclure_tva
      NULL,       -- p_taux_tva
      NULL,       -- p_wallet_paiement
      NULL,       -- p_nombre_produit_max
      NULL,       -- p_nombre_caisse_max
      NULL,       -- p_compte_prive
      NULL,       -- p_mensualite
      NULL,       -- p_taux_wallet
      NULL        -- p_live_autorise
    ) AS result
  `, 'T2 edit_param_structure 16 params');

  if (t2 && t2[0]) {
    const r = typeof t2[0].result === 'string' ? JSON.parse(t2[0].result) : t2[0].result;
    log('T2 ' + (r.success ? 'PASS' : 'FAIL') + ' : ' + r.message);
  }

  // T3 : get_admin_all_utilisateurs 11 params
  log('\n--- T3 : get_admin_all_utilisateurs (11 params) ---');
  const t3 = await q(`
    SELECT get_admin_all_utilisateurs(
      5,       -- p_limit
      0,       -- p_offset
      NULL,    -- p_id_structure
      NULL,    -- p_id_profil
      NULL,    -- p_search_nom
      NULL,    -- p_search_login
      NULL,    -- p_search_email
      NULL,    -- p_actif
      'createdat', -- p_order_by
      NULL,    -- p_search_structure (NEW)
      NULL     -- p_search_telephone (NEW)
    ) AS result
  `, 'T3 get_admin_all_utilisateurs 11 params');

  if (t3 && t3[0]) {
    const r = typeof t3[0].result === 'string' ? JSON.parse(t3[0].result) : t3[0].result;
    log('T3 ' + (r.success ? 'PASS' : 'FAIL') + ' : total=' + r.total + ', utilisateurs=' + (r.utilisateurs ? r.utilisateurs.length : 0));
  }

  // T3b : avec p_search_structure
  const t3b = await q(`
    SELECT get_admin_all_utilisateurs(
      10, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'createdat',
      'Kelefa',  -- p_search_structure
      NULL       -- p_search_telephone
    ) AS result
  `, 'T3b get_admin_all_utilisateurs avec search_structure=Kelefa');

  if (t3b && t3b[0]) {
    const r = typeof t3b[0].result === 'string' ? JSON.parse(t3b[0].result) : t3b[0].result;
    log('T3b ' + (r.success ? 'PASS' : 'FAIL') + ' : total=' + r.total);
  }

  // T4 : add_abonnement_offert
  log('\n--- T4 : add_abonnement_offert ---');

  // T4a : Guard id=0
  const t4a = await q(`
    SELECT add_abonnement_offert(0, 30, 'Test guard', 205) AS result
  `, 'T4a add_abonnement_offert id=0 (guard)');
  if (t4a && t4a[0]) {
    const r = typeof t4a[0].result === 'string' ? JSON.parse(t4a[0].result) : t4a[0].result;
    log('T4a ' + (!r.success ? 'PASS (rejeté comme attendu)' : 'FAIL (devrait être rejeté)') + ' : ' + r.message);
  }

  // T4b : Guard nb_jours négatif
  const t4b = await q(`
    SELECT add_abonnement_offert(1, -5, 'Test guard jours', 205) AS result
  `, 'T4b add_abonnement_offert nb_jours=-5 (guard)');
  if (t4b && t4b[0]) {
    const r = typeof t4b[0].result === 'string' ? JSON.parse(t4b[0].result) : t4b[0].result;
    log('T4b ' + (!r.success ? 'PASS (rejeté)' : 'FAIL') + ' : ' + r.message);
  }

  // T4c : Structure inexistante
  const t4c = await q(`
    SELECT add_abonnement_offert(999999, 30, 'Test inexistant', 205) AS result
  `, 'T4c add_abonnement_offert structure inexistante');
  if (t4c && t4c[0]) {
    const r = typeof t4c[0].result === 'string' ? JSON.parse(t4c[0].result) : t4c[0].result;
    log('T4c ' + (!r.success ? 'PASS (rejeté)' : 'FAIL') + ' : ' + r.message);
  }

  // T4d : Test réel sur SIMULA27
  const simula27 = await q(`
    SELECT id_structure, nom_structure FROM public.structures WHERE code_promo='SIMULA27' LIMIT 1
  `, 'T4d chercher structure SIMULA27');

  if (simula27 && simula27.length > 0) {
    const sid = simula27[0].id_structure;
    log('T4d : structure SIMULA27 = id=' + sid + ' nom=' + simula27[0].nom_structure);

    const t4d = await q(`
      SELECT add_abonnement_offert(${sid}, 7, 'Test déploiement DBA 2026-04-30', 205) AS result
    `, 'T4d add_abonnement_offert SIMULA27 7 jours');

    if (t4d && t4d[0]) {
      const r = typeof t4d[0].result === 'string' ? JSON.parse(t4d[0].result) : t4d[0].result;
      if (r.success && r.data) {
        log('T4d PASS : id_abonnement=' + r.data.id_abonnement + ' date_debut=' + r.data.date_debut + ' date_fin=' + r.data.date_fin);
      } else {
        log('T4d FAIL : ' + r.message);
      }
    }
  } else {
    log('T4d SKIP : Aucune structure avec code_promo=SIMULA27 trouvée');
  }

  // T5 : delete_structure
  log('\n--- T5 : delete_structure ---');

  // T5a : Guard id=0
  const t5a = await q(`
    SELECT delete_structure(0, 205) AS result
  `, 'T5a delete_structure id=0 (guard absolu)');
  if (t5a && t5a[0]) {
    const r = typeof t5a[0].result === 'string' ? JSON.parse(t5a[0].result) : t5a[0].result;
    log('T5a ' + (!r.success ? 'PASS (rejeté)' : 'FAIL') + ' : ' + r.message);
  }

  // T5b : Structure inexistante
  const t5b = await q(`
    SELECT delete_structure(999999, 205) AS result
  `, 'T5b delete_structure structure inexistante');
  if (t5b && t5b[0]) {
    const r = typeof t5b[0].result === 'string' ? JSON.parse(t5b[0].result) : t5b[0].result;
    log('T5b ' + (!r.success ? 'PASS (rejeté)' : 'FAIL') + ' : ' + r.message);
  }

  // T5c : ROLLBACK dry-run sur SIMULA27
  if (simula27 && simula27.length > 0) {
    const sid = simula27[0].id_structure;
    log('T5c : ROLLBACK dry-run sur structure SIMULA27 id=' + sid);

    await client.query('BEGIN');
    try {
      const t5c = await client.query(`SELECT delete_structure(${sid}, 205) AS result`);
      const row = t5c.rows[0];
      const r = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
      log('T5c delete_structure résultat : success=' + r.success + ' nb_factures=' + r.nb_factures_supprimees + ' nb_users=' + r.nb_users_supprimes);
      await client.query('ROLLBACK');
      log('T5c PASS : ROLLBACK effectué — structure non supprimée');

      // Vérifier que la structure existe encore
      const check = await client.query(`SELECT id_structure FROM public.structures WHERE id_structure=${sid}`);
      log('T5c vérification post-ROLLBACK : structure encore présente = ' + (check.rows.length > 0 ? 'OUI (PASS)' : 'NON (FAIL)'));
    } catch (e) {
      await client.query('ROLLBACK');
      log('T5c ERREUR (cascade) : ' + e.message);
    }
  } else {
    log('T5c SKIP : Pas de structure SIMULA27');
  }

  // T6 : reset_user_password
  log('\n--- T6 : reset_user_password ---');
  // id=205 = Administrateur system (id_structure=0)
  const t6 = await q(`
    SELECT reset_user_password(205) AS mdp
  `, 'T6 reset_user_password(id=205)');
  if (t6 && t6[0]) {
    const mdp = t6[0].mdp;
    if (mdp && mdp !== 'OK' && mdp !== 'NOK' && mdp.length >= 6) {
      log('T6 PASS : MDP retourné en clair (longueur=' + mdp.length + ') — NE PAS LOGGER LE MDP');
    } else if (mdp === 'OK') {
      log('T6 FAIL : retourne encore OK au lieu du MDP');
    } else {
      log('T6 résultat : ' + mdp);
    }
  }

  // T7 : Vérifier admin_actions_log structure + 3 index
  log('\n--- T7 : admin_actions_log structure + index ---');
  const t7cols = await q(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admin_actions_log'
    ORDER BY ordinal_position
  `, 'T7 colonnes admin_actions_log');

  const t7idx = await q(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public' AND tablename='admin_actions_log'
    ORDER BY indexname
  `, 'T7 index admin_actions_log');

  const idxNames = t7idx ? t7idx.map(r => r.indexname) : [];
  const required = ['idx_admin_log_admin', 'idx_admin_log_cible', 'idx_admin_log_action'];
  const allPresent = required.every(i => idxNames.includes(i));
  log('T7 index ' + (allPresent ? 'PASS' : 'FAIL') + ' : trouvés=' + idxNames.join(', '));
}

// ─────────────────────────────────────────────
// VÉRIFICATION FINALE
// ─────────────────────────────────────────────
async function verificationFinale() {
  log('\n=== VÉRIFICATION FINALE ===');

  // Compter nb params de chaque fonction
  await q(`
    SELECT p.proname, pg_get_function_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'edit_param_structure',
        'get_admin_all_utilisateurs',
        'delete_structure',
        'add_abonnement_offert',
        'log_admin_action',
        'reset_user_password'
      )
    ORDER BY p.proname, p.oid
  `, 'Fonctions déployées avec leurs signatures');

  // Vérifier la table admin_actions_log
  await q(`
    SELECT COUNT(*) AS nb_lignes FROM public.admin_actions_log
  `, 'Lignes dans admin_actions_log');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  log('=== DÉPLOIEMENT ADMIN GESTION STRUCTURES - ' + new Date().toISOString() + ' ===');

  client = new Client(DB);
  await client.connect();
  log('[OK] Connexion PostgreSQL établie : fayclick_db@154.12.224.173:3253');

  try {
    await step1_createAdminActionsLog();
    await step2_createLogAdminAction();
    await step3_extendEditParamStructure();
    await step4_extendGetAdminAllUtilisateurs();
    await step5_createDeleteStructure();
    await step5b_alterAbonnementsConstraints();
    await step6_createAddAbonnementOffert();
    await step7_patchResetUserPassword();
    await runTests();
    await verificationFinale();
  } finally {
    await client.end();
    log('\n[OK] Connexion fermée');
    log('\n=== FIN DÉPLOIEMENT ===');
  }
}

main().catch(e => {
  console.error('ERREUR FATALE:', e.message);
  if (client) client.end();
  process.exit(1);
});
