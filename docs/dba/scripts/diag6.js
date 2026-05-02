const { Client } = require('C:/tmp/pgquery/node_modules/pg');
const c = new Client({ host:'154.12.224.173', port:3253, user:'admin_icelab', password:'*IceL@b2022*', database:'fayclick_db' });
// Check which tables have id_structure column among the new ones
const tables = ['abonnement_tarif','active_live','banque_structure','categorie','compte_structure','control_access','demande_auth','facture','frais_virement','import_data','journal_activite','profil_droits','progression'];
c.connect().then(() => c.query(
  `SELECT table_name, column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name = ANY($1) AND column_name='id_structure'
   ORDER BY table_name`,
  [tables]
)).then(r => {
  console.log('Tables with id_structure:', JSON.stringify(r.rows));
  // Get all columns for control_access (uses code_structure)
  return c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='control_access' ORDER BY ordinal_position`);
}).then(r => {
  console.log('control_access columns:', JSON.stringify(r.rows));
  // Check proforma has id_structure
  return c.query(`SELECT COUNT(*) AS cnt FROM public.proforma WHERE id_structure=1998`);
}).then(r => {
  console.log('proforma SIMULA27:', JSON.stringify(r.rows));
  return c.query(`SELECT COUNT(*) AS cnt FROM public.proforma_details pd JOIN public.proforma p ON pd.id_proforma=p.id_proforma WHERE p.id_structure=1998`);
}).then(r => {
  console.log('proforma_details SIMULA27:', JSON.stringify(r.rows));
  return c.query(`SELECT COUNT(*) AS cnt FROM public.categorie WHERE id_structure=1998`);
}).then(r => {
  console.log('categorie SIMULA27:', JSON.stringify(r.rows));
  // Check if produit_service has FK to categorie
  return c.query(`SELECT kcu.table_name AS from_table, kcu.column_name AS from_col, ccu.table_name AS to_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema
    WHERE tc.constraint_type=$1 AND tc.table_schema=$2 AND ccu.table_name='categorie'`,
    ['FOREIGN KEY', 'public']);
}).then(r => {
  console.log('FKs → categorie:', JSON.stringify(r.rows));
  c.end();
}).catch(e => { console.error('ERROR:', e.message); c.end(); });
