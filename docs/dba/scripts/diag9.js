const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
c.connect().then(() => Promise.all([
  // Check last activity of admin id=205
  c.query(`SELECT u.username, u.login, u.id_structure, u.updatedat,
    (SELECT MAX(tms_create) FROM public.journal_activite WHERE id_structure = u.id_structure) AS last_activity
    FROM public.utilisateur u WHERE u.id = 205`),
  // FK audit for compte_structure, banque_structure, and other wallet tables
  c.query(`SELECT kcu.table_name AS from_table, kcu.column_name AS from_col, ccu.table_name AS to_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema
    WHERE tc.constraint_type=$1 AND tc.table_schema=$2
      AND ccu.table_name IN ('compte_structure','banque_structure','abonnements','utilisateur','produit_service','facture_com','depense')
    ORDER BY ccu.table_name, kcu.table_name`,
    ['FOREIGN KEY', 'public']),
  // Check if frais_virement has FK to compte_structure
  c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='frais_virement' ORDER BY ordinal_position`),
])).then(([admin205, fks, frais_cols]) => {
  console.log('ADMIN 205:', JSON.stringify(admin205.rows));
  console.log('FKs → wallet tables:', JSON.stringify(fks.rows, null, 2));
  console.log('frais_virement columns:', JSON.stringify(frais_cols.rows));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
