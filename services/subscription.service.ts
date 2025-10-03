/**
 * Service de gestion des abonnements FayClick
 * Gère les abonnements MENSUEL et ANNUEL avec paiement wallet
 */

import databaseService from './database.service';
import {
  SubscriptionType,
  CalculateMontantParams,
  CreateAbonnementParams,
  RenewAbonnementParams,
  HistoriqueAbonnementParams,
  Abonnement,
  HistoriqueAbonnement,
  AbonnementResponse,
  HistoriqueResponse,
  SUBSCRIPTION_PRICING
} from '@/types/subscription.types';
import { PaymentMethod } from '@/types/payment-wallet';

class SubscriptionService {
  /**
   * Calcule le montant d'un abonnement selon le type et la date de début
   *
   * Règles:
   * - Prix: 100 FCFA/jour
   * - MENSUEL: nb_jours_mois × 100
   * - ANNUEL: (somme 12 mois × 100) - (12 × 10) = montant - 120 FCFA
   *
   * @param type Type d'abonnement (MENSUEL ou ANNUEL)
   * @param dateDebut Date de début (format ISO ou Date), défaut: aujourd'hui
   * @returns Montant en FCFA
   */
  async calculateAmount(
    type: SubscriptionType,
    dateDebut?: string | Date
  ): Promise<number> {
    try {
      console.log('💰 [SUBSCRIPTION] Calcul montant:', { type, dateDebut });

      // Préparer la date de début
      const dateDebutStr = dateDebut
        ? (dateDebut instanceof Date ? dateDebut.toISOString().split('T')[0] : dateDebut)
        : new Date().toISOString().split('T')[0];

      // Appel fonction PostgreSQL: calculer_montant_abonnement
      // Note: databaseService.query() ne supporte pas les paramètres $1, $2
      const query = `SELECT calculer_montant_abonnement('${type}'::VARCHAR, '${dateDebutStr}'::DATE) as montant`;

      console.log('🔍 [SUBSCRIPTION] Requête SQL:', query);

      const result = await databaseService.query<{ montant: number }>(query);

      if (!result || result.length === 0) {
        throw new Error('Aucun montant retourné par la fonction de calcul');
      }

      const montant = Number(result[0].montant);

      console.log('✅ [SUBSCRIPTION] Montant calculé:', {
        type,
        dateDebut: dateDebutStr,
        montant
      });

      return montant;

    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Erreur calcul montant:', error);

      // Fallback: calcul approximatif côté client
      console.warn('⚠️ [SUBSCRIPTION] Utilisation du fallback approximatif');
      return type === 'MENSUEL'
        ? SUBSCRIPTION_PRICING.MONTANT_MENSUEL_APPROX
        : SUBSCRIPTION_PRICING.MONTANT_ANNUEL_APPROX;
    }
  }

  /**
   * Crée un nouvel abonnement pour une structure
   *
   * ⚠️ IMPORTANT: L'uuid_paiement doit être fourni après validation du paiement (polling COMPLETED)
   *
   * @param params Paramètres de création
   * @returns Réponse avec les détails de l'abonnement créé
   */
  async createSubscription(
    params: CreateAbonnementParams
  ): Promise<AbonnementResponse> {
    try {
      console.log('📝 [SUBSCRIPTION] Création abonnement:', params);

      // Validation
      if (!params.id_structure) {
        throw new Error('ID structure requis');
      }

      if (!params.uuid_paiement) {
        console.warn('⚠️ [SUBSCRIPTION] Création sans UUID paiement (mode test?)');
      }

      // Préparer les valeurs (NULL pour les optionnels)
      const dateDebut = params.date_debut || 'CURRENT_DATE';
      const refAbonnement = params.ref_abonnement ? `'${params.ref_abonnement}'` : 'NULL';
      const numRecu = params.numrecu ? `'${params.numrecu}'` : 'NULL';
      const uuidPaiement = params.uuid_paiement ? `'${params.uuid_paiement}'::UUID` : 'NULL';
      const forcerRemplacement = params.forcer_remplacement || false;

      // Appel fonction PostgreSQL: add_abonnement_structure
      // Note: databaseService.query() ne supporte pas les paramètres $1, $2
      const query = `SELECT add_abonnement_structure(
        ${params.id_structure}::INTEGER,
        '${params.type_abonnement}'::VARCHAR,
        '${params.methode}'::VARCHAR,
        ${dateDebut === 'CURRENT_DATE' ? 'CURRENT_DATE' : `'${dateDebut}'::DATE`},
        ${refAbonnement}::VARCHAR,
        ${numRecu}::VARCHAR,
        ${uuidPaiement},
        ${forcerRemplacement}::BOOLEAN
      )`;

      console.log('🔍 [SUBSCRIPTION] Requête SQL:', query);

      const result = await databaseService.query<{ add_abonnement_structure: string }>(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune réponse de la fonction de création');
      }

      // Parser la réponse JSON de PostgreSQL
      const response: AbonnementResponse = JSON.parse(
        result[0].add_abonnement_structure
      );

      if (!response.success) {
        console.error('❌ [SUBSCRIPTION] Échec création:', response.message);
        return {
          success: false,
          message: response.message || 'Erreur lors de la création',
          error: response.message
        };
      }

      console.log('✅ [SUBSCRIPTION] Abonnement créé:', response.data);

      return response;

    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Erreur création:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Erreur inconnue lors de la création';

      return {
        success: false,
        message: 'Échec de la création de l\'abonnement',
        error: errorMessage
      };
    }
  }

  /**
   * Renouvelle automatiquement un abonnement existant
   *
   * La date de début du nouvel abonnement est automatiquement définie à:
   * date_fin de l'ancien abonnement + 1 jour
   *
   * @param params Paramètres de renouvellement
   * @returns Réponse avec les détails du nouvel abonnement
   */
  async renewSubscription(
    params: RenewAbonnementParams
  ): Promise<AbonnementResponse> {
    try {
      console.log('🔄 [SUBSCRIPTION] Renouvellement abonnement:', params);

      // Validation
      if (!params.id_structure) {
        throw new Error('ID structure requis');
      }

      // Appel fonction PostgreSQL: renouveler_abonnement
      // Note: databaseService.query() ne supporte pas les paramètres $1, $2
      const query = `SELECT renouveler_abonnement(
        ${params.id_structure}::INTEGER,
        '${params.type_abonnement}'::VARCHAR,
        '${params.methode}'::VARCHAR
      )`;

      console.log('🔍 [SUBSCRIPTION] Requête SQL:', query);

      const result = await databaseService.query<{ renouveler_abonnement: string }>(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune réponse de la fonction de renouvellement');
      }

      // Parser la réponse JSON de PostgreSQL
      const response: AbonnementResponse = JSON.parse(
        result[0].renouveler_abonnement
      );

      if (!response.success) {
        console.error('❌ [SUBSCRIPTION] Échec renouvellement:', response.message);
        return {
          success: false,
          message: response.message || 'Erreur lors du renouvellement',
          error: response.message
        };
      }

      console.log('✅ [SUBSCRIPTION] Abonnement renouvelé:', response.data);

      return response;

    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Erreur renouvellement:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Erreur inconnue lors du renouvellement';

      return {
        success: false,
        message: 'Échec du renouvellement de l\'abonnement',
        error: errorMessage
      };
    }
  }

  /**
   * Récupère l'historique des abonnements d'une structure
   *
   * @param params Paramètres de la requête
   * @returns Liste des abonnements historiques
   */
  async getHistory(
    params: HistoriqueAbonnementParams
  ): Promise<HistoriqueResponse> {
    try {
      console.log('📚 [SUBSCRIPTION] Récupération historique:', params);

      // Validation
      if (!params.id_structure) {
        throw new Error('ID structure requis');
      }

      const limite = params.limite || 10;

      // Appel fonction PostgreSQL: historique_abonnements_structure
      // Note: databaseService.query() ne supporte pas les paramètres $1, $2
      // On doit les remplacer directement dans la requête
      const query = `SELECT * FROM historique_abonnements_structure(
        ${params.id_structure}::INTEGER,
        ${limite}::INTEGER
      )`;

      console.log('🔍 [SUBSCRIPTION] Requête SQL:', query);

      const result = await databaseService.query<HistoriqueAbonnement>(query);

      console.log(`✅ [SUBSCRIPTION] ${result.length} abonnements trouvés`);

      return {
        success: true,
        data: result || []
      };

    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Erreur récupération historique:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Erreur inconnue lors de la récupération';

      return {
        success: false,
        data: [],
        error: errorMessage
      };
    }
  }

  /**
   * Vérifie si une structure a un abonnement actif
   *
   * @param idStructure ID de la structure
   * @returns true si abonnement actif, false sinon
   */
  async hasActiveSubscription(idStructure: number): Promise<boolean> {
    try {
      const history = await this.getHistory({
        id_structure: idStructure,
        limite: 1
      });

      if (!history.success || !history.data || history.data.length === 0) {
        return false;
      }

      const lastSubscription = history.data[0];
      return lastSubscription.statut === 'ACTIF';

    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Erreur vérification abonnement actif:', error);
      return false;
    }
  }

  /**
   * Obtient le dernier abonnement d'une structure
   *
   * @param idStructure ID de la structure
   * @returns Dernier abonnement ou null si aucun
   */
  async getLastSubscription(
    idStructure: number
  ): Promise<HistoriqueAbonnement | null> {
    try {
      const history = await this.getHistory({
        id_structure: idStructure,
        limite: 1
      });

      if (!history.success || !history.data || history.data.length === 0) {
        return null;
      }

      return history.data[0];

    } catch (error) {
      console.error('❌ [SUBSCRIPTION] Erreur récupération dernier abonnement:', error);
      return null;
    }
  }
}

// Export singleton
const subscriptionService = new SubscriptionService();
export default subscriptionService;
