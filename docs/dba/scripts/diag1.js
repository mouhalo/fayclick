const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
c.connect().then(() => Promise.all([
  c.query('SELECT id, username, id_structure FROM public.utilisateur WHERE id_structure <= 0 LIMIT 5'),
  c.query('SELECT id, username FROM public.utilisateur ORDER BY id LIMIT 5'),
  c.query('SELECT id_structure, nom_structure FROM public.structures WHERE id_structure > 0 LIMIT 3'),
  c.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='abonnements' AND column_name='uuid_paiement'"),
  c.query("SELECT pg_get_functiondef(p.oid) AS src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'delete_structure' LIMIT 1"),
  c.query("SELECT id_structure, nom_structure FROM public.structures WHERE code_promo='SIMULA27' LIMIT 1")
])).then(([admins, users5, structs, uuidcol, delsrc, simula]) => {
  console.log('SYSTEM_ADMINS (id_structure<=0):', JSON.stringify(admins.rows));
  console.log('FIRST_5_USERS:', JSON.stringify(users5.rows));
  console.log('FIRST_3_STRUCTS:', JSON.stringify(structs.rows));
  console.log('UUID_COL_TYPE:', JSON.stringify(uuidcol.rows));
  console.log('SIMULA27:', JSON.stringify(simula.rows));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
