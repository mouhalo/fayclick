const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
c.connect().then(() => Promise.all([
  // Find tables with id_structure that could be "clients"
  c.query(`SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%client%' ORDER BY table_name`),
  // Check FK constraints on facture_com for id_client
  c.query(`SELECT kcu.table_name AS from_table, kcu.column_name AS from_col, ccu.table_name AS to_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema
    WHERE tc.constraint_type=$1 AND tc.table_schema=$2 AND kcu.table_name='facture_com'`,
    ['FOREIGN KEY','public']),
  // produit_photos table check
  c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('produit_photos','product_embeddings','recus_paiement','detail_facture_com') ORDER BY table_name`),
])).then(([clients, fc_fks, child_tables]) => {
  console.log('CLIENT TABLES:', JSON.stringify(clients.rows));
  console.log('FACTURE_COM FKs:', JSON.stringify(fc_fks.rows));
  console.log('CHILD TABLES:', JSON.stringify(child_tables.rows));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
