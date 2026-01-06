/**
 * useVisualRecognition Hook
 * Hook React pour la reconnaissance visuelle des produits
 * FayClick V2 - Commerce
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getVisualRecognitionService,
  VisualState,
  VisualRecognitionResult,
  EnrollmentResult,
  VisualRecognitionStats,
  VisualMatch
} from '@/services/visual-recognition';

interface UseVisualRecognitionOptions {
  idStructure: number;
  autoInit?: boolean;
}

interface UseVisualRecognitionReturn {
  // État
  state: VisualState;
  isProcessing: boolean;
  isReady: boolean;
  error: string | null;

  // Actions
  recognize: (image: File | Blob | string | HTMLVideoElement) => Promise<VisualRecognitionResult | null>;
  enroll: (idProduit: number, image: File | Blob | string | HTMLVideoElement) => Promise<EnrollmentResult>;
  updateEmbedding: (idProduit: number, image: File | Blob | string | HTMLVideoElement) => Promise<EnrollmentResult>;
  removeEmbedding: (idProduit: number) => Promise<void>;
  hasEmbedding: (idProduit: number) => Promise<boolean>;
  syncFromServer: () => Promise<number>;
  reset: () => void;

  // Stats
  stats: VisualRecognitionStats | null;
  refreshStats: () => Promise<void>;

  // Derniers résultats
  lastResult: VisualRecognitionResult | null;
  topMatch: VisualMatch | null;
}

export function useVisualRecognition({
  idStructure,
  autoInit = true
}: UseVisualRecognitionOptions): UseVisualRecognitionReturn {
  const serviceRef = useRef(getVisualRecognitionService());
  const [state, setState] = useState<VisualState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<VisualRecognitionStats | null>(null);
  const [lastResult, setLastResult] = useState<VisualRecognitionResult | null>(null);

  // Initialisation
  useEffect(() => {
    if (!autoInit || !idStructure) return;

    const service = serviceRef.current;

    const init = async () => {
      console.log('[useVisualRecognition] Initialisation pour structure:', idStructure);
      try {
        await service.initialize(idStructure);
        const initialStats = await service.getStats();
        console.log('[useVisualRecognition] Stats initiales:', initialStats);
        setStats(initialStats);
        setIsReady(true);
        console.log('[useVisualRecognition] Service prêt ✓');
      } catch (err) {
        console.error('[useVisualRecognition] Erreur init:', err);
        setError(err instanceof Error ? err.message : 'Erreur d\'initialisation');
      }
    };

    // Écouter les changements d'état
    const unsubscribe = service.onStateChange((newState, stateError) => {
      setState(newState);
      if (stateError) {
        setError(stateError);
      }
    });

    init();

    return () => {
      unsubscribe();
    };
  }, [idStructure, autoInit]);

  // Reconnaissance
  const recognize = useCallback(async (
    image: File | Blob | string | HTMLVideoElement
  ): Promise<VisualRecognitionResult | null> => {
    console.log('[useVisualRecognition] Début reconnaissance, type image:', typeof image);
    setError(null);

    try {
      console.log('[useVisualRecognition] Appel service.recognize()...');
      const result = await serviceRef.current.recognize(image);
      console.log('[useVisualRecognition] Résultat reconnaissance:', result);
      setLastResult(result);

      // Rafraîchir les stats après reconnaissance
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);

      return result;
    } catch (err) {
      console.error('[useVisualRecognition] Erreur reconnaissance:', err);
      const message = err instanceof Error ? err.message : 'Erreur de reconnaissance';
      setError(message);
      return null;
    }
  }, []);

  // Enrôlement
  const enroll = useCallback(async (
    idProduit: number,
    image: File | Blob | string | HTMLVideoElement
  ): Promise<EnrollmentResult> => {
    setError(null);

    try {
      const result = await serviceRef.current.enroll(idProduit, image);

      if (!result.success) {
        setError(result.message);
      }

      // Rafraîchir les stats après enrôlement
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'enrôlement';
      setError(message);
      return {
        success: false,
        idProduit,
        imageHash: '',
        message
      };
    }
  }, []);

  // Mise à jour d'embedding
  const updateEmbedding = useCallback(async (
    idProduit: number,
    image: File | Blob | string | HTMLVideoElement
  ): Promise<EnrollmentResult> => {
    setError(null);

    try {
      const result = await serviceRef.current.updateEmbedding(idProduit, image);

      // Rafraîchir les stats
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de mise à jour';
      setError(message);
      return {
        success: false,
        idProduit,
        imageHash: '',
        message
      };
    }
  }, []);

  // Suppression d'embedding
  const removeEmbedding = useCallback(async (idProduit: number): Promise<void> => {
    setError(null);

    try {
      await serviceRef.current.removeEmbedding(idProduit);

      // Rafraîchir les stats
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de suppression';
      setError(message);
      throw err;
    }
  }, []);

  // Vérifier si embedding existe
  const hasEmbedding = useCallback(async (idProduit: number): Promise<boolean> => {
    try {
      return await serviceRef.current.hasEmbedding(idProduit);
    } catch {
      return false;
    }
  }, []);

  // Sync depuis serveur
  const syncFromServer = useCallback(async (): Promise<number> => {
    setError(null);

    try {
      const synced = await serviceRef.current.syncFromServer();

      // Rafraîchir les stats
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);

      return synced;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de synchronisation';
      setError(message);
      throw err;
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    serviceRef.current.resetState();
    setError(null);
    setLastResult(null);
  }, []);

  // Rafraîchir les stats
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);
    } catch (err) {
      console.error('[useVisualRecognition] Erreur refresh stats:', err);
    }
  }, []);

  return {
    // État
    state,
    isProcessing: state === 'processing' || state === 'enrolling',
    isReady,
    error,

    // Actions
    recognize,
    enroll,
    updateEmbedding,
    removeEmbedding,
    hasEmbedding,
    syncFromServer,
    reset,

    // Stats
    stats,
    refreshStats,

    // Derniers résultats
    lastResult,
    topMatch: lastResult?.topMatch || null
  };
}

export default useVisualRecognition;
