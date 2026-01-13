-- ============================================================================
-- TABLE: product_embeddings
-- Description: Stockage des embeddings CLIP pour la reconnaissance visuelle
-- des produits dans FayClick Commerce
--
-- Usage: Exécuter manuellement sur le serveur PostgreSQL
-- Auteur: Claude Code - FayClick V2
-- Date: 2026-01-05
-- ============================================================================

-- Suppression de la table si elle existe (optionnel - décommenter si besoin)
-- DROP TABLE IF EXISTS product_embeddings CASCADE;

-- Création de la table product_embeddings
CREATE TABLE IF NOT EXISTS product_embeddings (
    id SERIAL PRIMARY KEY,

    -- Référence au produit
    id_produit INTEGER NOT NULL,
    id_structure INTEGER NOT NULL,

    -- Embedding CLIP (vecteur de 512 dimensions stocké en JSONB)
    embedding JSONB NOT NULL,

    -- Métadonnées de l'image
    image_hash VARCHAR(64) NOT NULL,           -- Hash SHA-256 de l'image
    image_size INTEGER,                         -- Taille en bytes
    image_dimensions VARCHAR(20),               -- Format "WxH" ex: "224x224"

    -- Statistiques de qualité
    confidence_score NUMERIC(5,4),              -- Score de confiance 0-1

    -- Horodatage
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contrainte d'unicité: un seul embedding par produit et image
    CONSTRAINT uk_produit_image UNIQUE (id_produit, image_hash)
);

-- Index pour recherche rapide par structure
CREATE INDEX IF NOT EXISTS idx_embeddings_structure
ON product_embeddings(id_structure);

-- Index pour recherche par produit
CREATE INDEX IF NOT EXISTS idx_embeddings_produit
ON product_embeddings(id_produit);

-- Index pour recherche par hash d'image
CREATE INDEX IF NOT EXISTS idx_embeddings_image_hash
ON product_embeddings(image_hash);

-- Trigger pour mise à jour automatique de date_modification
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_embedding_timestamp ON product_embeddings;
CREATE TRIGGER trg_update_embedding_timestamp
    BEFORE UPDATE ON product_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_embedding_timestamp();

-- ============================================================================
-- FONCTION: save_product_embedding
-- Description: Sauvegarde ou met à jour l'embedding d'un produit
-- ============================================================================
CREATE OR REPLACE FUNCTION save_product_embedding(
    p_id_produit INTEGER,
    p_id_structure INTEGER,
    p_embedding JSONB,
    p_image_hash VARCHAR(64),
    p_image_size INTEGER DEFAULT NULL,
    p_image_dimensions VARCHAR(20) DEFAULT NULL,
    p_confidence_score NUMERIC(5,4) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
    v_result JSONB;
BEGIN
    -- Insertion ou mise à jour (UPSERT)
    INSERT INTO product_embeddings (
        id_produit,
        id_structure,
        embedding,
        image_hash,
        image_size,
        image_dimensions,
        confidence_score
    )
    VALUES (
        p_id_produit,
        p_id_structure,
        p_embedding,
        p_image_hash,
        p_image_size,
        p_image_dimensions,
        p_confidence_score
    )
    ON CONFLICT (id_produit, image_hash)
    DO UPDATE SET
        embedding = EXCLUDED.embedding,
        image_size = EXCLUDED.image_size,
        image_dimensions = EXCLUDED.image_dimensions,
        confidence_score = EXCLUDED.confidence_score
    RETURNING id INTO v_id;

    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'Embedding sauvegardé avec succès',
        'data', jsonb_build_object(
            'id', v_id,
            'id_produit', p_id_produit,
            'id_structure', p_id_structure,
            'image_hash', p_image_hash
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
$$;

-- ============================================================================
-- FONCTION: get_product_embeddings
-- Description: Récupère les embeddings d'une structure pour la recherche locale
-- ============================================================================
CREATE OR REPLACE FUNCTION get_product_embeddings(
    p_id_structure INTEGER,
    p_limit INTEGER DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_embeddings JSONB;
    v_count INTEGER;
BEGIN
    -- Compter le total
    SELECT COUNT(*) INTO v_count
    FROM product_embeddings
    WHERE id_structure = p_id_structure;

    -- Récupérer les embeddings
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', pe.id,
                'id_produit', pe.id_produit,
                'embedding', pe.embedding,
                'image_hash', pe.image_hash,
                'confidence_score', pe.confidence_score,
                'date_creation', pe.date_creation
            )
            ORDER BY pe.date_creation DESC
        ),
        '[]'::jsonb
    ) INTO v_embeddings
    FROM (
        SELECT *
        FROM product_embeddings
        WHERE id_structure = p_id_structure
        ORDER BY date_creation DESC
        LIMIT p_limit
    ) pe;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Embeddings récupérés avec succès',
        'data', jsonb_build_object(
            'id_structure', p_id_structure,
            'total', v_count,
            'embeddings', v_embeddings
        ),
        'timestamp', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Erreur: ' || SQLERRM,
            'data', NULL,
            'timestamp', NOW()
        );
END;
$$;

-- ============================================================================
-- FONCTION: delete_product_embedding
-- Description: Supprime l'embedding d'un produit
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_product_embedding(
    p_id_produit INTEGER,
    p_id_structure INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM product_embeddings
    WHERE id_produit = p_id_produit
    AND id_structure = p_id_structure;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', v_deleted || ' embedding(s) supprimé(s)',
        'data', jsonb_build_object(
            'id_produit', p_id_produit,
            'deleted_count', v_deleted
        ),
        'timestamp', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Erreur: ' || SQLERRM,
            'data', NULL,
            'timestamp', NOW()
        );
END;
$$;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================
COMMENT ON TABLE product_embeddings IS
'Stockage des embeddings CLIP pour la reconnaissance visuelle des produits FayClick Commerce';

COMMENT ON FUNCTION save_product_embedding IS
'Sauvegarde ou met à jour l''embedding CLIP d''un produit. Utilise UPSERT pour éviter les doublons.';

COMMENT ON FUNCTION get_product_embeddings IS
'Récupère les embeddings d''une structure pour la recherche visuelle locale (IndexedDB sync).';

COMMENT ON FUNCTION delete_product_embedding IS
'Supprime les embeddings d''un produit spécifique.';

-- ============================================================================
-- GRANT (ajuster selon vos besoins)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON product_embeddings TO fayclick_app;
-- GRANT USAGE, SELECT ON SEQUENCE product_embeddings_id_seq TO fayclick_app;
