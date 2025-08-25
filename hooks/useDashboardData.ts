import { useState, useEffect, useCallback } from 'react';
import { dashboardService, DashboardStats, FinancialData } from '@/services/dashboard.service';
import { 
  StatsCardData, 
  DashboardState, 
  UseDashboardDataReturn, 
  getStructureConfig 
} from '@/types/dashboard';
import { ApiException } from '@/services/auth.service';

// Hook principal pour les données du dashboard
export function useDashboardData(structureId: number, autoRefresh: boolean = true): UseDashboardDataReturn {
  const [state, setState] = useState<DashboardState>({
    stats: null,
    statsCardData: null,
    financialData: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  // Transformer les stats en données d'affichage pour les cards
  const transformStatsToCardData = useCallback((stats: DashboardStats): StatsCardData => {
    const config = getStructureConfig(stats.type_structure);
    
    // Calcul du nombre approximatif de factures
    const invoicesCount = dashboardService.calculateInvoicesCount(stats.mt_total_factures);
    
    // Obtenir la valeur primaire selon le type de structure
    let primaryCount = 0;
    let primaryGrowth = 0;

    switch (stats.type_structure) {
      case 'SCOLAIRE':
        primaryCount = stats.total_eleves || 0;
        primaryGrowth = 8; // Croissance simulée, pourrait venir de l'API
        break;
      case 'IMMOBILIER':
        primaryCount = stats.total_clients || 0;
        primaryGrowth = 5;
        break;
      case 'COMMERCIALE':
        primaryCount = stats.total_produits || 0;
        primaryGrowth = 12;
        break;
      case 'PRESTATAIRE DE SERVICES':
        primaryCount = stats.total_services || 0;
        primaryGrowth = 7;
        break;
      default:
        primaryCount = stats.total_clients || 0;
        primaryGrowth = 5;
    }

    return {
      totalAmount: stats.mt_total_factures,
      invoicesCount,
      growthPercentage: 15, // Croissance des factures, pourrait être calculée
      primaryCount,
      primaryLabel: config.primaryMetric.label,
      primaryIcon: config.primaryMetric.icon,
      primaryGrowth,
    };
  }, []);

  // Fonction pour charger les données
  const loadDashboardData = useCallback(async (): Promise<void> => {
    if (!structureId || structureId <= 0) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null // Pas d'erreur, juste pas de données à charger
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Charger les stats depuis l'API
      const stats = await dashboardService.getDashboardStats(structureId);
      
      // Transformer les données pour l'affichage
      const statsCardData = transformStatsToCardData(stats);
      const financialData = dashboardService.calculateFinancialData(stats);

      setState(prev => ({
        ...prev,
        stats,
        statsCardData,
        financialData,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      }));

      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard data loaded successfully:', {
          stats,
          statsCardData,
          financialData
        });
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données dashboard:', error);
      
      let errorMessage = 'Une erreur est survenue lors du chargement';
      
      if (error instanceof ApiException) {
        errorMessage = error.message;
        
        // Si c'est une erreur d'authentification, ne pas afficher d'erreur
        // car la redirection vers login est gérée dans le service
        if (error.status === 401) {
          return;
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [structureId, transformStatsToCardData]);

  // Fonction de rafraîchissement manuel
  const refresh = useCallback(async (): Promise<void> => {
    // Vider le cache pour forcer le rechargement
    dashboardService.clearCacheForStructure(structureId);
    await loadDashboardData();
  }, [structureId, loadDashboardData]);

  // Fonction pour effacer les erreurs
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Charger les données au montage du composant
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh périodique si activé
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Rafraîchir seulement si pas d'erreur et données déjà chargées
      if (!state.error && state.stats) {
        loadDashboardData();
      }
    }, 5 * 60 * 1000); // Rafraîchir toutes les 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboardData, state.error, state.stats]);

  // Préchargement au montage pour améliorer les performances
  useEffect(() => {
    if (structureId && structureId > 0) {
      dashboardService.preloadDashboardStats(structureId);
    }
  }, [structureId]);

  return {
    stats: state.stats,
    statsCardData: state.statsCardData,
    financialData: state.financialData,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    clearError,
    lastUpdated: state.lastUpdated,
  };
}

// Hook simplifié pour obtenir juste les stats
export function useDashboardStats(structureId: number) {
  const { stats, isLoading, error, refresh } = useDashboardData(structureId, false);
  
  return {
    stats,
    isLoading,
    error,
    refresh,
  };
}

// Hook pour obtenir les données financières seulement
export function useFinancialData(structureId: number) {
  const { financialData, isLoading, error, refresh } = useDashboardData(structureId, false);
  
  return {
    financialData,
    isLoading,
    error,
    refresh,
  };
}

// Hook pour les données des stats cards seulement
export function useStatsCardData(structureId: number) {
  const { statsCardData, isLoading, error, refresh } = useDashboardData(structureId, true);
  
  return {
    statsCardData,
    isLoading,
    error,
    refresh,
  };
}

// Hook avec gestion du retry automatique en cas d'erreur
export function useDashboardDataWithRetry(structureId: number, maxRetries: number = 3) {
  const [retryCount, setRetryCount] = useState(0);
  const dashboardData = useDashboardData(structureId, true);

  const retryLoad = useCallback(async () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      await dashboardData.refresh();
    }
  }, [retryCount, maxRetries, dashboardData]);

  // Retry automatique en cas d'erreur réseau
  useEffect(() => {
    if (dashboardData.error && retryCount < maxRetries) {
      const timer = setTimeout(retryLoad, 2000 * (retryCount + 1)); // Délai exponentiel
      return () => clearTimeout(timer);
    }
  }, [dashboardData.error, retryCount, maxRetries, retryLoad]);

  return {
    ...dashboardData,
    retryCount,
    canRetry: retryCount < maxRetries,
    retryLoad,
  };
}