/**
 * SimilarityEngine Service
 * Calcul de similarité cosinus entre embeddings CLIP
 * FayClick V2 - Reconnaissance Visuelle Commerce
 */

import { EmbeddingStore, ProductEmbedding } from './embedding-store';

export interface VisualMatch {
  idProduit: number;
  similarity: number;       // Score 0-1
  embedding: ProductEmbedding;
}

export interface MatchResult {
  matches: VisualMatch[];
  topMatch: VisualMatch | null;
  confidence: number;
  processingTime: number;
}

/**
 * Moteur de calcul de similarité entre embeddings
 */
export class SimilarityEngine {
  private embeddingStore: EmbeddingStore;
  private cachedEmbeddings: ProductEmbedding[] = [];
  private lastCacheUpdate: Date | null = null;
  private cacheMaxAge: number; // En millisecondes

  constructor(embeddingStore: EmbeddingStore, options?: { cacheMaxAge?: number }) {
    this.embeddingStore = embeddingStore;
    this.cacheMaxAge = options?.cacheMaxAge || 5 * 60 * 1000; // 5 minutes par défaut
  }

  /**
   * Initialise le cache des embeddings
   */
  async initialize(): Promise<void> {
    await this.refreshCache();
  }

  /**
   * Rafraîchit le cache depuis IndexedDB
   */
  async refreshCache(): Promise<void> {
    this.cachedEmbeddings = await this.embeddingStore.getAll();
    this.lastCacheUpdate = new Date();
    console.log(`[SimilarityEngine] Cache rafraîchi: ${this.cachedEmbeddings.length} embeddings`);
  }

  /**
   * Trouve les produits les plus similaires à un embedding donné
   */
  async findSimilar(
    queryEmbedding: number[],
    options?: {
      limit?: number;
      minSimilarity?: number;
      excludeProductIds?: number[];
    }
  ): Promise<MatchResult> {
    const startTime = performance.now();
    const limit = options?.limit ?? 5;
    const minSimilarity = options?.minSimilarity ?? 0.5;
    const excludeIds = new Set(options?.excludeProductIds || []);

    // Rafraîchir le cache si nécessaire
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }

    // Filtrer les embeddings exclus
    const availableEmbeddings = excludeIds.size > 0
      ? this.cachedEmbeddings.filter(e => !excludeIds.has(e.idProduit))
      : this.cachedEmbeddings;

    if (availableEmbeddings.length === 0) {
      return {
        matches: [],
        topMatch: null,
        confidence: 0,
        processingTime: performance.now() - startTime
      };
    }

    // Calculer les similarités
    const matches: VisualMatch[] = availableEmbeddings
      .map(embedding => ({
        idProduit: embedding.idProduit,
        similarity: this.cosineSimilarity(queryEmbedding, embedding.embedding),
        embedding
      }))
      .filter(match => match.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    const topMatch = matches[0] || null;

    return {
      matches,
      topMatch,
      confidence: topMatch?.similarity ?? 0,
      processingTime: performance.now() - startTime
    };
  }

  /**
   * Calcule la similarité cosinus entre deux vecteurs
   * Cœur de l'algorithme de matching
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      console.error('[SimilarityEngine] Vecteurs de dimensions différentes:', vecA.length, vecB.length);
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Calcul optimisé en une seule boucle
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

    if (magnitude === 0) return 0;

    // Clamp entre 0 et 1 (les similarités CLIP sont généralement positives)
    const similarity = dotProduct / magnitude;
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Vérifie si un embedding est un doublon (similarity > 0.98)
   */
  async isDuplicate(queryEmbedding: number[]): Promise<number | null> {
    const result = await this.findSimilar(queryEmbedding, {
      limit: 1,
      minSimilarity: 0.98
    });

    return result.topMatch?.idProduit ?? null;
  }

  /**
   * Calcule la distance euclidienne (alternative à cosinus)
   */
  euclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Normalise un vecteur (L2 normalization)
   */
  normalizeVector(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));

    if (magnitude === 0) return vec;

    return vec.map(val => val / magnitude);
  }

  /**
   * Batch: trouve les similaires pour plusieurs requêtes
   */
  async findSimilarBatch(
    queryEmbeddings: number[][],
    options?: {
      limit?: number;
      minSimilarity?: number;
    }
  ): Promise<MatchResult[]> {
    // Rafraîchir le cache une seule fois pour le batch
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }

    return Promise.all(
      queryEmbeddings.map(query => this.findSimilar(query, options))
    );
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): {
    count: number;
    lastUpdate: Date | null;
    isStale: boolean;
  } {
    return {
      count: this.cachedEmbeddings.length,
      lastUpdate: this.lastCacheUpdate,
      isStale: this.shouldRefreshCache()
    };
  }

  /**
   * Invalide le cache (force refresh au prochain appel)
   */
  invalidateCache(): void {
    this.lastCacheUpdate = null;
  }

  /**
   * Vérifie si le cache doit être rafraîchi
   */
  private shouldRefreshCache(): boolean {
    if (!this.lastCacheUpdate) return true;
    return Date.now() - this.lastCacheUpdate.getTime() > this.cacheMaxAge;
  }

  /**
   * Calcul de similarité moyenne entre deux ensembles d'embeddings
   * Utile pour comparer des groupes de produits
   */
  averageSimilarity(embeddingsA: number[][], embeddingsB: number[][]): number {
    if (embeddingsA.length === 0 || embeddingsB.length === 0) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const a of embeddingsA) {
      for (const b of embeddingsB) {
        totalSimilarity += this.cosineSimilarity(a, b);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Trouve le centroïde (moyenne) d'un ensemble d'embeddings
   * Utile pour créer un embedding représentatif d'une catégorie
   */
  computeCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];

    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding[i];
      }
    }

    // Moyenne
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length;
    }

    // Normaliser le centroïde
    return this.normalizeVector(centroid);
  }
}

export default SimilarityEngine;
