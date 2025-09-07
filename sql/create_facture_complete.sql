-- Fonction stored procedure pour créer une facture complète avec format string délimité
-- Approche senior ingénieuse : parsing de string simple, transaction atomique
-- Format: "id_produit1-quantite1-prix1#id_produit2-quantite2-prix2#"
-- Author: FayClick V2 Team

CREATE OR REPLACE FUNCTION create_facture_complete(
  p_date_facture DATE,
  p_id_structure INTEGER,
  p_tel_client VARCHAR(50),
  p_nom_client_payeur VARCHAR(255),
  p_montant NUMERIC(10,2),
  p_description TEXT,
  p_articles_string TEXT,  -- Format: "id-qty-prix#id-qty-prix#"
  p_mt_remise NUMERIC(10,2) DEFAULT 0,
  p_mt_acompte NUMERIC(10,2) DEFAULT 0,
  p_avec_frais BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
  id_facture INTEGER,
  success BOOLEAN,
  message TEXT,
  details_ids INTEGER[],
  nb_details INTEGER
) 
LANGUAGE plpgsql
AS $$
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
      p_date_facture::TEXT,
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
      
      -- Parser chaque article: "id_produit-quantite-prix"
      v_article_parts := string_to_array(v_article_string, '-');
      
      -- Validation format: doit avoir exactement 3 parties
      IF array_length(v_article_parts, 1) != 3 THEN
        RAISE EXCEPTION 'Format article invalide: "%" (attendu: id-quantite-prix)', v_article_string;
      END IF;
      
      -- Extraire et valider les valeurs
      BEGIN
        v_id_produit := v_article_parts[1]::INTEGER;
        v_quantite := v_article_parts[2]::FLOAT;
        v_prix := v_article_parts[3]::NUMERIC(10,2);
        
        -- Validation des valeurs
        IF v_id_produit <= 0 OR v_quantite <= 0 OR v_prix < 0 THEN
          RAISE EXCEPTION 'Valeurs invalides pour article: ID=%, QTE=%, PRIX=%', v_id_produit, v_quantite, v_prix;
        END IF;
        
      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE EXCEPTION 'Conversion impossible pour article: "%"', v_article_string;
      END;

      -- Insérer le détail et récupérer l'ID
      INSERT INTO detail_facture_com (id_facture, id_produit, quantite, prix)
      VALUES (v_new_facture_id, v_id_produit, v_quantite, v_prix)
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
$$;

-- Donner les permissions appropriées
-- GRANT EXECUTE ON FUNCTION create_facture_complete TO your_app_user;

-- Exemples d'utilisation :
/*
-- Test avec un seul produit
SELECT * FROM create_facture_complete(
  '2025-08-29'::DATE,
  123,
  '771234567',
  'CLIENT TEST',
  15000.00,
  'Test facture simple',
  '351-1-15000#'
);

-- Test avec plusieurs produits
SELECT * FROM create_facture_complete(
  '2025-08-29'::DATE,
  123,
  '771234567',
  'CLIENT MULTI',
  25000.00,
  'Test facture multiple',
  '351-1-15000#352-2-5000#353-1-10000#',
  500,   -- remise
  0,     -- acompte
  FALSE  -- avec_frais
);

-- Test avec quantités décimales
SELECT * FROM create_facture_complete(
  '2025-08-29'::DATE,
  123,
  '771234567',
  'CLIENT DECIMAL',
  7750.00,
  'Test avec décimales',
  '351-1.5-5000#352-0.5-5500#'
);
*/