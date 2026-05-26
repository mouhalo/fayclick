-- ============================================================================
-- Fonctions PL/pgSQL — Module Bons de Commande Fournisseurs Phase 1 / EPIC 2
-- Version : v1.0
-- Date    : 2026-05-25
-- DBA     : dba_master
-- Base    : fayclick_db (154.12.224.173:3253)
-- PRD     : docs/prd-bons-commande-fournisseurs-2026-05-25.md (FR-009 à FR-013)
-- Dépendances :
--   - Tables EPIC 1 : etat_bon_commande, fournisseur (fournisseur-schema.sql)
--   - Tables EPIC 2 : bon_commande, bon_commande_details, bon_commande_compteur
--                     (bon-commande-schema.sql)
--   - Table : structures
--   - Table produits (pour snapshot nom_produit à la création)
-- Contrat interface (kader_backend) : voir bon-commande-spec.md Section 5
-- ============================================================================

-- ============================================================================
-- FONCTION 1 — create_bon_commande
-- FR-009 | Créer un bon de commande avec ses lignes articles
-- Signature : create_bon_commande(p_id_structure, p_date_bon_commande,
--             p_id_fournisseur, p_description, p_montant_net,
--             p_articles_string, p_mt_remise, p_id_utilisateur)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_bon_commande(
  p_id_structure       INTEGER,
  p_date_bon_commande  DATE,
  p_id_fournisseur     INTEGER,
  p_description        TEXT,
  p_montant_net        NUMERIC,
  p_articles_string    TEXT,           -- Format : "id_produit-qty-cout_revient#..."
  p_mt_remise          NUMERIC  DEFAULT 0,
  p_id_utilisateur     INTEGER  DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
BEGIN
  -- -----------------------------------------------------------------------
  -- Validations préliminaires
  -- -----------------------------------------------------------------------

  -- Date obligatoire
  IF p_date_bon_commande IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'La date du bon de commande est obligatoire'
    );
  END IF;

  -- montant_net ≥ 0
  IF p_montant_net IS NULL OR p_montant_net < 0 THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'Le montant net doit être supérieur ou égal à 0'
    );
  END IF;

  -- mt_remise ≥ 0
  IF COALESCE(p_mt_remise, 0) < 0 THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'La remise doit être supérieure ou égale à 0'
    );
  END IF;

  -- articles_string non vide
  IF p_articles_string IS NULL OR TRIM(p_articles_string) = '' THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'La liste des articles est obligatoire'
    );
  END IF;

  -- Vérification fournisseur : existe ET appartient à la structure ET actif
  SELECT nom_fournisseur, tel_fournisseur
  INTO v_nom_fourn_snap, v_tel_fourn_snap
  FROM fournisseur
  WHERE id_fournisseur = p_id_fournisseur
    AND id_structure   = p_id_structure
    AND actif          = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'id_bon_commande', NULL,
      'num_bc', NULL,
      'message', 'Fournisseur introuvable, inactif ou accès refusé'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Numérotation atomique via bon_commande_compteur (Option C)
  -- INSERT ON CONFLICT DO UPDATE garantit l'atomicité sans verrou explicite
  -- RETURNING retourne la NOUVELLE valeur (après incrément)
  -- -----------------------------------------------------------------------
  INSERT INTO bon_commande_compteur (id_structure, dernier_seq)
  VALUES (p_id_structure, 1)
  ON CONFLICT (id_structure) DO UPDATE
    SET dernier_seq = bon_commande_compteur.dernier_seq + 1
  RETURNING dernier_seq INTO v_seq;

  -- Format : BC-{id_structure}-{YYYYMMDD}-{seq sur 4 chiffres min}
  v_num_bc := 'BC-' || p_id_structure::TEXT
              || '-' || TO_CHAR(p_date_bon_commande, 'YYYYMMDD')
              || '-' || LPAD(v_seq::TEXT, 4, '0');

  -- -----------------------------------------------------------------------
  -- Insertion bon de commande (statut initial = 1 = BROUILLON)
  -- -----------------------------------------------------------------------
  INSERT INTO bon_commande (
    id_structure,
    id_fournisseur,
    id_etat,
    num_bc,
    date_bon_commande,
    description,
    montant_net,
    mt_remise,
    nom_fournisseur_snap,
    tel_fournisseur_snap,
    id_utilisateur
  )
  VALUES (
    p_id_structure,
    p_id_fournisseur,
    1,   -- BROUILLON
    v_num_bc,
    p_date_bon_commande,
    NULLIF(TRIM(p_description), ''),
    p_montant_net,
    COALESCE(p_mt_remise, 0),
    v_nom_fourn_snap,
    v_tel_fourn_snap,
    COALESCE(p_id_utilisateur, 0)
  )
  RETURNING id_bon_commande INTO v_id_bon_commande;

  -- -----------------------------------------------------------------------
  -- Parse articles_string : "id-qty-cout#id-qty-cout#"
  -- Découpage sur '#', filtre tokens vides (trailing '#')
  -- Chaque token : "id_produit-quantite-cout_revient"
  -- -----------------------------------------------------------------------
  v_tokens := string_to_array(p_articles_string, '#');

  FOREACH v_token IN ARRAY v_tokens
  LOOP
    -- Ignorer les tokens vides (résidu du '#' final obligatoire)
    CONTINUE WHEN TRIM(v_token) = '';

    -- Découpage du token en 3 parties sur '-'
    v_parts := string_to_array(v_token, '-');

    -- Validation : exactement 3 composants
    IF array_length(v_parts, 1) <> 3 THEN
      -- Rollback implicite via RAISE EXCEPTION capturé par EXCEPTION block
      RAISE EXCEPTION 'Format article invalide : %. Attendu: id-qty-cout', v_token;
    END IF;

    BEGIN
      v_id_produit   := v_parts[1]::INTEGER;
      v_quantite     := v_parts[2]::NUMERIC;
      v_cout_revient := v_parts[3]::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Valeur numérique invalide dans le token article : %', v_token;
    END;

    -- Validation quantité > 0 et cout_revient ≥ 0
    IF v_quantite <= 0 THEN
      RAISE EXCEPTION 'Quantité doit être > 0 pour l''article id_produit=%', v_id_produit;
    END IF;
    IF v_cout_revient < 0 THEN
      RAISE EXCEPTION 'Coût de revient doit être ≥ 0 pour l''article id_produit=%', v_id_produit;
    END IF;

    -- Snapshot nom_produit : recherche dans la table produits
    -- Si le produit n'existe pas : RAISE EXCEPTION (fail-fast à la création,
    -- intégrité garantie — il sera éventuellement supprimé après sans casser l'historique)
    SELECT nom_produit INTO v_nom_produit_snap
    FROM produits
    WHERE id_produit   = v_id_produit
      AND id_structure = p_id_structure;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit id=% introuvable dans la structure %',
        v_id_produit, p_id_structure;
    END IF;

    -- Insertion ligne détail
    INSERT INTO bon_commande_details (
      id_bon_commande,
      id_structure,
      id_produit,
      nom_produit_snap,
      quantite,
      cout_revient
    )
    VALUES (
      v_id_bon_commande,
      p_id_structure,
      v_id_produit,
      v_nom_produit_snap,
      v_quantite,
      v_cout_revient
    );
  END LOOP;

  -- Vérification qu'au moins une ligne a été insérée
  IF NOT EXISTS (
    SELECT 1 FROM bon_commande_details
    WHERE id_bon_commande = v_id_bon_commande
  ) THEN
    RAISE EXCEPTION 'Aucune ligne article valide trouvée dans articles_string';
  END IF;

  RETURN json_build_object(
    'success',         true,
    'id_bon_commande', v_id_bon_commande,
    'num_bc',          v_num_bc,
    'message',         'Bon de commande créé avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Toute exception lève un rollback complet de la transaction
    -- (bon_commande + bon_commande_details + incrément compteur non rollbacké
    --  intentionnellement : les trous de séquence sont acceptables)
    RETURN json_build_object(
      'success',         false,
      'id_bon_commande', NULL,
      'num_bc',          NULL,
      'message',         'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION create_bon_commande(INTEGER, DATE, INTEGER, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER)
  IS 'Crée un bon de commande fournisseur avec ses lignes articles. Numérotation atomique via bon_commande_compteur. Snapshot fournisseur + produits à la création. Parse articles_string format "id-qty-cout#". Statut initial BROUILLON. Retourne JSON {success, id_bon_commande, num_bc, message}. FR-009.';


-- ============================================================================
-- FONCTION 2 — edit_bon_commande
-- FR-010 | Modifier un BC : champs métier + transition de statut
-- Matrice transitions :
--   BROUILLON(1) → CONFIRME(2) ✅ | ANNULE(4) ✅
--   CONFIRME(2)  → BROUILLON(1) ✅ | LIVRE(3) ✅ | ANNULE(4) ✅
--   LIVRE(3)     → aucune transition ❌ (figé définitivement)
--   ANNULE(4)    → aucune transition ❌ (figé définitivement)
-- ============================================================================

CREATE OR REPLACE FUNCTION edit_bon_commande(
  p_id_bon_commande    INTEGER,
  p_id_structure       INTEGER,
  p_date_bon_commande  DATE     DEFAULT NULL,
  p_id_fournisseur     INTEGER  DEFAULT NULL,
  p_description        TEXT     DEFAULT NULL,
  p_montant_net        NUMERIC  DEFAULT NULL,
  p_articles_string    TEXT     DEFAULT NULL,  -- NULL = ne pas modifier les lignes
  p_mt_remise          NUMERIC  DEFAULT NULL,
  p_id_etat            INTEGER  DEFAULT NULL   -- NULL = ne pas changer le statut
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
BEGIN
  -- -----------------------------------------------------------------------
  -- Vérification sécurité + récupération état actuel
  -- -----------------------------------------------------------------------
  SELECT id_etat INTO v_etat_actuel
  FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bon de commande introuvable ou accès refusé'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Règle primaire : LIVRE(3) et ANNULE(4) sont figés — aucune modification
  -- Cette règle est vérifiée AVANT la matrice de transition
  -- -----------------------------------------------------------------------
  IF v_etat_actuel IN (3, 4) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Ce bon de commande est ' ||
        CASE v_etat_actuel WHEN 3 THEN 'livré' ELSE 'annulé' END ||
        ' et ne peut plus être modifié'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Validation de la transition de statut demandée (si fournie)
  -- Matrice explicite par paires autorisées
  -- -----------------------------------------------------------------------
  IF p_id_etat IS NOT NULL AND p_id_etat <> v_etat_actuel THEN
    -- Paires autorisées : (from, to)
    v_transition_ok := (v_etat_actuel = 1 AND p_id_etat = 2)   -- BROUILLON → CONFIRME
                    OR (v_etat_actuel = 1 AND p_id_etat = 4)   -- BROUILLON → ANNULE
                    OR (v_etat_actuel = 2 AND p_id_etat = 1)   -- CONFIRME  → BROUILLON
                    OR (v_etat_actuel = 2 AND p_id_etat = 3)   -- CONFIRME  → LIVRE
                    OR (v_etat_actuel = 2 AND p_id_etat = 4);  -- CONFIRME  → ANNULE

    IF NOT v_transition_ok THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Transition de statut non autorisée : ' ||
          v_etat_actuel::TEXT || ' → ' || p_id_etat::TEXT
      );
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  -- Validation montant_net et mt_remise si fournis
  -- -----------------------------------------------------------------------
  IF p_montant_net IS NOT NULL AND p_montant_net < 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Le montant net doit être supérieur ou égal à 0'
    );
  END IF;

  IF p_mt_remise IS NOT NULL AND p_mt_remise < 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'La remise doit être supérieure ou égale à 0'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Si changement de fournisseur : vérifier + récupérer snapshot
  -- -----------------------------------------------------------------------
  IF p_id_fournisseur IS NOT NULL THEN
    SELECT nom_fournisseur, tel_fournisseur
    INTO v_nom_fourn_snap, v_tel_fourn_snap
    FROM fournisseur
    WHERE id_fournisseur = p_id_fournisseur
      AND id_structure   = p_id_structure
      AND actif          = TRUE;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Fournisseur introuvable, inactif ou accès refusé'
      );
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  -- Mise à jour des champs du BC (COALESCE : NULL = conserver existant)
  -- -----------------------------------------------------------------------
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

  -- -----------------------------------------------------------------------
  -- Si articles_string fourni : remplacement complet des lignes
  -- Stratégie : DELETE toutes les lignes existantes + INSERT nouvelles
  -- (évite UPDATE partiel complexe avec gestion des suppressions de lignes)
  -- -----------------------------------------------------------------------
  IF p_articles_string IS NOT NULL AND TRIM(p_articles_string) <> '' THEN
    -- Suppression des lignes existantes
    DELETE FROM bon_commande_details
    WHERE id_bon_commande = p_id_bon_commande;

    -- Parse et insertion des nouvelles lignes
    v_tokens := string_to_array(p_articles_string, '#');

    FOREACH v_token IN ARRAY v_tokens
    LOOP
      CONTINUE WHEN TRIM(v_token) = '';

      v_parts := string_to_array(v_token, '-');

      IF array_length(v_parts, 1) <> 3 THEN
        RAISE EXCEPTION 'Format article invalide : %. Attendu: id-qty-cout', v_token;
      END IF;

      BEGIN
        v_id_produit   := v_parts[1]::INTEGER;
        v_quantite     := v_parts[2]::NUMERIC;
        v_cout_revient := v_parts[3]::NUMERIC;
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
      FROM produits
      WHERE id_produit   = v_id_produit
        AND id_structure = p_id_structure;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit id=% introuvable dans la structure %',
          v_id_produit, p_id_structure;
      END IF;

      INSERT INTO bon_commande_details (
        id_bon_commande,
        id_structure,
        id_produit,
        nom_produit_snap,
        quantite,
        cout_revient
      )
      VALUES (
        p_id_bon_commande,
        p_id_structure,
        v_id_produit,
        v_nom_produit_snap,
        v_quantite,
        v_cout_revient
      );
    END LOOP;

    -- Vérification qu'au moins une ligne a été insérée après remplacement
    IF NOT EXISTS (
      SELECT 1 FROM bon_commande_details
      WHERE id_bon_commande = p_id_bon_commande
    ) THEN
      RAISE EXCEPTION 'Aucune ligne article valide après remplacement';
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Bon de commande modifié avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION edit_bon_commande(INTEGER, INTEGER, DATE, INTEGER, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER)
  IS 'Modifie un BC. LIVRE(3) et ANNULE(4) sont figés. Matrice de transition : BROUILLON→CONFIRME/ANNULE, CONFIRME→BROUILLON/LIVRE/ANNULE. Remplacement complet des lignes si articles_string fourni. Pattern COALESCE sur tous les champs. Retourne JSON {success, message}. FR-010.';


-- ============================================================================
-- FONCTION 3 — delete_bon_commande
-- FR-011 | Supprimer un BC (DELETE physique + CASCADE sur details)
-- Refus si statut LIVRE(3)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_bon_commande(
  p_id_bon_commande  INTEGER,
  p_id_structure     INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_etat_actuel  INTEGER;
  v_num_bc       VARCHAR(30);
BEGIN
  -- Vérification sécurité + récupération état actuel
  SELECT id_etat, num_bc INTO v_etat_actuel, v_num_bc
  FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bon de commande introuvable ou accès refusé'
    );
  END IF;

  -- LIVRE(3) : suppression interdite — la livraison est une preuve comptable
  IF v_etat_actuel = 3 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Impossible de supprimer un bon de commande livré (statut LIVRE). Annulez-le d''abord si nécessaire.'
    );
  END IF;

  -- DELETE physique (bon_commande_details supprimé en CASCADE par FK)
  DELETE FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  RETURN json_build_object(
    'success', true,
    'message', 'Bon de commande ' || v_num_bc || ' supprimé avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION delete_bon_commande(INTEGER, INTEGER)
  IS 'Suppression physique d''un BC (BROUILLON, CONFIRME, ANNULE autorisés). LIVRE refusé. CASCADE DELETE sur bon_commande_details via FK. Retourne JSON {success, message}. FR-011.';


-- ============================================================================
-- FONCTION 4 — get_list_bons_commandes
-- FR-012 | Liste des BC d'une structure avec résumé financier
-- ============================================================================

CREATE OR REPLACE FUNCTION get_list_bons_commandes(
  p_id_structure  INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result  JSON;
BEGIN
  SELECT json_build_object(
    'success',         true,
    'bons_commandes',  COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id_bon_commande',     bc.id_bon_commande,
            'id_structure',        bc.id_structure,
            'id_fournisseur',      bc.id_fournisseur,
            'id_etat',             bc.id_etat,
            'libelle_etat',        ebc.libelle,
            'couleur_etat',        ebc.couleur,
            'num_bc',              bc.num_bc,
            'date_bon_commande',   TO_CHAR(bc.date_bon_commande, 'YYYY-MM-DD'),
            'description',         bc.description,
            'montant_net',         bc.montant_net,
            'mt_remise',           bc.mt_remise,
            'nom_fournisseur_snap',bc.nom_fournisseur_snap,
            'tel_fournisseur_snap',bc.tel_fournisseur_snap,
            'id_utilisateur',      bc.id_utilisateur,
            'nb_articles',         (
              SELECT COUNT(*)
              FROM bon_commande_details bcd
              WHERE bcd.id_bon_commande = bc.id_bon_commande
            ),
            'date_creation',       TO_CHAR(bc.date_creation, 'YYYY-MM-DD"T"HH24:MI:SS'),
            'date_modification',   TO_CHAR(bc.date_modification, 'YYYY-MM-DD"T"HH24:MI:SS')
          )
          ORDER BY bc.date_creation DESC
        )
        FROM bon_commande bc
        INNER JOIN etat_bon_commande ebc ON ebc.id_etat = bc.id_etat
        WHERE bc.id_structure = p_id_structure
      ),
      '[]'::JSON
    ),
    'resume',          (
      SELECT json_build_object(
        'total_bcs',           COUNT(*),
        'nb_brouillons',       COUNT(*) FILTER (WHERE id_etat = 1),
        'nb_confirmes',        COUNT(*) FILTER (WHERE id_etat = 2),
        'nb_livres',           COUNT(*) FILTER (WHERE id_etat = 3),
        'nb_annules',          COUNT(*) FILTER (WHERE id_etat = 4),
        -- montant_en_attente : cumul des BC non encore livrés ni annulés
        'montant_en_attente',  COALESCE(SUM(montant_net) FILTER (WHERE id_etat IN (1, 2)), 0),
        'montant_total_livre', COALESCE(SUM(montant_net) FILTER (WHERE id_etat = 3), 0)
      )
      FROM bon_commande
      WHERE id_structure = p_id_structure
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success',        false,
      'bons_commandes', '[]'::JSON,
      'message',        'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION get_list_bons_commandes(INTEGER)
  IS 'Retourne la liste JSON de tous les BC d''une structure (tous statuts), triés par date_creation DESC. Inclut libelle_etat, couleur_etat, nb_articles. Résumé : total par statut, montant_en_attente (BROUILLON+CONFIRME), montant_total_livre. Retourne JSON {success, bons_commandes[], resume}. FR-012.';


-- ============================================================================
-- FONCTION 5 — get_bon_commande_details
-- FR-013 | Détail complet d'un BC avec ses lignes articles et infos fournisseur
-- ============================================================================

CREATE OR REPLACE FUNCTION get_bon_commande_details(
  p_id_bon_commande  INTEGER,
  p_id_structure     INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result  JSON;
  v_bc_row  bon_commande%ROWTYPE;
BEGIN
  -- Vérification sécurité + chargement BC
  SELECT * INTO v_bc_row
  FROM bon_commande
  WHERE id_bon_commande = p_id_bon_commande
    AND id_structure    = p_id_structure;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bon de commande introuvable ou accès refusé'
    );
  END IF;

  SELECT json_build_object(
    'success',     true,
    'bon_commande', json_build_object(
      -- Champs BC
      'id_bon_commande',      v_bc_row.id_bon_commande,
      'id_structure',         v_bc_row.id_structure,
      'id_fournisseur',       v_bc_row.id_fournisseur,
      'id_etat',              v_bc_row.id_etat,
      'libelle_etat',         ebc.libelle,
      'couleur_etat',         ebc.couleur,
      'num_bc',               v_bc_row.num_bc,
      'date_bon_commande',    TO_CHAR(v_bc_row.date_bon_commande, 'YYYY-MM-DD'),
      'description',          v_bc_row.description,
      'montant_net',          v_bc_row.montant_net,
      'mt_remise',            v_bc_row.mt_remise,
      'id_utilisateur',       v_bc_row.id_utilisateur,
      'date_creation',        TO_CHAR(v_bc_row.date_creation, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'date_modification',    TO_CHAR(v_bc_row.date_modification, 'YYYY-MM-DD"T"HH24:MI:SS'),
      -- Snapshot fournisseur (immuable — capturé à la création)
      'nom_fournisseur_snap', v_bc_row.nom_fournisseur_snap,
      'tel_fournisseur_snap', v_bc_row.tel_fournisseur_snap,
      -- Infos fournisseur enrichies (données actuelles pour affichage)
      'fournisseur', (
        SELECT json_build_object(
          'id_fournisseur',    f.id_fournisseur,
          'nom_fournisseur',   f.nom_fournisseur,
          'tel_fournisseur',   f.tel_fournisseur,
          'email_fournisseur', f.email_fournisseur,
          'adresse',           f.adresse,
          'ninea',             f.ninea,
          'actif',             f.actif
        )
        FROM fournisseur f
        WHERE f.id_fournisseur = v_bc_row.id_fournisseur
      ),
      -- Lignes articles
      'articles', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id_detail',        bcd.id_detail,
              'id_produit',       bcd.id_produit,
              'nom_produit_snap', bcd.nom_produit_snap,
              'quantite',         bcd.quantite,
              'cout_revient',     bcd.cout_revient,
              'sous_total',       bcd.quantite * bcd.cout_revient
            )
            ORDER BY bcd.id_detail ASC
          )
          FROM bon_commande_details bcd
          WHERE bcd.id_bon_commande = v_bc_row.id_bon_commande
        ),
        '[]'::JSON
      )
    )
  ) INTO v_result
  FROM etat_bon_commande ebc
  WHERE ebc.id_etat = v_bc_row.id_etat;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur interne : ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION get_bon_commande_details(INTEGER, INTEGER)
  IS 'Retourne le détail complet d''un BC : métadonnées, snapshot fournisseur, infos fournisseur actuelles enrichies (email, adresse, ninea), lignes articles avec sous_total calculé. Vérification id_structure obligatoire. Retourne JSON {success, bon_commande{..., fournisseur{...}, articles[]}}. FR-013.';
