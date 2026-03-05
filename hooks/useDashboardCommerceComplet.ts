import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardCommerceComplet } from '@/types/dashboard';
import { ApiException } from '@/services/auth.service';

interface UseDashboardCommerceCompletReturn {
  data: DashboardCommerceComplet | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardCommerceComplet(
  structureId: number,
  periodeTop: 'semaine' | 'mois' = 'mois'
): UseDashboardCommerceCompletReturn {
  const [data, setData] = useState<DashboardCommerceComplet | null>(null);
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
      const result = await dashboardService.getDashboardCommerceComplet(structureId, periodeTop);
      setData(result);
    } catch (err) {
      if (err instanceof ApiException && err.status === 401) return;
      const msg = err instanceof Error ? err.message : 'Erreur chargement dashboard';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [structureId, periodeTop]);

  const refresh = useCallback(async () => {
    dashboardService.clearCacheForStructure(structureId);
    await loadData();
  }, [structureId, loadData]);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh toutes les 5 minutes
  useEffect(() => {
    if (!data || error) return;

    const interval = setInterval(() => {
      loadData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [data, error, loadData]);

  return { data, isLoading, error, refresh };
}
