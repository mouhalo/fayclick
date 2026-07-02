/**
 * Types pour le module de reversements (Réseau Distribution) — Stage B3.4
 *
 * Workflow : un représentant en mode LIBRE encaisse en CASH/wallet manuel.
 * Périodiquement, il déclare un reversement à son admin. L'admin valide
 * (ou rejette) après vérification physique de la somme remise.
 *
 * Réconcilié contre les signatures PostgreSQL actuellement en prod :
 *   - declarer_reversement(p_id_rep, p_montant, p_mode_paiement, p_reference DEFAULT NULL, p_commentaire DEFAULT NULL)
 *     ⚠️ PAS de p_id_structure (dérivé côté serveur à partir du représentant)
 *   - valider_reversement(p_id_reversement, p_id_admin, p_decision, p_commentaire DEFAULT NULL)
 *   - get_reversements_structure(p_id_structure, p_statut DEFAULT NULL, p_id_representant DEFAULT NULL)
 *   - get_solde_reversement_rep(p_id_rep)
 *     ⚠️ Ne renvoie JAMAIS success:false (dégrade à 0 si le rep n'est pas en mode LIBRE)
 */

export type ModeReversement = 'CASH' | 'OM' | 'WAVE' | 'FREE' | 'VIREMENT';
export type StatutReversement = 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
export type DecisionReversement = 'VALIDE' | 'REJETE';

/** Codes d'erreur métier renvoyés par declarer_reversement/valider_reversement */
export type ReversementErrorCode =
  | 'REP_INVALIDE_OU_MAUVAIS_MODE'
  | 'MODE_INVALIDE'
  | 'MONTANT_INVALIDE'
  | 'MONTANT_SUPERIEUR_SOLDE'
  | 'ERROR';

/**
 * Reversement complet (retour de la table, jointure rep pour affichage admin)
 */
export interface ReversementData {
  id_reversement: number;
  id_structure: number;
  id_representant: number;
  /** Nom du rep (jointure pour affichage admin) */
  nom_rep?: string;
  prenom_rep?: string;
  username_rep?: string;

  montant: number;
  mode_paiement: ModeReversement;
  reference_transaction?: string;
  date_reversement: string;

  statut: StatutReversement;
  id_user_validation?: number;
  nom_user_validation?: string;
  date_validation?: string;
  commentaire?: string;
}

/**
 * Paramètres pour declarer_reversement (côté rep)
 * ⚠️ id_representant fait partie des params — pas de p_id_structure (dérivé serveur)
 */
export interface DeclarerReversementParams {
  id_representant: number;
  montant: number;
  mode_paiement: ModeReversement;
  reference_transaction?: string;
  commentaire?: string;
}

/**
 * Paramètres pour valider_reversement (côté admin, réutilisé plus tard)
 */
export interface ValiderReversementParams {
  id_reversement: number;
  id_admin: number;
  decision: DecisionReversement;
  commentaire?: string;
}

/**
 * Réponse générique des fonctions d'écriture (declarer_reversement / valider_reversement)
 */
export interface ReversementOperationResponse {
  success: boolean;
  message?: string;
  /** Code d'erreur métier si success = false */
  code?: ReversementErrorCode | string;
  data?: {
    id_reversement?: number;
    montant?: number;
    mode_paiement?: ModeReversement;
    /** Présent sur declarer_reversement (nouveau reversement, toujours EN_ATTENTE) */
    statut?: StatutReversement;
    solde_apres_validation?: number;
    /** Présents sur valider_reversement */
    ancien_statut?: StatutReversement;
    nouveau_statut?: StatutReversement;
  };
}

/**
 * Payload data de get_reversements_structure : { reversements: [...], total }
 */
export interface ReversementsListData {
  reversements: ReversementData[];
  total: number;
}

export interface ReversementsListResponse {
  success: boolean;
  message?: string;
  data: ReversementsListData;
}

/**
 * Solde dû d'un rep (get_solde_reversement_rep)
 * ⚠️ success toujours true (dégrade total_encaisse/total_reverse/solde_du à 0
 * si le rep n'est pas en mode_encaissement LIBRE ou est inactif)
 */
export interface SoldeReversementRep {
  success: boolean;
  id_representant: number;
  id_structure?: number;
  total_encaisse: number;
  total_reverse: number;
  solde_du: number;
  date_derniere_vente?: string;
}

/**
 * Helper : badge couleur selon statut
 */
export const STATUT_COLORS: Record<StatutReversement, string> = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700 border-amber-200',
  VALIDE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJETE: 'bg-red-100 text-red-700 border-red-200',
};

export const STATUT_LABELS: Record<StatutReversement, string> = {
  EN_ATTENTE: 'En attente',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
};

export const MODE_LABELS: Record<ModeReversement, string> = {
  CASH: 'Espèces',
  OM: 'Orange Money',
  WAVE: 'Wave',
  FREE: 'Free Money',
  VIREMENT: 'Virement bancaire',
};
