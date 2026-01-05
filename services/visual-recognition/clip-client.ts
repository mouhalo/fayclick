/**
 * ClipClient Service
 * Client pour obtenir les embeddings CLIP via API route locale
 * Utilise l'API route pour éviter les problèmes CORS
 * FayClick V2 - Reconnaissance Visuelle Commerce
 */

export interface ClipEmbeddingResponse {
  embedding: number[];      // Vecteur 512D
  model: string;            // Modèle utilisé
  processingTime: number;   // Temps en ms
}

// URL de l'API route locale
const CLIP_API_URL = '/api/vision/clip';

/**
 * Service client pour l'API CLIP
 * Appelle l'API route locale qui fait le proxy vers Replicate
 */
export class ClipClient {
  constructor() {
    // Plus besoin de clé API côté client - gérée côté serveur
  }

  /**
   * Obtient l'embedding CLIP d'une image
   * @param imageBase64 Image encodée en base64 (avec ou sans le préfixe data:image/)
   */
  async getEmbedding(imageBase64: string): Promise<ClipEmbeddingResponse> {
    const startTime = Date.now();

    console.log('[ClipClient] Appel API route locale pour CLIP...');

    const response = await fetch(CLIP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageBase64 })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur API CLIP: ${response.status}`);
    }

    if (!result.embedding) {
      throw new Error('Embedding non retourné par l\'API');
    }

    console.log('[ClipClient] Embedding reçu, dimension:', result.embedding?.length || 0);

    return {
      embedding: result.embedding,
      model: 'clip-vit-base-patch32',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Obtient les embeddings pour plusieurs images en batch
   */
  async getEmbeddingsBatch(imagesBase64: string[]): Promise<ClipEmbeddingResponse[]> {
    // Exécuter en parallèle (max 5 concurrent pour éviter rate limiting)
    const batchSize = 5;
    const results: ClipEmbeddingResponse[] = [];

    for (let i = 0; i < imagesBase64.length; i += batchSize) {
      const batch = imagesBase64.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(img => this.getEmbedding(img))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Vérifie que l'API est accessible
   * Note: Test simplifié car la vérification réelle se fait côté serveur
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(CLIP_API_URL, {
        method: 'OPTIONS'
      });
      return response.ok || response.status === 405; // 405 = méthode non autorisée mais route existe
    } catch {
      return false;
    }
  }
}

// Instance singleton
export const clipClient = new ClipClient();

export default ClipClient;
