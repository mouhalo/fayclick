const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
const tables = ['abonnement_tarif','active_live','banque_structure','categorie','compte_structure','control_access','demande_auth','facture','frais_virement','import_data','journal_activite','profil_droits','progression','proforma','proforma_details'];
c.connect().then(() => c.query(
  `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1) ORDER BY table_name`,
  [tables]
)).then(r => {
  console.log('TABLE TYPES:', JSON.stringify(r.rows));
  // Check counts for SIMULA27 (id=1998)
  const countSqls = tables.map(t => `(SELECT COUNT(*) FROM public."${t}" WHERE id_structure=1998) AS "${t}"`);
  return c.query('SELECT ' + countSqls.join(', '));
}).then(r => {
  console.log('SIMULA27 COUNTS (extended):', JSON.stringify(r.rows));
  c.end();
}).catch(e => { console.error('ERROR:', e.message); c.end(); });
