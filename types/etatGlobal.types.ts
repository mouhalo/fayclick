/**
 * Types pour l'État Global Financier (Coffre-Fort)
 * Basé sur la fonction PostgreSQL get_etat_global(pid_structure, pannee)
 */

export interface VentesDetails {
  chiffre_affaires: number;
  nombre_factures: number;
  panier_moyen: number;
}

export interface CoutsDetails {
  cout_achats_marchandises: number;
  charges_exploitation: number;
  total_couts: number;
}

export interface RentabiliteDetails {
  marge_brute: number;
  resultat_net: number;
  taux_marge_nette: number;
  taux_marge_brute: number;
}

export interface EvolutionMensuelle {
  mois: number;
  nom_mois: string;
  ca: number;
  charges: number;
  achats: number;
  resultat: number;
}

export interface TopProduitsVendus {
  id_produit: number;
  nom_produit: string;
  quantite_vendue: number;
  ca_genere: number;
}

export interface EtatGlobalData {
  success: boolean;
  structure_id: number;
  annee: number;
  ca_total: number;
  nb_ventes: number;
  total_charges: number;
  cout_achats: number;
  total_charges_achats: number;
  solde_net: number;
  marge_brute: number;
  taux_marge: number;
  details: {
    ventes: VentesDetails;
    couts: CoutsDetails;
    rentabilite: RentabiliteDetails;
  };
  evolution_mensuelle: EvolutionMensuelle[];
  top_produits_vendus: TopProduitsVendus[];
}
