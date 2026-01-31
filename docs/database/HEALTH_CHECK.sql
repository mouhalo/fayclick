-- ========================================================================
-- HEALTH CHECK - Base de Données fayclick_db
-- ========================================================================
-- Script d'analyse rapide de la santé de la base de données
-- Exécution recommandée: Quotidienne ou lors de diagnostics
-- ========================================================================

\echo '╔══════════════════════════════════════════════════════════════════════╗'
\echo '║          HEALTH CHECK - fayclick_db                                  ║'
\echo '║          Date: ' `date +%Y-%m-%d` '                                                  ║'
\echo '╚══════════════════════════════════════════════════════════════════════╝'
\echo ''

-- ========================================================================
-- 1. STATISTIQUES GLOBALES
-- ========================================================================
\echo '📊 1. STATISTIQUES GLOBALES'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  'Nombre total de structures' as metrique,
  COUNT(*)::text as valeur
FROM structures
UNION ALL
SELECT
  'Structures actives',
  COUNT(*)::text
FROM structures
WHERE actif = true
UNION ALL
SELECT
  'Total factures',
  COUNT(*)::text
FROM list_factures_com
UNION ALL
SELECT
  'Total clients',
  COUNT(*)::text
FROM clients
UNION ALL
SELECT
  'Total produits actifs',
  COUNT(*)::text
FROM list_produits
WHERE actif = true;

\echo ''

-- ========================================================================
-- 2. ALERTES CRITIQUES
-- ========================================================================
\echo '🚨 2. ALERTES CRITIQUES'
\echo '─────────────────────────────────────────────────────────────────────'

-- Factures impayées > 30 jours
\echo '⚠️  Factures impayées depuis plus de 30 jours:'
SELECT
  COUNT(*) as nb_factures,
  SUM(reste_a_payer) as montant_total_impaye
FROM list_factures_com
WHERE statut IN ('IMPAYEE', 'PAYEE_PARTIELLE')
  AND CURRENT_DATE - date_facture::date > 30;

\echo ''

-- Produits en rupture de stock
\echo '⚠️  Produits en rupture de stock:'
SELECT COUNT(*) as nb_produits_rupture
FROM list_produits
WHERE quantite = 0 AND actif = true;

\echo ''

-- Abonnements expirant dans 7 jours
\echo '⚠️  Abonnements expirant dans 7 jours:'
SELECT COUNT(*) as nb_abonnements_expirant
FROM abonnements_structure
WHERE statut = 'ACTIF'
  AND date_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

\echo ''

-- ========================================================================
-- 3. TAILLE DES TABLES (TOP 10)
-- ========================================================================
\echo '💾 3. TAILLE DES TABLES (Top 10)'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  tablename as table_name,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 10;

\echo ''

-- ========================================================================
-- 4. ACTIVITÉ VACUUM
-- ========================================================================
\echo '🧹 4. ACTIVITÉ VACUUM (Tables critiques)'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  relname as table_name,
  last_vacuum,
  last_autovacuum,
  n_tup_ins as insertions,
  n_tup_upd as updates,
  n_tup_del as deletions
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('list_factures_com', 'paiements', 'transactions_wallet', 'mouvement_stock')
ORDER BY n_tup_upd DESC;

\echo ''

-- ========================================================================
-- 5. PERFORMANCE - INDEX MANQUANTS
-- ========================================================================
\echo '🔍 5. INDEX MANQUANTS SUR FOREIGN KEYS'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  tc.table_name,
  kcu.column_name,
  'Missing index on FK' as alerte
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
  )
LIMIT 10;

\echo ''

-- ========================================================================
-- 6. WALLET - SOLDES GLOBAUX
-- ========================================================================
\echo '💰 6. WALLET - SOLDES GLOBAUX'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  'Total ORANGE MONEY' as methode,
  SUM(solde_om) as solde_total
FROM wallet_structure
UNION ALL
SELECT
  'Total WAVE',
  SUM(solde_wave)
FROM wallet_structure
UNION ALL
SELECT
  'Total FREE MONEY',
  SUM(solde_free)
FROM wallet_structure
UNION ALL
SELECT
  'TOTAL GLOBAL',
  SUM(solde_om + solde_wave + solde_free)
FROM wallet_structure;

\echo ''

-- ========================================================================
-- 7. CHIFFRE D'AFFAIRES DU MOIS
-- ========================================================================
\echo '💵 7. CHIFFRE D''AFFAIRES DU MOIS EN COURS'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  COUNT(id_facture) as nb_factures,
  SUM(montant_net) as ca_total,
  SUM(acompte) as total_encaisse,
  SUM(reste_a_payer) as total_impaye
FROM list_factures_com
WHERE EXTRACT(YEAR FROM date_facture) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM date_facture) = EXTRACT(MONTH FROM CURRENT_DATE);

\echo ''

-- ========================================================================
-- 8. TOP 5 STRUCTURES PAR CA
-- ========================================================================
\echo '🏆 8. TOP 5 STRUCTURES PAR CHIFFRE D''AFFAIRES'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  s.nom_structure,
  COUNT(f.id_facture) as nb_factures,
  SUM(f.montant_net) as ca_total
FROM structures s
LEFT JOIN list_factures_com f ON s.id_structure = f.id_structure
GROUP BY s.id_structure, s.nom_structure
ORDER BY ca_total DESC NULLS LAST
LIMIT 5;

\echo ''

-- ========================================================================
-- 9. SMS EN ATTENTE
-- ========================================================================
\echo '📱 9. SMS EN ATTENTE D''ENVOI'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  statut,
  COUNT(*) as nb_sms
FROM pending_sms
GROUP BY statut;

\echo ''

-- ========================================================================
-- 10. CONNEXIONS ACTIVES
-- ========================================================================
\echo '🔌 10. CONNEXIONS ACTIVES À LA BASE'
\echo '─────────────────────────────────────────────────────────────────────'

SELECT
  datname as database,
  COUNT(*) as nb_connexions,
  MAX(state) as etat
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname;

\echo ''

-- ========================================================================
-- RECOMMANDATIONS
-- ========================================================================
\echo '💡 RECOMMANDATIONS'
\echo '─────────────────────────────────────────────────────────────────────'
\echo '1. Vérifier les alertes critiques ci-dessus'
\echo '2. Si tables > 10 GB, planifier VACUUM ANALYZE'
\echo '3. Si index manquants, créer selon REQUETES_SQL_UTILES.md'
\echo '4. Si factures impayées > 100, lancer campagne relance'
\echo '5. Si ruptures stock > 50, commander produits'
\echo ''
\echo '✅ Health check terminé.'
\echo ''
