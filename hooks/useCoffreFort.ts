/**
 * Hook pour récupérer les données du Coffre-Fort (État Global Financier)
 * Utilise get_etat_global() pour obtenir les vraies données financières
 */

import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '@/services/dashboard.service';
import type { EtatGlobalData } from '@/types/etatGlobal.types';

interface UseCoffreFortReturn {
  data: EtatGlobalData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCoffreFort(structureId: number, annee?: number): UseCoffreFortReturn {
  const [data, setData] = useState<EtatGlobalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!structureId || structureId <= 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const etatGlobal = await dashboardService.getRealFinancialData(structureId, annee);
      setData(etatGlobal);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement du Coffre-Fort:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [structureId, annee]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh
  };
}
