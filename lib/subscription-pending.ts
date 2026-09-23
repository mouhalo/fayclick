/**
 * Reprise d'un renouvellement d'abonnement dont le paiement a été confirmé
 * trop tard pour le polling (réconciliation batch OFMS).
 *
 * La clé localStorage est posée à l'affichage du QR code et consommée soit par
 * le flux normal (ModalPaiementAbonnement), soit au chargement de l'onglet
 * Abonnement de /settings.
 */

import { PaymentMethod } from '@/types/payment-wallet';
import { AbonnementResponse } from '@/types/subscription.types';
import subscriptionService from '@/services/subscription.service';

const CLE_PENDING = 'fayclick_pending_subscription';
const DUREE_VALIDITE_MS = 30 * 60 * 1000; // 30 minutes

// Verrou anti-concurrence : l'effet de /settings peut se rejouer (changement
// d'onglet, double invocation StrictMode) pendant l'aller-retour réseau de
// checkPaymentStatus, avant que la clé n'ait été purgée.
let repriseEnCours = false;

/** Retourne false si une reprise est déjà en cours. */
export function acquerirVerrouReprise(): boolean {
  if (repriseEnCours) return false;
  repriseEnCours = true;
  return true;
}

export function libererVerrouReprise(): void {
  repriseEnCours = false;
}

function suffixePaiement(uuid: string): string {
  return uuid.replace(/-/g, '').substring(0, 8).toUpperCase();
}

/**
 * Référence dérivée de l'uuid du paiement (et non de l'horodatage) : un rejeu
 * produit la même référence, ce qui rend une reprise détectable dans l'historique.
 */
export function derivePendingRef(uuid: string, idStructure: number): string {
  return `ABO-${idStructure}-${suffixePaiement(uuid)}`;
}

export interface AbonnementEnAttente {
  uuid: string;
  idStructure: number;
  jours: number;
  method: Exclude<PaymentMethod, 'CASH'>;
  timestamp: number;
}

export function savePendingSubscription(donnees: AbonnementEnAttente): void {
  try {
    localStorage.setItem(CLE_PENDING, JSON.stringify(donnees));
  } catch (e) {
    console.warn('Erreur sauvegarde abonnement en attente:', e);
  }
}

export function clearPendingSubscription(): void {
  try {
    localStorage.removeItem(CLE_PENDING);
  } catch (e) {
    console.warn('Erreur suppression abonnement en attente:', e);
  }
}

/** Retourne l'entrée si elle est encore valide ; purge et retourne null sinon. */
export function getPendingSubscription(): AbonnementEnAttente | null {
  try {
    const brut = localStorage.getItem(CLE_PENDING);
    if (!brut) return null;

    const donnees = JSON.parse(brut) as AbonnementEnAttente;

    if (!donnees?.uuid || !donnees.idStructure) {
      clearPendingSubscription();
      return null;
    }

    if (Date.now() - donnees.timestamp > DUREE_VALIDITE_MS) {
      clearPendingSubscription();
      return null;
    }

    return donnees;
  } catch (e) {
    console.warn('Erreur lecture abonnement en attente:', e);
    clearPendingSubscription();
    return null;
  }
}

/**
 * Chemin unique de renouvellement, partagé par le flux normal et la reprise.
 * Toutes les valeurs sont passées en paramètres : aucun état React capturé.
 */
export async function finalizeSubscriptionRenewal(
  params: Omit<AbonnementEnAttente, 'timestamp'>
): Promise<AbonnementResponse> {
  const { uuid, idStructure, jours, method } = params;

  const typeAbonnement = jours <= 1 ? 'JOURNALIER' as const
    : jours <= 7 ? 'HEBDOMADAIRE' as const
    : jours <= 31 ? 'MENSUEL' as const
    : jours <= 93 ? 'TRIMESTRIEL' as const
    : jours <= 186 ? 'SEMESTRIEL' as const
    : 'ANNUEL' as const;

  const refAbonnement = derivePendingRef(uuid, idStructure);
  const numRecu = `REC-${idStructure}-${suffixePaiement(uuid)}`;

  const response = await subscriptionService.renewSubscription({
    id_structure: idStructure,
    type_abonnement: typeAbonnement,
    methode: method,
    uuid_paiement: uuid,
    nombre_jours: jours,
    ref_abonnement: refAbonnement,
    numrecu: numRecu
  });

  if (response.success) {
    clearPendingSubscription();
  }

  return response;
}
