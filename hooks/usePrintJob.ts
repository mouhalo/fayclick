/**
 * Hook de gestion des jobs d'impression
 * Gère le workflow complet : génération QR → construction HTML → impression
 *
 * Fonctionnalités :
 * - Progression temps réel avec estimation
 * - Support annulation
 * - Gestion des erreurs
 * - Reset automatique
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Produit } from '@/types/produit';
import {
  PrintJob,
  PrintJobStatus,
  PrintJobProgress,
  QRGenerationProgress,
  StickerSizeKey,
  STICKER_SIZES,
  LIST_CONFIG,
  PRINT_LIMITS
} from '@/types/print';
import { printOptimized } from '@/services/produits-print.service';
import { formatTimeRemaining } from '@/utils/batch-processor';

// ============================================================================
// TYPES
// ============================================================================

export interface UsePrintJobOptions {
  produits: Produit[];
  nomStructure: string;
  logoStructure?: string;
}

export interface PrintJobConfig {
  format: 'list' | 'stickers';
  stickerSize?: StickerSizeKey;
  afficherNom?: boolean;
  afficherPrix?: boolean;
}

export interface UsePrintJobReturn {
  /** État actuel du job d'impression */
  job: PrintJob;

  /** Démarre l'impression avec la configuration spécifiée */
  startPrint: (config: PrintJobConfig) => Promise<void>;

  /** Annule l'impression en cours */
  cancel: () => void;

  /** Réinitialise l'état du job */
  reset: () => void;

  /** Indique si une impression est en cours */
  isProcessing: boolean;

  /** Message de progression formaté */
  progressMessage: string;

  /** Temps restant estimé formaté */
  timeRemaining: string;

  /** Nombre de pages estimées */
  estimatedPages: number;

  /** Avertissement si beaucoup de produits */
  warning: string | null;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function createInitialJob(): PrintJob {
  return {
    id: '',
    status: 'idle',
    progress: {
      phase: 'qr-generation',
      current: 0,
      total: 0
    }
  };
}

function getProgressMessage(job: PrintJob): string {
  if (job.status === 'idle') return '';
  if (job.status === 'cancelled') return 'Impression annulée';
  if (job.status === 'error') return job.error || 'Une erreur est survenue';
  if (job.status === 'ready') return 'Prêt pour impression';
  if (job.status === 'printing') return 'Impression en cours...';

  const { phase, current, total } = job.progress;

  if (phase === 'qr-generation') {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    return `Génération QR codes: ${current}/${total} (${percent}%)`;
  }

  if (phase === 'html-building') {
    return 'Préparation du document...';
  }

  return 'Traitement en cours...';
}

function calculateEstimatedPages(
  productCount: number,
  format: 'list' | 'stickers',
  stickerSize: StickerSizeKey = 'medium'
): number {
  if (productCount === 0) return 0;

  const itemsPerPage = format === 'stickers'
    ? STICKER_SIZES[stickerSize].perPage
    : LIST_CONFIG.itemsPerPage;

  return Math.ceil(productCount / itemsPerPage);
}

function getWarningMessage(productCount: number): string | null {
  if (productCount > PRINT_LIMITS.MAX_PRODUCTS) {
    return `Limite de ${PRINT_LIMITS.MAX_PRODUCTS} produits dépassée. Veuillez filtrer votre sélection.`;
  }

  if (productCount > PRINT_LIMITS.WARNING_THRESHOLD) {
    return `L'impression de ${productCount} produits peut prendre un moment. Vous pourrez annuler si nécessaire.`;
  }

  return null;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePrintJob(options: UsePrintJobOptions): UsePrintJobReturn {
  const { produits, nomStructure, logoStructure } = options;

  const [job, setJob] = useState<PrintJob>(createInitialJob);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Calculer les valeurs dérivées
  const isProcessing = job.status === 'generating';
  const warning = getWarningMessage(produits.length);

  /**
   * Démarre le processus d'impression
   */
  const startPrint = useCallback(async (config: PrintJobConfig) => {
    const {
      format,
      stickerSize = 'medium',
      afficherNom = true,
      afficherPrix = true
    } = config;

    // Vérifier la limite
    if (produits.length > PRINT_LIMITS.MAX_PRODUCTS) {
      setJob(prev => ({
        ...prev,
        status: 'error',
        error: `Impossible d'imprimer plus de ${PRINT_LIMITS.MAX_PRODUCTS} produits`
      }));
      return;
    }

    if (produits.length === 0) {
      setJob(prev => ({
        ...prev,
        status: 'error',
        error: 'Aucun produit à imprimer'
      }));
      return;
    }

    // Initialiser le job
    const jobId = `print-${Date.now()}`;
    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();

    setJob({
      id: jobId,
      status: 'generating',
      progress: {
        phase: 'qr-generation',
        current: 0,
        total: produits.length
      },
      startedAt: new Date()
    });

    try {
      // Lancer l'impression optimisée
      const success = await printOptimized({
        produits,
        nomStructure,
        logoStructure,
        format,
        stickerSize,
        afficherNom,
        afficherPrix,
        onProgress: (progress: QRGenerationProgress) => {
          setJob(prev => ({
            ...prev,
            progress: {
              phase: 'qr-generation',
              current: progress.processed,
              total: progress.total,
              estimatedTimeRemaining: progress.estimatedTimeRemaining,
              currentBatch: progress.currentBatch,
              totalBatches: progress.totalBatches
            }
          }));
        },
        abortSignal: abortControllerRef.current.signal
      });

      if (success) {
        setJob(prev => ({
          ...prev,
          status: 'printing',
          completedAt: new Date()
        }));

        // Reset après un court délai
        setTimeout(() => {
          setJob(createInitialJob());
        }, 2000);
      } else {
        setJob(prev => ({
          ...prev,
          status: 'error',
          error: 'Impossible d\'ouvrir la fenêtre d\'impression'
        }));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setJob(prev => ({
          ...prev,
          status: 'cancelled'
        }));
      } else {
        setJob(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }));
      }
    }
  }, [produits, nomStructure, logoStructure]);

  /**
   * Annule l'impression en cours
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Réinitialise l'état du job
   */
  const reset = useCallback(() => {
    cancel();
    setJob(createInitialJob());
  }, [cancel]);

  // Calculer le message de progression
  const progressMessage = getProgressMessage(job);

  // Calculer le temps restant formaté
  const timeRemaining = job.progress.estimatedTimeRemaining !== undefined
    ? formatTimeRemaining(job.progress.estimatedTimeRemaining)
    : '';

  // Calculer le nombre de pages estimées (pour affichage)
  const estimatedPages = calculateEstimatedPages(
    produits.length,
    'stickers', // Par défaut, sera recalculé selon le format choisi
    'medium'
  );

  return {
    job,
    startPrint,
    cancel,
    reset,
    isProcessing,
    progressMessage,
    timeRemaining,
    estimatedPages,
    warning
  };
}

// ============================================================================
// HOOK SIMPLIFIÉ POUR PETITES LISTES
// ============================================================================

/**
 * Hook simplifié pour les petites listes (< 100 produits)
 * Utilise la méthode legacy sans progression
 */
export function usePrintJobSimple(options: UsePrintJobOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const print = useCallback(async (config: PrintJobConfig) => {
    const { produits, nomStructure, logoStructure } = options;

    if (produits.length === 0) {
      setError('Aucun produit à imprimer');
      return false;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const success = await printOptimized({
        produits,
        nomStructure,
        logoStructure,
        format: config.format,
        stickerSize: config.stickerSize || 'medium',
        afficherNom: config.afficherNom ?? true,
        afficherPrix: config.afficherPrix ?? true
      });

      if (!success) {
        setError('Impossible d\'ouvrir la fenêtre d\'impression');
      }

      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setError(null);
  }, []);

  return {
    print,
    reset,
    isProcessing,
    error
  };
}
