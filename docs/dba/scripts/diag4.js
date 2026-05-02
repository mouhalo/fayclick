const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
c.connect().then(() => Promise.all([
  // All FKs pointing to structures table
  c.query(`SELECT kcu.table_name AS from_table, kcu.column_name AS from_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema
    WHERE tc.constraint_type=$1 AND tc.table_schema=$2 AND ccu.table_name=$3
    ORDER BY kcu.table_name`,
    ['FOREIGN KEY', 'public', 'structures']),
  // Count SIMULA27 data
  c.query(`SELECT
    (SELECT COUNT(*) FROM public.facture_com WHERE id_structure=1998) AS factures,
    (SELECT COUNT(*) FROM public.utilisateur WHERE id_structure=1998) AS users,
    (SELECT COUNT(*) FROM public.client_facture WHERE id_structure=1998) AS clients,
    (SELECT COUNT(*) FROM public.abonnements WHERE id_structure=1998) AS abonnements,
    (SELECT COUNT(*) FROM public.produit_service WHERE id_structure=1998) AS produits`),
  // Check if client_facture has id_structure column
  c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='client_facture' AND column_name='id_structure'`),
])).then(([fks, counts, cfcol]) => {
  console.log('FKs → structures:', JSON.stringify(fks.rows));
  console.log('SIMULA27 counts:', JSON.stringify(counts.rows));
  console.log('client_facture has id_structure:', cfcol.rows.length > 0 ? 'YES' : 'NO');
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
