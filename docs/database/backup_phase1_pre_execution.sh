#!/usr/bin/env bash
# ============================================================================
# BACKUP PRE-EXECUTION Phase 1 — Persistance remise par ligne
# Base       : fayclick_db @ 154.12.224.173:3253
# Auteur     : dba_master
# Date       : 2026-07-24
# ----------------------------------------------------------------------------
# BUT : capturer l'état exact AVANT exécution de PATCH_PHASE1_REMISE_LIGNE.sql
#       pour permettre un rollback complet si besoin.
#
# PRÉ-REQUIS :
#   - psql et pg_dump installés (PG 16 de préférence, mais PG 12+ OK)
#   - Variables d'environnement positionnées (cf. .env du projet) :
#       export DB_HOST=154.12.224.173
#       export DB_PORT=3253
#       export DB_NAME=fayclick_db
#       export DB_USER=admin_icelab
#       export DB_PASS='********'        # À REMPLIR — ne JAMAIS committer
#
# EXÉCUTION (depuis Git Bash sur le serveur de dev ou un poste d'admin) :
#   bash backup_phase1_pre_execution.sh
#
# DURÉE ESTIMÉE : 5-15 min (dump CSV de 548k lignes ~ 100 Mo)
# ============================================================================

set -euo pipefail

: "${DB_HOST:?DB_HOST requis}"
: "${DB_PORT:?DB_PORT requis}"
: "${DB_NAME:?DB_NAME requis}"
: "${DB_USER:?DB_USER requis}"
: "${DB_PASS:?DB_PASS requis}"

DATE_TAG="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="C:/tmp/pgquery/backup_remise_ligne_${DATE_TAG}"
mkdir -p "$BACKUP_DIR"

PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1"
PGDUMP="pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo "==== Backup Phase 1 — destination : $BACKUP_DIR ===="

# ----------------------------------------------------------------------------
# 1) Schéma des 4 tables (format \d+ lisible)
# ----------------------------------------------------------------------------
for tbl in detail_facture_com proforma_details bon_commande_details detail_devis; do
    echo "  + schéma $tbl"
    $PSQL -c "\d+ public.$tbl" > "$BACKUP_DIR/01_schema_${tbl}_before.txt" 2>&1
done

# ----------------------------------------------------------------------------
# 2) Dump DATA-only des 4 tables (format custom pour restauration rapide)
# ----------------------------------------------------------------------------
# 2a) detail_facture_com (548k lignes — ~100 Mo, format custom binaire rapide)
echo "  + pg_dump detail_facture_com (548k lignes — patienter)"
$PGDUMP --data-only --table=public.detail_facture_com --format=custom \
    -f "$BACKUP_DIR/03_dump_detail_facture_com.dump"

# 2b) proforma_details (876 lignes — léger)
echo "  + pg_dump proforma_details"
$PGDUMP --data-only --table=public.proforma_details --format=custom \
    -f "$BACKUP_DIR/04_dump_proforma_details.dump"

# 2c) bon_commande_details (faible volume)
echo "  + pg_dump bon_commande_details"
$PGDUMP --data-only --table=public.bon_commande_details --format=custom \
    -f "$BACKUP_DIR/05_dump_bon_commande_details.dump"

# 2d) detail_devis (faible volume)
echo "  + pg_dump detail_devis"
$PGDUMP --data-only --table=public.detail_devis --format=custom \
    -f "$BACKUP_DIR/06_dump_detail_devis.dump"

# ----------------------------------------------------------------------------
# 3) Export des pg_get_functiondef AVANT patch (14 fonctions = 14 surcharges)
#    → Rejouable tel quel pour le rollback (99_rollback_phase1_remise_ligne.sql ÉTAPE R5)
# ----------------------------------------------------------------------------
echo "  + export pg_get_functiondef (14 fonctions)"

$PSQL -t -A -c "
SELECT pg_get_functiondef(p.oid) || E';\n'
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_proforma','edit_proforma','convert_proforma_to_facture',
    'create_facture_complete','create_facture_complete1',
    'create_facture_online','create_bon_commande','edit_bon_commande',
    'add_new_devis_complet','maj_devis','modifier_facturecom',
    'rechercher_multifacturecom','get_my_factures1'
  )
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
" > "$BACKUP_DIR/backup_functions_before_phase1.sql"

# ----------------------------------------------------------------------------
# 4) Dump de la vue list_detailventes
# ----------------------------------------------------------------------------
echo "  + dump vue list_detailventes"
$PSQL -t -A -c "
SELECT 'CREATE OR REPLACE VIEW public.list_detailventes AS ' ||
       definition || ';' FROM pg_views
WHERE schemaname='public' AND viewname='list_detailventes';
" > "$BACKUP_DIR/20_view_list_detailventes_before.sql"

# ----------------------------------------------------------------------------
# 5) Snapshot informatif : sommes/volumétries pour comparaison post-patch
# ----------------------------------------------------------------------------
echo "  + snapshot sommes montants (sanity post-rollback)"

$PSQL -c "
SELECT 'detail_facture_com' AS tbl, COUNT(*) AS n, SUM(quantite * prix) AS brute
FROM public.detail_facture_com
UNION ALL
SELECT 'proforma_details', COUNT(*), SUM(quantite * prix_unitaire)
FROM public.proforma_details
UNION ALL
SELECT 'bon_commande_details', COUNT(*), SUM(quantite * cout_revient)
FROM public.bon_commande_details
UNION ALL
SELECT 'detail_devis', COUNT(*), SUM(quantite * prix)
FROM public.detail_devis;
" > "$BACKUP_DIR/30_sommes_avant.txt"

echo ""
echo "==== BACKUP TERMINÉ ===="
echo "Répertoire : $BACKUP_DIR"
echo ""
echo "Fichiers produits :"
ls -lh "$BACKUP_DIR"
echo ""
echo "PROCHAINE ÉTAPE : exécuter PATCH_PHASE1_REMISE_LIGNE.sql"
