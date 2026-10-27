#!/usr/bin/env node
/**
 * Tests de la liste blanche SQL (lib/sql-whitelist.mjs)
 * Usage : npm run test:sql-whitelist
 *
 * Corpus construit à partir de l'inventaire exhaustif du 2026-10-26 :
 * chaque forme légitime envoyée par les services doit passer ; tout le
 * reste (SQL arbitraire, fuite mobile_om, injections multi-énoncés,
 * commentaires, dollar-quoting, fonctions système) doit être refusé.
 */

import { validateQuery } from '../lib/sql-whitelist.mjs';

let passed = 0;
let failed = 0;

function accept(name, sql) {
  const v = validateQuery(sql);
  if (v.ok) { passed++; }
  else {
    failed++;
    console.error(`✗ DEVRAIT PASSER  [${name}] raison=${v.reason}`);
    console.error(`  ${String(sql).substring(0, 160)}`);
  }
}

function reject(name, sql) {
  const v = validateQuery(sql);
  if (!v.ok) { passed++; }
  else {
    failed++;
    console.error(`✗ DEVRAIT ÊTRE REFUSÉ  [${name}] via=${v.via}/${v.detail || ''}`);
    console.error(`  ${String(sql).substring(0, 160)}`);
  }
}

// ==========================================================================
// FORMES LÉGITIMES — transcription des services
// ==========================================================================

// Dictionnaires / ping
accept('type_structure.list', 'SELECT id_type, nom_type FROM type_structure WHERE id_type != 0 ORDER BY nom_type');
accept('localites.list', 'SELECT id_localite, nom_localite FROM localites ORDER BY nom_localite');
accept('ping', 'SELECT 1 as test_connection;');

// structures / list_structures
accept('structures.exists-by-name (quote échappée)', "SELECT 1 FROM structures WHERE UPPER(nom_structure) = 'BOUTIQUE L''AMITIE' LIMIT 1;");
accept('structures.name-by-id', 'SELECT nom_structure FROM structures WHERE id_structure = 183');
accept('structures.contact-by-id', "SELECT nom_structure, COALESCE(mobile_om, '') AS mobile_om, COALESCE(mobile_wave, '') AS mobile_wave FROM structures WHERE id_structure = 183");
accept('list_structures.recovery-by-name', "SELECT id_structure, mobile_om, code_iso_pays, email\nFROM list_structures\nWHERE UPPER(nom_structure) = 'MA BOUTIQUE'\nLIMIT 1;");
accept('list_structures.marketplace (SANS mobile_om, Vague 2)', `
  SELECT ls.id_structure, ls.code_structure, ls.nom_structure, ls.adresse,
         ls.id_localite, ls.actif, ls.logo, ls.createdat,
         ls.id_type, ls.type_structure
  FROM list_structures ls
  ORDER BY ls.nom_structure ASC
`);
accept('list_structures.logo-by-id', 'SELECT logo_structure FROM list_structures WHERE id_structure = 183');

// list_produits (constructeur dynamique produits.service.ts:67-118)
accept('list_produits.dynamic (base)', 'SELECT * FROM list_produits WHERE id_structure = 183 ORDER BY nom_produit ASC');
accept('list_produits.dynamic (filtres complet)', "SELECT * FROM list_produits WHERE id_structure = 183 AND (LOWER(nom_produit) LIKE '%café%' OR LOWER(description) LIKE '%café%') AND nom_categorie = 'Boissons' AND niveau_stock > 0 AND prix_vente >= 500 AND prix_vente <= 1500.5 ORDER BY prix_vente DESC");
accept('list_produits.dynamic (rupture)', 'SELECT * FROM list_produits WHERE id_structure = 183 AND niveau_stock <= 0 ORDER BY marge DESC');
accept('list_produits.by-id', 'SELECT * FROM list_produits WHERE id_produit = 55 AND id_structure = 183');
accept('list_produits.online-seller', `
  SELECT
    id_produit, nom_produit, prix_vente, description, niveau_stock,
    nom_categorie, photo_disponible, photos, nom_structure, logo
  FROM list_produits
  WHERE id_structure = 183
    AND id_produit = 55
`);
accept('list_produits.count-services', 'SELECT COUNT(*) as count FROM list_produits WHERE id_structure = 183 AND est_service = true');

// stock / photos
accept('mouvement_stock.stock-actuel', `
  SELECT
    COALESCE(SUM(CASE
      WHEN type_mouvement = 'ENTREE' THEN quantite
      WHEN type_mouvement = 'SORTIE' THEN -quantite
    END), 0) as stock_actuel
  FROM mouvement_stock
  WHERE id_produit = 55
  AND id_structure = 183
`);
accept('mouvement_stock.historique', `
  SELECT
    ms.*,
    p.nom_produit,
    (ms.prix_unitaire * ms.quantite) as total
  FROM mouvement_stock ms
  JOIN produit_service p ON ms.id_produit = p.id_produit
  WHERE ms.id_produit = 55
  AND ms.id_structure = 183
  ORDER BY ms.tms_create DESC
`);
accept('produit_photos.by-produit', 'SELECT id_photo, id_produit, id_structure, url_photo, ordre, created_at FROM produit_photos WHERE id_produit = 55 ORDER BY ordre ASC, created_at ASC LIMIT 6');
accept('vw_produits.catalogue-public', `
  SELECT
    p.*,
    s.nom_structure,
    s.adresse,
    s.mobile_om,
    s.mobile_wave
  FROM vw_produits p
  INNER JOIN list_structures s ON p.id_structure = s.id_structure
  WHERE s.nom_structure = 'MA BOUTIQUE'
    AND p.presente_au_public = true
  ORDER BY p.nom_produit ASC
`);

// factures / prestations
accept('list_factures.prestations-dynamic (base)', `SELECT
  id_facture as id_prestation,
  id_structure,
  id_facture,
  COALESCE(id_client, 0) as id_client,
  nom_client_payeur as nom_client,
  tel_client,
  date_facture as date_prestation,
  montant_net as montant_total,
  COALESCE(mt_total_paye, 0) as montant_paye,
  COALESCE(remise, 0) as remise,
  CASE
    WHEN mt_total_paye >= montant_net THEN 'PAYEE'
    WHEN mt_total_paye > 0 THEN 'PARTIELLE'
    ELSE 'IMPAYEE'
  END as statut
FROM list_factures WHERE id_structure = 183 ORDER BY date_facture DESC`);
accept('list_factures.prestations-dynamic (recherche+période)', `SELECT
  id_facture as id_prestation, id_structure, id_facture,
  COALESCE(id_client, 0) as id_client, nom_client_payeur as nom_client, tel_client,
  date_facture as date_prestation, montant_net as montant_total,
  COALESCE(mt_total_paye, 0) as montant_paye, COALESCE(remise, 0) as remise,
  CASE WHEN mt_total_paye >= montant_net THEN 'PAYEE' WHEN mt_total_paye > 0 THEN 'PARTIELLE' ELSE 'IMPAYEE' END as statut
FROM list_factures WHERE id_structure = 183 AND (LOWER(nom_client_payeur) LIKE '%diallo%' OR tel_client LIKE '%77%') AND date_facture >= '2026-10-01' ORDER BY date_facture DESC`);
accept('list_factures.prestations-stats', `SELECT
  COUNT(*) as total_prestations,
  COALESCE(SUM(mt_total_paye), 0) as ca_mois,
  COALESCE(SUM(CASE WHEN mt_total_paye < montant_net THEN montant_net - mt_total_paye ELSE 0 END), 0) as mt_impayees
FROM list_factures
WHERE id_structure = 183
AND date_facture >= '2026-10-01'`);
accept('list_factures_com.detail', `
  SELECT
    id_facture, num_facture, id_structure, date_facture, nannee, nmois,
    tel_client, nom_client, nom_client as nom_client_payeur, description,
    montant, mt_remise, mt_acompte, mt_restant, id_etat, tms_update,
    avec_frais, numrecu, mt_reverser, nom_classe, photo_url
  FROM list_factures_com
  WHERE id_structure = 183 AND id_facture = 9012
`);
accept('list_factures_com.recu-publique', `
  SELECT
    f.id_facture, f.num_facture, f.id_structure, f.nom_structure,
    f.date_facture, f.nom_client, f.tel_client, f.montant, f.libelle_etat,
    f.description, f.mt_remise, f.mt_acompte, f.mt_restant, f.logo
  FROM public.list_factures_com f
  WHERE f.id_structure = 183
    AND f.id_facture = 9012
`);

// reçus
accept('recus_paiement.by-numero', "SELECT id_recu, numero_recu FROM public.recus_paiement WHERE numero_recu = 'REC-2026-001' ORDER BY date_creation DESC LIMIT 1");
accept('recus_paiement.exists-numero', "SELECT id_recu FROM public.recus_paiement WHERE numero_recu = 'REC-2026-001' LIMIT 1");
accept('recus_paiement.by-facture', 'SELECT numero_recu, methode_paiement, montant_paye, reference_transaction, numero_telephone, date_paiement FROM public.recus_paiement WHERE id_facture = 9012 ORDER BY date_paiement DESC LIMIT 1');
accept('recus_paiement.count-by-facture', 'SELECT COUNT(*) as count FROM public.recus_paiement WHERE id_facture = 9012');
accept('recus_paiement.methode-venteflash', 'SELECT methode_paiement FROM recus_paiement WHERE id_facture = 9012 ORDER BY date_paiement DESC LIMIT 1');

// détails facture
accept('detail_facture_com.articles', `
  SELECT p.nom_produit, d.quantite, d.prix, (d.prix * d.quantite) as sous_total
  FROM public.detail_facture_com d
  INNER JOIN public.produit_service p ON d.id_produit = p.id_produit
  WHERE d.id_facture = 9012
  ORDER BY d.id_detail
`);
accept('detail_facture_com.articles-desc', `
  SELECT p.nom_produit, d.quantite, d.prix, (d.prix * d.quantite) as sous_total, p.description as description_produit
  FROM public.detail_facture_com d
  INNER JOIN public.produit_service p ON d.id_produit = p.id_produit
  WHERE d.id_facture = 9012
  ORDER BY d.id_detail
`);

// écritures directes (les 3 seules)
accept('write.delete-service', 'DELETE FROM list_produits WHERE id_produit = 55 AND id_structure = 183 AND est_service = true');
accept('write.update-presente-public', 'UPDATE produits SET presente_au_public = true WHERE id_produit = 55 AND id_structure = 183');
accept('write.update-id-localite', 'UPDATE structures SET id_localite = 3 WHERE id_structure = 183');

// fonctions PostgreSQL — formes variées
accept('fn executeFunction (casts)', "SELECT * FROM check_user_credentials('login'::varchar, 'pa''ss'::varchar);");
accept('fn sans cast', "SELECT * FROM get_list_clients(183, '');");
accept('fn bare ints', 'SELECT * FROM get_mes_droits(183, 2);');
accept('fn shape SELECT fn(args)', 'SELECT get_une_structure(183);');
accept('fn 16 args NULL/json', `SELECT edit_param_structure(183, true, 1000, NULL, NULL, '{"entete":"FayClick"}'::json, NULL, NULL, NULL, 18.5, NULL, NULL, NULL, NULL, NULL, NULL)`);
accept('fn multiline + alias', `
  SELECT gere_stock(
    183,
    55,
    'ENTREE',
    10,
    500,
    NULL
  ) as mouvement_id
`);
accept('fn COUNT wrapper', 'SELECT COUNT(*) as count FROM get_list_clients(183, NULL)');
accept('fn préfixe public.', "SELECT * FROM public.add_mouvement_stock(55, 183, 'ENTREE', 10, 'Inventaire initial', 12)");
accept('fn args nommés', "SELECT * FROM add_edit_photo(p_id_structure := 183, p_id_produit := 55, p_url_photo := 'https://fayclick.com/logo.png')");
accept('fn CURRENT_DATE', "SELECT * FROM create_bon_commande(183, CURRENT_DATE, 5, 'Réassort', 25000, 'Sucre-5-500-10#Sel-3-300-5', 0, 12)");
accept('fn alias as result', 'SELECT * FROM get_my_devis(183, 2026, 0, 55) as result');
accept('fn shape B save_my_logo', "SELECT save_my_logo(183, 'https://fayclick.com/uploads/logo_183.png')");
accept('fn facture complète 12 args', "SELECT * FROM create_facture_complete1('2026-10-26', 183, '771234567', 'Diallo', 15000, 'Vente comptoir', 'Sucre-5-500-10#Sel-3-300-5', 0, 0, false, false, 12)");
accept('fn marketplace_public_list (Vague 2 §3.1)', 'SELECT * FROM marketplace_public_list()');
accept('fn ; DANS une chaîne', "SELECT * FROM add_edit_client(183, 'Kiosk; Sar', '771234567', 'Dakar', 0)");
accept('fn -- DANS une chaîne', "SELECT * FROM add_multiproduit(183, 'Cola--Boissons-100-500-10#')");

// ==========================================================================
// ATTAQUES — tout doit être refusé
// ==========================================================================

reject('lecture table brute', 'SELECT * FROM structures');
reject('lecture table par id', 'SELECT * FROM structures WHERE id_structure = 183');
reject('fuite téléphones', 'SELECT mobile_om FROM list_structures');
reject('ANCIENNE requête marketplace AVEC mobile_om (anti-régression)', "SELECT ls.id_structure, ls.code_structure, ls.nom_structure, ls.adresse, ls.mobile_om, ls.id_localite, ls.actif, ls.logo, ls.createdat, ls.id_type, ls.type_structure FROM list_structures ls ORDER BY ls.nom_structure ASC");
reject('injection multi-énoncés', "SELECT * FROM get_list_clients(183, ''); DROP TABLE structures;--')");
reject('fonction système pg_read_file', "SELECT * FROM pg_read_file('/etc/passwd')");
reject('schéma information_schema', 'SELECT * FROM information_schema.tables');
reject('INSERT direct', "INSERT INTO structures (nom_structure) VALUES ('x')");
reject('UPDATE arbitraire', "UPDATE structures SET mobile_om = '777' WHERE id_structure = 183");
reject('DELETE arbitraire', 'DELETE FROM clients WHERE id_structure = 183');
reject('fonction inconnue', 'SELECT * FROM fn_inexistante(1)');
reject('fonction système version()', 'select version()');
reject('fonction système pg_sleep', 'SELECT * FROM pg_sleep(10)');
reject('sous-requête en argument', 'SELECT * FROM get_list_clients(183, (SELECT pwd FROM structures LIMIT 1))');
reject('double énoncé via ORDER BY', 'SELECT * FROM list_produits WHERE id_structure = 183 ORDER BY nom_produit; SELECT * FROM structures');
reject('commentaire --', 'SELECT 1 -- ; DROP TABLE x');
reject('commentaire /*', 'SELECT /* x */ * FROM structures');
reject('dollar-quoting', 'SELECT $$; DROP TABLE x$$');
reject('ORDER BY sous-requête', 'SELECT * FROM list_produits WHERE id_structure = 183 ORDER BY (SELECT 1)');
reject('UNION après appel fn', "SELECT * FROM get_list_clients(183, 'x') UNION SELECT * FROM structures");
reject('TRUNCATE après ;', "SELECT * FROM list_produits WHERE id_structure = 183; TRUNCATE structures");
reject('junk après fermeture paren', "SELECT * FROM get_list_clients(183, 'x') AND true");
reject('LIMIT non prévu (extension)', 'SELECT * FROM list_produits WHERE id_structure = 183 ORDER BY nom_produit DESC LIMIT 1 OFFSET 0');
reject('CAST exotique', "SELECT * FROM get_list_clients(183, 'x'::regclass)");
reject('nombre malformé', 'SELECT * FROM get_mes_droits(183, 2.4.5)');
reject('double cast', "SELECT * FROM get_list_clients(183, 'x'::varchar::varchar)");
reject('type non-string', 'SELECT * FROM structures');
reject('query vide', '');

// ==========================================================================
// Bilan
// ==========================================================================

console.log(`\nListe blanche SQL : ${passed} OK, ${failed} échec(s)`);
if (failed > 0) {
  process.exit(1);
}
