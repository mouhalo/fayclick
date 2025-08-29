/**
 * Types pour l'affichage public des factures
 */

export interface DetailFacturePublique {
  id_detail: number;
  id_facture: number;
  date_facture: string;
  nom_produit: string;
  cout_revient: number;
  quantite: number;
  prix: number;
  marge: number;
  id_produit: number;
  sous_total: number;
}

export interface ResumeFacture {
  nombre_articles: number;
  quantite_totale: number;
  cout_total_revient: number;
  marge_totale: number;
}

export interface InfoFacture {
  id_facture: number;
  num_facture: string;
  id_structure: number;
  nom_structure: string;
  date_facture: string;
  annee: number;
  mois: number;
  description: string;
  nom_classe: string;
  tel_client: string;
  nom_client: string;
  montant: number;
  id_etat: number;
  libelle_etat: string;
  numrecu: string;
  logo: string;
  tms_update: string | null;
  avec_frais: boolean;
  periode: string;
  mt_reverser: boolean;
  mt_remise: number;
  mt_acompte: number;
  mt_restant: number;
  photo_url: string;
}

export interface FacturePublique {
  facture: InfoFacture;
  details: DetailFacturePublique[];
  resume: ResumeFacture;
  timestamp_generation: string;
}

export type WalletProvider = 'orange_money' | 'wave' | 'free_money';

export interface WalletInfo {
  id: WalletProvider;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  instructions: string[];
  numero?: string;
}