/**
 * Service API pour FayClick V2 - Super App PWA
 * Gestion des 4 segments d'affaires du marché sénégalais:
 * - PRESTATAIRE DE SERVICES: Services professionnels
 * - COMMERCIALE: Commerce et vente de produits
 * - SCOLAIRE: Établissements d'enseignement
 * - IMMOBILIER: Gestion immobilière et locations
 */

import DatabaseService from './database.service';
import SecurityService from './security.service';
import { extractSingleDataFromResult, extractArrayDataFromResult } from '@/utils/dataExtractor';

// Types pour les structures d'affaires FayClick
export interface FayClickStructure {
  id: number;
  nom: string;
  type_structure: 'PRESTATAIRE DE SERVICES' | 'COMMERCIALE' | 'SCOLAIRE' | 'IMMOBILIER';
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  logo_url?: string;
  actif: boolean;
  date_creation: string;
}

// Types pour les événements/services par segment
export interface ServicePrestataire {
  id: number;
  nom_service: string;
  description: string;
  prix: number;
  duree_estimee?: number;
  categorie: string;
  actif: boolean;
}

export interface ProduitCommerce {
  id: number;
  nom_produit: string;
  description: string;
  prix_unitaire: number;
  stock_disponible: number;
  seuil_alerte: number;
  categorie: string;
  image_url?: string;
  actif: boolean;
}

export interface EvenementScolaire {
  id: number;
  nom_evenement: string;
  type_evenement: 'INSCRIPTION' | 'SCOLARITE' | 'EXAMEN' | 'ACTIVITE';
  prix: number;
  date_debut: string;
  date_fin?: string;
  description: string;
  places_disponibles?: number;
  actif: boolean;
}

export interface BienImmobilier {
  id: number;
  nom_bien: string;
  type_bien: 'LOCATION' | 'VENTE' | 'GESTION';
  prix_mensuel?: number;
  prix_vente?: number;
  commission_taux: number;
  adresse: string;
  superficie: number;
  nb_pieces: number;
  equipements?: string;
  images?: string[];
  actif: boolean;
}

// Types pour les transactions et factures
export interface FayClickTransaction {
  id: string;
  structure_id: number;
  type_transaction: string;
  montant: number;
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'ANNULEE';
  date_creation: string;
  details?: any;
}

export interface FayClickFacture {
  id: string;
  numero_facture: string;
  structure_id: number;
  client_info: any;
  items: Array<{
    nom: string;
    quantite: number;
    prix_unitaire: number;
    total: number;
  }>;
  montant_total: number;
  statut: 'BROUILLON' | 'EMISE' | 'PAYEE' | 'ANNULEE';
  date_emission: string;
  date_echeance?: string;
  date_paiement?: string;
}

class FayClickApiService {
  private static instance: FayClickApiService;

  static getInstance(): FayClickApiService {
    if (!this.instance) {
      this.instance = new FayClickApiService();
    }
    return this.instance;
  }

  // ================================
  // GESTION DES STRUCTURES
  // ================================

  /**
   * Récupère la liste des structures d'une utilisateur
   */
  async getStructuresUtilisateur(userId: number): Promise<FayClickStructure[]> {
    try {
      SecurityService.secureLog('log', 'Récupération structures utilisateur', { userId });
      
      const results = await DatabaseService.executeFunction('get_structures_utilisateur', [userId.toString()]);
      const structures = extractArrayDataFromResult<FayClickStructure>(results);
      
      SecurityService.secureLog('log', `${structures.length} structures trouvées pour l'utilisateur ${userId}`);
      return structures;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération structures utilisateur', { 
        userId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  /**
   * Récupère les détails d'une structure
   */
  async getStructureDetails(structureId: number): Promise<FayClickStructure | null> {
    try {
      SecurityService.secureLog('log', 'Récupération détails structure', { structureId });
      
      const results = await DatabaseService.executeFunction('get_structure_details', [structureId.toString()]);
      const structure = extractSingleDataFromResult<FayClickStructure>(results);
      
      return structure;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération détails structure', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  // ================================
  // SEGMENT PRESTATAIRE DE SERVICES
  // ================================

  /**
   * Récupère la liste des services d'un prestataire
   */
  async getServicesPrestataire(structureId: number): Promise<ServicePrestataire[]> {
    try {
      SecurityService.secureLog('log', 'Récupération services prestataire', { structureId });
      
      const results = await DatabaseService.executeFunction('get_services_prestataire', [structureId.toString()]);
      const services = extractArrayDataFromResult<ServicePrestataire>(results);
      
      SecurityService.secureLog('log', `${services.length} services trouvés pour la structure ${structureId}`);
      return services;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération services prestataire', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  /**
   * Crée une nouvelle réservation de service
   */
  async creerReservationService(structureId: number, serviceId: number, clientInfo: any, dateReservation: string): Promise<FayClickTransaction> {
    try {
      SecurityService.secureLog('log', 'Création réservation service', { 
        structureId, 
        serviceId, 
        dateReservation 
      });
      
      const results = await DatabaseService.executeFunction('creer_reservation_service', [
        structureId.toString(),
        serviceId.toString(), 
        JSON.stringify(SecurityService.sanitizeInput(clientInfo)),
        dateReservation
      ]);
      
      const reservation = extractSingleDataFromResult<FayClickTransaction>(results);
      
      if (!reservation) {
        throw new Error('Échec de création de la réservation');
      }
      
      SecurityService.secureLog('log', 'Réservation créée avec succès', { 
        reservationId: reservation.id 
      });
      
      return reservation;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création réservation service', { 
        structureId, 
        serviceId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  // ================================
  // SEGMENT COMMERCE
  // ================================

  /**
   * Récupère le catalogue de produits d'un commerce
   */
  async getCatalogueProduits(structureId: number): Promise<ProduitCommerce[]> {
    try {
      SecurityService.secureLog('log', 'Récupération catalogue produits', { structureId });
      
      const results = await DatabaseService.executeFunction('get_catalogue_produits', [structureId.toString()]);
      const produits = extractArrayDataFromResult<ProduitCommerce>(results);
      
      SecurityService.secureLog('log', `${produits.length} produits trouvés pour la structure ${structureId}`);
      return produits;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération catalogue produits', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  /**
   * Crée une nouvelle commande
   */
  async creerCommande(structureId: number, clientInfo: any, items: Array<{produit_id: number, quantite: number}>): Promise<FayClickFacture> {
    try {
      SecurityService.secureLog('log', 'Création commande commerce', { 
        structureId, 
        itemsCount: items.length 
      });
      
      const results = await DatabaseService.executeFunction('creer_commande_commerce', [
        structureId.toString(),
        JSON.stringify(SecurityService.sanitizeInput(clientInfo)),
        JSON.stringify(items)
      ]);
      
      const commande = extractSingleDataFromResult<FayClickFacture>(results);
      
      if (!commande) {
        throw new Error('Échec de création de la commande');
      }
      
      SecurityService.secureLog('log', 'Commande créée avec succès', { 
        factureId: commande.id,
        montant: commande.montant_total
      });
      
      return commande;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création commande commerce', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  // ================================
  // SEGMENT SCOLAIRE
  // ================================

  /**
   * Récupère la liste des événements scolaires (inscriptions, scolarité, etc.)
   */
  async getEvenementsScolaires(structureId: number): Promise<EvenementScolaire[]> {
    try {
      SecurityService.secureLog('log', 'Récupération événements scolaires', { structureId });
      
      const results = await DatabaseService.executeFunction('get_evenements_scolaires', [structureId.toString()]);
      const evenements = extractArrayDataFromResult<EvenementScolaire>(results);
      
      SecurityService.secureLog('log', `${evenements.length} événements scolaires trouvés pour la structure ${structureId}`);
      return evenements;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération événements scolaires', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  /**
   * Crée une nouvelle inscription ou paiement scolaire
   */
  async creerInscriptionScolaire(structureId: number, evenementId: number, eleveInfo: any): Promise<FayClickFacture> {
    try {
      SecurityService.secureLog('log', 'Création inscription scolaire', { 
        structureId, 
        evenementId 
      });
      
      const results = await DatabaseService.executeFunction('creer_inscription_scolaire', [
        structureId.toString(),
        evenementId.toString(),
        JSON.stringify(SecurityService.sanitizeInput(eleveInfo))
      ]);
      
      const inscription = extractSingleDataFromResult<FayClickFacture>(results);
      
      if (!inscription) {
        throw new Error('Échec de création de l\'inscription');
      }
      
      SecurityService.secureLog('log', 'Inscription scolaire créée avec succès', { 
        factureId: inscription.id,
        montant: inscription.montant_total
      });
      
      return inscription;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création inscription scolaire', { 
        structureId, 
        evenementId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  // ================================
  // SEGMENT IMMOBILIER
  // ================================

  /**
   * Récupère le portefeuille immobilier
   */
  async getBiensImmobiliers(structureId: number): Promise<BienImmobilier[]> {
    try {
      SecurityService.secureLog('log', 'Récupération biens immobiliers', { structureId });
      
      const results = await DatabaseService.executeFunction('get_biens_immobiliers', [structureId.toString()]);
      const biens = extractArrayDataFromResult<BienImmobilier>(results);
      
      SecurityService.secureLog('log', `${biens.length} biens immobiliers trouvés pour la structure ${structureId}`);
      return biens;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération biens immobiliers', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  /**
   * Crée une nouvelle transaction immobilière
   */
  async creerTransactionImmobiliere(structureId: number, bienId: number, clientInfo: any, typeTransaction: 'LOCATION' | 'VENTE'): Promise<FayClickFacture> {
    try {
      SecurityService.secureLog('log', 'Création transaction immobilière', { 
        structureId, 
        bienId, 
        typeTransaction 
      });
      
      const results = await DatabaseService.executeFunction('creer_transaction_immobiliere', [
        structureId.toString(),
        bienId.toString(),
        JSON.stringify(SecurityService.sanitizeInput(clientInfo)),
        typeTransaction
      ]);
      
      const transaction = extractSingleDataFromResult<FayClickFacture>(results);
      
      if (!transaction) {
        throw new Error('Échec de création de la transaction');
      }
      
      SecurityService.secureLog('log', 'Transaction immobilière créée avec succès', { 
        factureId: transaction.id,
        montant: transaction.montant_total
      });
      
      return transaction;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création transaction immobilière', { 
        structureId, 
        bienId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  // ================================
  // GESTION DES FACTURES & TRANSACTIONS
  // ================================

  /**
   * Récupère l'historique des factures d'une structure
   */
  async getHistoriqueFactures(structureId: number, limit: number = 50): Promise<FayClickFacture[]> {
    try {
      SecurityService.secureLog('log', 'Récupération historique factures', { structureId, limit });
      
      const results = await DatabaseService.executeFunction('get_historique_factures', [
        structureId.toString(), 
        limit.toString()
      ]);
      const factures = extractArrayDataFromResult<FayClickFacture>(results);
      
      SecurityService.secureLog('log', `${factures.length} factures trouvées pour la structure ${structureId}`);
      return factures;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération historique factures', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une facture
   */
  async mettreAJourStatutFacture(factureId: string, nouveauStatut: FayClickFacture['statut']): Promise<boolean> {
    try {
      SecurityService.secureLog('log', 'Mise à jour statut facture', { factureId, nouveauStatut });
      
      const results = await DatabaseService.executeFunction('update_statut_facture', [
        factureId,
        nouveauStatut
      ]);
      
      const success = extractSingleDataFromResult<{success: boolean}>(results);
      return success?.success || false;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur mise à jour statut facture', { 
        factureId, 
        nouveauStatut,
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  // ================================
  // STATISTIQUES & DASHBOARD
  // ================================

  /**
   * Récupère les statistiques dashboard d'une structure
   */
  async getStatistiquesDashboard(structureId: number): Promise<any> {
    try {
      SecurityService.secureLog('log', 'Récupération statistiques dashboard', { structureId });
      
      const results = await DatabaseService.executeFunction('get_dashboard_stats', [structureId.toString()]);
      const stats = extractSingleDataFromResult(results);
      
      SecurityService.secureLog('log', 'Statistiques dashboard récupérées', { 
        structureId,
        hasStats: !!stats
      });
      
      return stats;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération statistiques dashboard', { 
        structureId, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      throw error;
    }
  }

  // ================================
  // UTILITAIRES
  // ================================

  /**
   * Test de connectivité API spécifique FayClick
   */
  async testConnectiviteFayClick(): Promise<boolean> {
    try {
      SecurityService.secureLog('log', 'Test de connectivité API FayClick');
      
      const success = await DatabaseService.testConnection();
      
      SecurityService.secureLog('log', 'Test de connectivité terminé', { success });
      return success;
      
    } catch (error) {
      SecurityService.secureLog('error', 'Échec test de connectivité FayClick', { 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
      return false;
    }
  }
}

// Instance singleton exportée
export const fayClickApi = FayClickApiService.getInstance();
export default fayClickApi;