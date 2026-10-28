/**
 * Liste blanche SQL — Vague 2 (cf. Evolution/Securisation.md)
 * ------------------------------------------------------------------
 * Contrat d'exactitude front <-> sql_jsonpro : n'autorise que le SQL
 * réellement émis par les services FayClick (inventaire exhaustif du
 * 2026-10-26, ~150 fonctions PostgreSQL + ~30 formes sur tables/vues).
 *
 * Ce module est volontairement en .mjs pur (aucune dépendance) :
 * - importé par app/api/sql/route.ts (defense-in-depth en dev ;
 *   en prod c'est sql_jsonpro qui doit appliquer la même liste) ;
 * - exécutable directement par scripts/test-sql-whitelist.mjs ;
 * - référence d'implémentation pour Kader_backend (passerelle).
 *
 * Toute requête qui ne matche pas exactement une forme ci-dessous est
 * refusée. Deny-by-default : ajouter une forme = modifier ce fichier
 * ET prévenir le backend (synchro liste blanche, mémo §6).
 */

// ==========================================================================
// 1. Fonctions PostgreSQL autorisées (SELECT * FROM fn(...), SELECT fn(...),
//    SELECT COUNT(*) FROM fn(...)) — les arguments doivent être des
//    littéraux simples (voir grammaire ARG ci-dessous).
// ==========================================================================

const FUNCTION_WHITELIST = new Set([
  // --- Auth / structure / droits
  'connexion_agent', 'check_user_credentials', 'get_list_events',
  'get_dashboard', 'get_une_structure', 'edit_param_structure',
  'add_demande_password', 'add_check_demande', 'add_edit_inscription',
  'add_edit_inscription_v2', 'add_edit_utilisateur', 'change_user_password',
  'add_edit_structure', 'get_mes_droits',

  // --- Clients
  'get_list_clients', 'get_list_infos_client', 'add_edit_client',
  'delete_client', 'marquer_facture_payee', 'check_one_client',

  // --- Produits / stock / photos
  'supprimer_produit', 'add_mouvement_stock', 'add_edit_produit',
  'gere_stock', 'add_edit_photo', 'get_mes_produits', 'del_produit_photo',
  'add_multiproduit',

  // --- Prestations / devis
  'get_mes_services', 'add_edit_service', 'add_new_devis_complet',
  'get_my_devis', 'del_my_devis', 'maj_devis', 'add_new_facture',

  // --- Factures
  'add_acompte_facture', 'create_facture_complete1', 'modifier_facturecom',
  'get_my_factures1', 'get_my_factures_filtered', 'get_my_factures',
  'rechercher_multifacturecom', 'supprimer_facturecom',
  'get_historique_paiements_facture', 'supprimer_facturecom_admin',
  'create_facture_online', 'create_facture_representant',

  // --- Reçus
  'add_new_recupaiement', 'get_historic_recu', 'get_rapport_encaissements',

  // --- Fournisseurs / bons de commande / proformas
  'create_fournisseur', 'edit_fournisseur', 'delete_fournisseur',
  'get_list_fournisseurs', 'create_bon_commande', 'get_list_bons_commandes',
  'get_bon_commande_details', 'edit_bon_commande', 'delete_bon_commande',
  'create_proforma', 'get_list_proformas', 'get_proforma_details',
  'edit_proforma', 'delete_proforma', 'convert_proforma_to_facture',

  // --- Dépenses / inventaire / catégories / état global
  'get_list_categorie', 'add_edit_categorie', 'delete_categorie',
  'get_list_depenses', 'add_edit_depense', 'delete_depense',
  'add_edit_type_depense', 'delete_type_depense',
  'get_inventaire_periodique', 'get_etat_global',

  // --- Représentants / affectations / reversements / retraits
  'get_localites_disponibles', 'get_representants_structure',
  'create_representant', 'modifier_representant', 'suspendre_representant',
  'reactiver_representant', 'reinitialiser_pwd_representant_auto',
  'affecter_produit_representant', 'retirer_stock_representant',
  'modifier_prix_rep', 'get_stock_representant', 'declarer_reversement',
  'valider_reversement', 'get_reversements_structure',
  'get_solde_reversement_rep', 'add_retrait_marchand',

  // --- Admin
  'get_admin_stats_global', 'get_admin_list_structures',
  'get_admin_list_abonnements', 'get_admin_stats_ventes',
  'get_admin_detail_structure', 'get_admin_stats_produits_vendus',
  'get_admin_produits_vendus_details', 'get_admin_all_utilisateurs',
  'get_admin_detail_utilisateur', 'get_admin_reference_data',
  'get_admin_list_partenaires', 'add_edit_partenaire',
  'toggle_partenaire_actif', 'prolonger_partenaire',
  'get_admin_stats_codes_promo', 'validate_code_promo', 'log_admin_action',
  'delete_structure', 'add_abonnement_offert', 'reset_user_password',

  // --- Utilisateurs / notifications / abonnements / wallet / SMS
  'get_list_utilisateurs', 'update_profils_droits', 'delete_caissier',
  'add_new_notification', 'get_my_notifications', 'edit_read_notification',
  'mark_all_notifications_read', 'delete_my_notifications',
  'calculer_montant_abonnement', 'add_abonnement_structure',
  'renouveler_abonnement', 'historique_abonnements_structure',
  'get_soldes_wallet_structure', 'get_wallet_structure', 'add_pending_sms',

  // --- Partenaires / marketplace publique / live / logo / dashboard
  'get_partenaire_by_user', 'get_partenaire_stats',
  'get_partenaire_structures', 'get_partenaire_detail_structure',
  'get_partenaire_stats_ventes', 'get_produits_by_structure_name',
  'get_all_produits_publics', 'marketplace_public_list',
  'create_live', 'delete_live', 'get_active_live', 'get_lives_actifs',
  'save_my_logo', 'save_my_cachet', 'get_dashboard_commerce_complet',

  // --- Historique client / reconnaissance visuelle
  'get_historique_achats_client', 'anonymiser_achat_client',
  'save_product_embedding', 'delete_product_embedding',
  'get_product_embeddings',

  // --- API génériques (services/api.service.ts)
  'get_structures_utilisateur', 'get_structure_details',
  'get_services_prestataire', 'creer_reservation_service',
  'get_catalogue_produits', 'creer_commande_commerce',
  'get_evenements_scolaires', 'creer_inscription_scolaire',
  'get_biens_immobiliers', 'creer_transaction_immobiliere',
  'get_historique_factures', 'update_statut_facture',
  'get_dashboard_stats',
]);

// Applications légitimes transitant par le proxy (config/env.ts)
export const ALLOWED_APPLICATIONS = new Set(['payecole', 'fayclick', 'sms']);

// ==========================================================================
// 2. Grammaire des arguments de fonctions (littéraux uniquement)
// ==========================================================================

const IDENT = '[a-z_][a-z0-9_]*';
const NUM = "-?\\d+(?:\\.\\d+)?";
const Q = `'(?:[^']|'')*'`; // chaîne simple-quote avec échappement ''
const CAST =
  '::(?:integer|int|bigint|smallint|numeric(?:\\(\\d+,\\d+\\))?|decimal(?:\\(\\d+,\\d+\\))?|float|double precision|real|varchar(?:\\(\\d+\\))?|character varying(?:\\(\\d+\\))?|text|char(?:\\(\\d+\\))?|date|timestamp(?: with time zone)?|timestamptz|boolean|json|jsonb|uuid)';
const LITERAL = `(?:null|true|false|current_date|current_timestamp|${NUM}|${Q})`;
const ARG = `(?:${IDENT}\\s*:=\\s*)?${LITERAL}(?:${CAST})?`;
const ARGS = `${ARG}(?:\\s*,\\s*${ARG})*`;
const FN = `(?:public\\.)?(${IDENT})`;
const ALIAS = `(?:\\s+as\\s+${IDENT})?`;

// Formes d'appel de fonction acceptées (ancrees, insensible à la casse)
const FUNCTION_SHAPES = [
  // SELECT * FROM fn(args) [as alias]  — forme standard (executeFunction)
  new RegExp(`^select\\s+\\*\\s+from\\s+${FN}\\s*\\(\\s*(?:${ARGS})?\\s*\\)${ALIAS}$`, 'i'),
  // SELECT fn(args) [as alias] — ex. save_my_logo, gere_stock, edit_param_structure
  new RegExp(`^select\\s+${FN}\\s*\\(\\s*(?:${ARGS})?\\s*\\)${ALIAS}$`, 'i'),
  // SELECT COUNT(*) as count FROM fn(args) — ex. stats prestations
  new RegExp(`^select\\s+count\\(\\*\\)\\s+as\\s+count\\s+from\\s+${FN}\\s*\\(\\s*(?:${ARGS})?\\s*\\)${ALIAS}$`, 'i'),
];

// ==========================================================================
// 3. Formes SQL directes sur tables/vues (SELECT + 3 écritures)
//    Transcrites à l'identique des services (fichier:ligne en commentaire).
// ==========================================================================

const N = '\\d+';
const DATE = `\\d{4}-\\d{2}-\\d{2}`;
const PROD_PRED =
  `(?:id_structure\\s*=\\s*${N}|id_produit\\s*=\\s*${N}|est_service\\s*=\\s*true|` +
  `\\(\\s*lower\\(nom_produit\\)\\s+like\\s+${Q}\\s+or\\s+lower\\(description\\)\\s+like\\s+${Q}\\s*\\)|` +
  `nom_categorie\\s*=\\s*${Q}|niveau_stock\\s*(?:>|<=)\\s+0|prix_vente\\s*(?:>=|<=)\\s+${NUM})`;
const FACT_PRED =
  `(?:id_structure\\s*=\\s*${N}|` +
  `\\(\\s*lower\\(nom_client_payeur\\)\\s+like\\s+${Q}\\s+or\\s+tel_client\\s+like\\s+${Q}\\s*\\)|` +
  `date_facture\\s*>=\\s*'${DATE}')`;

function re(pattern) {
  return new RegExp(pattern, 'i');
}

export const TABLE_PATTERNS = [
  // --- Dictionnaires / ping
  { id: 'type_structure.list', // database.service.ts:353, registration.service.ts:33
    re: re(`^select\\s+id_type\\s*,\\s*nom_type\\s+from\\s+type_structure\\s+where\\s+id_type\\s*!=\\s*0\\s+order\\s+by\\s+nom_type$`) },
  { id: 'localites.list', // ModalEditStructure.tsx:102
    re: re(`^select\\s+id_localite\\s*,\\s*nom_localite\\s+from\\s+localites\\s+order\\s+by\\s+nom_localite$`) },
  { id: 'ping', // database.service.ts:377
    re: re(`^select\\s+1\\s+as\\s+test_connection$`) },

  // --- structures / list_structures
  { id: 'structures.exists-by-name', // database.service.ts:368, registration.service.ts:65
    re: re(`^select\\s+1\\s+from\\s+structures\\s+where\\s+upper\\(nom_structure\\)\\s*=\\s*${Q}\\s+limit\\s+1$`) },
  { id: 'structures.name-by-id', // catalogue-public.service.ts:128
    re: re(`^select\\s+nom_structure\\s+from\\s+structures\\s+where\\s+id_structure\\s*=\\s*${N}$`) },
  { id: 'structures.contact-by-id', // catalogue-public.service.ts:243 (catalogue public : contact vendeur)
    re: re(`^select\\s+nom_structure\\s*,\\s*coalesce\\(mobile_om\\s*,\\s*''\\)\\s+as\\s+mobile_om\\s*,\\s*coalesce\\(mobile_wave\\s*,\\s*''\\)\\s+as\\s+mobile_wave\\s+from\\s+structures\\s+where\\s+id_structure\\s*=\\s*${N}$`) },
  { id: 'list_structures.recovery-by-name', // registration.service.ts:338 (récupération de mot de passe : 1 ligne par nom)
    re: re(`^select\\s+id_structure\\s*,\\s*mobile_om\\s*,\\s*code_iso_pays\\s*,\\s*email\\s+from\\s+list_structures\\s+where\\s+upper\\(nom_structure\\)\\s*=\\s*${Q}\\s+limit\\s+1$`) },
  { id: 'list_structures.marketplace', // catalogues-public.service.ts:172 — VAGUE 2 : SANS mobile_om
    re: re(`^select\\s+ls\\.id_structure\\s*,\\s*ls\\.code_structure\\s*,\\s*ls\\.nom_structure\\s*,\\s*ls\\.adresse\\s*,\\s*ls\\.id_localite\\s*,\\s*ls\\.actif\\s*,\\s*ls\\.logo\\s*,\\s*ls\\.createdat\\s*,\\s*ls\\.id_type\\s*,\\s*ls\\.type_structure\\s+from\\s+list_structures\\s+ls\\s+order\\s+by\\s+ls\\.nom_structure\\s+asc$`) },
  { id: 'list_structures.logo-by-id', // logo-upload-simple.service.ts:322
    re: re(`^select\\s+logo_structure\\s+from\\s+list_structures\\s+where\\s+id_structure\\s*=\\s*${N}$`) },

  // --- list_produits
  { id: 'list_produits.dynamic', // produits.service.ts:67-118 (filtres + tri dynamiques)
    re: re(`^select\\s+\\*\\s+from\\s+list_produits\\s+where\\s+${PROD_PRED}(?:\\s+and\\s+${PROD_PRED})*(?:\\s+order\\s+by\\s+(?:nom_produit|prix_vente|niveau_stock|marge)\\s+(?:asc|desc))?$`) },
  { id: 'list_produits.by-id', // produits.service.ts:161
    re: re(`^select\\s+\\*\\s+from\\s+list_produits\\s+where\\s+id_produit\\s*=\\s*${N}\\s+and\\s+id_structure\\s*=\\s*${N}$`) },
  { id: 'list_produits.online-seller', // online-seller.service.ts:123
    re: re(`^select\\s+id_produit\\s*,\\s*nom_produit\\s*,\\s*prix_vente\\s*,\\s*description\\s*,\\s*niveau_stock\\s*,\\s*nom_categorie\\s*,\\s*photo_disponible\\s*,\\s*photos\\s*,\\s*nom_structure\\s*,\\s*logo\\s+from\\s+list_produits\\s+where\\s+id_structure\\s*=\\s*${N}\\s+and\\s+id_produit\\s*=\\s*${N}$`) },
  { id: 'list_produits.count-services', // prestation.service.ts:1054
    re: re(`^select\\s+count\\(\\*\\)\\s+as\\s+count\\s+from\\s+list_produits\\s+where\\s+id_structure\\s*=\\s*${N}\\s+and\\s+est_service\\s*=\\s*true$`) },

  // --- stock
  { id: 'mouvement_stock.stock-actuel', // produits.service.ts:670
    re: re(`^select\\s+coalesce\\(sum\\(case\\s+when\\s+type_mouvement\\s*=\\s*'entree'\\s+then\\s+quantite\\s+when\\s+type_mouvement\\s*=\\s*'sortie'\\s+then\\s+-quantite\\s+end\\)\\s*,\\s*0\\)\\s+as\\s+stock_actuel\\s+from\\s+mouvement_stock\\s+where\\s+id_produit\\s*=\\s*${N}\\s+and\\s+id_structure\\s*=\\s*${N}$`) },
  { id: 'mouvement_stock.historique', // produits.service.ts:724
    re: re(`^select\\s+ms\\.\\*\\s*,\\s*p\\.nom_produit\\s*,\\s*\\(ms\\.prix_unitaire\\s*\\*\\s*ms\\.quantite\\)\\s+as\\s+total\\s+from\\s+mouvement_stock\\s+ms\\s+join\\s+produit_service\\s+p\\s+on\\s+ms\\.id_produit\\s*=\\s*p\\.id_produit\\s+where\\s+ms\\.id_produit\\s*=\\s*${N}\\s+and\\s+ms\\.id_structure\\s*=\\s*${N}\\s+order\\s+by\\s+ms\\.tms_create\\s+desc$`) },
  { id: 'produit_photos.by-produit', // produits.service.ts:1061
    re: re(`^select\\s+id_photo\\s*,\\s*id_produit\\s*,\\s*id_structure\\s*,\\s*url_photo\\s*,\\s*ordre\\s*,\\s*created_at\\s+from\\s+produit_photos\\s+where\\s+id_produit\\s*=\\s*${N}\\s+order\\s+by\\s+ordre\\s+asc\\s*,\\s*created_at\\s+asc\\s+limit\\s+6$`) },
  { id: 'vw_produits.catalogue-public', // produits.service.ts:1043 (catalogue public d'UNE structure)
    re: re(`^select\\s+p\\.\\*\\s*,\\s*s\\.nom_structure\\s*,\\s*s\\.adresse\\s*,\\s*s\\.mobile_om\\s*,\\s*s\\.mobile_wave\\s+from\\s+vw_produits\\s+p\\s+inner\\s+join\\s+list_structures\\s+s\\s+on\\s+p\\.id_structure\\s*=\\s*s\\.id_structure\\s+where\\s+s\\.nom_structure\\s*=\\s*${Q}\\s+and\\s+p\\.presente_au_public\\s*=\\s*true\\s+order\\s+by\\s+p\\.nom_produit\\s+asc$`) },

  // --- factures / prestations
  { id: 'list_factures.prestations-dynamic', // prestation.service.ts:1001-1017
    re: re(`^select\\s+id_facture\\s+as\\s+id_prestation\\s*,\\s+id_structure\\s*,\\s+id_facture\\s*,\\s+coalesce\\(id_client\\s*,\\s*0\\)\\s+as\\s+id_client\\s*,\\s+nom_client_payeur\\s+as\\s+nom_client\\s*,\\s*tel_client\\s*,\\s+date_facture\\s+as\\s+date_prestation\\s*,\\s+montant_net\\s+as\\s+montant_total\\s*,\\s+coalesce\\(mt_total_paye\\s*,\\s*0\\)\\s+as\\s+montant_paye\\s*,\\s+coalesce\\(remise\\s*,\\s*0\\)\\s+as\\s+remise\\s*,\\s+case\\s+when\\s+mt_total_paye\\s*>=\\s*montant_net\\s+then\\s*'payee'\\s+when\\s+mt_total_paye\\s*>\\s*0\\s+then\\s*'partielle'\\s+else\\s+'impayee'\\s+end\\s+as\\s+statut\\s+from\\s+list_factures\\s+where\\s+${FACT_PRED}(?:\\s+and\\s+${FACT_PRED})*(?:\\s+order\\s+by\\s+date_facture\\s+desc)?$`) },
  { id: 'list_factures.prestations-stats', // prestation.service.ts:1074
    re: re(`^select\\s+count\\(\\*\\)\\s+as\\s+total_prestations\\s*,\\s+coalesce\\(sum\\(mt_total_paye\\)\\s*,\\s*0\\)\\s+as\\s+ca_mois\\s*,\\s+coalesce\\(sum\\(case\\s+when\\s+mt_total_paye\\s*<\\s*montant_net\\s+then\\s+montant_net\\s*-\\s*mt_total_paye\\s+else\\s+0\\s+end\\)\\s*,\\s*0\\)\\s+as\\s+mt_impayees\\s+from\\s+list_factures\\s+where\\s+id_structure\\s*=\\s*${N}\\s+and\\s+date_facture\\s*>=\\s*'${DATE}'$`) },
  { id: 'list_factures_com.detail', // facture.service.ts:310
    re: re(`^select\\s+id_facture\\s*,\\s*num_facture\\s*,\\s+id_structure\\s*,\\s+date_facture\\s*,\\s+nannee\\s*,\\s+nmois\\s*,\\s+tel_client\\s*,\\s+nom_client\\s*,\\s+nom_client\\s+as\\s+nom_client_payeur\\s*,\\s+description\\s*,\\s+montant\\s*,\\s+mt_remise\\s*,\\s+mt_acompte\\s*,\\s+mt_restant\\s*,\\s+id_etat\\s*,\\s+tms_update\\s*,\\s+avec_frais\\s*,\\s+numrecu\\s*,\\s+mt_reverser\\s*,\\s+nom_classe\\s*,\\s+photo_url\\s+from\\s+list_factures_com\\s+where\\s+id_structure\\s*=\\s*${N}\\s+and\\s+id_facture\\s*=\\s*${N}$`) },
  { id: 'list_factures_com.recu-publique', // recu.service.ts:228
    re: re(`^select\\s+f\\.id_facture\\s*,\\s+f\\.num_facture\\s*,\\s+f\\.id_structure\\s*,\\s+f\\.nom_structure\\s*,\\s+f\\.date_facture\\s*,\\s+f\\.nom_client\\s*,\\s+f\\.tel_client\\s*,\\s+f\\.montant\\s*,\\s+f\\.libelle_etat\\s*,\\s+f\\.description\\s*,\\s+f\\.mt_remise\\s*,\\s+f\\.mt_acompte\\s*,\\s+f\\.mt_restant\\s*,\\s+f\\.logo\\s+from\\s+public\\.list_factures_com\\s+f\\s+where\\s+f\\.id_structure\\s*=\\s*${N}\\s+and\\s+f\\.id_facture\\s*=\\s*${N}$`) },

  // --- reçus
  { id: 'recus_paiement.by-numero', // recu.service.ts:162
    re: re(`^select\\s+id_recu\\s*,\\s+numero_recu\\s+from\\s+public\\.recus_paiement\\s+where\\s+numero_recu\\s*=\\s*${Q}\\s+order\\s+by\\s+date_creation\\s+desc\\s+limit\\s+1$`) },
  { id: 'recus_paiement.exists-numero', // recu.service.ts:198
    re: re(`^select\\s+id_recu\\s+from\\s+public\\.recus_paiement\\s+where\\s+numero_recu\\s*=\\s*${Q}\\s+limit\\s+1$`) },
  { id: 'recus_paiement.by-facture', // recu.service.ts:258
    re: re(`^select\\s+numero_recu\\s*,\\s+methode_paiement\\s*,\\s+montant_paye\\s*,\\s+reference_transaction\\s*,\\s+numero_telephone\\s*,\\s+date_paiement\\s+from\\s+public\\.recus_paiement\\s+where\\s+id_facture\\s*=\\s*${N}\\s+order\\s+by\\s+date_paiement\\s+desc\\s+limit\\s+1$`) },
  { id: 'recus_paiement.count-by-facture', // recu.service.ts:549
    re: re(`^select\\s+count\\(\\*\\)\\s+as\\s+count\\s+from\\s+public\\.recus_paiement\\s+where\\s+id_facture\\s*=\\s*${N}$`) },
  { id: 'recus_paiement.methode-venteflash', // venteflash/page.tsx:795 (sans préfixe public.)
    re: re(`^select\\s+methode_paiement\\s+from\\s+recus_paiement\\s+where\\s+id_facture\\s*=\\s*${N}\\s+order\\s+by\\s+date_paiement\\s+desc\\s+limit\\s+1$`) },

  // --- détails facture
  { id: 'detail_facture_com.articles', // ModalFactureSuccess.tsx:214
    re: re(`^select\\s+p\\.nom_produit\\s*,\\s+d\\.quantite\\s*,\\s+d\\.prix\\s*,\\s*\\(d\\.prix\\s*\\*\\s*d\\.quantite\\)\\s+as\\s+sous_total\\s+from\\s+public\\.detail_facture_com\\s+d\\s+inner\\s+join\\s+public\\.produit_service\\s+p\\s+on\\s+d\\.id_produit\\s*=\\s+p\\.id_produit\\s+where\\s+d\\.id_facture\\s*=\\s*${N}\\s+order\\s+by\\s+d\\.id_detail$`) },
  { id: 'detail_facture_com.articles-desc', // recu.service.ts:301
    re: re(`^select\\s+p\\.nom_produit\\s*,\\s+d\\.quantite\\s*,\\s+d\\.prix\\s*,\\s*\\(d\\.prix\\s*\\*\\s*d\\.quantite\\)\\s+as\\s+sous_total\\s*,\\s+p\\.description\\s+as\\s+description_produit\\s+from\\s+public\\.detail_facture_com\\s+d\\s+inner\\s+join\\s+public\\.produit_service\\s+p\\s+on\\s+d\\.id_produit\\s*=\\s+p\\.id_produit\\s+where\\s+d\\.id_facture\\s*=\\s*${N}\\s+order\\s+by\\s+d\\.id_detail$`) },

  // --- écritures directes (les 3 seules du front)
  { id: 'write.delete-service', // prestation.service.ts:313
    re: re(`^delete\\s+from\\s+list_produits\\s+where\\s+id_produit\\s*=\\s*${N}\\s+and\\s+id_structure\\s*=\\s*${N}\\s+and\\s+est_service\\s*=\\s*true$`) },
  { id: 'write.update-presente-public', // produits.service.ts:1008
    re: re(`^update\\s+produits\\s+set\\s+presente_au_public\\s*=\\s*(?:true|false)\\s+where\\s+id_produit\\s*=\\s*${N}\\s+and\\s+id_structure\\s*=\\s*${N}$`) },
  { id: 'write.update-id-localite', // admin.service.ts:881
    re: re(`^update\\s+structures\\s+set\\s+id_localite\\s*=\\s*${N}\\s+where\\s+id_structure\\s*=\\s*${N}$`) },
];

// ==========================================================================
// 4. Validation
// ==========================================================================

const MAX_QUERY_LENGTH = 200_000;

/**
 * Scan quote-aware : rejette énoncés multiples (;), commentaires (-- /*),
 * dollar-quoting ($), caractères de contrôle ; normalise les espaces hors
 * chaînes. Un ';' final isolé est toléré puis retiré.
 */
function scanAndNormalize(raw) {
  if (typeof raw !== 'string') return { error: 'type_invalide' };
  if (raw.length === 0) return { error: 'vide' };
  if (raw.length > MAX_QUERY_LENGTH) return { error: 'trop_long' };

  let out = '';
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    const code = raw.charCodeAt(i);
    if (code < 32 && c !== '\n' && c !== '\r' && c !== '\t') {
      return { error: 'caractere_controle' };
    }
    if (c === "'") {
      if (inQuote && raw[i + 1] === "'") { out += "''"; i++; continue; }
      inQuote = !inQuote;
      out += c;
      continue;
    }
    if (inQuote) { out += c; continue; }
    if (c === ';') {
      if (/^\s*$/.test(raw.slice(i + 1))) break; // ';' final -> ignoré
      return { error: 'instruction_multiple' };
    }
    if (c === '-' && raw[i + 1] === '-') return { error: 'commentaire' };
    if (c === '/' && raw[i + 1] === '*') return { error: 'commentaire' };
    if (c === '$') return { error: 'dollar_quote' };
    if (/\s/.test(c)) { if (!out.endsWith(' ')) out += ' '; continue; }
    out += c;
  }
  if (inQuote) return { error: 'chaine_non_fermee' };
  return { value: out.trim() };
}

/**
 * Valide une requête SQL contre la liste blanche.
 * @returns {{ ok: true, via: string, detail?: string } | { ok: false, reason: string }}
 */
export function validateQuery(rawQuery) {
  const scan = scanAndNormalize(rawQuery);
  if (scan.error) return { ok: false, reason: scan.error };
  const q = scan.value;
  if (!q) return { ok: false, reason: 'vide' };

  for (const shape of FUNCTION_SHAPES) {
    const m = shape.exec(q);
    if (m) {
      const fn = m[1].toLowerCase();
      if (FUNCTION_WHITELIST.has(fn)) return { ok: true, via: 'function', detail: fn };
      return { ok: false, reason: 'fonction_hors_liste', detail: fn };
    }
  }

  for (const p of TABLE_PATTERNS) {
    if (p.re.test(q)) return { ok: true, via: 'table', detail: p.id };
  }

  return { ok: false, reason: 'forme_inconnue' };
}

/** Liste triée des fonctions autorisées (doc / synchro backend). */
export function whitelistedFunctions() {
  return [...FUNCTION_WHITELIST].sort();
}
