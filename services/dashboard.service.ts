import { ApiException, authService } from './auth.service';
import { FinancialData, DashboardStats, DashboardCommerceComplet } from '@/types/dashboard';
import DatabaseService from './database.service';
import { extractSingleDataFromResult } from '@/utils/dataExtractor';
import EtatGlobalService from './etatGlobal.service';
import type { EtatGlobalData } from '@/types/etatGlobal.types';

// Interface pour les données dashboard (retour direct de PostgreSQL)
interface DashboardRawData {
  nom_structure: string;
  type_structure: string;
  mt_total_factures: number;
  mt_total_payees: number;
  mt_total_impayees: number;
  // Spécifiques selon le type
  total_eleves?: number;      // SCOLAIRE
  total_clients?: number;     // IMMOBILIER
  total_produits?: number;    // COMMERCIALE
  mt_valeur_stocks?: number;  // COMMERCIALE
  total_services?: number;    // PRESTATAIRE DE SERVICES
  mt_chiffre_affaire?: number; // PRESTATAIRE DE SERVICES
}



// Service Dashboard
export class DashboardService {
  private static instance: DashboardService;
  private cache: Map<string, { data: DashboardStats; timestamp: number }> = new Map();
  private cacheComplet: Map<string, { data: DashboardCommerceComplet; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }


  // Vérifier si les données en cache sont valides
  private isValidCache(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < this.CACHE_DURATION;
  }

  // Récupérer les statistiques du dashboard depuis l'API
  async getDashboardStats(structureId: number): Promise<DashboardStats> {
    const cacheKey = `dashboard_${structureId}`;
    
    // Vérifier le cache d'abord
    if (this.isValidCache(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('Dashboard data loaded from cache');
        return cached.data;
      }
    }

    // Vérifier l'authentification
    if (!authService.isAuthenticated()) {
      throw new ApiException('Utilisateur non authentifié', 401);
    }

    try {
      console.log(`🔍 [DASHBOARD] Récupération données pour structure ${structureId}`);
      
      // Appel à la nouvelle API XML via DatabaseService
      const results = await DatabaseService.getDashboard(structureId.toString());
      
      console.log('🟢 [DASHBOARD] Résultat brut de l\'API:', results);
      
      if (!results || results.length === 0) {
        throw new ApiException('Aucune donnée trouvée pour cette structure', 404);
      }

      // Extraire les données avec dataExtractor
      const rawResult = extractSingleDataFromResult(results[0]);
      
      console.log('🟡 [DASHBOARD] Résultat extrait:', rawResult);
      
      // Les données sont dans rawResult.get_dashboard
      const dashboardData = rawResult?.get_dashboard as DashboardRawData;
      
      console.log('🟡 [DASHBOARD] Données dashboard finales:', dashboardData);
      
      if (!dashboardData) {
        throw new ApiException('Aucune donnée dashboard trouvée', 404);
      }
      
      // Convertir en format unifié
      const stats: DashboardStats = {
        nom_structure: dashboardData.nom_structure,
        type_structure: dashboardData.type_structure,
        mt_total_factures: dashboardData.mt_total_factures ?? 0,
        mt_total_payees: dashboardData.mt_total_payees ?? 0,
        mt_total_impayees: dashboardData.mt_total_impayees ?? 0,
        
        // Données spécifiques selon le type - utiliser typeof pour inclure les valeurs 0
        ...(typeof dashboardData.total_eleves === 'number' && { total_eleves: dashboardData.total_eleves }),
        ...(typeof dashboardData.total_clients === 'number' && { total_clients: dashboardData.total_clients }),
        ...(typeof dashboardData.total_produits === 'number' && { total_produits: dashboardData.total_produits }),
        ...(typeof dashboardData.mt_valeur_stocks === 'number' && { mt_valeur_stocks: dashboardData.mt_valeur_stocks }),
        ...(typeof dashboardData.total_services === 'number' && { total_services: dashboardData.total_services }),
        ...(typeof dashboardData.mt_chiffre_affaire === 'number' && { mt_chiffre_affaire: dashboardData.mt_chiffre_affaire }),
      };

      // Mettre en cache
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard stats loaded:', stats);
      }

      return stats;

    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      
      // Erreur de base de données ou autre
      console.error('Erreur lors de la récupération des données dashboard:', error);
      
      // Analyser le type d'erreur pour un message plus précis
      let errorMessage = 'Impossible de charger les données du dashboard';
      
      if (error instanceof Error) {
        if (error.message.includes('contacter')) {
          errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
        } else if (error.message.includes('Timeout')) {
          errorMessage = 'Délai d\'attente dépassé. Veuillez réessayer.';
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }
      
      throw new ApiException(errorMessage, 500);
    }
  }

  // Calculer les données financières à partir des stats selon le type de structure
  calculateFinancialData(stats: DashboardStats): FinancialData {
    const type = stats.type_structure;
    
    switch (type) {
      case 'SCOLAIRE':
        return this.calculateScolaireFinancials(stats);
      
      case 'COMMERCIALE':
        return this.calculateCommercialeFinancials(stats);
      
      case 'IMMOBILIER':
        return this.calculateImmobilierFinancials(stats);
      
      case 'PRESTATAIRE DE SERVICES':
        return this.calculatePrestatairesFinancials(stats);
      
      default:
        // Fallback pour types non reconnus
        return this.calculateDefaultFinancials(stats);
    }
  }

  // Calculs spécifiques pour SCOLAIRE
  private calculateScolaireFinancials(stats: DashboardStats): FinancialData {
    const totalRevenues = stats.mt_total_factures || 0;
    const totalPaid = stats.mt_total_payees || 0;
    const totalUnpaid = stats.mt_total_impayees || 0;
    const netBalance = totalPaid;
    const totalInvoices = this.calculateInvoicesCount(totalRevenues);

    return {
      totalRevenues,
      totalPaid,
      totalUnpaid,
      netBalance,
      totalInvoices,
      // Pour affichage cohérent dans le dashboard
      soldeNet: netBalance
    };
  }

  // Calculs spécifiques pour COMMERCIALE
  private calculateCommercialeFinancials(stats: DashboardStats): FinancialData {
    const totalStock = stats.mt_valeur_stocks || 0;
    // Pour COMMERCIALE, pas de factures mais stock comme base
    const totalRevenues = totalStock;
    const totalPaid = totalStock; // Stock = actif
    const totalUnpaid = 0; // Pas de factures impayées
    const netBalance = totalStock;
    
    // Estimation des charges (30% du stock comme exemple)
    const totalCharges = Math.round(totalStock * 0.3);
    const soldeNet = totalStock - totalCharges;

    return {
      totalRevenues,
      totalPaid,
      totalUnpaid,
      netBalance,
      totalStock,
      totalCharges,
      soldeNet,
      // Calcul approximatif des ventes basé sur le stock
      totalInvoices: this.calculateInvoicesCount(totalStock)
    };
  }

  // Calculs spécifiques pour IMMOBILIER  
  private calculateImmobilierFinancials(stats: DashboardStats): FinancialData {
    const totalRevenues = stats.mt_total_factures || 0;
    const totalPaid = stats.mt_total_payees || 0;
    const totalUnpaid = stats.mt_total_impayees || 0;
    const netBalance = totalPaid;
    
    // Pour immobilier, les commissions sont les montants payés
    const totalCommissions = totalPaid;
    const totalInvoices = this.calculateInvoicesCount(totalRevenues);

    return {
      totalRevenues,
      totalPaid,
      totalUnpaid,
      netBalance,
      totalCommissions,
      totalInvoices,
      // Estimation des charges (15% pour immobilier)
      totalCharges: Math.round(totalRevenues * 0.15),
      soldeNet: netBalance
    };
  }

  // Calculs spécifiques pour PRESTATAIRE DE SERVICES
  private calculatePrestatairesFinancials(stats: DashboardStats): FinancialData {
    const totalRevenueBusiness = stats.mt_chiffre_affaire || 0;
    const totalRevenues = totalRevenueBusiness;
    const totalPaid = totalRevenueBusiness; // Chiffre d'affaire = revenus
    const totalUnpaid = 0; // Pas de factures dans les données
    const netBalance = totalRevenueBusiness;
    
    // Estimation des charges (25% du CA)
    const totalCharges = Math.round(totalRevenueBusiness * 0.25);
    const soldeNet = totalRevenueBusiness - totalCharges;

    return {
      totalRevenues,
      totalPaid,
      totalUnpaid,
      netBalance,
      totalRevenueBusiness,
      totalCharges,
      soldeNet,
      totalInvoices: this.calculateInvoicesCount(totalRevenueBusiness)
    };
  }

  // Calculs par défaut pour types non reconnus
  private calculateDefaultFinancials(stats: DashboardStats): FinancialData {
    const totalRevenues = stats.mt_total_factures || stats.mt_chiffre_affaire || 0;
    const totalPaid = stats.mt_total_payees || totalRevenues;
    const totalUnpaid = stats.mt_total_impayees || 0;
    const netBalance = totalPaid;

    return {
      totalRevenues,
      totalPaid,
      totalUnpaid,
      netBalance,
      soldeNet: netBalance
    };
  }

  // Calculer le nombre approximatif de factures
  calculateInvoicesCount(totalAmount: number): number {
    // Estimation basée sur un montant moyen par facture
    // Ajustable selon le type de structure
    const averageInvoiceAmount = 50000; // 50k FCFA en moyenne
    return Math.max(1, Math.floor(totalAmount / averageInvoiceAmount));
  }

  // Dashboard Commerce Complet (vue desktop uniquement)
  async getDashboardCommerceComplet(
    structureId: number,
    periodeTop: 'semaine' | 'mois' = 'mois'
  ): Promise<DashboardCommerceComplet> {
    const cacheKey = `dashboard_complet_${structureId}_${periodeTop}`;

    // Verifier le cache
    const cached = this.cacheComplet.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('[DASHBOARD] Commerce complet loaded from cache');
      return cached.data;
    }

    if (!authService.isAuthenticated()) {
      throw new ApiException('Utilisateur non authentifie', 401);
    }

    try {
      const db = DatabaseService.getInstance();
      const results = await db.executeFunction(
        'get_dashboard_commerce_complet',
        [structureId.toString(), periodeTop]
      );

      if (!results || results.length === 0) {
        throw new ApiException('Aucune donnee dashboard commerce complet', 404);
      }

      const raw = (results[0] as Record<string, unknown>).get_dashboard_commerce_complet;
      const data: DashboardCommerceComplet = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!data || !data.success) {
        throw new ApiException('Reponse invalide de get_dashboard_commerce_complet', 500);
      }

      // Mettre en cache
      this.cacheComplet.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      if (error instanceof ApiException) throw error;
      console.error('Erreur getDashboardCommerceComplet:', error);
      throw new ApiException(
        error instanceof Error ? error.message : 'Erreur chargement dashboard commerce complet',
        500
      );
    }
  }

  // Vider le cache (utile pour forcer le rechargement)
  clearCache(): void {
    this.cache.clear();
    this.cacheComplet.clear();
  }

  // Vider le cache d'une structure specifique
  clearCacheForStructure(structureId: number): void {
    const cacheKey = `dashboard_${structureId}`;
    this.cache.delete(cacheKey);
    // Aussi vider le cache complet pour cette structure
    for (const key of this.cacheComplet.keys()) {
      if (key.startsWith(`dashboard_complet_${structureId}_`)) {
        this.cacheComplet.delete(key);
      }
    }
  }

  // Précharger les données pour une meilleure UX
  async preloadDashboardStats(structureId: number): Promise<void> {
    try {
      await this.getDashboardStats(structureId);
    } catch (error) {
      // Ignore les erreurs de préchargement
      console.warn('Erreur lors du préchargement des stats:', error);
    }
  }

  /**
   * Récupère les vraies données financières via get_etat_global()
   * Utilisé par le modal Coffre-Fort pour afficher les données réelles
   * @param structureId - ID de la structure
   * @param annee - Année (optionnel, par défaut année en cours)
   * @returns Données financières réelles depuis PostgreSQL
   */
  async getRealFinancialData(structureId: number, annee?: number): Promise<EtatGlobalData> {
    const etatGlobalService = EtatGlobalService.getInstance();
    return await etatGlobalService.getEtatGlobal(structureId, annee);
  }
}

// Instance singleton exportée
export const dashboardService = DashboardService.getInstance();