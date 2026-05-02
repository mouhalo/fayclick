const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
c.connect().then(() => Promise.all([
  // Get check constraint on abonnements
  c.query(`SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_schema='public' AND constraint_name LIKE '%abonnement%'`),
  // Get all constraints on abonnements table
  c.query(`SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema='public' AND tc.table_name='abonnements'`),
  // Sample existing rows in abonnements to see valid methode values
  c.query(`SELECT DISTINCT methode, type_abonnement, statut FROM public.abonnements ORDER BY methode LIMIT 20`),
])).then(([ccs, tc, sample]) => {
  console.log('CHECK CONSTRAINTS:', JSON.stringify(ccs.rows));
  console.log('ALL CONSTRAINTS:', JSON.stringify(tc.rows));
  console.log('SAMPLE methode values:', JSON.stringify(sample.rows));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
