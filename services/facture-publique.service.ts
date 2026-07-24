/**
 * Service pour récupérer les factures publiques (sans authentification)
 */

import DatabaseService from './database.service';

export class FacturePubliqueException extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'FacturePubliqueException';
  }
}

class FacturePubliqueService {
  private static instance: FacturePubliqueService;

  static getInstance(): FacturePubliqueService {
    if (!this.instance) {
      this.instance = new FacturePubliqueService();
    }
    return this.instance;
  }

  /**
   * Récupère une facture publique directement via la base de données
   */
  async getFacturePublique(id_structure: number, id_facture: number): Promise<unknown> {
    try {
      if (!id_structure || !id_facture) {
        throw new FacturePubliqueException('Paramètres manquants', 400);
      }
      if (isNaN(id_structure) || isNaN(id_facture)) {
        throw new FacturePubliqueException('Paramètres invalides', 400);
      }

      const query = `SELECT * FROM get_my_factures(${id_structure}, ${id_facture})`;
      console.log('📤 [FACTURE-PUBLIQUE] Requête:', query);

      const data = await DatabaseService.query(query);

      if (!data || data.length === 0) {
        throw new FacturePubliqueException('Facture introuvable', 404);
      }

      const firstRow = data[0] as Record<string, unknown>;
      let factureData = firstRow.get_my_factures || firstRow;

      if (typeof factureData === 'string') {
        try { factureData = JSON.parse(factureData); } catch { /* ignore */ }
      }

      if (!factureData || !(factureData as Record<string, unknown>).facture) {
        throw new FacturePubliqueException('Format de données invalide', 500);
      }

      console.log('✅ Facture récupérée:', {
        id_facture: (factureData as Record<string, unknown> & { facture: Record<string, unknown> }).facture.id_facture
      });

      return factureData;

    } catch (error) {
      console.error('❌ Erreur récupération facture publique:', error);
      if (error instanceof FacturePubliqueException) throw error;
      throw new FacturePubliqueException('Impossible de récupérer la facture', 500);
    }
  }

  /**
   * Vérifie si une facture existe et retourne son statut
   */
  async checkFactureStatus(id_structure: number, id_facture: number): Promise<{
    exists: boolean;
    isPaid: boolean;
    montant?: number;
    restant?: number;
  }> {
    try {
      const facture = await this.getFacturePublique(id_structure, id_facture);

      // Assertion de type pour accéder aux propriétés
      const typedFacture = facture as {
        facture: {
          id_etat: number;
          montant: number;
          mt_restant: number;
        }
      };

      return {
        exists: true,
        isPaid: typedFacture.facture.id_etat !== 1,
        montant: typedFacture.facture.montant,
        restant: typedFacture.facture.mt_restant
      };
    } catch (error) {
      if (error instanceof FacturePubliqueException && error.statusCode === 404) {
        return {
          exists: false,
          isPaid: false
        };
      }
      throw error;
    }
  }

  /**
   * Formate l'URL de partage d'une facture avec encodage sécurisé
   */
  async formatShareUrl(id_structure: number, id_facture: number): Promise<string> {
    // Utiliser l'import ES6 plutôt que require
    const { getFactureUrl } = await import('@/lib/url-config');
    return getFactureUrl(id_structure, id_facture);
  }

  /**
   * Ajouter un acompte à une facture publique (sans authentification)
   * Utilisé quand un client paie directement via le lien public de la facture
   */
  async addAcomptePublique(params: {
    id_structure: number;
    id_facture: number;
    montant_acompte: number;
    transaction_id: string;
    uuid: string;
    mode_paiement: 'OM' | 'WAVE' | 'FREE';
    telephone: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: unknown;
  }> {
    try {
      console.log('💳 [FACTURE-PUBLIQUE] Ajout acompte:', params);

      if (!params.id_structure || !params.id_facture) {
        throw new FacturePubliqueException('Paramètres de facture manquants', 400);
      }
      if (!params.montant_acompte || params.montant_acompte <= 0) {
        throw new FacturePubliqueException('Montant invalide', 400);
      }
      if (!params.uuid || !params.transaction_id) {
        throw new FacturePubliqueException('Informations de paiement manquantes', 400);
      }

      const telephone = params.telephone || '000000000';
      // Mapper le mode de paiement vers le format BD (identique à walletDisplayConfig)
      const modePaiement = params.mode_paiement;

      // add_acompte_facture consolidée (Phase 1C) : mêmes fonctionnalités que l'ex-v1
      // (journal + reçu + notifications) avec logique montant saine (brut immuable)
      const query = `SELECT * FROM add_acompte_facture(${params.id_structure}, ${params.id_facture}, ${params.montant_acompte}, '${params.transaction_id}', '${params.uuid}', '${modePaiement}', '${telephone}')`;
      console.log('📤 [FACTURE-PUBLIQUE] Requête acompte:', query);

      const data = await DatabaseService.query(query);

      let acompteResult: unknown;
      if (Array.isArray(data) && data.length > 0) {
        const firstRow = data[0] as Record<string, unknown>;
        acompteResult = firstRow.add_acompte_facture || firstRow;
      } else {
        acompteResult = data;
      }

      if (typeof acompteResult === 'string') {
        try { acompteResult = JSON.parse(acompteResult); } catch { /* ignore */ }
      }

      console.log('✅ [FACTURE-PUBLIQUE] Résultat acompte:', acompteResult);

      // Vérifier le succès
      if (acompteResult && acompteResult.success === false) {
        return {
          success: false,
          message: acompteResult.message || 'Échec de l\'enregistrement du paiement'
        };
      }

      return {
        success: true,
        message: 'Paiement enregistré avec succès',
        data: acompteResult
      };

    } catch (error) {
      console.error('❌ [FACTURE-PUBLIQUE] Erreur ajout acompte:', error);

      if (error instanceof FacturePubliqueException) {
        throw error;
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement'
      };
    }
  }
}

export const facturePubliqueService = FacturePubliqueService.getInstance();
export default facturePubliqueService;