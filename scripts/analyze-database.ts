/**
 * Script d'analyse de la base de données fayclick_db
 * Liste toutes les tables existantes avec leurs colonnes
 */

import DatabaseService from '../services/database.service';

async function analyzeDatabase() {
  console.log('🔍 === ANALYSE BASE DE DONNÉES fayclick_db ===\n');

  try {
    // 1. Lister tous les schémas
    console.log('📂 ÉTAPE 1: Liste des schémas disponibles');
    const schemasQuery = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name;
    `;

    const schemas = await DatabaseService.query(schemasQuery);
    console.log('✅ Schémas trouvés:', schemas);
    console.log('\n');

    // 2. Lister toutes les tables du schéma public
    console.log('📋 ÉTAPE 2: Liste des tables du schéma public');
    const tablesQuery = `
      SELECT
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tables = await DatabaseService.query(tablesQuery);
    console.log(`✅ ${tables.length} tables trouvées:\n`);

    // Afficher la liste des tables
    tables.forEach((table: any, index: number) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    console.log('\n');

    // 3. Pour chaque table, obtenir les détails des colonnes
    console.log('🔎 ÉTAPE 3: Détails des colonnes pour chaque table\n');

    for (const table of tables) {
      const tableName = (table as any).table_name;

      const columnsQuery = `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `;

      const columns = await DatabaseService.query(columnsQuery);

      console.log(`\n📊 TABLE: ${tableName}`);
      console.log('─'.repeat(80));
      console.log('Colonnes:');

      columns.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';

        console.log(`  - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });

      // Obtenir les contraintes (clés primaires, foreign keys, etc.)
      const constraintsQuery = `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = '${tableName}'
        ORDER BY tc.constraint_type, kcu.column_name;
      `;

      const constraints = await DatabaseService.query(constraintsQuery);

      if (constraints.length > 0) {
        console.log('\nContraintes:');
        constraints.forEach((constraint: any) => {
          console.log(`  - ${constraint.constraint_type}: ${constraint.column_name} (${constraint.constraint_name})`);
        });
      }

      // Obtenir les index
      const indexesQuery = `
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = '${tableName}'
        ORDER BY indexname;
      `;

      const indexes = await DatabaseService.query(indexesQuery);

      if (indexes.length > 0) {
        console.log('\nIndex:');
        indexes.forEach((idx: any) => {
          console.log(`  - ${idx.indexname}`);
        });
      }
    }

    // 4. Lister les fonctions PostgreSQL disponibles
    console.log('\n\n🔧 ÉTAPE 4: Fonctions PostgreSQL disponibles');
    console.log('─'.repeat(80));

    const functionsQuery = `
      SELECT
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `;

    const functions = await DatabaseService.query(functionsQuery);
    console.log(`✅ ${functions.length} fonctions trouvées:\n`);

    functions.forEach((func: any, index: number) => {
      console.log(`${index + 1}. ${func.routine_name}()`);
    });

    // 5. Statistiques globales
    console.log('\n\n📈 ÉTAPE 5: Statistiques globales');
    console.log('─'.repeat(80));

    const statsQuery = `
      SELECT
        COUNT(*) as total_tables
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    `;

    const stats = await DatabaseService.query(statsQuery);
    console.log(`Total tables: ${(stats[0] as any).total_tables}`);

    console.log('\n✅ === ANALYSE TERMINÉE ===\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    throw error;
  }
}

// Exécution du script
analyzeDatabase()
  .then(() => {
    console.log('Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script terminé avec erreur:', error);
    process.exit(1);
  });
