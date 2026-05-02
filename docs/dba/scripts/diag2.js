const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
c.connect().then(() => Promise.all([
  // Get exact signature of old get_admin_all_utilisateurs
  c.query(`SELECT p.oid::text, pg_get_function_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_admin_all_utilisateurs' ORDER BY p.oid`),
  // Test delete_structure with BEGIN/ROLLBACK to see actual error
  c.query('BEGIN'),
])).then(([versions, _]) => {
  console.log('get_admin_all_utilisateurs versions:', JSON.stringify(versions.rows, null, 2));
  return c.query('SELECT delete_structure(1998, 205) AS result');
}).then(r => {
  const row = r.rows[0];
  const res = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
  console.log('delete_structure SIMULA27 result:', JSON.stringify(res, null, 2));
  return c.query('ROLLBACK');
}).then(() => {
  console.log('ROLLBACK done');
  c.end();
}).catch(e => {
  console.error('ERROR:', e.message);
  c.query('ROLLBACK').finally(() => c.end());
});
