/**
 * Service de gestion des factures pour FayClick V2
 * Gestion de la création de factures et détails
 */

import { authService } from './auth.service';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import { ArticlePanier } from '@/types/produit';
import { AjouterAcompteData, AjouterAcompteResponse } from '@/types/facture';
import { tr } from 'zod/locales';

// Exceptions personnalisées pour les factures
export class FactureApiException extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: unknown) {
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
  est_devis: boolean;        // Nouveau: true = devis, false = facture
  id_utilisateur: number;    // Nouveau: ID de l'utilisateur qui crée la facture
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
   * @param articles - Liste des articles du panier
   * @param clientInfo - Informations client (tel, nom, description)
   * @param montants - Montants (remise, acompte)
   * @param avecFrais - Appliquer les frais de service
   * @param estDevis - true = créer un devis, false = créer une facture (défaut)
   * @param idUtilisateur - ID de l'utilisateur créateur (0 = utilisateur courant)
   */
  async createFacture(
    articles: ArticlePanier[],
    clientInfo: { tel_client?: string; nom_client_payeur?: string; description?: string },
    montants: { remise?: number; acompte?: number },
    avecFrais: boolean = false,
    estDevis: boolean = false,
    idUtilisateur?: number
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

      // Pattern aligné sur proforma : la remise par article est absorbée dans
      // prix_applique net (= prix × (1 - remise%/100)). La remise envoyée au backend
      // dans mt_remise = remise globale UNIQUEMENT. Cela permet de reconstituer la
      // remise par article à l'impression (lookup prix_vente actuel vs prix BD).
      // En mode F (FCFA), on convertit en % équivalent par ligne pour absorber.
      const remiseMode = (typeof window !== 'undefined' && localStorage.getItem('vf_remise_mode')) || '%';
      const articlesAvecPrixNet = articles.map(art => {
        const prixOrigine = art.prix_applique ?? art.prix_vente;
        const remiseArt = art.remise_article || 0;
        if (remiseArt === 0) return { ...art, prix_applique: prixOrigine };
        let pctEquivalent = 0;
        if (remiseMode === '%') {
          pctEquivalent = Math.max(0, Math.min(100, remiseArt));
        } else {
          // Mode F : remiseArt est un montant total (prix × qty × pct/100 pré-calculé)
          // On convertit en % de la ligne pour application unitaire
          const lineBrut = prixOrigine * art.quantity;
          pctEquivalent = lineBrut > 0 ? Math.min(100, (remiseArt / lineBrut) * 100) : 0;
        }
        const prixNet = Math.round(prixOrigine * (1 - pctEquivalent / 100));
        return { ...art, prix_applique: prixNet };
      });

      // sousTotal recalculé à partir des prix nets (après remises par article)
      const sousTotal = articlesAvecPrixNet.reduce((total, article) => {
        return total + ((article.prix_applique ?? article.prix_vente) * article.quantity);
      }, 0);

      // Remise globale uniquement (les remises par article sont déjà absorbées)
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
      // Note: On envoie sousTotal (montant brut net après remises article), le backend gère la déduction de la remise globale
      const factureData: FactureData = {
        date_facture: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
        id_structure: user.id_structure,
        tel_client: clientInfo.tel_client || '771234567',
        nom_client_payeur: clientInfo.nom_client_payeur || 'CLIENT_ANONYME',
        montant: sousTotal,
        description: clientInfo.description || `Commande ${articles.length} article(s)`,
        mt_remise: remise,
        mt_acompte: acompte,
        avec_frais: avecFrais,
        est_devis: estDevis,
        id_utilisateur: idUtilisateur ?? user.id ?? 0
      };

      // Approche senior: une seule requête atomique avec stored procedure
      // Construire le string des articles au format "id-qty-prix#" (prix net après remise article)
      const articlesString = articlesAvecPrixNet
        .map(article => `${article.id_produit}-${article.quantity}-${article.prix_applique ?? article.prix_vente}`)
        .join('#') + '#';

      SecurityService.secureLog('log', 'Création facture via stored procedure', {
        id_structure: user.id_structure,
        montant: montantNet,
        nb_articles: articles.length,
        articles_string: articlesString
      });

      // Appel de la fonction PostgreSQL atomique
      // Signature: create_facture_complete(
      //   p_date_facture, p_id_structure, p_tel_client, p_nom_client_payeur,
      //   p_montant, p_description, p_articles_string,
      //   p_mt_remise, p_mt_acompte, p_avec_frais, p_est_devis, p_id_utilisateur
      // )
      const factureCompleteQuery = `
        SELECT * FROM create_facture_complete1(
          '${factureData.date_facture}',
          ${factureData.id_structure},
          '${factureData.tel_client}',
          '${factureData.nom_client_payeur.replace(/'/g, "''")}',
          ${factureData.montant},
          '${factureData.description.replace(/'/g, "''")}',
          '${articlesString}',
          ${factureData.mt_remise},
          ${factureData.mt_acompte},
          ${factureData.avec_frais},
          ${factureData.est_devis},
          ${factureData.id_utilisateur}
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
        montant_brut: sousTotal,
        remise: remise
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

    // Validation montants (utilise prix_applique si choisi, sinon prix_vente)
    const sousTotal = articles?.reduce((total, article) => {
      return total + ((article.prix_applique ?? article.prix_vente) * article.quantity);
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
  async getFactureDetails(id_facture: number): Promise<unknown> {
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

  /**
   * Ajouter un acompte à une facture existante
   */
  async addAcompte(data: AjouterAcompteData): Promise<AjouterAcompteResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new FactureApiException('Utilisateur non authentifié', 401);
      }

      // Validation des données
      if (!data.id_facture || data.id_facture <= 0) {
        throw new FactureApiException('ID de facture invalide', 400);
      }

      if (!data.montant_acompte || data.montant_acompte <= 0) {
        throw new FactureApiException('Montant d\'acompte invalide', 400);
      }

      // Vérification que la structure correspond
      if (data.id_structure !== user.id_structure) {
        throw new FactureApiException('Structure non autorisée', 403);
      }

      SecurityService.secureLog('log', 'Ajout acompte facture', {
        id_structure: data.id_structure,
        id_facture: data.id_facture,
        montant_acompte: data.montant_acompte,
        transaction_id: data.transaction_id,
        uuid: data.uuid,
        mode_paiement: data.mode_paiement,
        telephone: data.telephone
      });

      // Appel de la fonction PostgreSQL add_acompte_facture (nouvelle signature 7 paramètres)
      const telephone = data.telephone || '000000000';
      const query = `SELECT * FROM add_acompte_facture(${data.id_structure}, ${data.id_facture}, ${data.montant_acompte}, '${data.transaction_id}', '${data.uuid}', '${data.mode_paiement}', '${telephone}')`;
      console.log('💰 [ACOMPTE] Requête add_acompte_facture:', query);
      const result = await DatabaseService.query(query);
      
      if (!result || result.length === 0) {
        throw new FactureApiException('Aucune réponse de add_acompte_facture', 500);
      }

      // Récupération du JSON depuis la première ligne
      const acompteData = result[0].add_acompte_facture;
      
      if (!acompteData) {
        throw new FactureApiException('Format de données invalide', 500);
      }

      // Parse du JSON si c'est une chaîne
      const parsedData = typeof acompteData === 'string' 
        ? JSON.parse(acompteData) 
        : acompteData;

      if (!parsedData.success) {
        throw new FactureApiException(
          parsedData.message || 'Erreur lors de l\'ajout de l\'acompte',
          400
        );
      }

      SecurityService.secureLog('log', 'Acompte ajouté avec succès', {
        id_facture: parsedData.facture?.id_facture,
        montant_verse: parsedData.facture?.montant_verse,
        nouveau_restant: parsedData.facture?.nouveau_restant,
        statut: parsedData.facture?.statut
      });

      return parsedData;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur ajout acompte', error);
      
      if (error instanceof FactureApiException) {
        throw error;
      }
      
      throw new FactureApiException(
        'Impossible d\'ajouter l\'acompte',
        500,
        error
      );
    }
  }

  /**
   * Valider les données d'acompte avant ajout
   */
  validateAcompteData(
    data: AjouterAcompteData,
    montantRestant?: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation ID facture
    if (!data.id_facture || data.id_facture <= 0) {
      errors.push('ID de facture invalide');
    }

    // Validation montant acompte
    if (!data.montant_acompte || data.montant_acompte <= 0) {
      errors.push('Le montant de l\'acompte doit être positif');
    }

    // Validation par rapport au montant restant si fourni
    if (montantRestant !== undefined && data.montant_acompte > montantRestant) {
      errors.push('L\'acompte ne peut pas être supérieur au montant restant');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton
export const factureService = FactureService.getInstance();
export default factureService;