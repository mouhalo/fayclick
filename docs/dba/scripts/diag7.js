const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
c.connect().then(() => Promise.all([
  // FKs pointing to facture table
  c.query(`SELECT kcu.table_name AS from_table, kcu.column_name AS from_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema
    WHERE tc.constraint_type=$1 AND tc.table_schema=$2 AND ccu.table_name=$3`,
    ['FOREIGN KEY', 'public', 'facture']),
  // Count facture for SIMULA27
  c.query(`SELECT COUNT(*) AS cnt FROM public.facture WHERE id_structure=1998`),
  // code_structure column in structures
  c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='structures' AND column_name='code_structure'`),
  // Check progression columns
  c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='progression' ORDER BY ordinal_position LIMIT 5`),
])).then(([facture_fks, facture_cnt, code_struct, progression_cols]) => {
  console.log('FKs → facture:', JSON.stringify(facture_fks.rows));
  console.log('facture SIMULA27:', JSON.stringify(facture_cnt.rows));
  console.log('structures.code_structure exists:', code_struct.rows.length > 0 ? 'YES' : 'NO');
  console.log('progression cols:', JSON.stringify(progression_cols.rows));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
