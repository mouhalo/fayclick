/**
 * Types du rapport d'encaissements par mode de paiement.
 *
 * Contrat figé de la fonction PostgreSQL :
 *   get_rapport_encaissements(p_id_structure int, p_date_debut date,
 *                             p_date_fin date, p_id_utilisateur int DEFAULT 0)
 *   RETURNS json
 *
 * `p_id_utilisateur` : 0 = tous les encaissements de la structure (ADMIN),
 * > 0 = uniquement ceux du caissier concerné (isolation par caissier).
 */

import type { ModePaiementNormalise } from '@/lib/payment-methods';

/** Période couverte par le rapport (bornes incluses, format `YYYY-MM-DD`). */
export interface RapportEncaissementsPeriode {
  date_debut: string;
  date_fin: string;
}

/** Agrégat d'un mode de paiement sur la période. */
export interface EncaissementParMode {
  mode: ModePaiementNormalise;
  nb_paiements: number;
  montant_total: number;
}

/** Agrégat toutes méthodes confondues. */
export interface RapportEncaissementsTotal {
  nb_paiements: number;
  montant_total: number;
}

/** Réponse complète de `get_rapport_encaissements()`. */
export interface RapportEncaissements {
  periode: RapportEncaissementsPeriode;
  id_utilisateur: number;
  modes: EncaissementParMode[];
  total: RapportEncaissementsTotal;
}
