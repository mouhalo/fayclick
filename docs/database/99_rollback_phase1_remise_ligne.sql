-- ============================================================================
-- ROLLBACK Phase 1 — Restauration ETAT AVANT patch remise par ligne
-- Base       : fayclick_db @ 154.12.224.173:3253
-- Auteur     : dba_master
-- Date       : 2026-07-24
-- A N'EXÉCUTER QU'EN CAS DE PROBLÈME post Phase 1 (validé par PO)
-- ============================================================================
--
-- PRINCIPE : ce script restaure l'état antérieur du schéma :
--   1. DROP des contraintes CHECK créées
--   2. DROP COLUMN remise_pct, prix_origine des 4 tables
--      (cascade : recrée les vues/fonctions impactées si besoin)
--   3. Restauration des 14 fonctions via leur dump pg_get_functiondef
--      (backup_functions_before.sql — à rejouer tel quel)
--   4. Restauration de la vue list_detailventes (DROP des colonnes suffit car
--      le CREATE OR REPLACE VIEW de la Phase 1 sera invalidé par le DROP COLUMN)
--
-- ATTENTION : DROP COLUMN sur detail_facture_com (548k lignes) implique un
-- REWRITE de la table (PG < 13) ou est plus rapide depuis PG 13 (mais reste
-- exclusif). À exécuter en heure creuse.
--
-- PRÉ-REQUIS : avoir exporté AVANT la Phase 1 :
--   - le dump des définitions de fonctions (backup_functions_before.sql)
--   - le pg_dump --schema-only des 4 tables
--
-- EXÉCUTION :
--   psql "postgresql://$DB_USER:$DB_PASS@154.12.224.173:3253/fayclick_db" \
--        -v ON_ERROR_STOP=1 -f 99_rollback_phase1_remise_ligne.sql
-- ============================================================================

\set ON_ERROR_STOP on
\echo '==== DEBUT ROLLBACK Phase 1 ===='

BEGIN;

-- ============================================================================
-- ÉTAPE R1 — DROP des contraintes CHECK (idempotent)
-- ============================================================================
\echo 'ETAPE R1 — DROP contraintes CHECK'

ALTER TABLE public.detail_facture_com     DROP CONSTRAINT IF EXISTS chk_detail_facture_remise_pct;
ALTER TABLE public.proforma_details       DROP CONSTRAINT IF EXISTS chk_proforma_remise_pct;
ALTER TABLE public.bon_commande_details   DROP CONSTRAINT IF EXISTS chk_bon_commande_remise_pct;
ALTER TABLE public.detail_devis           DROP CONSTRAINT IF EXISTS chk_detail_devis_remise_pct;

-- ============================================================================
-- ÉTAPE R2 — DROP VIEW list_detailventes (dépend des colonnes à supprimer)
-- ============================================================================
\echo 'ETAPE R2 — DROP VIEW list_detailventes'

DROP VIEW IF EXISTS public.list_detailventes;

-- ============================================================================
-- ÉTAPE R3 — DROP COLUMN remise_pct, prix_origine (4 tables)
-- ============================================================================
-- À exécuter en heure creuse (REWRITE TABLE possible sur 548k lignes).
\echo 'ETAPE R3 — DROP COLUMN (4 tables)'

ALTER TABLE public.detail_facture_com
    DROP COLUMN IF EXISTS remise_pct,
    DROP COLUMN IF EXISTS prix_origine;

ALTER TABLE public.proforma_details
    DROP COLUMN IF EXISTS remise_pct,
    DROP COLUMN IF EXISTS prix_origine;

ALTER TABLE public.bon_commande_details
    DROP COLUMN IF EXISTS remise_pct,
    DROP COLUMN IF EXISTS prix_origine;

ALTER TABLE public.detail_devis
    DROP COLUMN IF EXISTS remise_pct,
    DROP COLUMN IF EXISTS prix_origine;

-- ============================================================================
-- ÉTAPE R4 — Recréer la vue list_detailventes dans sa forme ORIGINALE (3 cols)
-- ============================================================================
\echo 'ETAPE R4 — Recréation vue list_detailventes (forme originale)'

CREATE VIEW public.list_detailventes AS
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
    ps.description
FROM detail_facture_com df
JOIN produit_service ps ON (df.id_produit = ps.id_produit);

COMMIT;

-- ============================================================================
-- ÉTAPE R5 — Rejouer le dump des fonctions AVANT Phase 1
-- ============================================================================
-- Le fichier backup_functions_before_phase1.sql contient les pg_get_functiondef
-- exacts des 14 fonctions dans leur état pré-patch. Il suffit de le rejouer.
--
-- Commande à lancer APRÈS ce script :
--   psql "...fayclick_db" -v ON_ERROR_STOP=1 \
--        -f backup_functions_before_phase1.sql
--
-- Si vous n'avez pas ce backup : il faut re-patcher manuellement chaque fonction
-- pour retirer le code [PHASE1] — non recommandé.

\echo '==== ROLLBACK schéma terminé ===='
\echo 'NE PAS OUBLIER : rejouer backup_functions_before_phase1.sql (ÉTAPE R5)'
