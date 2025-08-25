import { ApiException, authService } from './auth.service';

// Configuration de l'API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.icelabsoft.com/api';

// Interface pour les données dashboard
interface DashboardApiResponse {
  success: boolean;
  data: {
    get_dashboard: {
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
    };
  };
}

// Interface unifiée pour les stats dashboard
export interface DashboardStats {
  nom_structure: string;
  type_structure: string;
  mt_total_factures: number;
  mt_total_payees: number;
  mt_total_impayees: number;
  
  // Données spécifiques selon le type
  total_eleves?: number;
  total_clients?: number;
  total_produits?: number;
  mt_valeur_stocks?: number;
  total_services?: number;
  mt_chiffre_affaire?: number;
}

// Interface pour les données financières calculées
export interface FinancialData {
  totalRevenues: number;
  totalPaid: number;
  totalUnpaid: number;
  netBalance: number;
  // Données supplémentaires selon le type
  totalStock?: number;
  totalRevenueBusiness?: number;
}

// Service Dashboard
export class DashboardService {
  private static instance: DashboardService;
  private cache: Map<string, { data: DashboardStats; timestamp: number }> = new Map();
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

    const token = authService.getToken();
    if (!token) {
      throw new ApiException('Token d\'authentification manquant', 401);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/structures/dashboard/${structureId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Log pour debug
      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard API response status:', response.status);
      }

      // Gestion des erreurs HTTP
      if (!response.ok) {
        let errorMessage = 'Erreur lors du chargement des données';
        
        switch (response.status) {
          case 401:
            errorMessage = 'Session expirée, veuillez vous reconnecter';
            // Rediriger vers la page de login
            if (typeof window !== 'undefined') {
              window.location.href = '/login?logout=true';
            }
            break;
          case 403:
            errorMessage = 'Accès non autorisé à cette structure';
            break;
          case 404:
            errorMessage = 'Structure non trouvée';
            break;
          case 500:
            errorMessage = 'Erreur serveur, veuillez réessayer';
            break;
          default:
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        
        throw new ApiException(errorMessage, response.status);
      }

      const apiResponse: DashboardApiResponse = await response.json();
      
      // Vérifier la structure de la réponse
      if (!apiResponse.success || !apiResponse.data?.get_dashboard) {
        throw new ApiException('Format de réponse API invalide');
      }

      const dashboardData = apiResponse.data.get_dashboard;
      
      // Convertir en format unifié
      const stats: DashboardStats = {
        nom_structure: dashboardData.nom_structure,
        type_structure: dashboardData.type_structure,
        mt_total_factures: dashboardData.mt_total_factures || 0,
        mt_total_payees: dashboardData.mt_total_payees || 0,
        mt_total_impayees: dashboardData.mt_total_impayees || 0,
        // Données spécifiques selon le type
        ...(dashboardData.total_eleves && { total_eleves: dashboardData.total_eleves }),
        ...(dashboardData.total_clients && { total_clients: dashboardData.total_clients }),
        ...(dashboardData.total_produits && { total_produits: dashboardData.total_produits }),
        ...(dashboardData.mt_valeur_stocks && { mt_valeur_stocks: dashboardData.mt_valeur_stocks }),
        ...(dashboardData.total_services && { total_services: dashboardData.total_services }),
        ...(dashboardData.mt_chiffre_affaire && { mt_chiffre_affaire: dashboardData.mt_chiffre_affaire }),
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
      
      // Erreur réseau ou autre
      console.error('Erreur lors de l\'appel API dashboard:', error);
      throw new ApiException(
        'Impossible de charger les données. Vérifiez votre connexion.',
        0
      );
    }
  }

  // Calculer les données financières à partir des stats
  calculateFinancialData(stats: DashboardStats): FinancialData {
    const totalRevenues = stats.mt_total_factures || 0;
    const totalPaid = stats.mt_total_payees || 0;
    const totalUnpaid = stats.mt_total_impayees || 0;
    const netBalance = totalPaid; // Le solde net est généralement le montant payé

    const financialData: FinancialData = {
      totalRevenues,
      totalPaid,
      totalUnpaid,
      netBalance,
    };

    // Ajouter des données spécifiques selon le type
    if (stats.mt_valeur_stocks) {
      financialData.totalStock = stats.mt_valeur_stocks;
    }
    
    if (stats.mt_chiffre_affaire) {
      financialData.totalRevenueBusiness = stats.mt_chiffre_affaire;
    }

    return financialData;
  }

  // Calculer le nombre approximatif de factures
  calculateInvoicesCount(totalAmount: number): number {
    // Estimation basée sur un montant moyen par facture
    // Ajustable selon le type de structure
    const averageInvoiceAmount = 50000; // 50k FCFA en moyenne
    return Math.max(1, Math.floor(totalAmount / averageInvoiceAmount));
  }

  // Vider le cache (utile pour forcer le rechargement)
  clearCache(): void {
    this.cache.clear();
  }

  // Vider le cache d'une structure spécifique
  clearCacheForStructure(structureId: number): void {
    const cacheKey = `dashboard_${structureId}`;
    this.cache.delete(cacheKey);
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
}

// Instance singleton exportée
export const dashboardService = DashboardService.getInstance();