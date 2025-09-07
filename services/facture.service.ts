/**
 * Service de gestion des factures pour FayClick V2
 * Gestion de la création de factures et détails
 */

import { authService } from './auth.service';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import { ArticlePanier } from '@/types/produit';

// Exceptions personnalisées pour les factures
export class FactureApiException extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: any) {
    super(message);
    this.name = 'FactureApiException';
  }
}

// Interface pour les données de facturation
export interface FactureData {
  date_facture: string; // Format YYYY-MM-DD
  id_structure: number;
  tel_client: string;
  nom_client_payeur: string;
  montant: number;
  description: string;
  mt_remise: number;
  mt_acompte: number;
  avec_frais: boolean;
}

// Interface pour les détails de facture
export interface DetailFacture {
  id_produit: number;
  quantite: number;
  prix: number;
}

// Réponse de création de facture
export interface CreateFactureResponse {
  success: boolean;
  id_facture: number;
  message: string;
}


class FactureService {
  private static instance: FactureService;

  static getInstance(): FactureService {
    if (!this.instance) {
      this.instance = new FactureService();
    }
    return this.instance;
  }

  /**
   * Créer une nouvelle facture avec ses détails
   */
  async createFacture(
    articles: ArticlePanier[],
    clientInfo: { tel_client?: string; nom_client_payeur?: string; description?: string },
    montants: { remise?: number; acompte?: number },
    avecFrais: boolean = false
  ): Promise<CreateFactureResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new FactureApiException('Utilisateur non authentifié', 401);
      }

      // Validation des articles
      if (!articles || articles.length === 0) {
        throw new FactureApiException('Aucun article sélectionné', 400);
      }

      // Calcul du montant total
      const sousTotal = articles.reduce((total, article) => {
        return total + (article.prix_vente * article.quantity);
      }, 0);

      const remise = montants.remise || 0;
      const acompte = montants.acompte || 0;
      const montantNet = sousTotal - remise;

      // Validation des montants
      if (remise > sousTotal) {
        throw new FactureApiException('La remise ne peut pas être supérieure au sous-total', 400);
      }

      if (acompte > montantNet) {
        throw new FactureApiException('L\'acompte ne peut pas être supérieur au montant net', 400);
      }

      // Préparation des données de facture avec valeurs par défaut
      const factureData: FactureData = {
        date_facture: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
        id_structure: user.id_structure,
        tel_client: clientInfo.tel_client || '771234567',
        nom_client_payeur: clientInfo.nom_client_payeur || 'CLIENT_ANONYME',
        montant: montantNet,
        description: clientInfo.description || `Commande ${articles.length} article(s)`,
        mt_remise: remise,
        mt_acompte: acompte,
        avec_frais: avecFrais
      };

      // Approche senior: une seule requête atomique avec stored procedure
      // Construire le string des articles au format "id-qty-prix#"
      const articlesString = articles
        .map(article => `${article.id_produit}-${article.quantity}-${article.prix_vente}`)
        .join('#') + '#';

      SecurityService.secureLog('log', 'Création facture via stored procedure', {
        id_structure: user.id_structure,
        montant: montantNet,
        nb_articles: articles.length,
        articles_string: articlesString
      });

      // Appel de la fonction PostgreSQL atomique
      const factureCompleteQuery = `
        SELECT * FROM create_facture_complete(
          '${factureData.date_facture}',
          ${factureData.id_structure},
          '${factureData.tel_client}',
          '${factureData.nom_client_payeur.replace(/'/g, "''")}',
          ${factureData.montant},
          '${factureData.description.replace(/'/g, "''")}',
          '${articlesString}',
          ${factureData.mt_remise},
          ${factureData.mt_acompte},
          ${factureData.avec_frais}
        )
      `;

      const result = await DatabaseService.query(factureCompleteQuery);
      const factureResult = Array.isArray(result) && result.length > 0 ? result[0] : null;

      if (!factureResult) {
        throw new FactureApiException('Aucune réponse de la fonction create_facture_complete', 500);
      }

      if (!factureResult.success) {
        throw new FactureApiException(
          factureResult.message || 'Erreur lors de la création de la facture',
          500
        );
      }

      SecurityService.secureLog('log', 'Facture complète créée avec succès', {
        id_facture: factureResult.id_facture,
        nb_details: factureResult.nb_details,
        details_ids: factureResult.details_ids,
        montant_total: montantNet
      });

      return {
        success: true,
        id_facture: factureResult.id_facture,
        message: factureResult.message
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création facture', error);
      
      if (error instanceof FactureApiException) {
        throw error;
      }
      
      throw new FactureApiException(
        'Impossible de créer la facture',
        500,
        error
      );
    }
  }

  /**
   * Valider les données de facture avant création
   */
  validateFactureData(
    articles: ArticlePanier[],
    clientInfo: { tel_client?: string; nom_client_payeur?: string },
    montants: { remise?: number; acompte?: number }
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation articles
    if (!articles || articles.length === 0) {
      errors.push('Aucun article sélectionné');
    }

    // Validation téléphone (optionnel mais format si fourni)
    if (clientInfo.tel_client && !/^[0-9+\-\s]+$/.test(clientInfo.tel_client)) {
      errors.push('Format de téléphone invalide');
    }

    // Validation montants
    const sousTotal = articles?.reduce((total, article) => {
      return total + (article.prix_vente * article.quantity);
    }, 0) || 0;

    if (montants.remise && montants.remise > sousTotal) {
      errors.push('La remise ne peut pas être supérieure au sous-total');
    }

    if (montants.remise && montants.remise < 0) {
      errors.push('La remise ne peut pas être négative');
    }

    if (montants.acompte && montants.acompte < 0) {
      errors.push('L\'acompte ne peut pas être négatif');
    }

    const montantNet = sousTotal - (montants.remise || 0);
    if (montants.acompte && montants.acompte > montantNet) {
      errors.push('L\'acompte ne peut pas être supérieur au montant net');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Récupérer les détails d'une facture depuis list_factures_com
   */
  async getFactureDetails(id_facture: number): Promise<any> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new FactureApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Récupération détails facture', {
        id_facture,
        id_structure: user.id_structure
      });

      const query = `
        SELECT 
          id_facture,
          num_facture,
          id_structure,
          date_facture,
          nannee,
          nmois,
          tel_client,
          nom_client,
          nom_client as nom_client_payeur,
          description,
          montant,
          mt_remise,
          mt_acompte,
          mt_restant,
          id_etat,
          tms_update,
          avec_frais,
          numrecu,
          mt_reverser,
          nom_classe,
          photo_url
        FROM list_factures_com
        WHERE id_structure = ${user.id_structure} AND id_facture = ${id_facture}
      `;

      const result = await DatabaseService.query(query);
      
      if (!result || result.length === 0) {
        throw new FactureApiException('Facture introuvable', 404);
      }

      SecurityService.secureLog('log', 'Détails facture récupérés', {
        id_facture,
        num_facture: result[0].num_facture
      });

      return result[0];
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération détails facture', error);
      
      if (error instanceof FactureApiException) {
        throw error;
      }
      
      throw new FactureApiException(
        'Impossible de récupérer les détails de la facture',
        500,
        error
      );
    }
  }
}

// Export singleton
export const factureService = FactureService.getInstance();
export default factureService;