/**
 * Utilitaire de traitement par lots pour opérations lourdes
 * Permet de traiter des centaines d'éléments sans bloquer le navigateur
 *
 * Caractéristiques :
 * - Traitement par lots configurables (default: 50)
 * - Libération mémoire entre les batches
 * - Support annulation via AbortController
 * - Callbacks de progression en temps réel
 */

import { BatchProcessorOptions, BatchResult } from '@/types/print';

/**
 * Libère la mémoire entre les batches
 * Utilise requestIdleCallback si disponible, sinon setTimeout
 */
async function releaseMemory(delay: number = 50): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
        .requestIdleCallback(() => resolve(), { timeout: delay + 50 });
    } else {
      setTimeout(resolve, delay);
    }
  });
}

/**
 * Divise un tableau en lots de taille spécifiée
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Traite un tableau d'éléments par lots
 *
 * @example
 * ```typescript
 * const results = await processBatches({
 *   items: produits,
 *   batchSize: 50,
 *   processItem: async (produit) => await generateQRCode(produit.nom),
 *   onProgress: (processed, total) => {
 *     console.log(`${processed}/${total} traités`);
 *   }
 * });
 * ```
 */
export async function processBatches<T, R>(
  options: BatchProcessorOptions<T, R>
): Promise<BatchResult<R>> {
  const {
    items,
    batchSize,
    processItem,
    onProgress,
    onBatchComplete,
    delayBetweenBatches = 50,
    abortSignal
  } = options;

  const startTime = Date.now();
  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  const batches = chunkArray(items, batchSize);
  const totalBatches = batches.length;
  let totalProcessed = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    // Vérifier annulation
    if (abortSignal?.aborted) {
      console.log('⛔ [BATCH PROCESSOR] Traitement annulé par utilisateur');
      return {
        results,
        totalProcessed,
        errors,
        cancelled: true,
        duration: Date.now() - startTime
      };
    }

    const batch = batches[batchIndex];
    const batchStartIndex = batchIndex * batchSize;
    const batchResults: R[] = [];

    // Traiter tous les éléments du batch en parallèle
    const batchPromises = batch.map(async (item, localIndex) => {
      const globalIndex = batchStartIndex + localIndex;
      try {
        const result = await processItem(item, globalIndex);
        return { success: true as const, result, index: globalIndex };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error : new Error(String(error)),
          index: globalIndex
        };
      }
    });

    const batchOutcomes = await Promise.all(batchPromises);

    // Collecter résultats et erreurs
    for (const outcome of batchOutcomes) {
      if (outcome.success) {
        results.push(outcome.result);
        batchResults.push(outcome.result);
      } else {
        errors.push({ index: outcome.index, error: outcome.error });
      }
    }

    totalProcessed += batch.length;

    // Callback de fin de batch
    if (onBatchComplete) {
      onBatchComplete(batchResults, batchIndex);
    }

    // Callback de progression
    if (onProgress) {
      onProgress(totalProcessed, items.length, batchIndex + 1, totalBatches);
    }

    // Libérer la mémoire entre les batches (sauf le dernier)
    if (batchIndex < totalBatches - 1) {
      await releaseMemory(delayBetweenBatches);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ [BATCH PROCESSOR] Terminé: ${totalProcessed} éléments en ${duration}ms`);

  return {
    results,
    totalProcessed,
    errors,
    cancelled: false,
    duration
  };
}

/**
 * Version simplifiée pour des opérations moins complexes
 * Traite les éléments de manière séquentielle avec pauses
 */
export async function processSequentially<T, R>(
  items: T[],
  processItem: (item: T, index: number) => Promise<R>,
  options?: {
    pauseEvery?: number;      // Pause tous les N éléments (default: 20)
    pauseDuration?: number;   // Durée pause en ms (default: 10)
    onProgress?: (current: number, total: number) => void;
    abortSignal?: AbortSignal;
  }
): Promise<R[]> {
  const {
    pauseEvery = 20,
    pauseDuration = 10,
    onProgress,
    abortSignal
  } = options || {};

  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    if (abortSignal?.aborted) {
      break;
    }

    results.push(await processItem(items[i], i));

    if (onProgress) {
      onProgress(i + 1, items.length);
    }

    // Pause périodique pour libérer le thread principal
    if ((i + 1) % pauseEvery === 0 && i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, pauseDuration));
    }
  }

  return results;
}

/**
 * Calcule le temps restant estimé basé sur le temps écoulé
 */
export function estimateTimeRemaining(
  processed: number,
  total: number,
  elapsedMs: number
): number | undefined {
  if (processed === 0) return undefined;

  const msPerItem = elapsedMs / processed;
  const remaining = total - processed;
  const estimatedMs = remaining * msPerItem;

  return Math.round(estimatedMs / 1000); // Retourne en secondes
}

/**
 * Formate le temps restant pour affichage utilisateur
 */
export function formatTimeRemaining(seconds: number | undefined): string {
  if (seconds === undefined) return '';

  if (seconds < 60) {
    return `~${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `~${minutes}m ${remainingSeconds}s`;
}
