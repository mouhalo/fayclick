/**
 * Types TypeScript pour le module de Gestion des Dépenses
 * Module FayClick V2
 */

export interface Depense {
  id_depense: number;
  date_depense: string;
  id_type_depense: number;
  nom_type: string;
  montant: number;
  description: string;
  tms_update: string;
  mois?: string;
  trimestre?: string;
  jour_semaine?: string;
}

export interface TypeDepense {
  id_type_depense: number;
  nom_type: string;
  total_depenses: number;
  nb_depenses: number;
  pourcentage_total: number;
  depense_moyenne: number;
  montant_min: number;
  montant_max: number;
  derniere_depense: string | null;
}

export interface ResumeDepenses {
  total_depenses: number;
  variation_depenses: number;
  nb_depenses: number;
  variation_nb_depenses: number;
  depense_moyenne: number;
  nb_types_utilises: number;
  nb_types_total: number;
  montant_min: number;
  montant_max: number;
  date_premiere_depense: string | null;
  date_derniere_depense: string | null;
}

export interface DepensesData {
  success: boolean;
  structure_id: number;
  periode: string;
  annee: number;
  date_debut: string;
  date_fin: string;
  resume_depenses: ResumeDepenses;
  depenses_par_type: TypeDepense[];
  liste_depenses: Depense[];
  evolution_depenses: any[];
  timestamp_generation: string;
  error?: string;
}

export interface DepenseFormData {
  date_depense: string;
  id_type_depense: number;
  montant: number;
  description: string;
}

export interface FiltresDepenses {
  recherche?: string;
  type_depense?: number;
  date_debut?: string;
  date_fin?: string;
  montant_min?: number;
  montant_max?: number;
}

export interface TypeDepenseFormData {
  nom_type: string;
}
